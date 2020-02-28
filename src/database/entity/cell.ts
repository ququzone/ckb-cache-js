import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Cell {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public txHash: string;

  @Column()
  public createdBlockNumber: string;

  @Column({
    nullable: true,
  })
  public usedBlockNumber: string;

  @Column({
    nullable: true,
  })
  public usedTxHash: string;

  @Column()
  public status: string;

  @Column()
  public index: string;

  @Column()
  public capacity: string;

  @Column()
  public lockHash: string;

  @Column()
  public lockHashType: string;

  @Column()
  public lockCodeHash: string;

  @Column()
  public lockArgs: string;

  @Column({
    nullable: true,
  })
  public typeHash: string;

  @Column({
    nullable: true,
  })
  public typeHashType: string;

  @Column({
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
