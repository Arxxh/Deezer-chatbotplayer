from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

PYTHON_BACKEND_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[3]


@dataclass(slots=True)
class Settings:
    app_name: str
    app_version: str
    api_prefix: str
    frontend_url: str
    cors_allowed_origins: list[str]
    app_data_file: Path
    port: int
    youtube_data_api_key: str | None
    gemini_api_key: str | None


@lru_cache
def get_settings() -> Settings:
    load_env_file(REPO_ROOT / ".env")

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    raw_allowed_origins = os.getenv("CORS_ALLOWED_ORIGINS")
    allowed_origins = (
        split_csv(raw_allowed_origins)
        if raw_allowed_origins
        else [
            frontend_url,
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://0.0.0.0:3000",
        ]
    )
    port = parse_positive_int(os.getenv("PORT"), 4000)

    return Settings(
        app_name="deezer-chat-backend",
        app_version="0.1.0",
        api_prefix="/api/v1",
        frontend_url=frontend_url,
        cors_allowed_origins=dedupe_values(allowed_origins),
        app_data_file=Path(
            os.getenv("APP_DATA_FILE", str(REPO_ROOT / "var" / "data" / "app-state.json"))
        ),
        port=port,
        youtube_data_api_key=os.getenv("YOUTUBE_DATA_API_KEY"),
        gemini_api_key=os.getenv("GEMINI_API_KEY"),
    )


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def dedupe_values(values: list[str]) -> list[str]:
    deduped: list[str] = []

    for value in values:
        if value not in deduped:
            deduped.append(value)

    return deduped


def parse_positive_int(value: str | None, default: int) -> int:
    try:
        parsed = int(value or "")
    except (TypeError, ValueError):
        return default

    return parsed if parsed > 0 else default
