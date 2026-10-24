import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistroDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre: string;

  @IsEmail()
  correo: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password: string;

  @IsString()
  confirmarPassword: string;
}