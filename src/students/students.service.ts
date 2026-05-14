import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Student } from './entities/student.entity';
import { Group } from '../groups/entities/group.entity';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepo: Repository<Student>,

    @InjectRepository(Group)
    private groupRepo: Repository<Group>,
  ) { }

  async findByUserId(userId: number): Promise<Student | null> {
    return this.studentRepo.findOne({
      where: { userId },
      relations: ['user'],
    });
  }

  async findById(id: number): Promise<Student | null> {
    return this.studentRepo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async create(data: {
    userId: number;
    regNo: string;
    fatherName: string;
    department: string;
  }): Promise<Student> {
    const student = this.studentRepo.create(data);
    return this.studentRepo.save(student);
  }

  // Get all students with user info
  async findAll() {
    return this.studentRepo.find({ relations: ['user'] });
  }

  // Get students NOT already in any group
  async findAvailable() {
    const groups = await this.groupRepo.find();

    // Collect all student IDs that are in groups
    const groupedIds = new Set<number>();
    for (const g of groups) {
      if (g.leadStudentId) groupedIds.add(g.leadStudentId);
      if (g.studentIds) g.studentIds.forEach(id => groupedIds.add(id));
    }

    const allStudents = await this.studentRepo.find({ relations: ['user'] });

    return allStudents
      .filter(s => !groupedIds.has(s.id))
      .map(s => ({
        id: s.id,
        regNo: s.regNo,
        name: s.user?.name || '',
        email: s.user?.email || '',
        department: s.department,
      }));
  }
}
