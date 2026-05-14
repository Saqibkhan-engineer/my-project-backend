import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  regNo: string; 

  @IsString()
  @MinLength(6)
  password: string;
}
