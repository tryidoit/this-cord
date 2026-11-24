import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/api/client";
import { Pen, Square, Circle, Type, Eraser, Undo, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ["#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const SIZES = [2, 4, 6, 10];

export default function Whiteboard({ channelId, serverId, userId, username }) {
  const canvasRef = useRef(null);
  const [strokes, setStrokes] = useState([]);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [drawing, setDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState(null);
  const [textInput, setTextInput] = useState(null);
  const historyRef = useRef([]);

  const loadStrokes = useCallback(async () => {
    const page = await api.entities.WhiteboardStroke.filter({ channel_id: channelId }, { sort: "created_date", limit: 500 });
    setStrokes(page?.items || []);
  }, [channelId]);

  useEffect(() => {
    loadStrokes();
    const unsub = api.entities.WhiteboardStroke.subscribe(() => loadStrokes());
    return unsub;
  }, [loadStrokes]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (s) => {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (s.tool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }
      if (s.tool === "text" && s.text_content) {
        ctx.font = `${s.size * 4}px sans-serif`;
        ctx.fillText(s.text_content, s.points[0]?.x || 0, s.points[0]?.y || 0);
      } else if (s.tool === "rect" && s.points.length >= 2) {
        const w = s.points[1].x - s.points[0].x;
        const h = s.points[1].y - s.points[0].y;
        ctx.strokeRect(s.points[0].x, s.points[0].y, w, h);
      } else if (s.tool === "circle" && s.points.length >= 2) {
        const r = Math.hypot(s.points[1].x - s.points[0].x, s.points[1].y - s.points[0].y);
        ctx.beginPath();
        ctx.arc(s.points[0].x, s.points[0].y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
          ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    strokes.forEach(drawStroke);
    if (currentStroke) drawStroke(currentStroke);
  }, [strokes, currentStroke]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redraw();
  }, [redraw]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches?.[0];
    return {
      x: (touch ? touch.clientX : e.clientX) - rect.left,
      y: (touch ? touch.clientY : e.clientY) - rect.top,
    };
  };

  const startDraw = (e) => {
    if (tool === "text") {
      const pos = getPos(e);
      setTextInput({ pos, value: "" });
      return;
    }
    setDrawing(true);
    const pos = getPos(e);
    setCurrentStroke({ tool, color, size, points: [pos] });
  };

  const moveDraw = (e) => {
    if (!drawing || !currentStroke) return;
    e.preventDefault();
    const pos = getPos(e);
    if (tool === "pen" || tool === "eraser") {
      setCurrentStroke({ ...currentStroke, points: [...currentStroke.points, pos] });
    } else if (tool === "rect" || tool === "circle" || tool === "line") {
      setCurrentStroke({ ...currentStroke, points: [currentStroke.points[0], pos] });
    }
  };

  const endDraw = async () => {
    if (!drawing || !currentStroke) return;
    setDrawing(false);
    const stroke = currentStroke;
    setCurrentStroke(null);
    historyRef.current.push(stroke);
    // Save to server (throttled — one stroke per commit)
    await api.entities.WhiteboardStroke.create({
      channel_id: channelId,
      server_id: serverId,
      user_id: userId,
      username,
      tool: stroke.tool,
      color: stroke.color,
      size: stroke.size,
      points: stroke.points,
    }).catch(() => {});
    await loadStrokes();
  };

  const undo = async () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    if (last.created_by_id === userId) {
      await api.entities.WhiteboardStroke.delete(last.id).catch(() => {});
      await loadStrokes();
    }
  };

  const clearAll = async () => {
    await api.entities.WhiteboardStroke.deleteMany({ channel_id: channelId }).catch(() => {});
    await loadStrokes();
  };

  const submitText = async () => {
    if (!textInput?.value?.trim()) { setTextInput(null); return; }
    await api.entities.WhiteboardStroke.create({
      channel_id: channelId,
      server_id: serverId,
      user_id: userId,
      username,
      tool: "text",
      color,
      size,
      points: [textInput.pos],
      text_content: textInput.value,
    }).catch(() => {});
    setTextInput(null);
    await loadStrokes();
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${channelId}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        {[
          { id: "pen", icon: Pen },
          { id: "rect", icon: Square },
          { id: "circle", icon: Circle },
          { id: "text", icon: Type },
          { id: "eraser", icon: Eraser },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={cn("rounded-lg p-2 transition", tool === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            <t.icon className="h-4 w-4" />
          </button>
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={cn("h-5 w-5 rounded-full border-2 transition", color === c ? "border-primary scale-110" : "border-transparent")}
            style={{ backgroundColor: c }}
          />
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            className={cn("rounded-full transition", size === s ? "bg-primary" : "bg-muted hover:bg-muted/80")}
            style={{ width: s + 8, height: s + 8 }}
          />
        ))}
        <div className="mx-1 h-5 w-px bg-border" />
        <button onClick={undo} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Undo">
          <Undo className="h-4 w-4" />
        </button>
        <button onClick={exportImage} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Export">
          <Download className="h-4 w-4" />
        </button>
        <button onClick={clearAll} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" title="Clear all">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={moveDraw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={moveDraw}
          onTouchEnd={endDraw}
          className="absolute inset-0 cursor-crosshair touch-none"
        />
        {textInput && (
          <div className="absolute z-10" style={{ left: textInput.pos.x, top: textInput.pos.y }}>
            <input
              autoFocus
              value={textInput.value}
              onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
              onBlur={submitText}
              onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
              className="rounded border border-border bg-input px-1.5 py-0.5 text-sm text-foreground"
              style={{ color }}
            />
          </div>
        )}
      </div>
    </div>
  );
}