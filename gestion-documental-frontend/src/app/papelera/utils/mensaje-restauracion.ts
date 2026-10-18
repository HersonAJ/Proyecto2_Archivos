import { ResultadoRestauracion } from '../models/papelera.model';

export function mensajeRestauracion(resultado: ResultadoRestauracion): string {
  const nombre = resultado.elemento.nombre;
  const avisos: string[] = [];
  if (!resultado.enUbicacionOriginal) {
    avisos.push('su carpeta original ya no existe, así que está en Mis documentos');
  }
  if (resultado.nombreModificado) {
    avisos.push('ya había otro con el mismo nombre');
  }
  return avisos.length > 0
    ? `«${nombre}» restaurado: ${avisos.join(' y ')}`
    : `«${nombre}» restaurado`;
}