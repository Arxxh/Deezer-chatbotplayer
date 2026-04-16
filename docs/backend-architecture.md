# Backend Architecture

El backend actual vive en `python-backend/` y usa una estructura modular simple
centrada en FastAPI.

## Módulos

- `system`: root y health
- `chat`: entrada del chat, parser y orquestación
- `playback`: canción actual, cola, pause, resume y skip
- `playlists`: CRUD y reglas de playlist
- `integrations`: Deezer, YouTube y Gemini
- `storage`: persistencia JSON

## Estructura

```text
python-backend/app/
  core/
  integrations/
  modules/
    chat/
    playback/
    playlists/
    system/
  shared/
  storage/
```

## Flujo

1. `POST /api/v1/chat/messages` recibe un mensaje del chat.
2. `ChatService` usa `ChatCommandParser` para detectar intención.
3. Según la intención, delega a `PlaybackService` o `PlaylistService`.
4. Si hace falta buscar canciones, se usa Deezer.
5. Si hace falta playback completo, se intenta resolver YouTube.
6. El estado y las playlists se persisten en `var/data/app-state.json`.

## Decisiones

- No se metió DB todavía para no mezclar migración de lenguaje con migración de persistencia.
- La reproducción real sigue viviendo en el frontend.
- El backend devuelve estado, cola, canciones y metadata reproducible.
- Se mantuvo compatibilidad con la API existente del frontend.
- Cada playlist conserva el límite de 10 canciones.
