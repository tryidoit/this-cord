import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X, Loader2 } from "lucide-react";

// Voice recorder using MediaRecorder API with simple waveform visualization.
// props: onComplete(dataUrl, durationSec), onClose()
export default function VoiceRecorder({ onComplete, onClose }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [levels, setLevels] = useState([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(0);
  const timerRef = useRef(null);
  const stoppedRef = useRef(false);

  const cleanup = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleStop;
      recorder.start();
      setRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);
      setLevels([]);

      // Audio analyser for waveform
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        // Sample 32 bars
        const bars = [];
        const step = Math.floor(dataArray.length / 32);
        for (let i = 0; i < 32; i++) {
          let sum = 0;
          for (let j = 0; j < step; j++) sum += dataArray[i * step + j];
          bars.push(sum / step / 255);
        }
        setLevels(bars);
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
    } catch (err) {
      setError("Microphone access denied or unavailable.");
    }
  };

  const handleStop = async () => {
    if (stoppedRef.current) return;
    stoppedRef.current = true;
    cleanup();
    if (chunksRef.current.length === 0) {
      setError("No audio recorded.");
      return;
    }
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      setUploading(true);
      try {
        const { saveAsset } = await import("@/lib/assets");
        const ref = await saveAsset(dataUrl, "chat_image", "audio/webm", dataUrl.length, 0, 0);
        onComplete?.(ref, duration);
      } catch {
        setError("Upload failed.");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(blob);
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  };

  const cancel = () => {
    stoppedRef.current = true;
    cleanup();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    onClose?.();
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
      {!recording ? (
        <>
          <button
            onClick={start}
            className="grid h-9 w-9 place-items-center rounded-full bg-danger/15 text-danger transition hover:bg-danger/25 active:scale-95"
            title="Record voice message"
          >
            <Mic className="h-4 w-4" />
          </button>
          <span className="text-[12px] text-muted-foreground">Tap to record a voice message</span>
        </>
      ) : (
        <>
          <button
            onClick={stop}
            className="grid h-9 w-9 place-items-center rounded-full bg-danger text-foreground transition hover:bg-danger/80 active:scale-95"
            title="Stop recording"
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[13px] font-semibold text-danger">{fmtTime(duration)}</span>
          <div className="flex h-8 flex-1 items-center gap-0.5 overflow-hidden">
            {levels.map((lv, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-primary transition-all"
                style={{ height: `${Math.max(3, lv * 100)}%` }}
              />
            ))}
          </div>
        </>
      )}
      {uploading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      <button
        onClick={cancel}
        className="grid h-7 w-7 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground"
        title="Cancel"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {error && <span className="text-[11px] text-danger">{error}</span>}
    </div>
  );
}