import { extname } from "node:path";

interface OpcionesNombre {
    conExtension: boolean;
    maximo: number;
    etiqueta: 'restaurado' | 'restaurada';
}

export function nombreAlternativo(
    nombre: string,
    intento: number,
    { conExtension, maximo, etiqueta }: OpcionesNombre,
): string {
    const extension = conExtension ? extname(nombre) : '';
    const base = extension ? nombre.slice(0, -extension.length) : nombre;
    const sufijo = intento === 1 ? ` (${etiqueta})` : ` (${etiqueta} ${intento})`;

    const baseCorta = base.slice(0, Math.max(1, maximo - sufijo.length - extension.length));
    return `${baseCorta}${sufijo}${extension}`;
}