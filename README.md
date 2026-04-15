# Deezer Chat Backend

Backend en NestJS para un chat musical que interpreta comandos tipo Discord y consulta la API pública de Deezer.

# Arquitectura Limpia (Clean Architecture)
Este proyecto utiliza una arquitectura llamada Clean Arquitecture donde separamos application|domain|infraestructure|interfaces

En este punto el backend ya resuelve:

- chat por comandos como `/play`, `/pause`, `/resume`, `/skip`, `/queue`, `/nowplaying` y `/help`
- playlists persistentes con creación y agregado de canciones
- límite de `10` canciones por playlist
- persistencia no volátil en archivo JSON
- arquitectura limpia por capas: `domain`, `application`, `infrastructure`, `interfaces`

## Estado actual

Lo que ya existe:

- API HTTP con prefijo global `/api/v1`
- integración con Deezer para buscar canciones
- resolución opcional de playback completo en YouTube a partir de la pista elegida en Deezer
- cola de reproducción persistida
- canción actual y estado de pausa persistidos
- playlists persistidas en disco
- validación global con `ValidationPipe`
- headers de seguridad con `helmet`
- CORS configurable para el frontend

Lo que todavía no existe:

- frontend integrado
- reproducción real en el backend
- WebSockets en tiempo real
- salas o `roomId`
- base de datos relacional

La reproducción real vive en el frontend.

- sin `YOUTUBE_DATA_API_KEY`, el sistema sigue funcionando con búsqueda, cola y playlists
- con `YOUTUBE_DATA_API_KEY`, el backend también intenta resolver un `videoId` de YouTube para la canción elegida

## Stack

- Node.js
- NestJS
- Express
- TypeScript
- Deezer Public API
- YouTube Data API

## Arquitectura

El módulo principal del dominio actual es `chat`.

- `domain`: entidades puras como `Track`, `PlaybackState` y `Playlist`
- `application`: casos de uso, contratos y puertos
- `infrastructure`: adaptadores concretos para Deezer y persistencia en archivo
- `interfaces`: controladores HTTP y DTOs

La idea es que la lógica del sistema dependa de interfaces y no de detalles externos. Por eso los casos de uso dependen de puertos como:

- `MusicCatalogPort`
- `PlaybackSourceResolverPort`
- `PlaybackStatePort`
- `PlaylistRepositoryPort`

Y Nest conecta esos puertos con implementaciones reales dentro del módulo.

## Persistencia

El estado del sistema ya no es volátil.

Se guarda en:

```text
var/data/app-state.json
```

O en la ruta definida por la variable de entorno:

```bash
APP_DATA_FILE=/ruta/personalizada/app-state.json
```

Ahí se persisten:

- canción actual
- cola
- estado de pausa
- playlists

## Comandos de chat

Comandos soportados actualmente:

- `/play <búsqueda>`
- `/pause`
- `/resume`
- `/skip`
- `/queue`
- `/nowplaying`
- `/help`
- `/playlist list`
- `/playlist create <nombre>`
- `/playlist show <nombre>`
- `/playlist add <playlist> :: <canción>`

También hay soporte inicial para frases como:

- `pon stronger kanye west`
- `pausa`
- `qué suena`

## Endpoints

Base path:

```text
/api/v1
```

Rutas disponibles:

- `GET /api/v1/health`
- `POST /api/v1/chat/messages`
- `GET /api/v1/chat/state`
- `GET /api/v1/playlists`
- `GET /api/v1/playlists/:playlistId`
- `POST /api/v1/playlists`
- `POST /api/v1/playlists/:playlistId/tracks`

## Ejemplos

Enviar un mensaje al chat:

```bash
curl -X POST http://localhost:4000/api/v1/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"message":"/play stronger kanye west"}'
```

Crear una playlist:

```bash
curl -X POST http://localhost:4000/api/v1/playlists \
  -H "Content-Type: application/json" \
  -d '{"name":"favoritas"}'
```

Agregar una canción a una playlist:

```bash
curl -X POST http://localhost:4000/api/v1/playlists/<playlistId>/tracks \
  -H "Content-Type: application/json" \
  -d '{"query":"around the world daft punk"}'
```

## Variables de entorno

- `PORT`: puerto del backend. Default: `4000`
- `FRONTEND_URL`: origen permitido por CORS. Default: `http://localhost:3000`
- `APP_DATA_FILE`: ruta del archivo de persistencia
- `YOUTUBE_DATA_API_KEY`: clave para resolver playback completo en YouTube

## Desarrollo

Instalar dependencias:

```bash
npm install
```

Levantar el backend en desarrollo:

```bash
npm run start:dev
```

Verificar calidad:

```bash
npm run build
npm test -- --runInBand
npm run lint
```

## Regla funcional importante

Cada playlist tiene un límite máximo de `10` canciones.

Si una playlist ya alcanzó ese límite, el backend rechaza nuevas inserciones.
