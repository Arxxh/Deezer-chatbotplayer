from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.modules.track import track_router
from src.modules.search import search_router


def create_app() -> FastAPI:
    """Application factory"""
    
    app = FastAPI(
        title="fastDeezer",
        description="FastAPI backend for Deezer public API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register routers (APIs)
    app.include_router(track_router)
    app.include_router(search_router)

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "message": "fastDeezer",
            "docs": "/docs",
            "version": "1.0.0",
            "endpoints": {
                "search": "/search?q=kanye%20west",
                "track": "/track/3135556"
            }
        }

    @app.get("/health", tags=["Health"])
    async def health():
        return {"status": "ok"}
    
    return app


app = create_app()
