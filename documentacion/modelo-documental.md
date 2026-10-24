# Modelo Documental — Sistema de Gestión Documental

Este documento describe las decisiones de diseño del modelo de datos en MongoDB: qué colecciones existen, qué información se embebe, qué se referencia, y por qué. También incluye los índices y su justificación.

## Base de datos

- **Nombre:** `gestion_documental_db`
- **Motor:** MongoDB 7 (contenedor Docker `mongo:7`)
- **Driver:** Mongoose 9 (sobre Node.js 20+)
- **Autenticación:** usuario `admin` / contraseña `admin123` (solo para desarrollo; en producción iría en variables de entorno)

## Colecciones

El sistema tiene **6 colecciones principales** y **2 colecciones internas de GridFS**:

| Colección | Propósito |
|---|---|
| `usuarios` | Cuentas de usuario (admin y usuario normal) |
| `carpetas` | Jerarquía de carpetas por usuario |
| `archivos` | Metadata de los archivos (no el contenido) |
| `comparticiones` | Permisos otorgados de un recurso a un usuario |
| `comentarios` | Comentarios sobre archivos |
| `actividades` | Historial de operaciones (auditoría) |
| `contenidos.files` | GridFS: metadatos del contenido de cada archivo |
| `contenidos.chunks` | GridFS: trozos binarios del contenido |

## Decisión fundamental: embebido vs. referencia

En MongoDB, un dato relacionado puede **embeberse** (dentro del documento padre) o **referenciarse** (con un `ObjectId` que apunta a otro documento). La regla general:

- **Embeber** cuando los datos se leen juntos, cambian poco y no crecen sin límite.
- **Referenciar** cuando los datos se comparten entre documentos, cambian a menudo o pueden crecer.

En este proyecto:

| Relación | Decisión | Por qué |
|---|---|---|
| Usuario → sus archivos | **Referencia** (`archivos.propietario`) | Un archivo puede tener miles; no caben en el usuario. |
| Carpeta → sus archivos | **Referencia** (`archivos.carpeta`) | Un archivo pertenece a una carpeta; no se duplica. |
| Carpeta → sus subcarpetas | **Referencia** (`carpetas.carpetaPadre` + `carpetas.ancestros`) | Jerarquía arbitraria; embeber limitaría la profundidad y complicaría mover. |
| Archivo → su contenido | **Referencia** (`archivos.contenidoId` → GridFS) | El contenido binario es grande; GridFS lo parte en chunks. |
| Archivo → sus etiquetas | **Embebido** (`archivos.etiquetas: string[]`) | Pocas etiquetas por archivo, se leen con él. |
| Archivo → sus comentarios | **Referencia** (`comentarios.archivo`) | Un archivo puede tener muchos; no caben. |
| Recurso → sus comparticiones | **Referencia** (`comparticiones.recurso`) | Un recurso puede compartirse con N usuarios. |
| Actividad → detalles | **Embebido** (`actividades.detalles: object`) | Los detalles varían por acción y no se consultan por separado. |
| Usuario → su almacenamiento | **Embebido** (`usuarios.almacenamientoUsado: number`) | Un solo número; se actualiza con `$inc`. |

## Colecciones en detalle

### `usuarios`

