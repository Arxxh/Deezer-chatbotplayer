from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from app.modules.chat.models import ChatCommandIntent


class GeminiIntentClient:
    def __init__(self, api_key: str | None) -> None:
        self.api_key = api_key
        self.model_name = "gemini-2.5-flash"

    async def parse_intent(self, raw_message: str) -> ChatCommandIntent | None:
        if not self.api_key:
            return None

        try:
            payload = await asyncio.to_thread(self._generate_content_sync, raw_message)
            response_text = extract_response_text(payload)
            if not response_text:
                return None

            parsed = json.loads(response_text)
            intent = ChatCommandIntent.model_validate(
                {
                    **parsed,
                    "rawMessage": raw_message,
                }
            )
            return intent
        except Exception:
            return None

    def _generate_content_sync(self, raw_message: str) -> dict[str, Any]:
        endpoint = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model_name}:generateContent?{urlencode({'key': self.api_key or ''})}"
        )
        prompt = build_prompt(raw_message)
        body = json.dumps(
            {
                "generationConfig": {"responseMimeType": "application/json"},
                "contents": [{"parts": [{"text": prompt}]}],
            }
        ).encode("utf8")
        request = Request(
            endpoint,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )

        with urlopen(request, timeout=20) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(
                    f"Gemini request failed with status {response.status}"
                )

            return json.loads(response.read().decode("utf8"))


def extract_response_text(payload: dict[str, Any]) -> str | None:
    for candidate in payload.get("candidates", []):
        content = candidate.get("content", {})
        for part in content.get("parts", []):
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                return text

    return None


def build_prompt(raw_message: str) -> str:
    return f"""
Eres un analizador de intenciones musicales muy inteligente. Vas a extraer la intención de entrada del usuario en lenguaje humano y retornarla en un JSON estrictamente estructurado bajo el esquema `ChatCommandIntent`.

Esquema:
type ChatCommandName = 'play' | 'pause' | 'resume' | 'skip' | 'queue' | 'nowplaying' | 'help' | 'playlist' | 'unknown';
interface ChatCommandIntent {{
  command: ChatCommandName;
  rawMessage: string;
  query?: string; // Búsqueda de track a reproducir
  playlistAction?: 'list' | 'create' | 'add' | 'show' | 'delete' | 'play';
  playlistName?: string;
  playlistQuery?: string; // Nombre del track a añadir
}}

Por ejemplo:
- "quiero escuchar the box de roddy" -> {{"command": "play", "rawMessage": "...", "query": "the box roddy"}}
- "queria pausar porfa" -> {{"command": "pause", "rawMessage": "..."}}
- "muestra mis listas" -> {{"command": "playlist", "rawMessage": "...", "playlistAction": "list"}}
- "creame la playlist corridos" -> {{"command": "playlist", "rawMessage": "...", "playlistAction": "create", "playlistName": "corridos"}}
- "/playlist corridos" -> {{"command": "playlist", "rawMessage": "...", "playlistAction": "play", "playlistName": "corridos"}}
- "agrega esta cancion a la playlist corridos" -> {{"command": "playlist", "rawMessage": "...", "playlistAction": "add", "playlistName": "corridos"}}
- "borra la playlist corridos" -> {{"command": "playlist", "rawMessage": "...", "playlistAction": "delete", "playlistName": "corridos"}}
- "añade la combi versace a la playlist bangers" -> {{"command": "playlist", "rawMessage": "...", "playlistAction": "add", "playlistName": "bangers", "playlistQuery": "la combi versace"}}
- "que estupidez" -> {{"command": "unknown", "rawMessage": "..."}}

Extrae el JSON para este comando:
"{raw_message}"
""".strip()
