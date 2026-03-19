import asyncio
import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from app.config import settings
from app.models import (
    AccessibilityFinding,
    AnalysisResult,
    ProcessingStatus,
    RemediationRequest,
    RemediationResult,
    TranscriptionResult,
    VideoStatus,
    VideoUploadResponse,
)
from core.gemini_analyzer import GeminiAccessibilityAnalyzer
from core.report_generator import ReportGenerator
from core.video_enhancer import VideoEnhancer
from core.whisper_transcriber import WhisperTranscriber

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["video"])

# --------------- In-memory state (hackathon) ---------------

video_store: dict[str, dict] = {}
# video_store[video_id] = {
#     "id": str, "filename": str, "path": str,
#     "duration": float, "resolution": str,
#     "status": ProcessingStatus,
#     "analysis": AnalysisResult | None,
#     "srt_path": str | None,
#     "transcription": dict | None,
#     "remediation": RemediationResult | None,
#     "output_path": str | None,
#     "error": str | None,
# }

# Lazy-loaded singletons
_analyzer: GeminiAccessibilityAnalyzer | None = None
_transcriber: WhisperTranscriber | None = None
_enhancer: VideoEnhancer | None = None
_reporter = ReportGenerator()


def get_analyzer() -> GeminiAccessibilityAnalyzer:
    global _analyzer
    if _analyzer is None:
        if not settings.GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not configured")
        _analyzer = GeminiAccessibilityAnalyzer(settings.GEMINI_API_KEY)
    return _analyzer


def get_transcriber() -> WhisperTranscriber:
    global _transcriber
    if _transcriber is None:
        _transcriber = WhisperTranscriber(settings.WHISPER_MODEL)
    return _transcriber


def get_enhancer() -> VideoEnhancer:
    global _enhancer
    if _enhancer is None:
        _enhancer = VideoEnhancer(settings.FFMPEG_PATH)
    return _enhancer


# --------------- Helpers ---------------


async def _ffprobe_metadata(video_path: str) -> dict:
    """Extract video metadata with ffprobe."""
    cmd = [
        settings.FFPROBE_PATH,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(video_path),
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
    )
    stdout, _ = await proc.communicate()
    if proc.returncode != 0:
        return {"duration": 0.0, "resolution": "unknown"}

    data = json.loads(stdout.decode())
    duration = float(data.get("format", {}).get("duration", 0))

    # Find video stream
    width, height = 0, 0
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video":
            width = stream.get("width", 0)
            height = stream.get("height", 0)
            break

    return {
        "duration": round(duration, 2),
        "resolution": f"{width}x{height}" if width else "unknown",
    }


def _get_video(video_id: str) -> dict:
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found")
    return video_store[video_id]