```json
{
  "_id": ObjectId("..."),
  "nombre": "Ana López",
  "correo": "ana@correo.com",
  "password": "$2b$12$...",           // hash bcrypt, select:false
  "rol": "USUARIO",                    // "ADMIN" | "USUARIO"
  "activo": true,
  "almacenamientoUsado": 84367,        // bytes
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

**Decisiones:**
- `password` con `select: false` y `toJSON.transform` que lo borra: **nunca se devuelve al cliente**, ni siquiera por error.
- `correo` con `unique`, `lowercase`, `trim`: normalizado y único.
- `almacenamientoUsado` **embebido** y actualizado con `$inc` (atómico): evita race conditions al subir/editar/borrar archivos.
- `activo` en lugar de borrar: **la desactivación no pierde información histórica**.

**Índices:**
- `correo` (único, implícito por `unique: true`).
- (Opcional, no implementado) `{ activo: 1, nombre: 1 }` para el directorio de compartir.

### `carpetas`

```json
{
  "_id": ObjectId("..."),
  "nombre": "Contratos",
  "propietario": ObjectId("..."),       // ref: usuarios
  "carpetaPadre": ObjectId("...") | null,
  "ancestros": [ObjectId("..."), ...],  // cadena de padres desde la raíz
  "enPapelera": false,
  "fechaEliminacion": null,
  "eliminadaPorCascada": false,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

**Decisiones:**
- **`ancestros` desnormalizado**: guarda todos los padres en orden. Permite **resolver permisos y mover subárboles en O(1)** sin `$graphLookup`. Es la decisión clave del modelo.
- **`carpetaPadre` + `ancestros`**: redundancia controlada. `carpetaPadre` para mostrar el padre inmediato; `ancestros` para consultas jerárquicas.
- **`enPapelera` + `fechaEliminacion` + `eliminadaPorCascada`**: el borrado es lógico. `eliminadaPorCascada` distingue la "raíz" del lote (la que el usuario eliminó) de sus descendientes.
- **Índice único parcial** `{ propietario, carpetaPadre, nombre }` con `partialFilterExpression: { enPapelera: false }`: impide duplicados activos, pero permite el mismo nombre si está en papelera.

**Índices:**
- `{ propietario: 1, carpetaPadre: 1, nombre: 1 }` único parcial con collation `es` (strength 2, insensible a mayúsculas/acentos).
- `{ ancestros: 1 }` para `idsDescendientesActivas`, `idsSubarbol`, `enviarDescendientesAPapelera`, `restaurarDescendientes` y `AccesoService`.

### `archivos`

```json
{
  "_id": ObjectId("..."),
  "nombre": "informe-alfa.txt",
  "tipo": "txt",                       // "txt" | "md"
  "tamano": 1234,                      // bytes
  "propietario": ObjectId("..."),       // ref: usuarios
  "carpeta": ObjectId("...") | null,
  "contenidoId": ObjectId("..."),       // ref: contenidos.files (GridFS)
  "etiquetas": ["contrato", "2026"],    // embebido
  "enPapelera": false,
  "fechaEliminacion": null,
  "eliminadoPorCascada": false,
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

**Decisiones:**
- **El contenido NO se guarda en el documento**. Se guarda en **GridFS** (colecciones `contenidos.files` y `contenidos.chunks`). El documento solo tiene `contenidoId`.
- **`etiquetas` embebidas**: array de strings, máximo 10 por archivo. Se leen con el archivo. Índice `{ etiquetas: 1 }` para filtros y `distinct`.
- **`tipo` como enum `"txt" | "md"`**: coincide con la extensión y con el `Content-Type` al descargar.
- **Índice único parcial** `{ propietario, carpeta, nombre }` con `partialFilterExpression: { enPapelera: false }`: impide duplicados activos en la misma carpeta, pero permite el mismo nombre si está en papelera.

**Índices:**
- `{ propietario: 1, carpeta: 1, nombre: 1 }` único parcial con collation `es`.
- `{ propietario: 1, createdAt: -1 }` para búsquedas por rango de fechas.
- `{ etiquetas: 1 }` para `distinct` y filtros por etiqueta.

### `comparticiones`

```json
{
  "_id": ObjectId("..."),
  "tipoRecurso": "ARCHIVO",             // "ARCHIVO" | "CARPETA"
  "recurso": ObjectId("..."),           // ref: archivos o carpetas (según tipo)
  "propietario": ObjectId("..."),       // ref: usuarios (quien comparte)
  "destinatario": ObjectId("..."),      // ref: usuarios (quien recibe)
  "nivel": "LECTURA",                   // "LECTURA" | "COMENTAR" | "EDICION"
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

**Decisiones:**
- **`recurso` con `tipoRecurso`**: no hay dos colecciones separadas para comparticiones de archivos y de carpetas. Una sola colección con un discriminador. **Simplifica las consultas** ("¿qué se ha compartido conmigo?" en una sola query).
- **`nivel` con enum**: 3 niveles (`LECTURA`, `COMENTAR`, `EDICION`). El `PROPIETARIO` no se guarda aquí: se resuelve por `archivos.propietario` / `carpetas.propietario`.
- **Índice único** `{ recurso, destinatario }`: **impide compartir dos veces el mismo recurso con la misma persona**. El error 11000 se traduce a 409 Conflict.

**Índices:**
- `{ recurso: 1, destinatario: 1 }` único.
- `{ destinatario: 1, createdAt: -1 }` para "recursos compartidos conmigo".
- `{ propietario: 1, createdAt: -1 }` para "recursos que he compartido".

### `comentarios`

```json
{
  "_id": ObjectId("..."),
  "archivo": ObjectId("..."),           // ref: archivos
  "autor": ObjectId("..."),             // ref: usuarios
  "texto": "Revisado, todo en orden.",
  "createdAt": ISODate("..."),
  "updatedAt": ISODate("...")
}
```

**Decisiones:**
- **`texto` embebido**: el comentario en sí es el dato principal.
- **`autor` referenciado**: el usuario puede cambiar de nombre, pero el comentario debe seguir siendo del mismo `_id`.

**Índices:**
- `{ archivo: 1, createdAt: 1 }` para listar comentarios de un archivo en orden cronológico.

### `actividades`

```json
{
  "_id": ObjectId("..."),
  "usuario": ObjectId("..."),           // ref: usuarios (quien hizo la acción)
  "propietarioRecurso": ObjectId("..."),// ref: usuarios (dueño del recurso afectado)
  "accion": "SUBIR",                    // enum: CREAR, SUBIR, DESCARGAR, EDITAR, ...
  "tipoRecurso": "ARCHIVO",             // enum
  "recurso": ObjectId("..."),           // ref: archivos o carpetas
  "nombreRecurso": "informe.txt",
  "detalles": { "tamano": 1234 },       // embebido, variable por acción
  "fecha": ISODate("...")
}
```

**Decisiones:**
- **`detalles` embebido**: cada acción tiene un `detalles` distinto (`tamano`, `anterior`, `nuevo`, `destinatario`, `nivel`...). Embeberlo permite guardar información específica sin crear un campo por acción. **Se formatea en el frontend según la acción.**
- **`propietarioRecurso`**: separa "quién hizo la acción" (`usuario`) de "a quién le afecta" (`propietarioRecurso`). Permite que el dueño vea la actividad **sobre sus recursos**, aunque la haya hecho otro.
- **`timestamps: { createdAt: 'fecha', updatedAt: false }`**: las actividades **no se editan nunca**, así que no hay `updatedAt`. Y la fecha se llama `fecha` (más natural que `createdAt`).
- **`nombreRecurso` desnormalizado**: guarda el nombre del recurso en el momento de la acción. Si el recurso se renombra o elimina, la actividad conserva el nombre histórico.

**Índices:**
- `{ usuario: 1, fecha: -1 }` para "historial de un usuario".
- `{ recurso: 1, fecha: -1 }` para "historial de un recurso".
- `{ fecha: -1 }` para "historial global".
- `{ propietarioRecurso: 1, fecha: -1 }` para "actividad sobre mis recursos".

### GridFS: `contenidos.files` y `contenidos.chunks`

No se declaran en Mongoose: **GridFS las crea automáticamente** al usar `GridFSBucket`.

**`contenidos.files`** (1 documento por archivo subido):
```json
{
  "_id": ObjectId("..."),               // = contenidoId en archivos
  "length": 1234,                        // tamaño en bytes
  "chunkSize": 261120,                   // 255 KB (default de Mongo)
  "uploadDate": ISODate("..."),
  "filename": "informe-alfa.txt"
}
```

**`contenidos.chunks`** (N documentos por archivo, uno por trozo):
```json
{
  "_id": ObjectId("..."),
  "files_id": ObjectId("..."),           // ref: contenidos.files
  "n": 0,                                // índice del chunk (0, 1, 2, ...)
  "data": BinData(0, "...")              // 255 KB binarios
}
```

**Por qué GridFS:**
- **Límite de 16 MB por documento**. Los archivos del proyecto son pequeños, pero un `.md` con imágenes podría superarlo. GridFS parte el contenido en chunks de 255 KB.
- **Streaming**: se puede descargar el archivo por trozos sin cargarlo entero en memoria.
- **El enunciado lo pide explícitamente**: "utilizar funcionalidades proporcionadas por MongoDB para este propósito".
- **Atomicidad**: `contenidos.files` y `contenidos.chunks` se gestionan como una unidad. Si el archivo se borra, se borran ambos.

## Índices: resumen y justificación

| Colección | Índice | Tipo | Por qué |
|---|---|---|---|
| `usuarios` | `correo` | Único | Evitar correos duplicados. |
| `carpetas` | `{ propietario, carpetaPadre, nombre }` | Único parcial + collation | Evitar carpetas duplicadas activas, insensible a mayúsculas/acentos. |
| `carpetas` | `{ ancestros: 1 }` | Simple | Acelerar consultas jerárquicas (descendientes, permisos). |
| `archivos` | `{ propietario, carpeta, nombre }` | Único parcial + collation | Evitar archivos duplicados activos en la misma carpeta. |
| `archivos` | `{ propietario, createdAt: -1 }` | Compuesto | Reportes de rango de fechas. |
| `archivos` | `{ etiquetas: 1 }` | Simple | Filtros y `distinct` de etiquetas. |
| `comparticiones` | `{ recurso, destinatario }` | Único | Evitar compartir dos veces el mismo recurso con la misma persona. |
| `comparticiones` | `{ destinatario, createdAt: -1 }` | Compuesto | "Recursos compartidos conmigo". |
| `comparticiones` | `{ propietario, createdAt: -1 }` | Compuesto | "Recursos que he compartido". |
| `comentarios` | `{ archivo, createdAt: 1 }` | Compuesto | Listar comentarios de un archivo en orden cronológico. |
| `actividades` | `{ usuario, fecha: -1 }` | Compuesto | Historial de un usuario. |
| `actividades` | `{ recurso, fecha: -1 }` | Compuesto | Historial de un recurso. |
| `actividades` | `{ fecha: -1 }` | Simple | Historial global. |
| `actividades` | `{ propietarioRecurso, fecha: -1 }` | Compuesto | Actividad sobre los recursos de un usuario. |

**Collation `es` (strength 2):** en los índices únicos de `carpetas` y `archivos`. Hace que `"Docs"` y `"docs"` colisionen, que es lo que un usuario espera (no puede haber dos carpetas con el mismo nombre "ignorando mayúsculas" en la misma ubicación).

**`partialFilterExpression: { enPapelera: false }`:** los índices únicos **solo se aplican a documentos activos**. Esto permite tener dos archivos con el mismo nombre si uno está en papelera. **Sin esto, no podrías subir un `informe.txt` nuevo mientras el viejo está en papelera.**

## Operaciones destacadas

### Mover carpeta con descendientes (update pipeline)

**Ubicación:** `CarpetasRepository.moverConDescendientes`.

```ts
await this.modelo.updateMany(
  { $or: [{ _id: carpeta }, { ancestros: carpeta }] },
  [
    { $set: {
        ancestros: {
          $concatArrays: [
            nuevosAncestros,
            { $cond: [
                { $eq: ['$_id', carpeta] },
                [],
                { $concatArrays: [
                    [carpeta],
                    { $slice: ['$ancestros', { $add: [{ $indexOfArray: ['$ancestros', carpeta] }, 1] }, 100000] },
                ] },
            ] },
          ],
        },
        carpetaPadre: { $cond: [{ $eq: ['$_id', carpeta] }, nuevoPadreId, '$carpetaPadre'] },
        updatedAt: { $cond: [{ $eq: ['$_id', carpeta] }, '$$NOW', '$updatedAt'] },
    } },
  ],
  { timestamps: false, updatePipeline: true },
);
```

**Qué hace:** en **una sola operación**, reescribe los `ancestros` de la carpeta movida **y de todos sus descendientes**. Sin esto, mover una carpeta con 100 subcarpetas requeriría 101 updates.

**Por qué `timestamps: false`:** el pipeline controla `updatedAt` manualmente (`$$NOW` solo para la carpeta movida, no para los descendientes).

### Ajustar almacenamiento (operación atómica)

**Ubicación:** `UsuariosRepository.ajustarAlmacenamiento`.

```ts
return this.modelo.findByIdAndUpdate(id, { $inc: { almacenamientoUsado: delta } }).exec();
```

**Qué hace:** incrementa (o decrementa) `almacenamientoUsado` en `delta` bytes. **Es atómico** a nivel de documento: dos peticiones concurrentes no se pisan. **Si se hiciera con `find` + `save`, habría race condition.**

### Filtrar por rango de fechas

**Ubicación:** `ArchivosRepository.buscar` y `ActividadesRepository.buscar`.

```ts
if (filtro.desde) consulta.where('createdAt').gte(filtro.desde.getTime());
if (filtro.hasta) consulta.where('createdAt').lte(filtro.hasta.getTime());
```

**Qué hace:** filtra por rango de fechas. `$gte` y `$lte` son inclusivos. **Si usáramos `$gt`/`$lt`, el día "hasta" no incluiría las 23:59:59.**

## Consultas de agregación (reportes)

Los reportes usan `$match`, `$group`, `$sort`, `$limit`, `$lookup`, `$unwind`, `$project`, `$facet`, `$count`, `$size`, `$ne`. Todos están documentados en el archivo `docs/reportes.md` (o en el código de `ReportesRepository`).

**Patrón general:**
1. `$match` para filtrar (usa índices).
2. `$group` para agrupar y contar (`$sum: 1`).
3. `$sort` + `$limit` para el "top N".
4. `$lookup` con `pipeline` para enriquecer (filtrar y proyectar solo lo necesario).
5. `$unwind` para convertir el array de 1 elemento del `$lookup` en objeto (y descartar los que no encontraron recurso).

## Justificación de las decisiones clave (para la defensa)

**1. ¿Por qué `ancestros` desnormalizado en lugar de `$graphLookup`?**
> Porque la jerarquía es poco profunda (3-4 niveles), los movimientos son raros y las consultas de permisos son frecuentes. Con `ancestros`, resolver permisos es una sola query con `$in`. Con `$graphLookup`, cada consulta de permisos sería recursiva y más lenta. La desnormalización se paga en el `update` de mover (que es raro) y se ahorra en cada `GET`.

**2. ¿Por qué el contenido en GridFS y no embebido?**
> Por el límite de 16 MB por documento, por streaming y porque el enunciado lo pide. GridFS parte el contenido en chunks de 255 KB y permite descargarlo por trozos.

**3. ¿Por qué `comparticiones` en una sola colección con `tipoRecurso`?**
> Porque las consultas "¿qué se ha compartido conmigo?" son las más frecuentes, y con una sola colección son una sola query. Con dos colecciones (una para archivos, otra para carpetas), habría que hacer dos queries y unirlas en memoria.

**4. ¿Por qué el índice único es parcial (`enPapelera: false`)?**
> Para permitir tener dos archivos con el mismo nombre si uno está en papelera. Sin el parcial, al eliminar un archivo y querer subir otro con el mismo nombre, fallaría.

**5. ¿Por qué `almacenamientoUsado` con `$inc` y no con `save`?**
> Porque `$inc` es atómico. Con `find` + `save`, dos subidas concurrentes podrían leer el mismo valor, sumar y guardar, perdiendo una de las sumas.

**6. ¿Por qué `actividades` no tiene `updatedAt`?**
> Porque las actividades son inmutables: se registran una vez y no se editan. El `timestamps` personalizado (`createdAt: 'fecha', updatedAt: false`) refleja eso.

## Resumen

- **6 colecciones principales** + **2 de GridFS**.
- **Embebido:** etiquetas, `detalles` de actividad, `almacenamientoUsado`, `ancestros`.
- **Referenciado:** propietario, carpeta, contenido, comparticiones, comentarios, actividad.
- **14 índices** (5 únicos, 3 con collation `es`, 2 parciales).
- **Operaciones destacadas:** mover con pipeline, ajustar almacenamiento con `$inc`, filtrar por rango de fechas, agregaciones para reportes.
