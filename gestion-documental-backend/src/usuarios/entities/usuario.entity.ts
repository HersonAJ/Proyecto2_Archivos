import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type UsuarioDocument = HydratedDocument<Usuario>;

@Schema({ timestamps: true,})
export class Usuario {
    @Prop({ required: true, trim: true,})
    nombre: string;

    @Prop({ required: true, unique: true, lowercase: true, trim: true,})
    correo: string;

    @Prop({required: true,})
    password: string;

    @Prop({required: true, enum: ['ADMIN', 'USUARIO'], default: 'USUARIO',})
    rol: string;

    @Prop({default: true})
    activo: boolean;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
