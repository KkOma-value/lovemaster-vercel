from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .agents import agent_orchestrator
from .ai_client import close_client
from .dependencies import repository
from .routers import auth, chat, cron, health, images, knowledge
from .settings import settings

agent_orchestrator.set_repository(repository)


@asynccontextmanager
async def lifespan(app):
    yield
    await close_client()


app = FastAPI(title="Lovemaster API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.effective_cors_origins == "*" else settings.effective_cors_origins.split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(cron.router)
app.include_router(images.router)


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def api_fallback(path: str, request: Request) -> Response:
    if request.method == "OPTIONS":
        return Response(status_code=204)
    return JSONResponse(status_code=404, content={"error": f"API route not implemented: /api/{path}"})
