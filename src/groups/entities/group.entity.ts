import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Proposal } from '../../proposal/entities/proposal.entity';
import { Supervisor } from '../../supervisor/entities/supervisor.entity';

@Entity('groups')
export class Group {

  @PrimaryGeneratedColumn()
  id: number;

  // Null when group is created from a supervisor's posted project
  @Column({ nullable: true })
  proposalId: number;

  @ManyToOne(() => Proposal)
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal;

  // Set when group is created from a supervisor's approved project idea
  @Column({ nullable: true })
  supervisorProposalId: number;

  @Column()
  supervisorId: number;

  @ManyToOne(() => Supervisor)
  @JoinColumn({ name: 'supervisorId' })
  supervisor: Supervisor;

  @Column()
  leadStudentId: number;

  // Legacy: reg numbers as simple-array
  @Column('simple-array', { nullable: true })
  studentRegs: string[];

  // NEW: actual student IDs of all group members (including lead)
  @Column('int', { array: true, nullable: true })
  studentIds: number[];

  @Column({ nullable: true, type: 'int' })
  committeeId: number | null;

  // GITHUB
  @Column({ nullable: true })
  repoUrl: string;

  @Column('simple-array', { nullable: true })
  githubUsernames: string[];

  // PERFORMANCE
  @Column({ default: 0 })
  totalCommits: number;

  @Column('json', { nullable: true })
  individualCommits: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}