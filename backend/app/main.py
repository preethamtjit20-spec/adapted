from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from routers.video import router as video_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure storage dirs exist on startup
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    settings.output_path.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="AdaptEd",
    description="AI Accessibility Agent for Educational Videos",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(video_router)


@app.get("/")
async def root():
    return {
        "app": "AdaptEd",
        "description": "AI Accessibility Agent for Educational Videos",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}
