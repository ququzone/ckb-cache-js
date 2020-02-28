import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Rule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  data: string;
}