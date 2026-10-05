import { Pipe, PipeTransform } from '@angular/core';

// Convierte bytes en un texto legible: 1536 -> "1.50 KB"
@Pipe({ name: 'tamano' })
export class TamanoPipe implements PipeTransform {
  transform(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) return '';
    if (bytes < 1024) return `${bytes} B`;

    const unidades = ['KB', 'MB', 'GB'];
    let valor = bytes / 1024;
    let i = 0;
    while (valor >= 1024 && i < unidades.length - 1) {
      valor /= 1024;
      i++;
    }
    return `${valor.toFixed(valor < 10 ? 2 : 1)} ${unidades[i]}`;
  }
}