import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Cinematic boot sequence: appears when the app opens, before a game loads, and
// on any full-screen loading state.
export default function IntroOverlay({ label = "connecting to the grid", duration = 1750, onDone }) {
  const [visible, setVisible] = useState(true);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      doneRef.current?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(12px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-70">
            <div className="absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.28),transparent_62%)] blur-2xl" />
            <div className="absolute left-1/3 top-1/3 h-[40vmax] w-[40vmax] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.16),transparent_65%)] blur-2xl" />
          </div>

          <div className="relative flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.6, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
              className="relative grid h-20 w-20 place-items-center rounded-[30%] bg-gradient-to-br from-violet-500 via-fuchsia-500 to-teal-400 shadow-[0_0_60px_-6px_rgba(168,85,247,0.85)]"
            >
              <motion.span
                className="absolute inset-[-10px] rounded-[34%] border border-white/25"
                animate={{ rotate: 360 }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-3xl font-black tracking-tighter text-foreground">TC</span>
            </motion.div>

            <div className="overflow-hidden">
              <motion.h1
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.55, ease: "easeOut" }}
                className="font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl"
              >
                This<span className="bg-gradient-to-r from-violet-400 to-teal-300 bg-clip-text text-transparent">-Cord</span>
              </motion.h1>
            </div>

            <div className="h-[2px] w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full w-1/2 rounded-full bg-gradient-to-r from-violet-400 to-teal-300"
                animate={{ x: ["-100%", "220%"] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[11px] uppercase tracking-[0.42em] text-foreground/40"
            >
              {label}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}