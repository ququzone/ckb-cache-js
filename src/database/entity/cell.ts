import {Column, Entity, Index, PrimaryGeneratedColumn} from "typeorm";

@Entity()
@Index(["txHash", "index"], { unique: true })
export class Cell {
  @PrimaryGeneratedColumn("uuid")
  public id: number;

  @Column({
    type: "character",
    length: 66,
  })
  @Index()
  public txHash: string;

  @Column({
    type: "varchar",
    length: 5,
  })
  public index: string;

  @Column({
    type: "bigint",
  })
  public createdBlockNumber: number;

  @Column({
    type: "bigint",
    nullable: true,
  })
  public usedBlockNumber: number;

  @Column({
    type: "character",
    length: 66,
    nullable: true,
  })
  public usedTxHash: string;

  @Column({
    type: "varchar",
    length: 15,
  })
  public status: string;

  @Column({
    type: "varchar",
    length: 18,
  })
  public capacity: string;

  @Column({
    type: "character",
    length: 66,
  })
  @Index()
  public lockHash: string;

  @Column({
    type: "character",
    length: 4,
  })
  @Index()
  public lockHashType: string;

  @Column({
    type: "character",
    length: 66,
  })
  @Index()
  public lockCodeHash: string;

  @Column()
  public lockArgs: string;

  @Column({
    type: "character",
    length: 66,
    nullable: true,
  })
  @Index()
  public typeHash: string;

  @Column({
    type: "character",
    length: 4,
    nullable: true,
  })
  @Index()
  public typeHashType: string;

  @Column({
    type: "character",
    length: 66,
    nullable: true,
  })
  @Index()
  public typeCodeHash: string;

  @Column({
    nullable: true,
  })
  public typeArgs: string;

  @Column()
  public data: string;
}
