import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";

export default function Lightbox({ src, alt, onClose }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-4 top-4 flex gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); }}
          className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setZoom((z) => z + 0.5); }}
          className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <a
          href={src}
          download
          onClick={(e) => e.stopPropagation()}
          className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
        >
          <Download className="h-4 w-4" />
        </a>
        <button
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-foreground transition hover:bg-muted/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <img
        src={src}
        alt={alt || ""}
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `scale(${zoom})`, transition: "transform 0.2s" }}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />
    </div>
  );
}