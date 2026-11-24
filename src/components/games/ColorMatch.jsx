import React, { useEffect, useRef, useState } from "react";

// Color memory game: watch a sequence of colored tiles light up, then repeat it.
// Reach sequence length 6 to win.
const TILES = [
  { id: 0, color: "#f43f5e", glow: "#fb7185" },
  { id: 1, color: "#22d3ee", glow: "#67e8f9" },
  { id: 2, color: "#a855f7", glow: "#c4b5fd" },
  { id: 3, color: "#fbbf24", glow: "#fde68a" },
];
const WIN_LENGTH = 6;

export default function ColorMatch({ onFinish }) {
  const [sequence, setSequence] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState(null);
  const [inputIndex, setInputIndex] = useState(0);
  const [showing, setShowing] = useState(false);
  const [status, setStatus] = useState("Tap start to begin");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const generateSequence = () => {
    const seq = [];
    for (let i = 0; i < WIN_LENGTH; i += 1) seq.push(Math.floor(Math.random() * 4));
    return seq;
  };

  const playSequence = async (seq) => {
    setShowing(true);
    setStatus("Watch carefully…");
    for (let i = 0; i < seq.length; i += 1) {
      await new Promise((r) => { timerRef.current = setTimeout(r, 600); });
      setActive(seq[i]);
      await new Promise((r) => { timerRef.current = setTimeout(r, 450); });
      setActive(null);
    }
    setShowing(false);
    setStatus("Your turn — repeat the sequence");
    setInputIndex(0);
  };

  const start = () => {
    if (showing || playing) return;
    const seq = generateSequence();
    setSequence(seq);
    setPlaying(true);
    playSequence(seq);
  };

  const handleTile = (tileId) => {
    if (showing || !playing) return;
    setActive(tileId);
    setTimeout(() => setActive(null), 200);

    if (tileId === sequence[inputIndex]) {
      const next = inputIndex + 1;
      if (next >= sequence.length) {
        setPlaying(false);
        setStatus("Perfect! You win!");
        onFinish("win");
        return;
      }
      setInputIndex(next);
    } else {
      setPlaying(false);
      setStatus("Wrong tile! Game over.");
      onFinish("lose");
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-background">
      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border bg-background/50 px-4 py-1.5 text-center backdrop-blur">
        <p className="text-[10px] uppercase tracking-[0.3em] text-foreground/40">sequence</p>
        <p className="font-display text-lg font-bold text-primary">
          {inputIndex} <span className="text-foreground/30">/ {WIN_LENGTH}</span>
        </p>
      </div>
      <p className="mb-6 text-sm text-foreground/50">{status}</p>
      <div className="grid grid-cols-2 gap-3">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => handleTile(tile.id)}
            disabled={showing || !playing}
            className="h-28 w-28 rounded-2xl transition-all duration-150 sm:h-32 sm:w-32"
            style={{
              backgroundColor: active === tile.id ? tile.glow : tile.color,
              boxShadow: active === tile.id ? `0 0 40px ${tile.glow}` : "none",
              opacity: showing && active !== tile.id ? 0.5 : 1,
            }}
          />
        ))}
      </div>
      {!playing && (
        <button
          type="button"
          onClick={start}
          className="mt-6 rounded-xl bg-gradient-to-r from-violet-500 to-teal-400 px-6 py-2.5 text-sm font-bold text-black transition hover:brightness-110 active:scale-95"
        >
          Start
        </button>
      )}
      <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] text-foreground/30">
        memorize the pattern · reach {WIN_LENGTH} tiles to win
      </p>
    </div>
  );
}