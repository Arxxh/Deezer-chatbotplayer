from __future__ import annotations

import re

from app.integrations.gemini_client import GeminiIntentClient
from app.modules.chat.models import ChatCommandIntent
from app.shared.text import normalize_text


class ChatCommandParser:
    def __init__(self, gemini_client: GeminiIntentClient) -> None:
        self.gemini_client = gemini_client

    async def parse(self, message: str) -> ChatCommandIntent:
        raw_message = message.strip()

        if not raw_message:
            return ChatCommandIntent(command="help", rawMessage=raw_message)

        if raw_message.startswith("/"):
            return self._parse_slash_command(raw_message)

        ai_intent = await self.gemini_client.parse_intent(raw_message)
        if ai_intent:
            return ai_intent

        return self._parse_natural_language(raw_message)

    def _parse_slash_command(self, raw_message: str) -> ChatCommandIntent:
        command_token = raw_message.split(maxsplit=1)[0]
        query = raw_message[len(command_token) :].strip()
        command = self._map_slash_command(command_token[1:].lower())

        if command == "playlist":
            return self._parse_playlist_command(raw_message, query)

        return ChatCommandIntent(
            command=command,
            rawMessage=raw_message,
            query=query or None,
        )

    def _parse_natural_language(self, raw_message: str) -> ChatCommandIntent:
        normalized_message = normalize_text(raw_message)

        playlist_intent = self._parse_playlist_natural_language(
            normalized_message,
            raw_message,
        )
        if playlist_intent:
            return playlist_intent

        play_regex = re.compile(
            r"^(?:quiero escuchar|quiero que reproduzcas|quiero que pongas|hagas play de|ponme|pon|reproduce|toca|play)(?:\s+(?:a|de|la cancion)(?=\s|$))?\s*(.*)$",
            re.IGNORECASE,
        )
        play_match = play_regex.match(normalized_message)
        if play_match:
            return ChatCommandIntent(
                command="play",
                rawMessage=raw_message,
                query=(play_match.group(1).strip() or None),
            )

        direct_commands: list[tuple[str, list[str]]] = [
            ("pause", ["pause", "pausa", "deten"]),
            ("resume", ["resume", "reanuda", "continua", "continua la musica"]),
            ("skip", ["skip", "salta", "siguiente", "siguiente cancion"]),
            ("queue", ["queue", "cola", "ver cola"]),
            (
                "nowplaying",
                [
                    "now playing",
                    "ahora suena",
                    "que suena",
                    "que esta sonando",
                    "que esta sonando ahora",
                ],
            ),
            ("help", ["help", "ayuda", "comandos"]),
        ]

        for command, aliases in direct_commands:
            if normalized_message in aliases:
                return ChatCommandIntent(command=command, rawMessage=raw_message)

        if normalized_message in ["pon", "reproduce", "toca", "play"]:
            return ChatCommandIntent(command="play", rawMessage=raw_message)

        return ChatCommandIntent(command="unknown", rawMessage=raw_message)

    def _parse_playlist_natural_language(
        self,
        normalized_message: str,
        raw_message: str,
    ) -> ChatCommandIntent | None:
        if re.match(
            r"^(lista|listar|ver|mostrar|muestrame|enseñame|ensename|mostrar mis|ver mis|muestrame mis)\s+(playlists?|listas?|mis playlists?|mis listas?)$",
            normalized_message,
        ):
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="list",
            )

        create_match = re.match(
            r"^(?:crea|creame|crear|quiero crear)\s+(?:una\s+)?(?:playlist|lista)(?:\s+llamada|\s+de|\s+que se llame)?\s+(.+)$",
            normalized_message,
            re.IGNORECASE,
        )
        if create_match:
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="create",
                playlistName=create_match.group(1).strip(),
            )

        show_match = re.match(
            r"^(?:ver|mostrar|abre|enseñame|ensename)\s+(?:la\s+)?(?:playlist|lista)(?:\s+llamada|\s+de)?\s+(.+)$",
            normalized_message,
            re.IGNORECASE,
        )
        if show_match:
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="show",
                playlistName=show_match.group(1).strip(),
            )

        delete_match = re.match(
            r"^(?:borra|borrar|elimina|eliminar|quita)\s+(?:la\s+)?(?:playlist|lista)(?:\s+llamada|\s+de)?\s+(.+)$",
            normalized_message,
            re.IGNORECASE,
        )
        if delete_match:
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="delete",
                playlistName=delete_match.group(1).strip(),
            )

        add_match = re.match(
            r"^(?:agrega|anade|añade|mete)\s+(.+?)\s+(?:a la\s+|a mi\s+|en la\s+|en mi\s+|a\s+)?(?:playlist|lista)\s+(.+)$",
            normalized_message,
            re.IGNORECASE,
        )
        if add_match:
            track_object = add_match.group(1).strip()
            playlist_name = add_match.group(2).strip()

            if track_object in [
                "esta cancion",
                "esto",
                "la cancion actual",
                "la cancion",
            ]:
                return ChatCommandIntent(
                    command="playlist",
                    rawMessage=raw_message,
                    playlistAction="add",
                    playlistName=playlist_name,
                )

            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="add",
                playlistName=playlist_name,
                playlistQuery=track_object,
            )

        return None

    def _map_slash_command(self, command: str) -> str:
        if command == "play":
            return "play"
        if command == "pause":
            return "pause"
        if command == "resume":
            return "resume"
        if command == "skip":
            return "skip"
        if command == "queue":
            return "queue"
        if command in ["nowplaying", "np"]:
            return "nowplaying"
        if command == "help":
            return "help"
        if command == "playlist":
            return "playlist"

        return "unknown"

    def _parse_playlist_command(
        self,
        raw_message: str,
        remainder: str,
    ) -> ChatCommandIntent:
        normalized_remainder = remainder.strip()

        if not normalized_remainder:
            return ChatCommandIntent(command="playlist", rawMessage=raw_message)

        if normalized_remainder == "list":
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="list",
            )

        if normalized_remainder.startswith("create "):
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="create",
                playlistName=normalized_remainder[len("create ") :].strip() or None,
            )

        if normalized_remainder.startswith("show "):
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="show",
                playlistName=normalized_remainder[len("show ") :].strip() or None,
            )

        if normalized_remainder.startswith("delete "):
            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="delete",
                playlistName=normalized_remainder[len("delete ") :].strip() or None,
            )

        if normalized_remainder.startswith("add "):
            payload = normalized_remainder[len("add ") :].strip()
            separator_index = payload.find("::")

            if separator_index == -1:
                return ChatCommandIntent(
                    command="playlist",
                    rawMessage=raw_message,
                    playlistAction="add",
                )

            playlist_name = payload[:separator_index].strip()
            playlist_query = payload[separator_index + 2 :].strip()

            return ChatCommandIntent(
                command="playlist",
                rawMessage=raw_message,
                playlistAction="add",
                playlistName=playlist_name or None,
                playlistQuery=playlist_query or None,
            )

        return ChatCommandIntent(
            command="playlist",
            rawMessage=raw_message,
            playlistAction="play",
            playlistName=normalized_remainder,
        )
