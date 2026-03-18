import logging
from datetime import datetime
from pathlib import Path

from fpdf import FPDF

from app.models import AccessibilityFinding, Severity

logger = logging.getLogger(__name__)

# Colors
COLOR_BG = (24, 24, 36)
COLOR_WHITE = (255, 255, 255)
COLOR_CRITICAL = (220, 53, 69)
COLOR_MAJOR = (255, 152, 0)
COLOR_MINOR = (255, 215, 0)
COLOR_GREEN = (40, 167, 69)
COLOR_HEADER_BG = (44, 62, 80)
COLOR_ROW_ALT = (240, 240, 245)


class ReportGenerator:
    def generate_pdf(
        self,
        video_id: str,
        filename: str,
        score_before: int,
        score_after: int,
        findings: list[AccessibilityFinding],
        actions_applied: list[str],
        output_path: str,
    ) -> str:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()

        # ---- Title ----
        pdf.set_fill_color(*COLOR_HEADER_BG)
        pdf.rect(0, 0, 210, 45, "F")
        pdf.set_text_color(*COLOR_WHITE)
        pdf.set_font("Helvetica", "B", 28)
        pdf.set_y(10)
        pdf.cell(0, 12, "AdaptEd", ln=True, align="C")
        pdf.set_font("Helvetica", "", 14)
        pdf.cell(0, 8, "Accessibility Report", ln=True, align="C")

        # ---- Executive Summary ----
        pdf.set_y(55)
        pdf.set_text_color(0, 0, 0)
        self._section_header(pdf, "Executive Summary")

        pdf.set_font("Helvetica", "", 11)
        pdf.multi_cell(
            0,
            6,
            f"Video: {filename}\n"
            f"Video ID: {video_id}\n"
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n"
            f"Total issues found: {len(findings)}",
        )
        pdf.ln(4)

        # ---- Score Section ----
        self._section_header(pdf, "Accessibility Score")
        self._draw_score_bar(pdf, "Before", score_before)
        pdf.ln(2)
        self._draw_score_bar(pdf, "After", score_after)
        pdf.ln(4)

        improvement = score_after - score_before
        pdf.set_font("Helvetica", "B", 12)
        if improvement > 0:
            pdf.set_text_color(*COLOR_GREEN)
            pdf.cell(0, 8, f"Improvement: +{improvement} points", ln=True)
        else:
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 8, f"Score change: {improvement} points", ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(4)

        # ---- Findings Table ----
        self._section_header(pdf, "Accessibility Findings")

        if findings:
            # Table header
            pdf.set_font("Helvetica", "B", 9)
            pdf.set_fill_color(*COLOR_HEADER_BG)
            pdf.set_text_color(*COLOR_WHITE)
            col_widths = [30, 20, 65, 30, 45]
            headers = ["Type", "Severity", "Description", "WCAG", "Recommendation"]
            for w, h in zip(col_widths, headers):
                pdf.cell(w, 7, h, border=1, fill=True, align="C")
            pdf.ln()

            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(0, 0, 0)

            for i, f in enumerate(findings):
                # Severity color for the severity cell
                if f.severity == Severity.CRITICAL:
                    sev_color = COLOR_CRITICAL
                elif f.severity == Severity.MAJOR:
                    sev_color = COLOR_MAJOR
                else:
                    sev_color = COLOR_MINOR

                row_fill = i % 2 == 1
                if row_fill:
                    pdf.set_fill_color(*COLOR_ROW_ALT)

                row_h = 12
                x_start = pdf.get_x()
                y_start = pdf.get_y()

                # Check if we need a new page
                if y_start + row_h > 270:
                    pdf.add_page()
                    y_start = pdf.get_y()

                pdf.cell(col_widths[0], row_h, f.type[:18], border=1, fill=row_fill)

                # Severity cell with color
                pdf.set_fill_color(*sev_color)
                pdf.set_text_color(*COLOR_WHITE)
                pdf.cell(col_widths[1], row_h, f.severity.value, border=1, fill=True, align="C")
                pdf.set_text_color(0, 0, 0)
                if row_fill:
                    pdf.set_fill_color(*COLOR_ROW_ALT)

                desc = f.description[:40] + "..." if len(f.description) > 40 else f.description
                pdf.cell(col_widths[2], row_h, desc, border=1, fill=row_fill)

                wcag = f.wcag_criterion or "N/A"
                pdf.cell(col_widths[3], row_h, wcag, border=1, fill=row_fill, align="C")

                rec = f.recommendation[:28] + "..." if len(f.recommendation) > 28 else f.recommendation
                pdf.cell(col_widths[4], row_h, rec, border=1, fill=row_fill)
                pdf.ln()
        else:
            pdf.set_font("Helvetica", "I", 11)
            pdf.cell(0, 8, "No accessibility issues found.", ln=True)

        pdf.ln(6)

        # ---- Remediations Applied ----
        self._section_header(pdf, "Remediations Applied")
        if actions_applied:
            pdf.set_font("Helvetica", "", 11)
            for action in actions_applied:
                label = action.replace("_", " ").title()
                pdf.set_fill_color(*COLOR_GREEN)
                pdf.set_text_color(*COLOR_WHITE)
                pdf.cell(6, 6, "", border=0)
                pdf.cell(4, 6, "", fill=True)
                pdf.set_text_color(0, 0, 0)
                pdf.cell(0, 6, f"  {label}", ln=True)
                pdf.ln(1)
        else:
            pdf.set_font("Helvetica", "I", 11)
            pdf.cell(0, 8, "No remediations applied yet.", ln=True)

        pdf.ln(6)

        # ---- WCAG 2.1 Compliance Checklist ----
        self._section_header(pdf, "WCAG 2.1 Compliance Checklist")

        wcag_items = {
            "1.1.1 Non-text Content (A)": not any(f.wcag_criterion == "1.1.1" for f in findings),
            "1.2.2 Captions (A)": not any(f.wcag_criterion == "1.2.2" for f in findings),
            "1.2.5 Audio Description (AA)": not any(f.wcag_criterion == "1.2.5" for f in findings),
            "1.4.3 Contrast Minimum (AA)": not any(f.wcag_criterion == "1.4.3" for f in findings),
            "1.4.4 Resize Text (AA)": not any(f.wcag_criterion == "1.4.4" for f in findings),
            "1.4.7 Low Background Audio (AAA)": not any(f.wcag_criterion == "1.4.7" for f in findings),
            "2.3.1 Three Flashes (A)": not any(f.wcag_criterion == "2.3.1" for f in findings),
            "2.4.1 Bypass Blocks (A)": not any(f.wcag_criterion == "2.4.1" for f in findings),
        }

        pdf.set_font("Helvetica", "", 10)
        for criterion, passing in wcag_items.items():
            if passing:
                pdf.set_text_color(*COLOR_GREEN)
                symbol = "PASS"
            else:
                pdf.set_text_color(*COLOR_CRITICAL)
                symbol = "FAIL"
            pdf.cell(15, 6, symbol, align="C")
            pdf.set_text_color(0, 0, 0)
            pdf.cell(0, 6, criterion, ln=True)

        # ---- Footer ----
        pdf.set_y(-30)
        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(128, 128, 128)
        pdf.cell(0, 5, "Generated by AdaptEd - AI Accessibility Agent for Educational Videos", align="C", ln=True)
        pdf.cell(0, 5, "This report is for informational purposes. Full WCAG compliance requires human review.", align="C")

        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        pdf.output(str(output_path))
        logger.info("PDF report saved to %s", output_path)
        return str(output_path)

    def _section_header(self, pdf: FPDF, title: str):
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(44, 62, 80)
        pdf.cell(0, 10, title, ln=True)
        pdf.set_draw_color(44, 62, 80)
        pdf.line(pdf.get_x(), pdf.get_y(), pdf.get_x() + 190, pdf.get_y())
        pdf.ln(4)
        pdf.set_text_color(0, 0, 0)

    def _draw_score_bar(self, pdf: FPDF, label: str, score: int):
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(30, 8, f"{label}:")

        # Background bar
        bar_x = pdf.get_x()
        bar_y = pdf.get_y()
        bar_width = 120
        bar_height = 8

        pdf.set_fill_color(220, 220, 220)
        pdf.rect(bar_x, bar_y, bar_width, bar_height, "F")

        # Filled portion
        fill_width = bar_width * (score / 100)
        if score >= 70:
            pdf.set_fill_color(*COLOR_GREEN)
        elif score >= 40:
            pdf.set_fill_color(*COLOR_MAJOR)
        else:
            pdf.set_fill_color(*COLOR_CRITICAL)
        pdf.rect(bar_x, bar_y, fill_width, bar_height, "F")

        # Score text
        pdf.set_x(bar_x + bar_width + 5)
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(20, 8, f"{score}/100", ln=True)
