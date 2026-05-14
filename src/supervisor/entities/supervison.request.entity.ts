import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Proposal } from '../../proposal/entities/proposal.entity';

@Entity('supervisor_requests')
export class SupervisorRequest {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number; // main requester student

  @Column()
  proposalId: number;

  @ManyToOne(() => Proposal)
  @JoinColumn({ name: 'proposalId' })
  proposal: Proposal;

  @Column()
  supervisorId: number;

  // Legacy: group/team members as reg numbers
  @Column('json', { nullable: true })
  teamMembers: {
    member1: string;
    member2: string;
    member3: string;
  };

  // NEW: team member student IDs (picked from student list)
  @Column('int', { array: true, nullable: true })
  memberStudentIds: number[];

  @Column({ default: 'pending' })
  status: string; // pending | accepted | cancelled

  @CreateDateColumn()
  createdAt: Date;
}