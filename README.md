# Proyecto2_Archivos
proyecto No.2 del curso de archivos SS 2026

carga de archivos iniciales
## Carga inicial de datos (seed)

El proyecto incluye un script de siembra que crea usuarios, carpetas, archivos
(con contenido en GridFS), comparticiones, comentarios, actividad y papelera,
todo con fechas repartidas en los últimos 60 días.

> Ejecuta el seed **con la aplicación detenida** y **antes** de `npm run start:dev`.
> El seed abre su propio contexto Nest, siembra y se cierra solo.

### Primera vez (base de datos vacía)

```bash
npm run seed
npm run start:dev
```

Si la base de datos ya tiene datos, `seed` aborta con:

```
La base de datos ya contiene datos. Para borrarlos y sembrar de nuevo ejecuta: npm run seed:reset
```

### Reiniciar los datos (borra todo y vuelve a sembrar)

```bash
npm run seed:reset
npm run start:dev
```

`seed:reset` equivale a `SEED_FORZAR=true npm run seed`: elimina usuarios,
carpetas, archivos, comparticiones, comentarios y actividades, y también los
contenidos de GridFS (`contenidos.files` y `contenidos.chunks`) antes de sembrar.

### Resumen de comandos

| Comando               | Qué hace                                                    | Cuándo usarlo                     |
| --------------------- | ----------------------------------------------------------- | --------------------------------- |
| `npm run seed`        | Siembra **solo si la BD está vacía**. Si no, aborta.        | Primera carga                     |
| `npm run seed:reset`  | Borra **todo** (incluido GridFS) y siembra de cero.         | Quieres datos limpios             |
| `npm run start:dev`   | Arranca la app en modo desarrollo.                          | Siempre, después del seed         |

**No ejecutes `seed` y `seed:reset` seguidos**: son alternativas, no pasos.

### Credenciales de prueba

| Correo             | Contraseña   | Rol     | Notas              |
| ------------------ | ------------ | ------- | ------------------ |
| admin@correo.com   | admin123     | ADMIN   | Solo administra    |
| ana@correo.com     | secreto123   | USUARIO |                    |
| luis@correo.com    | secreto123   | USUARIO |                    |
| marta@correo.com   | secreto123   | USUARIO |                    |
| carlos@correo.com  | secreto123   | USUARIO |                    |
| sofia@correo.com   | secreto123   | USUARIO |                    |
| pedro@correo.com   | secreto123   | USUARIO | Queda **inactivo** |
