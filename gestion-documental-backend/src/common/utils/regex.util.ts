export const escaparRegex = (texto: string) =>
  texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');