from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    UPLOADED = "uploaded"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    TRANSCRIBING = "transcribing"
    TRANSCRIBED = "transcribed"
    REMEDIATING = "remediating"
    REMEDIATED = "remediated"
    FAILED = "failed"


class Severity(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"


# --------------- Request / Response Models ---------------


class VideoUploadResponse(BaseModel):
    id: str
    filename: str
    duration: float
    resolution: str
    status: ProcessingStatus = ProcessingStatus.UPLOADED


class AccessibilityFinding(BaseModel):
    type: str
    severity: Severity
    description: str
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    wcag_criterion: Optional[str] = None
    recommendation: str


class AnalysisResult(BaseModel):
    video_id: str
    findings: list[AccessibilityFinding]
    score_before: int
    total_issues: int
    critical_count: int
    major_count: int
    minor_count: int


class RemediationAction(str, Enum):
    ADD_CAPTIONS = "add_captions"
    ENHANCE_CONTRAST = "enhance_contrast"
    ADD_ALT_DESCRIPTIONS = "add_alt_descriptions"
    NORMALIZE_AUDIO = "normalize_audio"
    ADD_PAUSE_POINTS = "add_pause_points"


class RemediationRequest(BaseModel):
    video_id: str
    actions: list[str] = Field(
        ...,
        description="Actions to apply: add_captions, enhance_contrast, normalize_audio, add_alt_descriptions, add_pause_points",
    )


class RemediationResult(BaseModel):
    video_id: str
    output_url: str
    score_after: int
    actions_applied: list[str]
    captions_generated: int = 0
    enhancements: list[str]


class AccessibilityReport(BaseModel):
    video_id: str
    score_before: int
    score_after: int
    findings: list[AccessibilityFinding]
    remediations: list[str]
    wcag_compliance: dict
    generated_at: datetime = Field(default_factory=datetime.utcnow)


class VideoStatus(BaseModel):
    video_id: str
    status: ProcessingStatus
    filename: str
    duration: float = 0.0
    resolution: str = ""
    has_analysis: bool = False
    has_transcription: bool = False
    has_remediation: bool = False
    error: Optional[str] = None


class TranscriptionResult(BaseModel):
    video_id: str
    text: str
    language: str
    segments_count: int
    srt_path: str
