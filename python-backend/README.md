# Deezer API Python Backend

Backend principal en Python para el chat musical.

## Objetivo

- conservar `/api/v1/chat/messages`
- conservar `/api/v1/chat/state`
- conservar `/api/v1/playlists`
- mantener playback, cola, playlists, parser slash y lenguaje natural
- seguir usando persistencia en archivo JSON para no cambiar demasiadas cosas a la vez

## Estructura

```text
app/
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

## Requisitos

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Desarrollo

Desde `python-backend/`:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 4000 --reload
```

También puedes abrirlo por LAN:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```

O más rápido desde la raíz del repo:

```bash
make backend-install
make backend-dev
```

## Variables de entorno

Se lee automáticamente el `.env` del repo raíz si existe.

- `PORT`
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `APP_DATA_FILE`
- `YOUTUBE_DATA_API_KEY`
- `GEMINI_API_KEY`

## Persistencia

Por defecto usa el mismo archivo compartido del repo:

```text
var/data/app-state.json
```

Eso permite mantener compatibilidad sin meter DB todavía.

## Verificación

```bash
PYTHONPATH=$(pwd) .venv/bin/python -m unittest discover -s tests
```
