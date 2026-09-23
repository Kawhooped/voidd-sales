#!/usr/bin/env python3
"""Local multimedia studio: upload, Veo/Gemini generate, ffmpeg assemble."""
from __future__ import annotations
import json, os, shutil, subprocess, time, uuid
from pathlib import Path
from typing import Any, Literal
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
UPLOADS, GENERATED, EXPORTS = DATA / "uploads", DATA / "generated", DATA / "exports"
INDEX, MANIFEST = ROOT / "index.html", DATA / "manifest.json"
for d in (UPLOADS, GENERATED, EXPORTS):
    d.mkdir(parents=True, exist_ok=True)

KIND = Literal["image", "audio", "video"]
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
AUDIO_EXT = {".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"}
VIDEO_EXT = {".mp4", ".mov", ".webm", ".mkv", ".avi"}

app = FastAPI(title="Video Studio", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["https://kawhooped.github.io", "http://127.0.0.1:8765", "http://localhost:8765"], allow_methods=["*"], allow_headers=["*"])

def load_manifest():
    return json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"assets": []}
def save_manifest(doc):
    MANIFEST.write_text(json.dumps(doc, indent=2))
def kind_of(name: str) -> KIND:
    ext = Path(name).suffix.lower()
    if ext in IMAGE_EXT: return "image"
    if ext in AUDIO_EXT: return "audio"
    if ext in VIDEO_EXT: return "video"
    raise HTTPException(400, f"Unsupported type: {ext}")
def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"
def which_ffmpeg():
    return shutil.which("ffmpeg")
def which_ffprobe():
    return shutil.which("ffprobe")
def run(cmd, timeout=300):
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
def probe_duration(path: Path):
    ffprobe = which_ffprobe()
    if not ffprobe: return None
    r = run([ffprobe, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)], timeout=30)
    try: return float(r.stdout.strip())
    except ValueError: return None
def asset_path(asset):
    return ROOT / asset["path"]
def find_asset(asset_id: str):
    for a in load_manifest()["assets"]:
        if a["id"] == asset_id: return a
    raise HTTPException(404, f"Unknown asset {asset_id}")

class GenerateBody(BaseModel):
    prompt: str = Field(min_length=1, max_length=4000)
    duration_sec: float = Field(default=5.0, ge=1.0, le=16.0)
class ClipSpec(BaseModel):
    id: str
    duration: float | None = Field(default=None, ge=0.2, le=120.0)
class AssembleBody(BaseModel):
    clips: list[ClipSpec]
    audio_id: str | None = None
    audio_volume: float = Field(default=0.4, ge=0.0, le=1.0)
    fps: int = Field(default=30, ge=12, le=60)

@app.get("/", response_class=HTMLResponse)
def home():
    if not INDEX.exists(): raise HTTPException(500, "index.html missing")
    return HTMLResponse(INDEX.read_text())
