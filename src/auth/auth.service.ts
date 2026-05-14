import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { StudentsService } from '../students/students.service';
import { SupervisorService } from '../supervisor/supervisor.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly studentsService: StudentsService,
    private readonly supervisorService: SupervisorService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.signIn(user);
  }

  async signup(data: {
    name: string;
    email: string;
    password: string;
    role: string;
    // Student fields
    regNo?: string;
    fatherName?: string;
    department?: string;
    // Supervisor fields
    designation?: string;
    expertise?: string[];
  }) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 1. Create the shared user row
    const user = await this.usersService.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
    });

    // 2. Create role-specific row
    try {
      if (data.role === 'student') {
        await this.studentsService.create({
          userId: user.id,
          regNo: data.regNo || '',
          fatherName: data.fatherName || '',
          department: data.department || '',
        });
      } else if (data.role === 'supervisor') {
        await this.supervisorService.create({
          userId: user.id,
          designation: data.designation || '',
          expertise: data.expertise || [],
        });
      }
    } catch (err) {
      // Rollback: delete the user record we just created to avoid orphans
      await this.usersService.deleteById(user.id).catch(() => {});

      // PostgreSQL unique violation code
      if (err?.code === '23505') {
        const detail: string = err?.detail || '';
        if (detail.includes('reg_no')) {
          throw new ConflictException(`Registration number "${data.regNo}" is already registered.`);
        }
        if (detail.includes('email')) {
          throw new ConflictException('Email already registered.');
        }
        throw new ConflictException('A unique constraint was violated: ' + detail);
      }
      throw err;
    }

    return {
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async signIn(user: any) {
    let studentId: number | null = null;
    let supervisorId: number | null = null;
    let regNo: string | null = null;

    if (user.role === 'student') {
      const student = await this.studentsService.findByUserId(user.id);
      studentId = student?.id || null;
      regNo = student?.regNo || null;
    } else if (user.role === 'supervisor') {
      const supervisor = await this.supervisorService.findByUserId(user.id);
      supervisorId = supervisor?.id || null;
    }

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      studentId,
      supervisorId,
      regNo,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      accesstoken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId,
        supervisorId,
        regNo,
      },
      message: 'Login successful',
    };
  }
}
