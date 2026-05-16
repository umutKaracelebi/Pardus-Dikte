#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
import json
import threading
import time
import numpy as np

devnull = os.open(os.devnull, os.O_WRONLY)
old_stderr = os.dup(2)
sys.stderr.flush()
os.dup2(devnull, 2)

def emit(data):
    """Send JSON event to Rust via stdout."""
    os.dup2(old_stderr, 2)
    print(json.dumps(data), flush=True)
    os.dup2(devnull, 2)

# ── Global State ──
current_model = None
audio_buffer = []
is_recording = False
samplerate = 16000
cancel_download = threading.Event()


def is_model_cached(model_size):
    """Check if a faster-whisper model is already in HuggingFace cache."""
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    model_dir = os.path.join(cache_dir, f"models--Systran--faster-whisper-{model_size}")
    if not os.path.isdir(model_dir):
        return False
    # Check for actual model files (not just metadata)
    for root, dirs, files in os.walk(model_dir):
        for f in files:
            if f == "model.bin":
                return True
    return False


def get_model_cache_size(model_size):
    """Get current download size of model cache dir."""
    cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
    model_dir = os.path.join(cache_dir, f"models--Systran--faster-whisper-{model_size}")
    if not os.path.isdir(model_dir):
        return 0
    total = 0
    for root, dirs, files in os.walk(model_dir):
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


# Approximate model sizes in bytes for progress calculation
MODEL_SIZES = {
    "tiny": 75_000_000,
    "base": 145_000_000,
    "small": 490_000_000,
    "medium": 1_530_000_000,
    "large-v3": 3_100_000_000,
}


def load_model(model_size):
    """Load or download+load a whisper model with progress reporting."""
    global current_model
    cancel_download.clear()

    try:
        cached = is_model_cached(model_size)
        expected_size = MODEL_SIZES.get(model_size, 0)

        if cached:
            emit({"type": "status", "message": f"loading_model:{model_size}"})
        else:
            emit({"type": "status", "message": f"downloading_model:{model_size}"})
            emit({"type": "download", "status": "start", "model": model_size,
                  "total_bytes": expected_size})

        # Load model in background thread (handles both cached and download)
        load_error = [None]
        load_done = threading.Event()
        loaded_model = [None]

        def do_load():
            try:
                from faster_whisper import WhisperModel
                loaded_model[0] = WhisperModel(model_size, device="cpu", compute_type="int8")
            except Exception as e:
                load_error[0] = str(e)
            finally:
                load_done.set()

        t = threading.Thread(target=do_load, daemon=True)
        t.start()

        # Monitor progress while loading/downloading
        if not cached:
            last_percent = -1
            while not load_done.is_set():
                if cancel_download.is_set():
                    emit({"type": "download", "status": "cancelled", "model": model_size})
                    return

                current_size = get_model_cache_size(model_size)
                if expected_size > 0:
                    percent = min(99, int(current_size * 100 / expected_size))
                else:
                    percent = -1

                if percent != last_percent:
                    last_percent = percent
                    emit({"type": "download", "status": "progress", "model": model_size,
                          "percent": percent, "total_bytes": expected_size,
                          "downloaded_bytes": current_size})

                load_done.wait(timeout=0.5)
        else:
            # Cached: just wait for load
            load_done.wait()

        if load_error[0]:
            if not cached:
                emit({"type": "download", "status": "error", "model": model_size,
                      "message": load_error[0]})
            emit({"type": "error", "message": f"Model yüklenemedi: {load_error[0]}"})
            return

        current_model = loaded_model[0]
        if not cached:
            emit({"type": "download", "status": "complete", "model": model_size, "percent": 100})
        emit({"type": "status", "message": "ready"})

    except Exception as e:
        emit({"type": "error", "message": f"Model yüklenemedi: {e}"})


# ── Initial model load ──
load_model("small")


# ── Audio ──
import sounddevice as sd

last_level_time = 0

def audio_callback(indata, frames, time_info, status):
    global last_level_time
    if is_recording:
        audio_buffer.append(indata.copy())
        now = time.time()
        if now - last_level_time > 0.1:
            last_level_time = now
            rms = float(np.sqrt(np.mean(indata**2)))
            level = max(0, min(1, (rms - 0.005) * 8)) if rms > 0.005 else 0
            emit({"type": "audio_level", "level": round(level, 3)})

stream = sd.InputStream(samplerate=samplerate, channels=1, dtype='float32', callback=audio_callback)
stream.start()

# ── Main command loop ──
try:
    for line in sys.stdin:
        command = line.strip()
        if command == "start":
            if current_model is None:
                emit({"type": "error", "message": "Model henüz yüklenmedi."})
                continue
            audio_buffer.clear()
            is_recording = True
            emit({"type": "status", "message": "recording_started"})
        elif command == "cancel":
            is_recording = False
            audio_buffer.clear()
            emit({"type": "status", "message": "recording_cancelled"})
        elif command == "cancel_download":
            cancel_download.set()
        elif command.startswith("set_model:"):
            model_size = command.split(":", 1)[1]
            threading.Thread(target=load_model, args=(model_size,), daemon=True).start()
        elif command == "stop":
            is_recording = False
            if not audio_buffer:
                emit({"type": "final", "text": ""})
                continue

            audio_data = np.concatenate(audio_buffer).flatten()

            rms = np.sqrt(np.mean(audio_data**2))
            if rms < 0.005:
                emit({"type": "error", "message": "Ses algılanmıyor veya mikrofon kapalı."})
                emit({"type": "final", "text": ""})
                continue

            try:
                segments, info = current_model.transcribe(audio_data, beam_size=5, language="tr")
                text = " ".join([segment.text for segment in segments]).strip()

                import re
                text_lower = text.lower().strip()
                text_clean = re.sub(r'[^\w\s]', '', text_lower).strip()

                is_hallucination = (
                    not text_clean or
                    (rms < 0.03 and ('altyazı' in text_clean or 'alt yazı' in text_clean))
                )
                if is_hallucination:
                    text = ""

                emit({"type": "final", "text": text})
            except Exception as e:
                emit({"type": "error", "message": str(e)})

            audio_buffer.clear()
        elif command == "exit":
            break
except KeyboardInterrupt:
    pass
finally:
    stream.stop()
    stream.close()
    sys.exit(0)
