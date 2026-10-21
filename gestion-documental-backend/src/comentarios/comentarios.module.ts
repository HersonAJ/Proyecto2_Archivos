import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AccesoModule } from "../acceso/acceso.module";
import { ActividadesModule } from "../acciones/actividades.module";
import { ComentariosController } from "./comentarios.controller";
import { ComentariosService } from "./comentarios.service";
import { Comentario, ComentarioSchema } from "./entities/comentario.entity";
import { ComentariosRepository } from "./repository/comentarios.repository";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Comentario.name, schema: ComentarioSchema }]),
        AccesoModule,
        ActividadesModule,
    ],
    controllers: [ComentariosController],
    providers: [ComentariosService, ComentariosRepository],
    exports: [ComentariosRepository],
})
export class ComentariosModule {}