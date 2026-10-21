import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";
import { Usuario } from "../../usuarios/entities/usuario.entity";

export type ComentarioDocument = HydratedDocument<Comentario>;

@Schema({ collection: 'comentarios', timestamps: true, versionKey: false })
export class Comentario {

    @Prop({ type: MongooseSchema.Types.ObjectId, required: true })
    archivo: Types.ObjectId;

    @Prop({ type: MongooseSchema.Types.ObjectId, ref: Usuario.name, required: true })
    autor: Types.ObjectId;

    @Prop({ required: true, trim: true, maxLength: 1000 })
    texto: string;

    createdAt: Date;
    updatedAt: Date;
}

export const ComentarioSchema = SchemaFactory.createForClass(Comentario);

ComentarioSchema.index({ archivo: 1, createdAt: 1 });