import React, { useEffect, useRef, useState } from "react";

const COLS = 30;
const ROWS = 20;
const TARGET_LEN = 26;
const TICK_MS = 88;

// Snake.io-inspired arena: outgrow the bots and reach 22 segments.
export default function SerpentArena({ onFinish }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const pushDirRef = useRef(() => {});
  const [length, setLength] = useState(3);
  const [time, setTime] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext("2d");
    let cell = 20;
    let offsetX = 0;
    let offsetY = 0;

    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.max(8, Math.floor(Math.min(w / COLS, h / ROWS)));
      offsetX = (w - cell * COLS) / 2;
      offsetY = (h - cell * ROWS) / 2;
    };
    resize();

    const state = {
      snake: [
        { x: 6, y: 10 },
        { x: 5, y: 10 },
        { x: 4, y: 10 },
      ],
      dir: { x: 1, y: 0 },
      queue: [],
      food: { x: 16, y: 10 },
      bots: [
        { cells: [{ x: 24, y: 5 }, { x: 23, y: 5 }, { x: 22, y: 5 }], dir: { x: -1, y: 0 }, color: "#f472b6" },
        { cells: [{ x: 9, y: 16 }, { x: 9, y: 17 }, { x: 9, y: 18 }], dir: { x: 0, y: -1 }, color: "#fbbf24" },
      ],
      dead: false,
      won: false,
    };

    const taken = () => [...state.snake, ...state.bots.flatMap((b) => b.cells)];
    const emptyCell = () => {
      const busy = taken();
      for (let i = 0; i < 400; i += 1) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);
        if (!busy.some((c) => c.x === x && c.y === y)) return { x, y };
      }
      return { x: 1, y: 1 };
    };

    const roundRect = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#08080F";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(139,92,246,0.10)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= COLS; x += 1) {
        ctx.beginPath();
        ctx.moveTo(offsetX + x * cell, offsetY);
        ctx.lineTo(offsetX + x * cell, offsetY + ROWS * cell);
        ctx.stroke();
      }
      for (let y = 0; y <= ROWS; y += 1) {
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + y * cell);
        ctx.lineTo(offsetX + COLS * cell, offsetY + y * cell);
        ctx.stroke();
      }

      const fx = offsetX + state.food.x * cell + cell / 2;
      const fy = offsetY + state.food.y * cell + cell / 2;
      ctx.shadowColor = "#2dd4bf";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#2dd4bf";
      ctx.beginPath();
      ctx.arc(fx, fy, cell * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      const paint = (cells, headColor, bodyColor) => {
        cells.forEach((c, i) => {
          const x = offsetX + c.x * cell + 1;
          const y = offsetY + c.y * cell + 1;
          const size = cell - 2;
          ctx.globalAlpha = i === 0 ? 1 : Math.max(0.32, 1 - i * 0.045);
          ctx.fillStyle = i === 0 ? headColor : bodyColor;
          if (i === 0) {
            ctx.shadowColor = headColor;
            ctx.shadowBlur = 14;
          }
          roundRect(x, y, size, size, Math.max(3, cell * 0.28));
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        ctx.globalAlpha = 1;
      };

      state.bots.forEach((b) => paint(b.cells, b.color, `${b.color}99`));
      paint(state.snake, "#a78bfa", "#8b5cf6cc");
    };

    const finish = (win) => {
      if (state.dead || state.won) return;
      if (win) state.won = true;
      else state.dead = true;
      onFinish(win ? "win" : "lose");
    };

    const step = () => {
      if (state.dead || state.won) return;

      if (state.queue.length) state.dir = state.queue.shift();
      const head = state.snake[0];
      const next = { x: head.x + state.dir.x, y: head.y + state.dir.y };

      if (next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS) return finish(false);
      if (state.snake.slice(0, -1).some((c) => c.x === next.x && c.y === next.y)) return finish(false);
      if (state.bots.some((b) => b.cells.some((c) => c.x === next.x && c.y === next.y))) return finish(false);

      state.snake.unshift(next);
      if (next.x === state.food.x && next.y === state.food.y) {
        state.food = emptyCell();
      } else {
        state.snake.pop();
      }

      state.bots.forEach((bot) => {
        if (Math.random() < 0.16) {
          const options = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ].filter((d) => !(d.x === -bot.dir.x && d.y === -bot.dir.y));
          bot.dir = options[Math.floor(Math.random() * options.length)];
        }
        const bHead = { x: bot.cells[0].x + bot.dir.x, y: bot.cells[0].y + bot.dir.y };
        if (bHead.x < 0 || bHead.y < 0 || bHead.x >= COLS || bHead.y >= ROWS) {
          bot.dir = { x: -bot.dir.x, y: -bot.dir.y };
          return;
        }
        bot.cells.unshift(bHead);
        if (bHead.x === state.food.x && bHead.y === state.food.y) state.food = emptyCell();
        else bot.cells.pop();
        if (bot.cells.length > 9) bot.cells.pop();
      });

      draw();
      setLength(state.snake.length);
      if (state.snake.length >= TARGET_LEN) finish(true);
    };

    const pushDir = (nd) => {
      const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
      if ((last.x === -nd.x && last.y === -nd.y) || (last.x === nd.x && last.y === nd.y)) return;
      if (state.queue.length < 2) state.queue.push(nd);
    };
    pushDirRef.current = pushDir;

    const onKey = (e) => {
      const map = {
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 },
        s: { x: 0, y: 1 },
        a: { x: -1, y: 0 },
        d: { x: 1, y: 0 },
      };
      const nd = map[e.key] || map[String(e.key).toLowerCase()];
      if (!nd) return;
      e.preventDefault();
      pushDir(nd);
    };

    let touchStart = null;
    const onTouchStart = (e) => {
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onTouchEnd = (e) => {
      if (!touchStart) return;
      const dx = e.changedTouches[0].clientX - touchStart.x;
      const dy = e.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > Math.abs(dy)) pushDir({ x: dx > 0 ? 1 : -1, y: 0 });
      else if (Math.abs(dy) > 8) pushDir({ x: 0, y: dy > 0 ? 1 : -1 });
      touchStart = null;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", resize);
    canvas.addEventListener("touchstart", onTouchStart, { passive: true });
    canvas.addEventListener("touchend", onTouchEnd, { passive: true });

    draw();
    const loop = setInterval(step, TICK_MS);
    const clock = setInterval(() => setTime((t) => t + 1), 1000);

    return () => {
      clearInterval(loop);
      clearInterval(clock);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [onFinish]);

  const dirButton = (dir, label, className) => (
    <button
      onClick={() => pushDirRef.current(dir)}
      className={`grid h-11 w-11 place-items-center rounded-xl border border-border bg-foreground/[0.06] text-foreground/70 backdrop-blur transition active:bg-primary/30 ${className}`}
    >
      {label}
    </button>
  );

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />

      <div className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 gap-3">
        <div className="rounded-full border border-border bg-background/55 px-4 py-1.5 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">length</p>
          <p className="font-display text-lg font-bold text-primary">
            {length} <span className="text-foreground/30">/ {TARGET_LEN}</span>
          </p>
        </div>
        <div className="rounded-full border border-border bg-background/55 px-4 py-1.5 text-center backdrop-blur">
          <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">time</p>
          <p className="font-display text-lg font-bold text-foreground">{time}s</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5 md:hidden">
        {dirButton({ x: 0, y: -1 }, "↑", "")}
        <div className="flex gap-1.5">
          {dirButton({ x: -1, y: 0 }, "←", "")}
          {dirButton({ x: 0, y: 1 }, "↓", "")}
          {dirButton({ x: 1, y: 0 }, "→", "")}
        </div>
      </div>
      <p className="pointer-events-none absolute bottom-4 right-4 hidden text-[11px] text-foreground/30 md:block">
        arrows / wasd · eat cyan, avoid walls & bots
      </p>
    </div>
  );
}