import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { DateSchemaDefinition, HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";
import { COLACION_ES } from "../../common/constants/colacion.constante";
import { TipoArchivo } from "../../common/enums/tipo-archivo.enum";
import { Usuario } from "../../usuarios/entities/usuario.entity";

export type ArchivoDocument = HydratedDocument<Archivo>;

@Schema({ collection: 'archivos', timestamps: true, versionKey: false })
export class Archivo {
    @Prop({ required: true, trim: true, maxLength: 255})
    nombre: string;

    @Prop({ required: true, enum: TipoArchivo })
    tipo: TipoArchivo;

    @Prop({ required: true, min: 0})
    tamano: number;

    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: Usuario.name,
        required: true,
    })
    propietario: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Carpeta', default: null})
    carpeta: Types.ObjectId | null;

    @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
    contenidoId: Types.ObjectId;

    @Prop({ type: [String], default: []})
    etiquetas: string[];

    @Prop({ default: false })
    enPapelera: boolean;

    @Prop({ type: Date, default: null })
    fechaEliminacion: Date | null;

    @Prop({ default: false })
    eliminadoPorCascada: boolean;

    createAt: Date;
    updateAt: Date;
}

export const ArchivoSchema = SchemaFactory.createForClass(Archivo);

ArchivoSchema.index(
    { propietario: 1, carpeta: 1, nombre: 1},
    {
        unique: true,
        partialFilterExpression: { enPapelera: false },
        collation: COLACION_ES,
    },
);

//indice para cunsulta por rango de fechas 
ArchivoSchema.index({ propietario: 1, createAt: -1});

ArchivoSchema.index({ etiquetas: 1});