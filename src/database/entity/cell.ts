import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Cell {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  txHash: string;

  @Column()
  createdBlockNumber: string;

  @Column({
    nullable: true
  })
  usedBlockNumber: string;

  @Column({
    nullable: true
  })
  usedTxHash: string;

  @Column()
  status: string;

  @Column()
  index: string;

  @Column()
  capacity: string

  @Column()
  lockHash: string;

  @Column()
  lockHashType: string;

  @Column()
  lockCodeHash: string;

  @Column()
  lockArgs: string;

  @Column({
    nullable: true
  })
  typeHash: string;

  @Column({
    nullable: true
  })
  typeHashType: string;

  @Column({
    nullable: true
  })
  typeCodeHash: string;

  @Column({
    nullable: true
  })
  typeArgs: string;

  @Column()
  data: string;
}