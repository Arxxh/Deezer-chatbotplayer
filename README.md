# Deezer API

Repositorio del chat musical con dos piezas principales:

- backend oficial en Python/FastAPI en [`python-backend/`](</Users/diegosilva12/deezer-api/python-backend/README.md:1>)
- frontend en Next.js en [`web/`](</Users/diegosilva12/deezer-api/web/README.md:1>)

## Estado Actual

La migración del backend a Python ya es la base oficial del proyecto. El backend
anterior fue retirado para no mantener dos implementaciones paralelas del mismo
contrato.

## Estructura

```text
deezer-api/
  python-backend/
  web/
  docs/
  var/data/app-state.json
```

## Backend

El backend Python conserva la API que ya consume el frontend:

- `GET /`
- `GET /health`
- `GET /api/v1/health`
- `POST /api/v1/chat/messages`
- `GET /api/v1/chat/state`
- `GET /api/v1/playlists`
- `GET /api/v1/playlists/{playlistId}`
- `POST /api/v1/playlists`
- `POST /api/v1/playlists/{playlistId}/tracks`
- `DELETE /api/v1/playlists/{playlistId}`

Y mantiene las funcionalidades que ya estaban en producción local:

- `/play`, `/pause`, `/resume`, `/skip`, `/queue`, `/nowplaying`, `/help`
- `/playlist list`, `create`, `show`, `add`, `delete` y reproducción
- reproducción de playlists completas con cola
- limpieza de cola al reproducir una canción suelta fuera de playlist
- parser slash y parser en lenguaje natural
- integración con Deezer
- resolución opcional a YouTube
- parsing opcional con Gemini
- persistencia en archivo JSON compartido

## Persistencia

El estado del sistema se guarda en:

```text
var/data/app-state.json
```

O en la ruta definida por:

```bash
APP_DATA_FILE=/ruta/personalizada/app-state.json
```

## Desarrollo

Backend:

```bash
make backend-install
make backend-dev
```

Frontend:

```bash
cd web
npm install
npm run dev
```

## Variables De Entorno

En el root puedes seguir usando `.env`:

```bash
PORT=4000
FRONTEND_URL=http://localhost:3000
APP_DATA_FILE=/ruta/personalizada/app-state.json
YOUTUBE_DATA_API_KEY=tu_api_key
GEMINI_API_KEY=tu_api_key
```

## Verificación

Backend Python:

```bash
make backend-test
```

## Makefile

Desde la raíz del repo:

```bash
make backend-install
make backend-dev
make backend-dev-lan
make backend-test
```

Frontend:

```bash
cd web
npm run lint
npm run build
```
