import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import BN from "bn.js";
import CellRepository from "../database/cell-repository";
import { Cell } from "../database/entity/cell";
import { Rule } from "../database/entity/rule";
import MetadataRepository from "../database/metadata-repository";
import RuleRepository from "../database/rule-repository";
import common from "../utils/common";

const ZERO = new BN(0);
const ONE = new BN(1);
const BATCH_SIZE = new BN(100);
const CONFIRM_SIZE = new BN(300);

export default class SyncService {
  private ckb: CKB;
  private metadataRepository: MetadataRepository;
  private ruleRepository: RuleRepository;
  private cellReposicory: CellRepository;
  private rules: Map<string, string[]>;
  private currentBlock: BN;
  private currentBlockN: BN;
  private stopped = false;
  private enableRule: boolean;

  public constructor(ckb: CKB, enableRule: boolean) {
    this.ckb = ckb;
    this.currentBlock = ZERO.clone();
    this.metadataRepository = new MetadataRepository();
    this.ruleRepository = new RuleRepository();
    this.cellReposicory = new CellRepository();

    this.rules = new Map();
    this.rules.set("LockCodeHash", []);
    this.rules.set("LockHash", []);
    this.rules.set("TypeCodeHash", []);
    this.rules.set("TypeHash", []);
    this.enableRule = enableRule;
  }

  public getCurrentBlock(): BN {
    return this.currentBlock.clone();
  }

  public stop() {
    this.stopped = true;
  }

  public async addRule(rule: Rule) {
    if (!this.enableRule) {
      throw new Error("startup by disable rule mode.");
    }
    await this.ruleRepository.save(rule);
    const rules = this.rules.get(rule.name.toString());
    for (const r of rules) {
      if (r === rule.data) {
        return;
      }
    }
    rules.push(rule.data);
    this.rules.set(rule.name.toString(), rules);
  }

  public async start() {
    this.processBlock();
    this.processFork();
  }

  public async allRules(): Promise<Rule[]> {
    return this.ruleRepository.all();
  }

  public async resetStartBlockNumber(blockNumber: string) {
    const setting = new BN(blockNumber, 10);
    if (setting.lt(ZERO) || setting.gt(this.currentBlock)) {
      return;
    }
    await this.yield(1000);
    await this.metadataRepository.updateCurrentBlock(setting.toString(10));
    this.currentBlockN = setting;
  }

  private async processBlock() {
    const currentBlockS = await this.metadataRepository.findCurrentBlock();
    this.currentBlock = new BN(currentBlockS).sub(new BN(1));
    if (this.currentBlock.lt(ZERO)) {
      this.currentBlock = ZERO.clone();
    }

    const rules = await this.ruleRepository.all();
    rules.forEach((rule: Rule) => {
      const items = this.rules.get(rule.name);
      items.push(rule.data);
      this.rules.set(rule.name, items);
    });

    while (!this.stopped) {
      let synced = false;
      try {
        const header = await this.ckb.rpc.getTipHeader();
        let headerNumber = new BN(header.number.slice(2), 16);
        if (headerNumber.sub(BATCH_SIZE).gt(this.currentBlock)) {
          headerNumber = this.currentBlock.add(BATCH_SIZE);
        }
        // tslint:disable-next-line:no-console
        console.debug(`begin sync block at: ${this.currentBlock.toString(10)}`);
        while (this.currentBlock.lte(headerNumber)) {
          if (this.currentBlockN) {
            this.currentBlock = this.currentBlockN;
            this.currentBlockN = null;
            break;
          }
          const block = await this.ckb.rpc.getBlockByNumber(`0x${this.currentBlock.toString(16)}`);
          synced = true;
          block.transactions.forEach((tx) => {
            tx.inputs.forEach((input) => {
              this.cellReposicory.updateUsed(
                "pending_dead",
                tx.hash,
                this.currentBlock.toNumber(),
                input.previousOutput.txHash,
                input.previousOutput.index,
              );
            });
            for (let i = 0; i < tx.outputs.length; i++) {
              const output = tx.outputs[i];
              if (this.checkCell(output)) {
                const cell = new Cell();
                cell.createdBlockNumber = this.currentBlock.toNumber();
                cell.status = "pending";
                cell.txHash = tx.hash;
                cell.index = `0x${i.toString(16)}`;
                cell.capacity = output.capacity;
                cell.lockHash = utils.scriptToHash(output.lock);
                cell.lockCodeHash = output.lock.codeHash;
                cell.lockHashType = output.lock.hashType;
                cell.lockArgs = output.lock.args;
                if (output.type) {
                  cell.typeHash = utils.scriptToHash(output.type);
                  cell.typeCodeHash = output.type.codeHash;
                  cell.typeHashType = output.type.hashType;
                  cell.typeArgs = output.type.args;
                }
                cell.data = tx.outputsData[i];
                this.cellReposicory.save(cell);
              }
            }
          });

          this.currentBlock.iadd(ONE);
        }
      } catch (err) {
        // tslint:disable-next-line:no-console
        console.error("cache cells error:", err);
      } finally {
        if (synced) {
          // tslint:disable-next-line:no-console
          console.debug(`sync block since: ${this.currentBlock.toString(10)}`);
          await this.metadataRepository.updateCurrentBlock(this.currentBlock.toString(10));
        } else {
          await this.yield(10000);
        }
      }
    }
  }

