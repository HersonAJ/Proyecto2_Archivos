import { FormControl, FormGroup } from '@angular/forms';
import { ListarArchivosParams, TipoArchivo } from './archivo.model';

export type FormularioFiltros = FormGroup<{
  q: FormControl<string>;
  tipo: FormControl<TipoArchivo | ''>;
  etiqueta: FormControl<string>;
  desde: FormControl<Date | null>;
  hasta: FormControl<Date | null>;
}>;

export type ValoresFiltros = ReturnType<FormularioFiltros['getRawValue']>;

export function crearFormularioFiltros(): FormularioFiltros {
  return new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    tipo: new FormControl<TipoArchivo | ''>('', { nonNullable: true }),
    etiqueta: new FormControl('', { nonNullable: true }),
    desde: new FormControl<Date | null>(null),
    hasta: new FormControl<Date | null>(null),
  });
}

export function hayFiltrosActivos(v: ValoresFiltros): boolean {
  return Boolean(v.q.trim() || v.tipo || v.etiqueta || v.desde || v.hasta);
}

export function aParametros(
  v: ValoresFiltros,
): Pick<ListarArchivosParams, 'q' | 'tipo' | 'etiqueta' | 'desde' | 'hasta'> {
  const desde = v.desde ? new Date(v.desde) : null;
  desde?.setHours(0, 0, 0, 0);
  const hasta = v.hasta ? new Date(v.hasta) : null;
  hasta?.setHours(23, 59, 59, 999);
  return {
    q: v.q.trim() || undefined,
    tipo: v.tipo || undefined,
    etiqueta: v.etiqueta || undefined,
    desde: desde?.toISOString(),
    hasta: hasta?.toISOString(),
  };
}