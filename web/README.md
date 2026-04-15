# musicBot Web

Frontend en Next.js para el backend `deezer-api`.

## Objetivo

Interfaz de chat musical inspirada en Grok Web:

- sidebar persistente
- vista principal de conversación
- reproducción completa mediante YouTube IFrame Player cuando el backend devuelve una fuente reproducible
- playlists manejables por comandos de chat

## Arquitectura

La app está organizada por capas y módulos:

- `src/app`: rutas y layout global
- `src/modules/chat`: dominio, integración HTTP y UI del chat
- `src/modules/playlists`: dominio, integración HTTP y UI de playlists
- `src/shared`: configuración, cliente HTTP, eventos del navegador y shell visual

## Variables de entorno

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000/api/v1
```

Para reproducción completa también necesitas en el backend:

```bash
YOUTUBE_DATA_API_KEY=tu_api_key
```

## Desarrollo

```bash
npm install
npm run dev
```