@app.get("/api/health")
def health():
    return {"ok": True, "ffmpeg": which_ffmpeg() is not None, "ffprobe": which_ffprobe() is not None, "google_key": bool(os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")), "assets": len(load_manifest()["assets"])}
@app.get("/api/assets")
def list_assets():
    return load_manifest()
@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    if not file.filename: raise HTTPException(400, "filename required")
    kind = kind_of(file.filename)
    ext = Path(file.filename).suffix.lower()
    aid = new_id({"image": "img", "audio": "aud", "video": "vid"}[kind])
    dest = UPLOADS / f"{aid}{ext}"
    dest.write_bytes(await file.read())
    rec = {"id": aid, "kind": kind, "name": file.filename, "path": str(dest.relative_to(ROOT)), "duration": None if kind == "image" else probe_duration(dest), "created": time.time(), "source": "upload"}
    doc = load_manifest(); doc["assets"].insert(0, rec); save_manifest(doc)
    return rec

def generate_slate(prompt: str, duration: float, dest: Path):
    ff = which_ffmpeg()
    if not ff: raise HTTPException(500, "ffmpeg required")
    r2 = run([ff, "-y", "-f", "lavfi", "-i", f"color=c=0x4c1d95:s=1920x1080:d={duration}:r=30", "-c:v", "libx264", "-pix_fmt", "yuv420p", str(dest)])
    if r2.returncode != 0: raise HTTPException(500, r2.stderr[-800:])
def generate_veo(prompt: str, duration: float, dest: Path) -> str:
    key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not key:
        generate_slate(prompt, duration, dest); return "fallback-slate (no GOOGLE_API_KEY)"
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=key)
        model = os.environ.get("VEO_MODEL", "veo-2.0-generate-001")
        op = client.models.generate_videos(model=model, prompt=prompt, config=types.GenerateVideosConfig(number_of_videos=1, aspect_ratio="16:9"))
        deadline = time.time() + 180
        while not getattr(op, "done", False) and time.time() < deadline:
            time.sleep(4)
            try: op = client.operations.get(op)
            except Exception: break
        videos = getattr(getattr(op, "response", None), "generated_videos", None) if getattr(op, "response", None) else None
        if not videos:
            generate_slate(prompt, duration, dest); return "fallback-slate (Veo returned no video)"
        video = videos[0].video
        raw = getattr(video, "video_bytes", None) or (client.files.download(file=video) if hasattr(client.files, "download") else None)
        if not raw:
            generate_slate(prompt, duration, dest); return "fallback-slate (Veo bytes missing)"
        dest.write_bytes(raw if isinstance(raw, (bytes, bytearray)) else bytes(raw))
        return f"veo:{model}"
    except Exception as exc:
        generate_slate(prompt, duration, dest); return f"fallback-slate ({type(exc).__name__}: {exc})"

@app.post("/api/generate")
def generate(body: GenerateBody):
    aid = new_id("gen")
    dest = GENERATED / f"{aid}.mp4"
    note = generate_veo(body.prompt, body.duration_sec, dest)
    rec = {"id": aid, "kind": "video", "name": body.prompt[:72], "path": str(dest.relative_to(ROOT)), "duration": probe_duration(dest) or body.duration_sec, "created": time.time(), "source": "generate", "prompt": body.prompt, "provider": note}
    doc = load_manifest(); doc["assets"].insert(0, rec); save_manifest(doc)
    return rec

def scale_filter():
    return "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1,fps=30,format=yuv420p"

@app.post("/api/assemble")
def assemble(body: AssembleBody):
    if not body.clips: raise HTTPException(400, "clips required")
    ff = which_ffmpeg()
    if not ff: raise HTTPException(500, "ffmpeg not on PATH")
    work = DATA / f"work_{uuid.uuid4().hex[:8]}"; work.mkdir(); parts = []
    try:
        for i, spec in enumerate(body.clips):
            asset = find_asset(spec.id); src = asset_path(asset)
            if not src.exists(): raise HTTPException(404, f"file missing for {spec.id}")
            out = work / f"part_{i:03d}.mp4"
            if asset["kind"] == "image":
                dur = spec.duration if spec.duration is not None else 3.0
                r = run([ff, "-y", "-loop", "1", "-i", str(src), "-t", f"{dur:.3f}", "-vf", scale_filter(), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(out)])
            elif asset["kind"] == "video":
                args = [ff, "-y", "-i", str(src)] + (["-t", f"{spec.duration:.3f}"] if spec.duration else []) + ["-vf", scale_filter(), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", str(out)]
                r = run(args)
            else:
                raise HTTPException(400, f"{spec.id} is {asset['kind']}, not a visual clip")
            if r.returncode != 0 or not out.exists(): raise HTTPException(500, f"encode failed for {spec.id}: {r.stderr[-600:]}")
            parts.append(out)
        concat_list = work / "concat.txt"
        concat_list.write_text("".join(f"file '{p.name}'\n" for p in parts))
        silent = work / "silent.mp4"
        r = run([ff, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(silent)])
        if r.returncode != 0: raise HTTPException(500, f"concat failed: {r.stderr[-600:]}")
        eid = new_id("exp"); final = EXPORTS / f"{eid}.mp4"
        if body.audio_id:
            song = find_asset(body.audio_id)
            if song["kind"] != "audio": raise HTTPException(400, "audio_id must be an audio asset")
            vol = max(0.0, min(1.0, body.audio_volume))
            r = run([ff, "-y", "-i", str(silent), "-i", str(asset_path(song)), "-filter_complex", f"[1:a]volume={vol}[a]", "-map", "0:v:0", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-shortest", str(final)])
        else:
            r = run([ff, "-y", "-i", str(silent), "-c", "copy", str(final)])
        if r.returncode != 0 or not final.exists(): raise HTTPException(500, f"mux failed: {r.stderr[-600:]}")
        rec = {"id": eid, "kind": "video", "name": f"export {eid}", "path": str(final.relative_to(ROOT)), "duration": probe_duration(final), "created": time.time(), "source": "export", "url": f"/exports/{final.name}"}
        doc = load_manifest(); doc["assets"].insert(0, rec); save_manifest(doc)
        return rec
    finally:
        shutil.rmtree(work, ignore_errors=True)

@app.get("/media/{asset_id}")
def media(asset_id: str):
    path = asset_path(find_asset(asset_id))
    if not path.exists(): raise HTTPException(404, "file gone")
    return FileResponse(path)
@app.get("/exports/{name}")
def export_file(name: str):
    path = EXPORTS / Path(name).name
    if not path.exists(): raise HTTPException(404, "export not found")
    return FileResponse(path, media_type="video/mp4", filename=path.name)
