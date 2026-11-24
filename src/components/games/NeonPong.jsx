import React, { useEffect, useRef, useState } from "react";

const PADDLE_W = 90;
const PADDLE_H = 12;
const BALL_R = 7;
const WIN_SCORE = 7;

// Classic neon pong against an AI opponent. First to 7 wins.
export default function NeonPong({ onFinish }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ me: 0, ai: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function resize() {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const state = {
      ballX: canvas.width / 2,
      ballY: canvas.height / 2,
      vx: 4.5,
      vy: 2.5,
      paddleX: canvas.width / 2 - PADDLE_W / 2,
      aiX: canvas.width / 2 - PADDLE_W / 2,
      me: 0,
      ai: 0,
      finished: false,
    };

    const finish = (win) => {
      if (state.finished) return;
      state.finished = true;
      onFinish(win ? "win" : "lose");
    };

    const onMove = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      state.paddleX = Math.max(0, Math.min(canvas.width - PADDLE_W, x - PADDLE_W / 2));
    };

    const onMouse = (e) => onMove(e.clientX);
    const onTouch = (e) => { e.preventDefault(); onMove(e.touches[0].clientX); };

    canvas.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch);

    let raf = 0;
    const loop = () => {
      if (state.finished) return;
      raf = requestAnimationFrame(loop);

      state.ballX += state.vx;
      state.ballY += state.vy;

      if (state.ballX < BALL_R) { state.ballX = BALL_R; state.vx *= -1; }
      if (state.ballX > canvas.width - BALL_R) { state.ballX = canvas.width - BALL_R; state.vx *= -1; }

      // Player paddle (bottom)
      if (state.ballY > canvas.height - 24 - BALL_R && state.ballY < canvas.height - 12 &&
          state.ballX > state.paddleX && state.ballX < state.paddleX + PADDLE_W) {
        state.ballY = canvas.height - 24 - BALL_R;
        state.vy *= -1;
        const hit = (state.ballX - (state.paddleX + PADDLE_W / 2)) / (PADDLE_W / 2);
        state.vx = hit * 6;
      }

      // AI paddle (top) — follows ball with slight lag
      const aiCenter = state.aiX + PADDLE_W / 2;
      const diff = state.ballX - aiCenter;
      state.aiX += Math.sign(diff) * Math.min(Math.abs(diff), 3.2);
      state.aiX = Math.max(0, Math.min(canvas.width - PADDLE_W, state.aiX));

      if (state.ballY < 24 + BALL_R && state.ballY > 12 &&
          state.ballX > state.aiX && state.ballX < state.aiX + PADDLE_W) {
        state.ballY = 24 + BALL_R;
        state.vy *= -1;
      }

      // Score
      if (state.ballY > canvas.height + 20) {
        state.ai += 1;
        setScore({ me: state.me, ai: state.ai });
        if (state.ai >= WIN_SCORE) { finish(false); return; }
        state.ballX = canvas.width / 2;
        state.ballY = canvas.height / 2;
        state.vx = 4.5;
        state.vy = 2.5;
      }
      if (state.ballY < -20) {
        state.me += 1;
        setScore({ me: state.me, ai: state.ai });
        if (state.me >= WIN_SCORE) { finish(true); return; }
        state.ballX = canvas.width / 2;
        state.ballY = canvas.height / 2;
        state.vx = -4.5;
        state.vy = -2.5;
      }

      // Render
      ctx.fillStyle = "#06060B";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = "rgba(139,92,246,0.2)";
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#2dd4bf";
      ctx.fillRect(state.paddleX, canvas.height - 24, PADDLE_W, PADDLE_H);

      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(state.aiX, 12, PADDLE_W, PADDLE_H);

      ctx.beginPath();
      ctx.arc(state.ballX, state.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = "#fbbf24";
      ctx.shadowColor = "#fbbf24";
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", resize);
    };
  }, [onFinish]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full touch-none" />
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">score</p>
        <p className="font-display text-lg font-bold text-info">
          {score.me} <span className="text-foreground/30">— {score.ai}</span>
        </p>
      </div>
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-foreground/30">
        move your mouse · first to {WIN_SCORE} wins
      </p>
    </div>
  );
}