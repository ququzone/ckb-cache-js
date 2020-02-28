import CKB from "@nervosnetwork/ckb-sdk-core";
import * as utils from "@nervosnetwork/ckb-sdk-utils";
import * as BN from "bn.js";
import MetadataRepository from "../database/metadata-repository";
import RuleRepository from "../database/rule-repository";
import CellRepository from "../database/cell-repository";
import common from "../utils/common";
import { Cell } from "../database/entity/cell";
import { Rule } from "../database/entity/rule";

export default class SyncService {
  private ckb: CKB;
  private metadataRepository: MetadataRepository;
  private ruleRepository: RuleRepository;
  private cellReposicory: CellRepository;
  private rules: Map<string, string[]>;
  private currentBlock: BN;
  private stopped = false;

  public constructor(ckb: CKB) {
    this.ckb = ckb;
    this.metadataRepository = new MetadataRepository();
    this.ruleRepository = new RuleRepository();
    this.cellReposicory = new CellRepository();

    this.rules = new Map();
    this.rules.set("LockCodeHash", []);
    this.rules.set("LockHash", []);
    this.rules.set("TypeCodeHash", []);
    this.rules.set("TypeHash", []);
  }

  public async reset() {
    this.stopped = true;
    await this.cellReposicory.clear();
    this.stopped = false;
  }

  public stop() {
    this.stopped = true;
  }

  public async addRule(rule: Rule) {
    await this.ruleRepository.save(rule);
    const rules = this.rules.get(rule.name.toString());
    for (let i = 0; i < rules.length; i++) {
      if (rules[i] === rule.data) {
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

  private async processBlock() {
    const currentBlockS = await this.metadataRepository.findCurrentBlock();
    this.currentBlock = new BN(currentBlockS).sub(new BN(1));

    const rules = await this.ruleRepository.all();
    rules.forEach(rule => {
      const rules = this.rules.get(rule.name);
      rules.push(rule.data);
      this.rules.set(rule.name, rules);
    });

    while (!this.stopped) {
      let synced = false;
      try {
        const header = await this.ckb.rpc.getTipHeader();
        const headerNumber = new BN(header.number.slice(2), 16);
        console.debug(`begin sync block at: ${this.currentBlock.toString(10)}`);
        while (this.currentBlock.lte(headerNumber)) {
          const block = await this.ckb.rpc.getBlockByNumber(`0x${this.currentBlock.toString(16)}`);
          synced = true;
          block.transactions.forEach(tx => {
            tx.inputs.forEach(input => {
              this.cellReposicory.updateUsed("pending_dead", tx.hash, this.currentBlock.toString(10), input.previousOutput.txHash, input.previousOutput.index);
            });
            for (let i = 0; i < tx.outputs.length; i++) {
              const output = tx.outputs[i];
              if (this.checkCell(output)) {
                const cell = new Cell();
                cell.createdBlockNumber = this.currentBlock.toString(10);
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

          this.currentBlock = this.currentBlock.add(new BN(1));
        }
      } catch (err) {
        console.error("cache cells error:", err);
      } finally {
        if (synced) {
          console.debug(`sync block since: ${this.currentBlock.toString(10)}`);
          await this.metadataRepository.updateCurrentBlock(this.currentBlock.toString(10));
        }
        await this.yield(10000);
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
        pendingCells.forEach(async cell => {
          const tx = await this.ckb.rpc.getTransaction(cell.txHash);
          if (!tx) {
            await this.cellReposicory.remove(cell.id);
            return;
          }
          if (new BN(cell.createdBlockNumber).add(new BN(300)).lte(headerNumber)) {
            await this.cellReposicory.updateStatus(cell.id, "pending", "normal");
          }
        });

        // process pending dead cells
        const pendingDeadCells = await this.cellReposicory.findByStatus("pending_dead");
        pendingDeadCells.forEach(async cell => {
          const tx = await this.ckb.rpc.getTransaction(cell.usedTxHash);
          if (!tx) {
            await this.cellReposicory.updateStatus(cell.id, "pending_dead", "pending");
            return;
          }
          if (new BN(cell.usedBlockNumber).add(new BN(300)).lte(headerNumber)) {
            await this.cellReposicory.remove(cell.id);
          }
        });
      } catch (err) {
        console.error("process fork data error:", err);
      } finally {
        await this.yield(60000);
      }
    }
  }
  
  private checkCell(output: CKBComponents.CellOutput): boolean {
    const lockCodeHash = this.rules.get("LockCodeHash");
    for (let i = 0; i < lockCodeHash.length; i++) {
      if (lockCodeHash[i] === output.lock.codeHash) {
        return true;
      }
    }
    const lockHash = this.rules.get("LockHash");
    for (let i = 0; i < lockHash.length; i++) {
      if (lockHash[i] === utils.scriptToHash(output.lock)) {
        return true;
      }
    }

    if (!output.type) {
      return false;
    }
    const typeCodeHash = this.rules.get("TypeCodeHash");
    for (let i = 0; i < typeCodeHash.length; i++) {
      if (typeCodeHash[i] === output.type.codeHash) {
        return true;
      }
    }
    const typeHash = this.rules.get("TypeHash");
    for (let i = 0; i < typeHash.length; i++) {
      if (typeHash[i] === utils.scriptToHash(output.type)) {
        return true;
      }
    }

    return false;
  }

  private async yield(millisecond: number = 1) {
    await common.sleep(millisecond);
  }

  public async allRules(): Promise<Rule[]> {
    return this.ruleRepository.all();
  }

  public resetStartBlockNumber(blockNumber: string) {
    this.currentBlock = new BN(blockNumber, 10);
  }
}