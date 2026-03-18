import json
import logging
import time
from pathlib import Path

from app.models import AccessibilityFinding, AnalysisResult, Severity

logger = logging.getLogger(__name__)

ANALYSIS_PROMPT = """You are an expert accessibility auditor specializing in educational video content. Analyze this video thoroughly for accessibility issues according to WCAG 2.1 guidelines.

Examine the video for ALL of the following potential issues:

1. **Missing Captions/Subtitles** (WCAG 1.2.2 - Level A): Is there spoken content without captions?
2. **Fast-Paced Content** (WCAG 1.4.13): Are there segments that move too quickly for comprehension, without pauses?
3. **Complex Visuals Without Descriptions** (WCAG 1.1.1 - Level A): Are there diagrams, charts, graphs, or equations shown without verbal/text explanation?
4. **Low Contrast Text** (WCAG 1.4.3 - Level AA): Is there text overlaid on slides/screen with poor contrast ratio?
5. **No Audio Descriptions** (WCAG 1.2.5 - Level AA): Are there visual-only segments (e.g., silent demos, animations) with no narration?
6. **Small Font Sizes** (WCAG 1.4.4): Is there text on screen that appears too small to read comfortably?
7. **Flickering/Flashing Content** (WCAG 2.3.1 - Level A): Are there any rapid flashes or strobing effects (seizure risk)?
8. **Audio Clarity Issues** (WCAG 1.4.7 - Level AAA): Is background music or noise drowning out speech?
9. **Speech Clarity** (WCAG 1.2.1): Are there segments with unclear, monotone, or hard-to-understand speech?
10. **Missing Structure/Navigation** (WCAG 2.4.1): Does the video lack clear chapter markers, section breaks, or topic transitions?

For each issue found, provide:
- `type`: Short category name (e.g., "missing_captions", "low_contrast_text", "no_audio_description", "complex_visual_undescribed", "fast_paced_content", "small_font", "flickering_content", "audio_clarity", "speech_clarity", "missing_navigation")
- `severity`: "critical", "major", or "minor"
  - **critical**: Makes content inaccessible to a group of users (e.g., no captions for deaf users, seizure-risk flashing)
  - **major**: Significantly hinders comprehension (e.g., complex diagram never explained, very low contrast)
  - **minor**: Reduces quality but content is still usable (e.g., slightly fast pacing, minor audio issues)
- `description`: Clear, specific description of the issue with context
- `timestamp_start`: Start time in seconds where the issue occurs (null if video-wide)
- `timestamp_end`: End time in seconds (null if video-wide or momentary)
- `wcag_criterion`: The relevant WCAG criterion (e.g., "1.2.2", "1.4.3")
- `recommendation`: Actionable fix recommendation

Return a JSON array of findings. If no issues are found for a category, omit it. Be thorough but accurate — do not fabricate issues that are not present.

Return ONLY the JSON array, no markdown formatting:
[
  {
    "type": "...",
    "severity": "...",
    "description": "...",
    "timestamp_start": ...,
    "timestamp_end": ...,
    "wcag_criterion": "...",
    "recommendation": "..."
  }
]"""


class GeminiAccessibilityAnalyzer:
    def __init__(self, api_key: str):
        from google import genai

        self.client = genai.Client(api_key=api_key)

    def analyze_video(self, video_path: str) -> AnalysisResult:
        from google.genai import types

        video_path = str(video_path)
        video_id = Path(video_path).stem

        logger.info("Uploading video to Gemini for analysis: %s", video_path)
        video_file = self.client.files.upload(file=video_path)

        # Wait for Gemini to process the video
        while video_file.state.name == "PROCESSING":
            time.sleep(2)
            video_file = self.client.files.get(name=video_file.name)

        if video_file.state.name == "FAILED":
            raise RuntimeError(f"Gemini video processing failed: {video_file.state.name}")

        logger.info("Video processed by Gemini, running accessibility analysis...")

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_uri(
                            file_uri=video_file.uri,
                            mime_type=video_file.mime_type,
                        ),
                        types.Part.from_text(text=ANALYSIS_PROMPT),
                    ],
                )
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        # Parse response
        raw = response.text.strip()
        findings_data = json.loads(raw)

        if isinstance(findings_data, dict) and "findings" in findings_data:
            findings_data = findings_data["findings"]

        findings: list[AccessibilityFinding] = []
        for item in findings_data:
            try:
                severity = item.get("severity", "minor").lower()
                if severity not in ("critical", "major", "minor"):
                    severity = "minor"
                findings.append(
                    AccessibilityFinding(
                        type=item.get("type", "unknown"),
                        severity=Severity(severity),
                        description=item.get("description", ""),
                        timestamp_start=item.get("timestamp_start"),
                        timestamp_end=item.get("timestamp_end"),
                        wcag_criterion=item.get("wcag_criterion"),
                        recommendation=item.get("recommendation", ""),
                    )
                )
            except Exception as e:
                logger.warning("Skipping malformed finding: %s — %s", item, e)

        # Clean up the uploaded file
        try:
            self.client.files.delete(name=video_file.name)
        except Exception:
            pass

        # Calculate score
        critical = sum(1 for f in findings if f.severity == Severity.CRITICAL)
        major = sum(1 for f in findings if f.severity == Severity.MAJOR)
        minor = sum(1 for f in findings if f.severity == Severity.MINOR)

        score = 100 - (critical * 15) - (major * 10) - (minor * 5)
        score = max(score, 0)

        return AnalysisResult(
            video_id=video_id,
            findings=findings,
            score_before=score,
            total_issues=len(findings),
            critical_count=critical,
            major_count=major,
            minor_count=minor,
        )
