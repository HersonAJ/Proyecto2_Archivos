import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AutenticacionService } from './autenticacion.service';
import { LoginDto } from './dto/login.dto';
import { Publico } from './decorators/publico.decorator';
import { RegistroDto } from './dto/registro.dto';

@Controller('auth')
export class AutenticacionController {
  constructor(private readonly autenticacionService: AutenticacionService) {}

  @Publico()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.autenticacionService.login(dto);
  }

  @Publico()
  @Post('registro')
  @HttpCode(201)
  registro(@Body() dto: RegistroDto) {
    return this.autenticacionService.registro(dto);
  }
}