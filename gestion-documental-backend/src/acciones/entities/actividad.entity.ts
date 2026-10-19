import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";
import { AccionActividad } from "../../common/enums/accion-actividad.enum";
import { TipoRecurso } from "../../common/enums/tipo-recurso.enum";
import { Usuario } from "../../usuarios/entities/usuario.entity";

export type ActividadDocument = HydratedDocument<Actividad>;

@Schema({
    collection: 'actividades',
    timestamps: { createdAt: 'fecha', updatedAt: false },
    versionKey: false,
})
export class Actividad {
    @Prop({
        type: MongooseSchema.Types.ObjectId,
        ref: Usuario.name,
        required: true,
    })
    usuario: Types.ObjectId;

    @Prop({ required: true, enum: AccionActividad })
    accion: AccionActividad;

    @Prop({ required: true, enum: TipoRecurso })
    tipoRecurso: TipoRecurso;

    @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
    recurso: Types.ObjectId;

    @Prop({ required: true, trim: true })
    nombreRecurso: string;

    @Prop({ type: Object, default: {} })
    detalles: Record<string, unknown>;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Usuario.name })
    propietarioRecurso: Types.ObjectId;


    fecha: Date;
}

export const ActividadSchema = SchemaFactory.createForClass(Actividad);

ActividadSchema.index({ usuario: 1, fecha: -1 });
ActividadSchema.index({ recurso: 1, fecha: -1 });
ActividadSchema.index({ fecha: -1 });
ActividadSchema.index({ propietarioRecurso: 1, fecha: -1 });