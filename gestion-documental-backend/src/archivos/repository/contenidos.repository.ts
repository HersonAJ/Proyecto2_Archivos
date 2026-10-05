import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, mongo } from "mongoose";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

//mongo los guarda como dos elementos  contenido.files y econtenido.chunks en trozos
@Injectable()
export class ContenidosRepository {
    private readonly bucket: mongo.GridFSBucket;

    constructor(@InjectConnection() conexion: Connection) {
        if (!conexion.db) {
            throw new Error ('La conexion a MongoDB no esta lista');
        }

        this.bucket = new mongo.GridFSBucket(conexion.db, { bucketName: 'contenidos'});
    }

    //guarda el contenido y devuelve su id
    async guardar(contenido: Buffer, nombre: string): Promise<string> {
        const subida = this.bucket.openUploadStream(nombre);
        await pipeline(Readable.from(contenido), subida);
        return subida.id.toString();
    }

    abrirLectura(id: string) {
        return this.bucket.openDownloadStream(new mongo.ObjectId(id));
    }

    async eliminar(id: string): Promise<void> {
        await this.bucket.delete(new mongo.ObjectId(id));
    }
}