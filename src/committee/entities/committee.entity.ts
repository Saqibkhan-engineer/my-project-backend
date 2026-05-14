import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('committees')
export class Committee {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // supervisor IDs who are members of this committee
  @Column('int', { array: true, default: '{}' })
  memberIds: number[];

  // group IDs assigned to this committee for evaluation
  @Column('int', { array: true, default: '{}' })
  groupIds: number[];

  @CreateDateColumn()
  createdAt: Date;
}
