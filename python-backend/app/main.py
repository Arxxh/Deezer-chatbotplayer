from __future__ import annotations

from fastapi import APIRouter, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.modules.chat.router import router as chat_router
from app.modules.playlists.router import router as playlists_router
from app.modules.system.router import router as system_router
from app.shared.exceptions import ApiException

settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(system_router)

api_router = APIRouter(prefix=settings.api_prefix)
api_router.include_router(system_router)
api_router.include_router(chat_router)
api_router.include_router(playlists_router)
app.include_router(api_router)


@app.exception_handler(ApiException)
async def handle_api_exception(
    _request: Request,
    exc: ApiException,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.message},
    )


@app.exception_handler(RequestValidationError)
async def handle_validation_exception(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else None
    message = first_error["msg"] if first_error else "Payload inválido."
    return JSONResponse(
        status_code=422,
        content={
            "message": message,
            "errors": exc.errors(),
        },
    )
