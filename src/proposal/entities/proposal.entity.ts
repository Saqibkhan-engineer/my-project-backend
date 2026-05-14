import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Student } from '../../students/entities/student.entity';

@Entity('proposals')
export class Proposal {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 500, nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  domain: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string;

  @Column({ name: 'student_id', nullable: true })
  studentId: number;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({
    name: 'title_embedding',
    type: 'vector',
    nullable: true,
  })
  titleEmbedding: number[];

  @Column({
    name: 'scope_embedding',
    type: 'vector',
    nullable: true,
  })
  scopeEmbedding: number[];

  @Column({
    name: 'modules_embedding',
    type: 'vector',
    nullable: true,
  })
  modulesEmbedding: number[];

  @Column({
    name: 'highest_similarity',
    type: 'float',
    default: 0,
  })
  highestSimilarity: number;

  @Column({ length: 50, default: 'draft' })
  status: string;

  @Column({ name: 'pec_feedback', type: 'text', nullable: true })
  pecFeedback: string;

  // ✅ FIXED supervisor status
  @Column({ length: 50, default: 'pending', nullable: true })
  supervisorStatus: string;

  // ✅ BEST PRACTICE (auto timestamp)
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}