# --------------- Endpoints ---------------


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file for accessibility analysis."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in (".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"):
        raise HTTPException(status_code=400, detail=f"Unsupported video format: {ext}")

    video_id = str(uuid.uuid4())
    safe_name = f"{video_id}{ext}"
    save_path = settings.upload_path / safe_name

    # Stream file to disk
    with open(save_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            f.write(chunk)

    # Get metadata
    meta = await _ffprobe_metadata(str(save_path))

    video_store[video_id] = {
        "id": video_id,
        "filename": file.filename,
        "path": str(save_path),
        "duration": meta["duration"],
        "resolution": meta["resolution"],
        "status": ProcessingStatus.UPLOADED,
        "analysis": None,
        "srt_path": None,
        "transcription": None,
        "remediation": None,
        "output_path": None,
        "error": None,
    }

    return VideoUploadResponse(
        id=video_id,
        filename=file.filename,
        duration=meta["duration"],
        resolution=meta["resolution"],
        status=ProcessingStatus.UPLOADED,
    )


@router.post("/analyze/{video_id}", response_model=AnalysisResult)
async def analyze_video(video_id: str):
    """Analyze video for accessibility issues using Gemini AI."""
    video = _get_video(video_id)
    video["status"] = ProcessingStatus.ANALYZING

    try:
        analyzer = get_analyzer()
        # Run in executor since Gemini calls are blocking
        loop = asyncio.get_event_loop()
        result: AnalysisResult = await loop.run_in_executor(
            None, analyzer.analyze_video, video["path"]
        )
        # Fix video_id in result
        result.video_id = video_id

        # Also try Gradient AI Agent for transcript-level analysis (non-blocking)
        try:
            from core.gradient_agent import analyze_transcript_with_gradient
            # If transcription exists, use it; otherwise skip Gradient
            if video.get("transcription") and video["transcription"].get("segments"):
                gradient_findings = await analyze_transcript_with_gradient(
                    video["transcription"]["segments"]
                )
                # Merge unique findings from Gradient
                existing_types = {f.type for f in result.findings}
                for gf in gradient_findings:
                    if gf.get("type") and gf["type"] not in existing_types:
                        try:
                            from app.models import Severity
                            severity = gf.get("severity", "minor").lower()
                            if severity not in ("critical", "major", "minor"):
                                severity = "minor"
                            result.findings.append(
                                AccessibilityFinding(
                                    type=gf["type"],
                                    severity=Severity(severity),
                                    description=gf.get("description", ""),
                                    timestamp_start=gf.get("timestamp_start"),
                                    timestamp_end=gf.get("timestamp_end"),
                                    wcag_criterion=gf.get("wcag_criterion"),
                                    recommendation=gf.get("recommendation", ""),
                                )
                            )
                        except Exception:
                            pass
                # Recalculate score with merged findings
                from app.models import Severity
                critical = sum(1 for f in result.findings if f.severity == Severity.CRITICAL)
                major = sum(1 for f in result.findings if f.severity == Severity.MAJOR)
                minor = sum(1 for f in result.findings if f.severity == Severity.MINOR)
                result.score_before = max(0, 100 - (critical * 15) - (major * 10) - (minor * 5))
                result.total_issues = len(result.findings)
                result.critical_count = critical
                result.major_count = major
                result.minor_count = minor
                logger.info("Merged %d Gradient findings into analysis", len(gradient_findings))
        except Exception as e:
            logger.warning("Gradient agent integration skipped: %s", e)

        video["analysis"] = result
        video["status"] = ProcessingStatus.ANALYZED
        return result

    except Exception as e:
        video["status"] = ProcessingStatus.FAILED
        video["error"] = str(e)
        logger.exception("Analysis failed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")


@router.post("/transcribe/{video_id}", response_model=TranscriptionResult)
async def transcribe_video(video_id: str):
    """Transcribe video audio using Whisper and generate SRT captions."""
    video = _get_video(video_id)
    video["status"] = ProcessingStatus.TRANSCRIBING

    try:
        transcriber = get_transcriber()
        loop = asyncio.get_event_loop()

        # Transcribe (blocking, run in executor)
        result = await loop.run_in_executor(
            None, transcriber.transcribe, video["path"]
        )

        # Generate SRT
        srt_path = str(Path(video["path"]).with_suffix(".srt"))
        await loop.run_in_executor(
            None, transcriber.generate_srt, result["segments"], srt_path
        )

        video["srt_path"] = srt_path
        video["transcription"] = result
        video["status"] = ProcessingStatus.TRANSCRIBED

        return TranscriptionResult(
            video_id=video_id,
            text=result["text"],
            language=result["language"],
            segments_count=len(result["segments"]),
            srt_path=srt_path,
        )

    except Exception as e:
        video["status"] = ProcessingStatus.FAILED
        video["error"] = str(e)
        logger.exception("Transcription failed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")


@router.post("/remediate/{video_id}", response_model=RemediationResult)
async def remediate_video(video_id: str, request: RemediationRequest):
    """Apply accessibility remediations to the video."""
    video = _get_video(video_id)
    video["status"] = ProcessingStatus.REMEDIATING

    valid_actions = {
        "add_captions", "enhance_contrast",
        "normalize_audio", "add_alt_descriptions", "add_pause_points",
    }
    actions = [a for a in request.actions if a in valid_actions]
    if not actions:
        raise HTTPException(status_code=400, detail="No valid actions provided")

    # Captions require transcription first
    if "add_captions" in actions and not video.get("srt_path"):
        raise HTTPException(
            status_code=400,
            detail="Transcription required before adding captions. Call /api/transcribe/{video_id} first.",
        )

    try:
        enhancer = get_enhancer()
        output_name = f"{video_id}_remediated.mp4"
        output_path = str(settings.output_path / output_name)

        await enhancer.apply_all(
            video_path=video["path"],
            srt_path=video.get("srt_path"),
            actions=actions,
            output_path=output_path,
        )

        # Calculate score_after
        analysis: AnalysisResult | None = video.get("analysis")
        score_before = analysis.score_before if analysis else 50

        # Points recovered per action
        recovery = {
            "add_captions": 20,
            "enhance_contrast": 10,
            "normalize_audio": 10,
            "add_alt_descriptions": 10,
            "add_pause_points": 5,
        }
        score_after = score_before + sum(recovery.get(a, 0) for a in actions)
        score_after = min(score_after, 100)

        # Count captions
        captions_count = 0
        if "add_captions" in actions and video.get("transcription"):
            captions_count = len(video["transcription"].get("segments", []))

        enhancements = []
        if "add_captions" in actions:
            enhancements.append("Burned SRT captions with styled subtitles")
        if "enhance_contrast" in actions:
            enhancements.append("Enhanced contrast, brightness, and saturation")
        if "normalize_audio" in actions:
            enhancements.append("Normalized audio loudness to -16 LUFS")
        if "add_alt_descriptions" in actions:
            enhancements.append("Alt descriptions flagged for visual content")
        if "add_pause_points" in actions:
            enhancements.append("Pause points identified for fast segments")

        result = RemediationResult(
            video_id=video_id,
            output_url=f"/api/video/{video_id}/remediated",
            score_after=score_after,
            actions_applied=actions,
            captions_generated=captions_count,
            enhancements=enhancements,
        )

        video["remediation"] = result
        video["output_path"] = output_path
        video["status"] = ProcessingStatus.REMEDIATED

        return result

    except Exception as e:
        video["status"] = ProcessingStatus.FAILED
        video["error"] = str(e)
        logger.exception("Remediation failed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Remediation failed: {e}")


@router.get("/report/{video_id}")
async def get_report(video_id: str):
    """Generate and return a PDF accessibility report."""
    video = _get_video(video_id)

    analysis: AnalysisResult | None = video.get("analysis")
    remediation: RemediationResult | None = video.get("remediation")

    score_before = analysis.score_before if analysis else 0
    score_after = remediation.score_after if remediation else score_before
    findings = analysis.findings if analysis else []
    actions = remediation.actions_applied if remediation else []

    report_path = str(settings.output_path / f"{video_id}_report.pdf")

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None,
            _reporter.generate_pdf,
            video_id,
            video["filename"],
            score_before,
            score_after,
            findings,
            actions,
            report_path,
        )
    except Exception as e:
        logger.exception("Report generation failed for %s", video_id)
        raise HTTPException(status_code=500, detail=f"Report generation failed: {e}")

    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=f"adapted_report_{video_id[:8]}.pdf",
    )


