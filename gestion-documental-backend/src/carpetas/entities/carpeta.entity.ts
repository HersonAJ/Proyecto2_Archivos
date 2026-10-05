import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Usuario } from '../../usuarios/entities/usuario.entity';

export type CarpetaDocument = HydratedDocument<Carpeta>;

// "es" con strength 2 ignora mayúsculas/minúsculas: "Docs" y "docs" son iguales.
export const COLACION_ES = { locale: 'es', strength: 2 };

@Schema({ collection: 'carpetas', timestamps: true, versionKey: false })
export class Carpeta {
  @Prop({ required: true, trim: true, maxlength: 100 })
  nombre: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Usuario.name, required: true, })
  propietario: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Carpeta', default: null })
  carpetaPadre: Types.ObjectId | null;

  @Prop({ type: [MongooseSchema.Types.ObjectId], default: [] })
  ancestros: Types.ObjectId[];

  @Prop({ default: false })
  enPapelera: boolean;

  @Prop({ type: Date, default: null })
  fechaEliminacion: Date | null;

  // true = se envio a la papelera porque su carpeta superior fue eliminada
  @Prop({ default: false })
  eliminadaPorCascada: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const CarpetaSchema = SchemaFactory.createForClass(Carpeta);

CarpetaSchema.index(
  { propietario: 1, carpetaPadre: 1, nombre: 1 },
  {
    unique: true,
    partialFilterExpression: { enPapelera: false },
    collation: COLACION_ES,
  },
);

CarpetaSchema.index({ ancestros: 1 });