  private async processFork() {
    while (!this.stopped) {
      try {
        const header = await this.ckb.rpc.getTipHeader();
        const headerNumber = new BN(header.number.slice(2), 16);

        // process pending cells
        const pendingCells = await this.cellReposicory.findByStatus("pending");
        pendingCells.forEach(async (cell) => {
          const tx = await this.ckb.rpc.getTransaction(cell.txHash);
          if (!tx) {
            await this.cellReposicory.remove(cell.id);
            return;
          }
          if (new BN(cell.createdBlockNumber).add(CONFIRM_SIZE).lte(headerNumber)) {
            await this.cellReposicory.updateStatus(cell.id, "pending", "normal");
          }
        });

        // process pending dead cells
        const pendingDeadCells = await this.cellReposicory.findByStatus("pending_dead");
        pendingDeadCells.forEach(async (cell) => {
          const tx = await this.ckb.rpc.getTransaction(cell.usedTxHash);
          if (!tx) {
            await this.cellReposicory.updateStatus(cell.id, "pending_dead", "pending");
            return;
          }
          if (new BN(cell.usedBlockNumber).add(CONFIRM_SIZE).lte(headerNumber)) {
            await this.cellReposicory.remove(cell.id);
          }
        });
      } catch (err) {
        // tslint:disable-next-line:no-console
        console.error("process fork data error:", err);
      } finally {
        await this.yield(60000);
      }
    }
  }

  private checkCell(output: CKBComponents.CellOutput): boolean {
    if (!this.enableRule) {
      return true;
    }
    const lockCodeHash = this.rules.get("LockCodeHash");
    for (const hash of lockCodeHash) {
      if (hash === output.lock.codeHash) {
        return true;
      }
    }
    const lockHash = this.rules.get("LockHash");
    for (const hash of lockHash) {
      if (hash === utils.scriptToHash(output.lock)) {
        return true;
      }
    }

    if (!output.type) {
      return false;
    }
    const typeCodeHash = this.rules.get("TypeCodeHash");
    for (const hash of typeCodeHash) {
      if (hash === output.type.codeHash) {
        return true;
      }
    }
    const typeHash = this.rules.get("TypeHash");
    for (const hash of typeHash) {
      if (hash === utils.scriptToHash(output.type)) {
        return true;
      }
    }

    return false;
  }

  private async yield(millisecond: number = 1) {
    await common.sleep(millisecond);
  }
}
