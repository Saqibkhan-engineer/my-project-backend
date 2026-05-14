import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('project_requests')
export class ProjectRequest {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @Column()
  supervisorProposalId: number;

  @Column()
  supervisorId: number;

  // Why this group's request should be accepted
  @Column({ type: 'text', nullable: true })
  description: string;

  // Team member reg numbers  { member1: 'reg', member2: 'reg' }
  @Column('json', { nullable: true })
  teamMembers: Record<string, string>;

  // Actual student IDs of all members (lead + others)
  @Column('int', { array: true, nullable: true })
  memberStudentIds: number[];

  // pending | accepted | rejected
  @Column({ length: 50, default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
