import { Module } from "@nestjs/common";
import { MongooseModule, Schema } from "@nestjs/mongoose";
import { ActividadesModule } from "../acciones/actividades.module";
import { CarpetasController } from "./carpetas.controller";
import { CarpetaService } from "./carpeta.service";
import { Carpeta, CarpetaSchema } from "./entities/carpeta.entity";
import { CarpetasRepository } from "./repository/carpetas.repository";

@Module({
    imports: [MongooseModule.forFeature([{ name: Carpeta.name, schema: CarpetaSchema }]),
        ActividadesModule,
    ],
    controllers: [CarpetasController],
    providers: [CarpetaService, CarpetasRepository],
    exports: [CarpetaService, CarpetasRepository],
})

export class CarpetasModule { }