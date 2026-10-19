import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Archivo, ArchivoSchema } from "../archivos/entities/archivo.entity";
import { Carpeta, CarpetaSchema } from "../carpetas/entities/carpeta.entity";
import { Comparticion, ComparticionSchema } from "../comparticiones/entities/comparticion.entity";
import { AccesoService } from "./acceso.service";
import { AccesoRepository } from "./repository/acceso.repository";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Carpeta.name, schema: CarpetaSchema},
            { name: Archivo.name, schema: ArchivoSchema},
            { name: Comparticion.name, schema: ComparticionSchema},
        ]),
    ],
    providers: [AccesoRepository, AccesoService],
    exports: [AccesoService]
})
export class AccesoModule {}