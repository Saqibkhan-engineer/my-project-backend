import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Supervisor } from '../../supervisor/entities/supervisor.entity';

@Entity('supervisor_proposals')
export class SupervisorProposal {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  supervisorId: number;

  @ManyToOne(() => Supervisor)
  @JoinColumn({ name: 'supervisorId' })
  supervisor: Supervisor;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  scope: string;

  @Column('text', { array: true, nullable: true })
  modules: string[];

  @Column({ length: 50, nullable: true })
  domain: string;

  // submitted | approved | revision
  @Column({ length: 50, default: 'submitted' })
  status: string;

  @Column({ type: 'text', nullable: true })
  pecFeedback: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
