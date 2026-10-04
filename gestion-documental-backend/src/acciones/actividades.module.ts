import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ActividadesController } from "./actividades.controller";
import { ActividadesService } from "./actividades.service";
import { Actividad, ActividadSchema } from "./entities/actividad.entity";
import { ActividadesRepository } from "./repository/actividades.repository";

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Actividad.name, schema: ActividadSchema }]),
    ],
    controllers: [ActividadesController],
    providers: [ActividadesService, ActividadesRepository],
    exports: [ActividadesService],
})
export class ActividadesModule {}