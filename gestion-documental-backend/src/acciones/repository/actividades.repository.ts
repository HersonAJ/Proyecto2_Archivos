import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Actividad, ActividadDocument } from "../entities/actividad.entity";
import { DatosActividad, FiltroActividades } from "../interfaces/actividad.interface";

@Injectable()
export class ActividadesRepository {
    constructor(
        @InjectModel(Actividad.name)
        private readonly modelo: Model<ActividadDocument>,
    ) {}

    crear(datos: DatosActividad) {
        return this.modelo.create(datos);
    }

    async buscar(filtro: FiltroActividades, pagina: number, limite: number) {
        const consulta = this.modelo.find();

        if (filtro.usuario) consulta.where('usuario').equals(filtro.usuario);
        if (filtro.accion) consulta.where('accion').equals(filtro.accion);
        if (filtro.tipoRecurso) consulta.where('tipoRecurso').equals(filtro.tipoRecurso);
        if (filtro.recurso) consulta.where('recuros').equals(filtro.recurso);
        if (filtro.desde) consulta.where('fecha').gte(filtro.desde.getTime());
        if (filtro.hasta) consulta.where('fecha').lte(filtro.hasta.getTime());

        const [datos, total] = await Promise.all([
            consulta
            .clone()
            .sort({fecha: -1}) // el -1 es para ordenar descendente
            .skip((pagina - 1) * limite)
            .limit(limite)
            .exec(),
            this.modelo.countDocuments(consulta.getFilter()),
        ]);

        return { datos, total };
    }
}