import asyncio
import logging
import shutil
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


class VideoEnhancer:
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path or shutil.which("ffmpeg") or "ffmpeg"

    async def _run(self, cmd: list[str]) -> None:
        """Run an FFmpeg command asynchronously."""
        logger.info("FFmpeg: %s", " ".join(cmd))
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr = await proc.communicate()
        if proc.returncode != 0:
            err = stderr.decode(errors="replace")
            raise RuntimeError(f"FFmpeg failed (rc={proc.returncode}): {err[-2000:]}")

    @staticmethod
    def _parse_srt(srt_path: str) -> list[dict]:
        """Parse SRT file into list of {start, end, text} dicts (times in seconds)."""
        import re

        def _ts_to_sec(ts: str) -> float:
            h, m, s = ts.replace(",", ".").split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)

        entries = []
        with open(srt_path, "r", encoding="utf-8") as f:
            content = f.read()

        blocks = re.split(r"\n\n+", content.strip())
        for block in blocks:
            lines = block.strip().split("\n")
            if len(lines) < 3:
                continue
            time_match = re.match(
                r"(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})",
                lines[1],
            )
            if not time_match:
                continue
            entries.append({
                "start": _ts_to_sec(time_match.group(1)),
                "end": _ts_to_sec(time_match.group(2)),
                "text": " ".join(lines[2:]),
            })
        return entries

    async def burn_captions(
        self, video_path: str, srt_path: str, output_path: str
    ) -> str:
        """Burn captions directly onto video frames using OpenCV + Pillow.

        Works without libass/freetype — renders text onto each frame in Python,
        then re-encodes with FFmpeg.
        """
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, self._burn_captions_sync, video_path, srt_path, output_path
        )
        return output_path

    def _burn_captions_sync(
        self, video_path: str, srt_path: str, output_path: str
    ) -> None:
        """Side-by-side layout: video with captions (left) + Braille panel (right)."""
        import cv2
        import numpy as np
        from PIL import Image, ImageDraw, ImageFont
        from core.braille_translator import translate_to_braille

        subs = self._parse_srt(srt_path)
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        vid_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        vid_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

        # Layout: [Video with captions | Braille panel]
        # Braille panel is 35% of video width
        panel_w = int(vid_w * 0.35)
        canvas_w = vid_w + panel_w
        canvas_h = vid_h

        tmpdir = tempfile.mkdtemp(prefix="adapted_caps_")
        frames_dir = Path(tmpdir) / "frames"
        frames_dir.mkdir()

        # Fonts
        caption_font_size = max(18, vid_h // 28)
        braille_font_size = max(28, vid_h // 16)
        label_font_size = max(14, vid_h // 40)
        text_font_size = max(12, vid_h // 45)

        def _load_font(size, preferred=None):
            paths = [
                "/System/Library/Fonts/Helvetica.ttc",
                "/System/Library/Fonts/SFNSMono.ttf",
                "/System/Library/Fonts/Supplemental/Arial.ttf",
            ]
            if preferred:
                paths.insert(0, preferred)
            for p in paths:
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    continue
            return ImageFont.load_default()

        caption_font = _load_font(caption_font_size)
        braille_font = _load_font(braille_font_size, "/System/Library/Fonts/Apple Braille.ttf")
        label_font = _load_font(label_font_size)
        text_font = _load_font(text_font_size)

        # Colors
        PANEL_BG = (15, 15, 25)         # Dark navy
        ACCENT = (99, 102, 241)          # Indigo
        ACCENT_DIM = (55, 48, 107)       # Dim purple
        BRAILLE_COLOR = (220, 220, 255)  # Bright white-blue
        CAPTION_BG = (0, 0, 0, 180)     # Semi-transparent black
        TEXT_WHITE = (255, 255, 255)
        TEXT_GRAY = (160, 160, 180)
        DIVIDER = (60, 60, 90)

        logger.info(
            "Burning captions + braille: %d subs onto %d frames (%dx%d -> %dx%d)",
            len(subs), total_frames, vid_w, vid_h, canvas_w, canvas_h,
        )

        # Pre-translate all subs to braille
        braille_cache = {}
        for sub in subs:
            if sub["text"] not in braille_cache:
                braille_cache[sub["text"]] = translate_to_braille(sub["text"])

        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            current_time = frame_idx / fps

            # Find active subtitle
            active_text = None
            for sub in subs:
                if sub["start"] <= current_time <= sub["end"]:
                    active_text = sub["text"]
                    break

            # Build canvas: video on left, panel on right
            pil_video = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))

            # --- Burn caption text onto video ---
            if active_text:
                draw_vid = ImageDraw.Draw(pil_video)
                max_cap_w = int(vid_w * 0.85)
                cap_lines = self._wrap_text(draw_vid, active_text, caption_font, max_cap_w)

                line_h = caption_font_size + 6
                total_h = len(cap_lines) * line_h
                y_start = vid_h - total_h - 30

                # Draw background bar for all caption lines
                overlay = Image.new("RGBA", pil_video.size, (0, 0, 0, 0))
                ov_draw = ImageDraw.Draw(overlay)
                pad = 10
                ov_draw.rectangle(
                    [pad, y_start - pad, vid_w - pad, y_start + total_h + pad],
                    fill=CAPTION_BG,
                )
                pil_video = Image.alpha_composite(
                    pil_video.convert("RGBA"), overlay
                ).convert("RGB")
                draw_vid = ImageDraw.Draw(pil_video)

                for i, line in enumerate(cap_lines):
                    bbox = draw_vid.textbbox((0, 0), line, font=caption_font)
                    tw = bbox[2] - bbox[0]
                    x = (vid_w - tw) // 2
                    y = y_start + i * line_h
                    draw_vid.text((x, y), line, font=caption_font, fill=TEXT_WHITE)

            # --- Build Braille panel ---
            panel = Image.new("RGB", (panel_w, canvas_h), PANEL_BG)
            draw_p = ImageDraw.Draw(panel)

            # Divider line on left edge
            draw_p.line([(0, 0), (0, canvas_h)], fill=DIVIDER, width=2)

            # Panel header
            margin = 20
            y_pos = 20

            # "BRAILLE OUTPUT" label
            draw_p.text(
                (margin, y_pos), "BRAILLE OUTPUT",
                font=label_font, fill=ACCENT,
            )
            y_pos += label_font_size + 8

            # Thin accent line
            draw_p.line(
                [(margin, y_pos), (panel_w - margin, y_pos)],
                fill=ACCENT_DIM, width=1,
            )
            y_pos += 15

            # "UEB Grade 2" label
            draw_p.text(
                (margin, y_pos), "UEB Grade 2 | liblouis",
                font=text_font, fill=TEXT_GRAY,
            )
            y_pos += text_font_size + 20

            if active_text:
                braille_text = braille_cache.get(active_text, "")

                # English text label
                draw_p.text(
                    (margin, y_pos), "ENGLISH:",
                    font=text_font, fill=TEXT_GRAY,
                )
                y_pos += text_font_size + 6

                # Wrap and draw English text
                eng_lines = self._wrap_text(draw_p, active_text, text_font, panel_w - 2 * margin)
                for line in eng_lines:
                    draw_p.text((margin, y_pos), line, font=text_font, fill=TEXT_WHITE)
                    y_pos += text_font_size + 4
                y_pos += 20

                # Braille label
                draw_p.text(
                    (margin, y_pos), "BRAILLE:",
                    font=text_font, fill=TEXT_GRAY,
                )
                y_pos += text_font_size + 10

                # Draw braille text — large, with subtle glow effect
                braille_lines = self._wrap_text(
                    draw_p, braille_text, braille_font, panel_w - 2 * margin
                )
                for line in braille_lines:
                    # Glow
                    draw_p.text(
                        (margin - 1, y_pos), line,
                        font=braille_font, fill=(99, 102, 241, 60),
                    )
                    # Main text
                    draw_p.text(
                        (margin, y_pos), line,
                        font=braille_font, fill=BRAILLE_COLOR,
                    )
                    y_pos += braille_font_size + 6

                # Dots indicator at bottom
                y_pos += 15
                draw_p.text(
                    (margin, y_pos),
                    f"{len(braille_text)} braille cells",
                    font=text_font, fill=TEXT_GRAY,
                )
            else:
                # No active caption — show waiting state
                wait_y = canvas_h // 2 - 30
                draw_p.text(
                    (margin, wait_y), "⠀⠀⠀⠄⠄⠄⠀⠀⠀",
                    font=braille_font, fill=ACCENT_DIM,
                )
                draw_p.text(
                    (margin, wait_y + braille_font_size + 10),
                    "Waiting for speech...",
                    font=text_font, fill=TEXT_GRAY,
                )

            # Timestamp footer
            mins = int(current_time) // 60
            secs = int(current_time) % 60
            draw_p.text(
                (margin, canvas_h - label_font_size - 15),
                f"⏱ {mins:02d}:{secs:02d}",
                font=label_font, fill=TEXT_GRAY,
            )

            # --- Composite: video | panel ---
            canvas = Image.new("RGB", (canvas_w, canvas_h), PANEL_BG)
            canvas.paste(pil_video, (0, 0))
            canvas.paste(panel, (vid_w, 0))

            # Write frame
            out_frame = cv2.cvtColor(np.array(canvas), cv2.COLOR_RGB2BGR)
            cv2.imwrite(str(frames_dir / f"{frame_idx:06d}.png"), out_frame)
            frame_idx += 1

        cap.release()
        logger.info("Wrote %d captioned+braille frames, encoding video...", frame_idx)

        # Encode frames to video
        import subprocess

        tmp_video = str(Path(tmpdir) / "captioned_noaudio.mp4")
        subprocess.run(
            [
                self.ffmpeg, "-y",
                "-framerate", str(fps),
                "-i", str(frames_dir / "%06d.png"),
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                tmp_video,
            ],
            check=True,
            capture_output=True,
        )

        # Mux original audio back in
        subprocess.run(
            [
                self.ffmpeg, "-y",
                "-i", tmp_video,
                "-i", video_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-shortest",
                output_path,
            ],
            check=True,
            capture_output=True,
        )

        # Cleanup
        shutil.rmtree(tmpdir, ignore_errors=True)

    @staticmethod
    def _wrap_text(draw, text: str, font, max_width: int) -> list[str]:
        """Wrap text to fit within max_width pixels."""
        words = text.split()
        lines = []
        current_line = ""
        for word in words:
            test = f"{current_line} {word}".strip()
            bbox = draw.textbbox((0, 0), test, font=font)
            if bbox[2] - bbox[0] <= max_width:
                current_line = test
            else:
                if current_line:
                    lines.append(current_line)
                current_line = word
        if current_line:
            lines.append(current_line)
        return lines if lines else [text]

    async def enhance_contrast(self, video_path: str, output_path: str) -> str:
        """Boost contrast, brightness, and saturation for better visibility."""
        cmd = [
            self.ffmpeg, "-y",
            "-i", str(video_path),
            "-vf", "eq=contrast=1.3:brightness=0.05:saturation=1.1",
            "-c:a", "copy",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            str(output_path),
        ]
        await self._run(cmd)
        return output_path

    async def normalize_audio(self, video_path: str, output_path: str) -> str:
        """Two-pass loudness normalization using loudnorm filter."""
        # Pass 1: measure
        measure_cmd = [
            self.ffmpeg, "-y",
            "-i", str(video_path),
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
            "-f", "null",
            "-",
        ]
        proc = await asyncio.create_subprocess_exec(
            *measure_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        _, stderr_bytes = await proc.communicate()
        stderr_text = stderr_bytes.decode(errors="replace")

        # Parse measured values from FFmpeg output
        import json
        import re

        # Find the JSON block in stderr
        json_match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr_text, re.DOTALL)
        if json_match:
            measured = json.loads(json_match.group())
            mi = measured.get("input_i", "-24.0")
            mtp = measured.get("input_tp", "-2.0")
            mlra = measured.get("input_lra", "7.0")
            mt = measured.get("input_thresh", "-34.0")
            mo = measured.get("target_offset", "0.0")

            af = (
                f"loudnorm=I=-16:TP=-1.5:LRA=11:"
                f"measured_I={mi}:measured_TP={mtp}:"
                f"measured_LRA={mlra}:measured_thresh={mt}:"
                f"offset={mo}:linear=true"
            )
        else:
            # Fallback to single-pass
            logger.warning("Could not parse loudnorm measurements, using single-pass")
            af = "loudnorm=I=-16:TP=-1.5:LRA=11"

        # Pass 2: apply
        cmd = [
            self.ffmpeg, "-y",
            "-i", str(video_path),
            "-af", af,
            "-c:v", "copy",
            str(output_path),
        ]
        await self._run(cmd)
        return output_path

    async def apply_all(
        self,
        video_path: str,
        srt_path: str | None,
        actions: list[str],
        output_path: str,
    ) -> str:
        """Apply selected enhancements sequentially using temp files."""
        current = str(video_path)
        tmpdir = tempfile.mkdtemp(prefix="adapted_")
        step = 0

        try:
            if "add_captions" in actions and srt_path and Path(srt_path).exists():
                step += 1
                tmp_out = str(Path(tmpdir) / f"step{step}.mp4")
                await self.burn_captions(current, srt_path, tmp_out)
                current = tmp_out

            if "enhance_contrast" in actions:
                step += 1
                tmp_out = str(Path(tmpdir) / f"step{step}.mp4")
                await self.enhance_contrast(current, tmp_out)
                current = tmp_out

            if "normalize_audio" in actions:
                step += 1
                tmp_out = str(Path(tmpdir) / f"step{step}.mp4")
                await self.normalize_audio(current, tmp_out)
                current = tmp_out

            # Copy final result to output_path
            if current != str(video_path):
                shutil.copy2(current, str(output_path))
            else:
                # Nothing was applied, just copy original
                shutil.copy2(str(video_path), str(output_path))

        finally:
            # Clean up temp files
            shutil.rmtree(tmpdir, ignore_errors=True)

        return str(output_path)
