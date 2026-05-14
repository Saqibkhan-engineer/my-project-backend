import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('messages')
export class Message {

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roomId: string; // later = groupId

  @Column()
  senderId: number;

  @Column({nullable:true})
  senderName: string;

  @Column()
  senderRole: string; // student | supervisor

  @Column('text')
  message: string;

  @Column({ type: 'timestamp', nullable: true })
  seenAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}