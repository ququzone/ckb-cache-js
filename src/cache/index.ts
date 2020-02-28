// tslint:disable:variable-name
import CKB from "@nervosnetwork/ckb-sdk-core";
import * as BN from "bn.js";
import CellRepository from "../database/cell-repository";
import { Cell } from "../database/entity/cell";
import { Rule } from "../database/entity/rule";
import SyncService from "./sync";

export class Query {
  public lockHash: string;
  public lockCodeHash: string;
  public typeHash: string;
  public typeCodeHash: string;
  public data: string;
  public capacity: BN;
  public capacityFetcher: (cell: Cell) => BN;

  constructor(queryBuilder: QueryBuilder) {
    this.lockHash = queryBuilder.lockHash;
    this.lockCodeHash = queryBuilder.lockCodeHash;
    this.typeHash = queryBuilder.typeHash;
    this.typeCodeHash = queryBuilder.typeCodeHash;
    this.data = queryBuilder.data;
    this.capacity = queryBuilder.capacity;
    this.capacityFetcher = queryBuilder.capacityFetcher;
  }
}

export class QueryResult {
  public static EmptyResult = {
    cells: [],
    totalCKB: new BN(0),
    total: new BN(0),
  };

  public cells: Cell[];
  public totalCKB: BN;
  public total: BN;
}

export class QueryBuilder {
  public static create(): QueryBuilder {
    return new QueryBuilder();
  }

  private _lockHash: string;
  private _lockCodeHash: string;
  private _typeHash: string;
  private _typeCodeHash: string;
  private _data: string;
  private _capacity: BN;
  private _capacityFetcher: (cell: Cell) => BN;

  public build(): Query {
    if (!this._capacityFetcher) {
      this._capacityFetcher = (cell: Cell) => {
        return new BN(cell.capacity.slice(2), 16);
      };
    }
    return new Query(this);
  }

  public setLockHash(lockHash: string): QueryBuilder {
    this._lockHash = lockHash;
    return this;
  }

  public setLockCodeHash(lockCodeHash: string): QueryBuilder {
    this._lockCodeHash = lockCodeHash;
    return this;
  }

  public setTypeHash(typeHash: string): QueryBuilder {
    this._typeHash = typeHash;
    return this;
  }

  public setTypeCodeHash(typeCodeHash: string): QueryBuilder {
    this._typeCodeHash = typeCodeHash;
    return this;
  }

  public setData(data: string): QueryBuilder {
    this._data = data;
    return this;
  }

  public setCapacity(capacity: BN): QueryBuilder {
    this._capacity = capacity;
    return this;
  }

  public setCapacityFetcher(capacityFetcher: (cell: Cell) => BN): QueryBuilder {
    this._capacityFetcher = capacityFetcher;
    return this;
  }

  get lockHash() {
    return this._lockHash;
  }

  get lockCodeHash() {
    return this._lockCodeHash;
  }

  get typeHash() {
    return this._typeHash;
  }

  get typeCodeHash() {
    return this._typeCodeHash;
  }

  get data() {
    return this._data;
  }

  get capacity() {
    return this._capacity;
  }

  get capacityFetcher() {
    return this._capacityFetcher;
  }
}

export interface CacheService {
  addRule(rule: Rule): Promise<void>;

  allRules(): Promise<Rule[]>;

  reset(): Promise<void>;

  resetStartBlockNumber(blockNumber: string): void;

  findCells(query: Query): Promise<QueryResult>;
}

export class NullCacheService implements CacheService {
  public async addRule(rule: Rule): Promise<void> {
    return;
  }

  public async allRules(): Promise<Rule[]> {
    return [];
  }

  public async reset(): Promise<void> {
    return;
  }

  public resetStartBlockNumber(blockNumber: string): void {
    return;
  }

  public async findCells(query: Query): Promise<QueryResult> {
    return QueryResult.EmptyResult;
  }
}

export class DefaultCacheService implements CacheService {
  private syncService: SyncService;
  private cellRepository: CellRepository;

  public constructor(ckb: CKB) {
    this.syncService = new SyncService(ckb);
    this.cellRepository = new CellRepository();
  }

  public async start() {
    this.syncService.start();
  }

  public async addRule(rule: Rule): Promise<void> {
    return this.syncService.addRule(rule);
  }

  public async allRules(): Promise<Rule[]> {
    return this.syncService.allRules();
  }

  public async reset(): Promise<void> {
    return this.syncService.reset();
  }

  public resetStartBlockNumber(blockNumber: string): void {
    this.syncService.resetStartBlockNumber(blockNumber);
  }

  public async findCells(query: Query): Promise<QueryResult> {
    const totalCKB = new BN(0);
    const total = new BN(0);
    const cells = [];
    let skip = 0;
    while (true) {
      let stop = false;
      // @ts-ignore
      query.skip = skip;
      const data = await this.cellRepository.find(query);
      for (const cell of data) {
        total.iadd(query.capacityFetcher(cell));
        totalCKB.iadd(new BN(cell.capacity.slice(2), 16));
        cells.push(cell);

        if (query.capacity && query.capacity.lte(total)) {
          stop = true;
          break;
        }
      }

      if (stop || data.length < 100) {
        break;
      }
      skip += 100;
    }

    return {
      cells,
      total,
      totalCKB,
    };
  }
}
