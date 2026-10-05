export const recortarTexto = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value;