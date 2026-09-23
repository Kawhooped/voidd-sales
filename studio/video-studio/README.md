# Video Studio — local multimedia assembler

Lightweight local app: FastAPI backend + single-file HTML timeline.
Public desk: https://kawhooped.github.io/voidd-sales/tools/video-studio.html

Upload images / audio / video, optionally generate a clip with Gemini/Veo, arrange a 16:9 1080p timeline, overlay a song, export MP4.

## Prerequisites

- Python 3.10+
- `ffmpeg` and `ffprobe` on PATH
- Optional: Google AI API key with Veo access

## Setup

```bash
cd studio/video-studio
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
export GOOGLE_API_KEY=your_key_here
uvicorn main:app --reload --host 127.0.0.1 --port 8765
```

Open http://127.0.0.1:8765 or keep the Pages desk open; it talks to this port.
