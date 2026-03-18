# AdaptEd — AI Accessibility Agent for Educational Videos

> Making education accessible for everyone, automatically.

**800 million+ people worldwide have disabilities. 90% of educational videos lack basic accessibility features. AdaptEd fixes that.**

AdaptEd is an autonomous AI agent that analyzes educational videos for accessibility gaps and automatically remediates them — generating captions, enhancing visual contrast, normalizing audio, and more — powered by DigitalOcean Gradient™ AI.

## What It Does

1. **Upload** any educational video (lecture, tutorial, course)
2. **AI Analysis** — Gemini 3.0 Pro analyzes the full video for accessibility issues referencing WCAG 2.1 guidelines
3. **Accessibility Score** — Get a 0-100 score with detailed findings (critical/major/minor)
4. **Auto-Remediate** — One-click fixes:
   - AI-generated captions via Whisper (running on DigitalOcean Gradient GPU)
   - Visual contrast enhancement
   - Audio normalization
   - Content alt-descriptions
   - Pause point recommendations
5. **Compliance Report** — Download a PDF accessibility report with WCAG 2.1 checklist

## Tech Stack

| Layer | Technology | Infrastructure |
|-------|-----------|----------------|
| AI Video Analysis | Gemini 3.0 Pro | Google AI |
| Speech-to-Text | OpenAI Whisper | **DigitalOcean Gradient™ GPU** |
| Video Processing | FFmpeg + OpenCV | **DigitalOcean Droplet** |
| Backend | FastAPI (Python) | **DigitalOcean App Platform** |
| Frontend | React + TypeScript + Tailwind | **DigitalOcean App Platform** |
| Storage | S3-compatible | **DigitalOcean Spaces** |
| Containerization | Docker | **DigitalOcean Container Registry** |

## DigitalOcean Gradient™ AI Usage

AdaptEd leverages DigitalOcean Gradient™ for GPU-accelerated AI inference:

- **Whisper Speech-to-Text**: Runs on Gradient GPU instances for fast, accurate transcription of educational content
- **Model Serving**: Whisper model deployed as a GPU-backed service via Gradient
- **Seamless Integration**: Gradient GPU workflows connect directly with App Platform (backend), Spaces (storage), and Droplets (processing)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- FFmpeg installed
- Gemini API key

### Backend
```bash
cd backend
cp .env.example .env
# Fill in GEMINI_API_KEY in .env
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
│   │   ├── whisper_transcriber.py  # Whisper STT
│   │   ├── video_enhancer.py       # FFmpeg processing
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

## License

MIT License — see [LICENSE](LICENSE)

---

Built with DigitalOcean Gradient™ AI for the DigitalOcean Gradient™ AI Hackathon 2026.
