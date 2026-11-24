import React, { useState, useRef, useCallback } from "react";
import { Upload, Download, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function StickerMaker() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [stickerSize, setStickerSize] = useState(128);
  const [compress, setCompress] = useState(0.7);
  const fileRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        renderCanvas(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const renderCanvas = useCallback((img, size = stickerSize, quality = compress) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, size, size);
    // Fit image into square, cropping excess
    const minDim = Math.min(img.width, img.height);
    const sx = (img.width - minDim) / 2;
    const sy = (img.height - minDim) / 2;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
    setPreview(canvas.toDataURL("image/png", quality));
  }, [stickerSize, compress]);

  const onSizeChange = (val) => {
    setStickerSize(val);
    if (image) renderCanvas(image, val, compress);
  };

  const onCompressChange = (val) => {
    setCompress(val);
    if (image) renderCanvas(image, stickerSize, val);
  };

  const download = () => {
    if (!preview) return;
    const link = document.createElement("a");
    link.download = `sticker-${Date.now()}.png`;
    link.href = preview;
    link.click();
    toast({ title: "Sticker downloaded!", description: `${stickerSize}×${stickerSize}px` });
  };

  return (
    <div className="flex h-full flex-col items-center p-6">
      <h3 className="mb-1 font-display text-lg font-bold text-foreground">Sticker Maker</h3>
      <p className="mb-4 text-xs text-muted-foreground">Crop and compress an image into a sticker or emoji</p>

      {!image ? (
        <label className="flex h-48 w-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border transition hover:border-primary/50">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <span className="mt-2 text-xs text-muted-foreground">Click to upload an image</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center">
          <div className="relative">
            <canvas ref={canvasRef} className="rounded-xl border border-border bg-muted" style={{ maxWidth: "200px" }} />
            <button
              onClick={() => { setImage(null); setPreview(null); }}
              className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="mt-4 w-full space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Size: {stickerSize}px</label>
              <input
                type="range"
                min="64"
                max="256"
                step="32"
                value={stickerSize}
                onChange={(e) => onSizeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Quality: {Math.round(compress * 100)}%</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={compress}
                onChange={(e) => onCompressChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
          <button
            onClick={download}
            className="mt-4 flex items-center gap-2 rounded-xl bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Download sticker
          </button>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}