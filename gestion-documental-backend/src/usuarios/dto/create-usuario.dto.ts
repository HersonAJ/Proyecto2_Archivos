import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
    @IsString()
    @IsNotEmpty()
    nombre: string;

    @IsEmail()
    correo: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsOptional()
    @IsString()
    rol?: string;
}
