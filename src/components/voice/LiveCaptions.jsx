import React, { useState, useEffect, useRef } from "react";
import { Captions, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Live captions using the browser's built-in SpeechRecognition API.
// This is an accessibility feature and is clearly marked as browser-dependent.
// Works in Chrome/Edge. Not available in Firefox/Safari.

export default function LiveCaptions({ onClose }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event) => {
      let final = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript + " ";
        else interimText += result[0].transcript;
      }
      if (final) setTranscript((prev) => (prev + " " + final).slice(-500));
      setInterim(interimText);
    };

    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        setListening(false);
      }
    };

    recognition.onend = () => {
      if (listening) {
        try { recognition.start(); } catch { /* */ }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try { recognition.stop(); } catch { /* */ }
    };
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (listening) {
      setListening(false);
      try { recognitionRef.current.stop(); } catch { /* */ }
    } else {
      setListening(true);
      setTranscript("");
      setInterim("");
      try { recognitionRef.current.start(); } catch { /* */ }
    }
  };

  if (!supported) {
    return (
      <div className="fixed bottom-20 right-4 z-[75] w-72 rounded-xl border border-border bg-card p-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <Captions className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-[13px] font-semibold text-foreground">Live Captions</span>
          <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Live captions require the Web Speech API, which is not available in this browser. Try Chrome or Edge.
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground/60">This is an accessibility feature, browser-dependent.</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-[75] w-80 rounded-xl border border-border bg-card p-4 shadow-2xl">
      <div className="flex items-center gap-2">
        <Captions className={cn("h-4 w-4", listening ? "text-primary animate-pulse" : "text-muted-foreground")} />
        <span className="flex-1 text-[13px] font-semibold text-foreground">Live Captions</span>
        <button
          onClick={toggle}
          className={cn(
            "rounded-md px-2 py-0.5 text-[11px] font-medium transition",
            listening ? "bg-danger/20 text-danger" : "bg-primary/20 text-primary"
          )}
        >
          {listening ? "Stop" : "Start"}
        </button>
        <button onClick={onClose} className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted/60">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground/60">Browser-dependent accessibility feature</p>
      <div className="mt-2 max-h-40 overflow-y-auto rounded-md bg-muted/30 p-2">
        {transcript || interim ? (
          <p className="text-[12px] text-foreground">
            {transcript}
            <span className="text-muted-foreground">{interim}</span>
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground/50">{listening ? "Listening…" : "Press Start to begin captioning"}</p>
        )}
      </div>
    </div>
  );
}