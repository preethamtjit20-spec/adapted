"""DigitalOcean Gradient AI Agent integration for transcript-level accessibility analysis."""

import json
import logging
import httpx

logger = logging.getLogger(__name__)

from app.config import settings

AGENT_ENDPOINT = settings.GRADIENT_AGENT_ENDPOINT
AGENT_KEY = settings.GRADIENT_AGENT_KEY


async def analyze_transcript_with_gradient(transcript_segments: list[dict]) -> list[dict]:
    """Send transcript to Gradient AI Agent for WCAG accessibility analysis.

    Args:
        transcript_segments: List of {start, end, text} dicts from Whisper

    Returns:
        List of accessibility findings from the agent
    """
    # Format transcript with timestamps
    lines = []
    for seg in transcript_segments:
        start = seg.get("start", 0)
        end = seg.get("end", 0)
        text = seg.get("text", "").strip()
        if text:
            sm, ss = int(start) // 60, int(start) % 60
            em, es = int(end) // 60, int(end) % 60
            lines.append(f"[{sm:02d}:{ss:02d}-{em:02d}:{es:02d}] {text}")

    transcript_text = "\n".join(lines)

    prompt = f"""Analyze this educational video transcript for WCAG 2.1 accessibility issues:

{transcript_text}

Return a JSON array of findings. Each finding must have: type, severity (critical/major/minor), description, timestamp_start (seconds), timestamp_end (seconds), wcag_criterion, and recommendation."""

    if not AGENT_KEY:
        logger.info("Gradient agent key not configured, skipping")
        return []

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                AGENT_ENDPOINT,
                headers={
                    "Authorization": f"Bearer {AGENT_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "messages": [{"role": "user", "content": prompt}],
                },
            )

            if response.status_code != 200:
                logger.warning(
                    "Gradient agent returned %s: %s",
                    response.status_code,
                    response.text[:200],
                )
                return []

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            # Parse JSON from response (may be wrapped in markdown code blocks)
            content = content.strip()
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                content = content.rsplit("```", 1)[0]
            content = content.strip()

            findings = json.loads(content)
            if isinstance(findings, dict) and "findings" in findings:
                findings = findings["findings"]

            logger.info("Gradient agent returned %d findings", len(findings))
            return findings

    except Exception as e:
        logger.warning("Gradient agent call failed: %s", e)
        return []
