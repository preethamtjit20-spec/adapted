import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def _format_srt_time(seconds: float) -> str:
    """Convert seconds to SRT timestamp format: HH:MM:SS,mmm"""
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"


class WhisperTranscriber:
    def __init__(self, model_name: str = "base"):
        self.model_name = model_name
        self._model = None

    @property
    def model(self):
        if self._model is None:
            import whisper

            logger.info("Loading Whisper model: %s", self.model_name)
            self._model = whisper.load_model(self.model_name)
        return self._model

    def transcribe(self, video_path: str) -> dict:
        """Transcribe audio from video file. Returns dict with segments, text, language."""
        logger.info("Transcribing: %s", video_path)
        result = self.model.transcribe(
            str(video_path),
            task="transcribe",
            verbose=False,
        )
        return {
            "text": result.get("text", ""),
            "language": result.get("language", "unknown"),
            "segments": result.get("segments", []),
        }

    def generate_srt(self, segments: list[dict], output_path: str) -> str:
        """Write SRT file from Whisper segments. Returns the output path."""
        output_path = str(output_path)
        lines: list[str] = []

        for i, seg in enumerate(segments, start=1):
            start = seg["start"]
            end = seg["end"]
            text = seg["text"].strip()
            if not text:
                continue
            lines.append(str(i))
            lines.append(f"{_format_srt_time(start)} --> {_format_srt_time(end)}")
            lines.append(text)
            lines.append("")

        Path(output_path).write_text("\n".join(lines), encoding="utf-8")
        logger.info("SRT written to %s (%d segments)", output_path, len(segments))
        return output_path
