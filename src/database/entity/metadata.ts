import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Metadata {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column()
  public value: string;
}
