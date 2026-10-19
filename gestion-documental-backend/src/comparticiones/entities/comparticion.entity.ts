import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongoseSchema, Types } from "mongoose";
import { NivelPermiso } from "../../common/enums/nivel-permiso.enum";
import { TipoRecurso } from "../../common/enums/tipo-recurso.enum";
import { Usuario } from "../../usuarios/entities/usuario.entity";

export type ComparticionDocument = HydratedDocument<Comparticion>;

@Schema({ collection: 'comparticiones', timestamps: true, versionKey: false })
export class Comparticion {

    @Prop({ required: true, enum: TipoRecurso })
    tipoRecurso: TipoRecurso;

    @Prop({ type: MongoseSchema.Types.ObjectId, required: true })
    recurso: Types.ObjectId;

    @Prop({ type: MongoseSchema.Types.ObjectId, ref: Usuario.name, required: true })
    propietario: Types.ObjectId;

    @Prop({ type: MongoseSchema.Types.ObjectId, ref: Usuario.name, required: true })
    destinatario: Types.ObjectId;

    @Prop({ required: true, enum: NivelPermiso })
    nivel: NivelPermiso;

    createdAt: Date;
    updatedAt: Date;
}

export const ComparticionSchema = SchemaFactory.createForClass(Comparticion);

ComparticionSchema.index({ recurso: 1, destinatario: 1 }, { unique: true });

ComparticionSchema.index({ destinatario: 1, createdAt: -1 });

ComparticionSchema.index({ propietario: 1, createdAt: -1 });