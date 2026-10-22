import { Injectable } from "@angular/core";
import { HttpParams, HttpResponse } from "@angular/common/http";
import { map } from "rxjs/operators";
import { ApiService } from "../../core/service/api.service";
import { Archivo, ListarArchivosResponse, ListarArchivosParams, ActualizarArchivoDto } from "../models/archivo.model";

@Injectable({ providedIn: 'root' })
export class ArchivosService extends ApiService {

    listar(params: ListarArchivosParams) {
        let httpParams = new HttpParams();

        for (const [clave, valor] of Object.entries(params)) {
            if (valor === undefined || valor === null || valor === '') continue;
            const esFecha = clave === 'desde' || clave === 'hasta';
            httpParams = httpParams.set(
                clave,
                esFecha ? new Date(valor as string).toISOString() : String(valor),
            );
        }
        return this.http.get<ListarArchivosResponse>(`${this.baseUrl}/archivos`, { params: httpParams });
    }

    obtener(id: string) {
        return this.http.get<Archivo>(`${this.baseUrl}/archivos/${id}`);
    }

    obtenerContenido(id: string, descargar: boolean = false) {
        const params = new HttpParams().set('descargar', descargar.toString());

        return this.http.get(`${this.baseUrl}/archivos/${id}/contenido`, {
            params,
            responseType: 'blob',
            observe: 'response'
        }).pipe(
            map((response: HttpResponse<Blob>) => {
                const blob = response.body as Blob;
                let nombreArchivo: string | null = null;

                const contentDisposition = response.headers.get('content-disposition');
                const match = contentDisposition?.match(/filename\*=UTF-8''(.+)/);
                if (match?.[1]) {
                    nombreArchivo = decodeURIComponent(match[1]);
                }
                return { blob, nombreArchivo };
            })
        );
    }

    subir(archivo: File, carpeta?: string, etiquetas?: string) {
        const formData = new FormData();
        formData.append('archivo', archivo, archivo.name);

        if (carpeta) {
            formData.append('carpeta', carpeta);
        }
        if (etiquetas) {
            formData.append('etiquetas', etiquetas);
        }

        return this.http.post<Archivo>(`${this.baseUrl}/archivos`, formData);
    }

    actualizar(id: string, datos: ActualizarArchivoDto) {
        return this.http.patch<Archivo>(`${this.baseUrl}/archivos/${id}`, datos);
    }

    mover(id: string, carpeta: string | null) {
        return this.http.patch<Archivo>(`${this.baseUrl}/archivos/${id}/mover`, { carpeta });
    }

    editarContenido(id: string, texto: string, version: string) {
        const formData = new FormData();
        formData.append('archivo', new Blob([texto], { type: 'text/plain' }), 'contenido.txt');
        formData.append('version', version);
        return this.http.put<Archivo>(`${this.baseUrl}/archivos/${id}/contenido`, formData);
    }

    etiquetas(carpeta?: string) {
        const params: Record<string, string> = carpeta ? { carpeta } : {};
        return this.http.get<string[]>(`${this.baseUrl}/archivos/etiquetas`, { params });
    }
}