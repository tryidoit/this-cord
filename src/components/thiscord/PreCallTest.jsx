import React, { useEffect, useRef, useState } from "react";
import { Mic, Camera, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PreCallTest({ onClose }) {
  const [micLevel, setMicLevel] = useState(0);
  const [error, setError] = useState("");
  const [audioOutputs, setAudioOutputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        const ac = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ac;
        const source = ac.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
        const analyser = ac.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (err?.name === "NotAllowedError") setError("Microphone or camera blocked. Allow access in your browser settings.");
        else if (err?.name === "NotFoundError") setError("No microphone or camera found.");
        else setError("Could not access microphone or camera.");
      }
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAudioOutputs(devices.filter((d) => d.kind === "audiooutput"));
      } catch { /* not supported */ }
    };
    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const testSpeaker = () => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = "sine";
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0, ac.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ac.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.5);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + 1.5);
      osc.onended = () => ac.close().catch(() => {});
    } catch { /* not supported */ }
  };

  const changeOutput = async (deviceId) => {
    setSelectedOutput(deviceId);
    const el = videoRef.current;
    if (el && el.setSinkId) {
      try { await el.setSinkId(deviceId); } catch { /* not supported */ }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Test call devices</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Mic className="h-4 w-4" /> Microphone
          </div>
          {error ? (
            <p className="text-xs text-danger">{error}</p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${micLevel}%` }} />
              </div>
              <span className="w-8 text-right text-xs text-muted-foreground">{micLevel}%</span>
            </div>
          )}
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Camera className="h-4 w-4" /> Camera
          </div>
          <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-background object-cover" />
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
            <Volume2 className="h-4 w-4" /> Speaker
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={testSpeaker}>Play test sound</Button>
            {audioOutputs.length > 1 && typeof HTMLVideoElement.prototype.setSinkId === "function" && (
              <select value={selectedOutput} onChange={(e) => changeOutput(e.target.value)} className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs">
                {audioOutputs.map((d) => <option key={d.deviceId} value={d.deviceId}>{d.label || "Audio device"}</option>)}
              </select>
            )}
          </div>
        </div>

        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    </div>
  );
}