import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { resolveTokens, getFontUrl, getStyle, getEffects } from "./uiStyles";

const UIContext = createContext(null);

export function useUI() {
  return useContext(UIContext);
}

function getSystemDark() {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return true;
  }
}

export function UIProvider({ styleId, colorMode, paletteId, overrides, children }) {
  const [mode, setMode] = useState(colorMode || "system");
  const [systemDark, setSystemDark] = useState(getSystemDark());

  useEffect(() => {
    setMode(colorMode || "system");
  }, [colorMode]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const effectiveMode = mode === "system" ? (systemDark ? "dark" : "light") : mode;
  const isDark = effectiveMode === "dark";

  const tokens = useMemo(
    () => resolveTokens(styleId || "discord", paletteId, effectiveMode, overrides),
    [styleId, paletteId, effectiveMode, overrides]
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
    root.setAttribute("data-ui-style", styleId || "discord");
    const fx = getEffects(styleId || "discord");
    for (const k of ["glow", "glass", "noise", "scanlines"]) root.setAttribute("data-" + k, fx[k] ? "1" : "0");
    for (const [key, value] of Object.entries(tokens)) {
      root.style.setProperty(key, value);
    }
    try {
      localStorage.setItem("tc_ui_vars", JSON.stringify(tokens));
      localStorage.setItem("tc_ui_mode", mode);
      localStorage.setItem("tc_ui_style", styleId || "discord");
      const fUrl = getFontUrl(styleId || "discord");
      if (fUrl) {
        localStorage.setItem("tc_ui_font_url", fUrl);
        if (!document.querySelector('link[href="' + CSS.escape(fUrl) + '"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = fUrl;
          document.head.appendChild(link);
        }
      }
    } catch (e) { /* ignore */ }
  }, [styleId, mode, isDark, tokens]);

  const value = useMemo(
    () => ({
      styleId: styleId || "discord",
      mode,
      effectiveMode,
      isDark,
      paletteId,
      overrides,
      style: getStyle(styleId || "discord"),
    }),
    [styleId, mode, effectiveMode, isDark, paletteId, overrides]
  );

  return React.createElement(UIContext.Provider, { value }, children);
}