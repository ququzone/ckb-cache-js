import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Cell {
  @PrimaryGeneratedColumn("uuid")
  public id: number;

  @Column({
    type: "character",
    length: 66,
  })
  public txHash: string;

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
    length: 5,
  })
  public index: string;

  @Column({
    type: "varchar",
    length: 18,
  })
  public capacity: string;

  @Column({
    type: "character",
    length: 66,
  })
  public lockHash: string;

  @Column({
    type: "character",
    length: 4,
  })
  public lockHashType: string;

  @Column({
    type: "character",
    length: 66,
  })
  public lockCodeHash: string;

  @Column()
  public lockArgs: string;

  @Column({
    type: "character",
    length: 66,
    nullable: true,
  })
  public typeHash: string;

  @Column({
    type: "character",
    length: 4,
    nullable: true,
  })
  public typeHashType: string;

  @Column({
    type: "character",
    length: 66,
    nullable: true,
  })
  public typeCodeHash: string;

  @Column({
    nullable: true,
  })
  public typeArgs: string;

  @Column()
  public data: string;
}
