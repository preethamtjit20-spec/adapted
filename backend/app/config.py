import shutil
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Gemini
    GEMINI_API_KEY: str = ""

    # DigitalOcean Spaces
    DO_SPACES_KEY: str = ""
    DO_SPACES_SECRET: str = ""
    DO_SPACES_BUCKET: str = "adapted-videos"
    DO_SPACES_REGION: str = "nyc3"

    # Storage
    UPLOAD_DIR: str = "storage/uploads"
    OUTPUT_DIR: str = "storage/output"

    # Whisper
    WHISPER_MODEL: str = "base"

    # Gradient AI Agent
    GRADIENT_AGENT_ENDPOINT: str = ""
    GRADIENT_AGENT_KEY: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # FFmpeg — auto-detect
    FFMPEG_PATH: str = ""
    FFPROBE_PATH: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.FFMPEG_PATH:
            self.FFMPEG_PATH = shutil.which("ffmpeg") or "ffmpeg"
        if not self.FFPROBE_PATH:
            self.FFPROBE_PATH = shutil.which("ffprobe") or "ffprobe"

    @property
    def upload_path(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def output_path(self) -> Path:
        p = Path(self.OUTPUT_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def spaces_endpoint(self) -> str:
        return f"https://{self.DO_SPACES_REGION}.digitaloceanspaces.com"


settings = Settings()
