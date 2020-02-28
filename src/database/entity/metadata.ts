import {Entity, PrimaryGeneratedColumn, Column} from "typeorm";

@Entity()
export class Metadata {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  value: string;
}