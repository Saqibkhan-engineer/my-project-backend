import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('supervisors')
export class Supervisor {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  // multiple expertise (AI, Web, Mobile etc)
  @Column('text', { array: true, nullable: true })
  expertise: string[];

  @Column('text', { nullable: true })
  designation: string;

  @Column({ default: 3 })
  maxGroups: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}