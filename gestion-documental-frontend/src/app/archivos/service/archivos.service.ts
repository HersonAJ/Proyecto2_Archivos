import { Injectable } from "@angular/core";
import { HttpParams, HttpResponse } from "@angular/common/http";
import { map } from "rxjs/operators";
import { ApiService } from "../../core/service/api.service";
import { Archivo, ListarArchivosResponse, ListarArchivosParams, ActualizarArchivoDto } from "../models/archivo.model";

@Injectable({ providedIn: 'root' })
export class ArchivosService extends ApiService {

    listar(params: ListarArchivosParams) {
        let httpParams = new HttpParams();

        Object.keys(params).forEach(key => {
            const value = (params as any)[key];
            if (value !== undefined && value !== null && value !== '') {
                if (key === 'desde' || key === 'hasta') {
                    httpParams = httpParams.append(key, new Date(value).toISOString());
                } else {
                    httpParams = httpParams.append(key, value.toString());
                }
            }
        });
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
                let nombreArchivo = 'archivo_descargado';

                const contentDisposition = response.headers.get('content-disposition');
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
                    if (match && match[1]) {
                        nombreArchivo = decodeURIComponent(match[1]);
                    }
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
}