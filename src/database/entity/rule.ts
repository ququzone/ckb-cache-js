import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

@Entity()
export class Rule {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public name: string;

  @Column()
  public data: string;
}
