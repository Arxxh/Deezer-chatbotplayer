# Backend Architecture

El backend está organizado en cuatro capas:

- `domain`: entidades puras del negocio (`Track`, `PlaybackState`).
- `application`: casos de uso, contratos de entrada/salida y puertos.
- `infrastructure`: adaptadores concretos como Deezer e implementación en memoria.
- `interfaces`: controladores HTTP.

## Flujo actual

1. `POST /chat/messages` recibe un mensaje del chat.
2. `HandleChatMessageUseCase` usa `ChatCommandParserService` para detectar intención.
3. El caso de uso correspondiente ejecuta la regla (`play`, `pause`, `queue`, etc).
4. Si hace falta catálogo musical, se usa el puerto `MusicCatalogPort`.
5. Si hace falta estado de reproducción, se usa el puerto `PlaybackStatePort`.

## Comandos MVP

- `/play <texto>`
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

También hay soporte inicial para frases como `pon stronger`, `pausa` o `qué suena`.

## Decisiones intencionales

- La reproducción real no vive en el backend. El backend devuelve estado y resultados; el frontend reproducirá el `previewUrl`.
- El estado ya no es volátil: cola y playlists se persisten en `var/data/app-state.json`, o en la ruta definida por `APP_DATA_FILE`.
- Cada playlist tiene un límite de 10 canciones como regla de dominio.
- Deezer está detrás de un puerto para poder reemplazarlo o mockearlo en pruebas.