@router.get("/video/{video_id}/{video_type}")
async def serve_video(video_id: str, video_type: str, request: Request):
    """Serve original or remediated video file with Range request support."""
    video = _get_video(video_id)

    if video_type == "original":
        path = video["path"]
    elif video_type == "remediated":
        path = video.get("output_path")
        if not path or not Path(path).exists():
            raise HTTPException(status_code=404, detail="Remediated video not found. Run remediation first.")
    else:
        raise HTTPException(status_code=400, detail="Type must be 'original' or 'remediated'")

    if not Path(path).exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")

    file_path = Path(path)
    file_size = file_path.stat().st_size

    # Handle Range requests for video streaming
    range_header = request.headers.get("range")
    if range_header:
        from starlette.responses import StreamingResponse
        range_val = range_header.strip().split("=")[1]
        start, end = range_val.split("-")
        start = int(start)
        end = int(end) if end else file_size - 1
        content_length = end - start + 1

        def iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                while remaining > 0:
                    chunk = f.read(min(8192, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type="video/mp4",
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
            },
        )

    return FileResponse(path, media_type="video/mp4", headers={"Accept-Ranges": "bytes"})


@router.get("/status/{video_id}", response_model=VideoStatus)
async def get_status(video_id: str):
    """Return current processing status for a video."""
    video = _get_video(video_id)
    return VideoStatus(
        video_id=video_id,
        status=video["status"],
        filename=video["filename"],
        duration=video["duration"],
        resolution=video["resolution"],
        has_analysis=video["analysis"] is not None,
        has_transcription=video["transcription"] is not None,
        has_remediation=video["remediation"] is not None,
        error=video.get("error"),
    )
