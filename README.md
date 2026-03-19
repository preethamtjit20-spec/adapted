# AdaptEd — AI Accessibility Agent for Educational Videos

> Making education accessible for everyone, automatically.

**800 million+ people worldwide have disabilities. 90% of educational videos lack basic accessibility features. AdaptEd fixes that.**

AdaptEd is an autonomous AI agent that analyzes educational videos for accessibility gaps and automatically remediates them — generating captions, translating to Braille, enhancing visual contrast, normalizing audio, and producing WCAG compliance reports — powered by DigitalOcean Gradient™ AI.

## What It Does

1. **Upload** any educational video (lecture, tutorial, course)
2. **AI Analysis** — Gemini analyzes the full video for accessibility issues, while the DigitalOcean Gradient AI Agent (Llama 3.3 70B) performs transcript-level WCAG reasoning
3. **Accessibility Score** — Get a 0-100 score with detailed findings (critical/major/minor) mapped to WCAG 2.1 criteria
4. **Auto-Remediate** — One-click fixes:
   - AI-generated captions via Whisper speech-to-text
   - **Braille translation** using liblouis (UEB Grade 2) — rendered as a side panel in the video
   - Visual contrast enhancement
   - Audio normalization to -16 LUFS
5. **Compliance Report** — Download a PDF accessibility report with WCAG 2.1 checklist and before/after score comparison

## Tech Stack

| Layer | Technology | Infrastructure |
|-------|-----------|----------------|
| Video Analysis | Gemini 2.5 Flash | Google AI |
| Transcript WCAG Analysis | Llama 3.3 Instruct (70B) | **DigitalOcean Gradient™ AI Agent** |
| Speech-to-Text | OpenAI Whisper | **DigitalOcean Droplet** |
| Braille Translation | liblouis (UEB Grade 2) | **DigitalOcean Droplet** |
| Video Processing | FFmpeg + OpenCV + Pillow | **DigitalOcean Droplet** |
| Backend | FastAPI (Python) | **DigitalOcean Droplet** |
| Frontend | React + TypeScript + Tailwind | **DigitalOcean Droplet** (nginx) |
| Containerization | Docker | Docker Compose |

## DigitalOcean Gradient™ AI Usage

AdaptEd uses a **multi-model architecture** leveraging DigitalOcean Gradient™ AI:

- **Gradient AI Agent** (Llama 3.3 Instruct 70B): Performs transcript-level WCAG 2.1 accessibility reasoning — analyzes speech patterns, pacing, content descriptions, and navigation structure. Findings are merged with Gemini's video-level analysis for comprehensive results.
- **DigitalOcean Droplet** (s-2vcpu-4gb): Hosts the FastAPI backend, Whisper inference, FFmpeg video processing, and nginx serving the React frontend.
- **Multi-model pipeline**: Gemini handles native video understanding (visual content), Gradient Agent handles transcript reasoning (speech/text content), Whisper handles transcription — each model doing what it's best at.

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- FFmpeg installed (`brew install ffmpeg` or `apt install ffmpeg`)
- liblouis installed (`brew install liblouis` or `apt install liblouis-bin`)
- Gemini API key

### Backend
```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY and GRADIENT_AGENT_KEY in .env
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up
```

Visit `http://localhost:5173`

## Project Structure
```
adapted/
├── backend/
│   ├── app/           # FastAPI application
│   │   ├── main.py    # Entry point
│   │   ├── config.py  # Settings
│   │   └── models.py  # Pydantic schemas
│   ├── routers/
│   │   └── video.py   # API endpoints
│   ├── core/
│   │   ├── gemini_analyzer.py      # Gemini video analysis
│   │   ├── gradient_agent.py       # DO Gradient AI Agent integration
│   │   ├── whisper_transcriber.py  # Whisper STT
│   │   ├── braille_translator.py   # liblouis Braille translation
│   │   ├── video_enhancer.py       # FFmpeg + Pillow processing
│   │   └── report_generator.py     # PDF reports
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/  # React UI components
│   │   ├── services/    # API client
│   │   └── App.tsx      # Main app
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Accessibility Standards

AdaptEd evaluates against WCAG 2.1 guidelines:
- **1.2.1** Captions (Prerecorded)
- **1.2.3** Audio Description
- **1.2.5** Audio Description (Prerecorded)
- **1.4.3** Contrast (Minimum)
- **1.4.6** Contrast (Enhanced)
- **1.4.7** Low or No Background Audio
- **2.2.2** Pause, Stop, Hide
- **2.3.1** Three Flashes or Below Threshold

## Design System

AdaptEd's UI is built with a WCAG-compliant color system:
- Brand seed: Teal (#0D9488)
- Primary text: 15.4:1 contrast ratio (AAA)
- Secondary text: 7.0:1 contrast ratio (AA)
- Accent text: 11.1:1 contrast ratio (AAA)
- No purple/indigo gradients — an accessibility tool that practices what it preaches

## License

MIT License — see [LICENSE](LICENSE)

---

Built with DigitalOcean Gradient™ AI for the DigitalOcean Gradient™ AI Hackathon 2026.
