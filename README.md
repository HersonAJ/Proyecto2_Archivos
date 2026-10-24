# Proyecto2_Archivos
proyecto No.2 del curso de archivos SS 2026

Sistema de gestión documental con backend NestJS + MongoDB y frontend Angular.

## Requisitos

- Node.js 20+ 
- Docker y Docker Compose
- Angular CLI (`npm install -g @angular/cli`)

## Arranque

### 1. Levantar MongoDB

Desde la raíz del repo:

```bash
docker compose up -d
```

El contenedor usa el puerto **27018** en tu PC (para no chocar con un MongoDB global en 27017). mongo-express queda en `http://localhost:8081`.

Verifica que está corriendo:

```bash
docker compose ps
```

### 2. Backend

```bash
cd gestion-documental-backend
npm install
cp .env.example .env    
npm run seed            # siembra la BD (solo si está vacía)
npm run start:dev       # API en http://localhost:3000/api
```

> El `.env` ya apunta a `localhost:27018`. El seed necesita el backend **detenido** (abre su propio contexto Nest, siembra y se cierra).

### 3. Frontend (otra terminal)

```bash
cd gestion-documental-frontend
npm install
ng serve                # app en http://localhost:4200
```

### 4. Entrar

| Correo | Contraseña | Rol |
|---|---|---|
| admin@correo.com | admin123 | ADMIN |
| ana@correo.com | secreto123 | USUARIO |

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

## Comandos útiles

- **Detener MongoDB:** `docker compose down`
- **Borrar también los datos:** `docker compose down -v`
- **Ver logs de Mongo:** `docker compose logs -f mongodb`
- **mongosh:** `docker exec -it gestion-documental-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin gestion_documental_db`
- **mongo-express:** `http://localhost:8081` (admin/admin123)

## Notas

- El contenido de los archivos se guarda en **GridFS** (colecciones `contenidos.files` y `contenidos.chunks`). El documento de `archivos` solo guarda una referencia (`contenidoId`).
- Los archivos eliminados van a la **papelera** y no se borran hasta que se eliminan definitivamente o se vacía la papelera.
- Si tienes MongoDB global en el puerto 27017, **no hay conflicto**: el Docker usa 27018 en el host.
