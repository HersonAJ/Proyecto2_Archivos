import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AutenticacionService } from "./autenticacion.service";
import { LoginDto } from "./dto/login.dto";

@Controller('auth')
export class AuntenticacionController {
    constructor(private readonly autenticacionSerice: AutenticacionService) {}

     @Post('login')
     @HttpCode(200)
     login(@Body() dto: LoginDto) {
        return this.autenticacionSerice.login(dto);
     }
}