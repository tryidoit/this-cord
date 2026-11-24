import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sun, Moon, Monitor, Search, RotateCcw } from "lucide-react";
import { api } from "@/api/client";
import { useProfile } from "@/lib/ProfileContext";
import { useUI } from "@/lib/UIContext";
import { UI_STYLES, getPalettes, getWallpapers, resolveTokens } from "@/lib/uiStyles";
import { cn } from "@/lib/utils";
import StyleCard from "@/components/appearance/StyleCard";
import PreviewChat from "@/components/appearance/PreviewChat";

function hexToHsl(hex) {
  hex = hex.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h = Math.round(h * 60); s = Math.round(s * 100); l = Math.round(l * 100);
  }
  return `${h} ${s}% ${l}%`;
}

function hslToHex(hsl) {
  const m = (hsl || "").match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!m) return "#5865f2";
  const [h, s, l] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  const a = s * Math.min(l, 100 - l) / 10000;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

const MODES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const TOKEN_KEYS = [
  { key: "--background", label: "Background" },
  { key: "--card", label: "Card" },
  { key: "--foreground", label: "Text" },
  { key: "--muted-foreground", label: "Muted Text" },
  { key: "--border", label: "Border" },
  { key: "--primary", label: "Primary" },
  { key: "--accent", label: "Accent" },
  { key: "--sidebar-background", label: "Sidebar" },
  { key: "--success", label: "Success" },
  { key: "--warning", label: "Warning" },
  { key: "--danger", label: "Danger" },
];

export default function Appearance() {
  const { profile, setProfile } = useProfile();
  const ui = useUI();
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewDark, setPreviewDark] = useState(ui?.isDark ?? true);

  const save = async (patch) => {
    if (!profile || busy) return;
    setBusy(true);
    try {
      const updated = await api.entities.Profile.update(profile.id, patch);
      setProfile(updated);
    } finally {
      setBusy(false);
    }
  };

  const custom = profile?.ui_custom || {};
  const activeStyleId = profile?.ui_style_id || "discord";
  const activeMode = profile?.color_mode || "system";
  const activePalette = custom.palette || "";
  const overrides = custom.overrides || {};
  const fontSize = custom.fontSize || 100;
  const wallpaperId = custom.wallpaper || "";
  const radiusOverride = custom.radius;

  const palettes = getPalettes(activeStyleId);
  const wallpapers = getWallpapers();

  const filteredStyles = UI_STYLES.filter((s) => {
    if (!search) return true;
    return s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search.toLowerCase());
  });

  const setStyle = (id) => save({ ui_style_id: id });
  const setMode = (m) => save({ color_mode: m });
  const setPalette = (id) => save({ ui_custom: { ...custom, palette: id } });
  const setWallpaper = (id) => save({ ui_custom: { ...custom, wallpaper: id } });
  const setRadius = (r) => save({ ui_custom: { ...custom, radius: r } });
  const setFontSize = (s) => save({ ui_custom: { ...custom, fontSize: s } });
  const setOverride = (key, val) => save({ ui_custom: { ...custom, overrides: { ...overrides, [key]: val } } });
  const setAccent = (hex) => setOverride("--primary", hexToHsl(hex));
  const resetStyle = () => save({ ui_custom: {} });

  const currentRadius = radiusOverride || ui?.style?.radius || "0.5rem";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4">
          <Link to="/" className="grid h-9 w-9 place-items-center rounded-xl bg-muted text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold">Appearance</h1>
            <p className="text-[12px] text-muted-foreground">23 styles · dark & light · full customization</p>
          </div>
          <button
            onClick={resetStyle}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6 space-y-8">
        {/* Live Preview */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Live Preview</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <PreviewChat />
            <div className="flex flex-col justify-center gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-online" />
                <span className="text-[12px] text-foreground">Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-idle" />
                <span className="text-[12px] text-foreground">Idle</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-dnd" />
                <span className="text-[12px] text-foreground">Do Not Disturb</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button className="rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground">Primary</button>
                <button className="rounded-md bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground">Accent</button>
                <button className="rounded-md bg-danger px-3 py-1.5 text-[11px] font-medium text-danger-foreground">Danger</button>
              </div>
            </div>
          </div>
        </section>

        {/* Style Picker */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Style</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search styles..."
                  className="h-8 w-40 rounded-lg border border-border bg-background pl-8 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setPreviewDark(!previewDark)}
                className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition hover:text-foreground"
                title={previewDark ? "Previewing dark" : "Previewing light"}
              >
                {previewDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredStyles.map((style, i) => (
              <div key={style.id} className="relative">
                <span className="absolute left-1.5 top-1.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-background/80 text-[10px] font-bold text-muted-foreground backdrop-blur">
                  {i + 1}
                </span>
                <StyleCard
                  style={style}
                  active={activeStyleId === style.id}
                  previewDark={previewDark}
                  onSelect={() => setStyle(style.id)}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Mode */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Mode</h2>
          <div className="flex gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-4 py-2 text-[13px] transition",
                    activeMode === m.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Colors */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Colors</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-[13px] text-foreground">Accent color</label>
              <input
                type="color"
                value={hslToHex(overrides["--primary"] || (ui?.style ? resolveTokens(activeStyleId, null, ui.isDark ? "dark" : "light")["--primary"] : "235 85% 66%"))}
                onChange={(e) => setAccent(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-border bg-background"
              />
              <button
                onClick={() => setOverride("--primary", null)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            </div>

            {palettes.length > 0 && (
              <div>
                <h3 className="mb-2 text-[12px] font-medium text-muted-foreground">Palettes ({palettes.length})</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {palettes.map((p) => {
                    const active = activePalette === p.id || (!activePalette && p.id === palettes[0].id);
                    const darkBg = `hsl(${p.dark["--background"]})`;
                    const darkPrimary = `hsl(${p.dark["--primary"]})`;
                    const lightBg = `hsl(${p.light["--background"]})`;
                    const lightPrimary = `hsl(${p.light["--primary"]})`;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPalette(p.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border p-2 text-left transition",
                          active ? "border-primary ring-1 ring-primary/40" : "border-border"
                        )}
                      >
                        <div className="flex h-8 w-8 overflow-hidden rounded">
                          <div className="flex-1" style={{ background: darkBg }} />
                          <div className="flex-1" style={{ background: lightBg }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[11px] font-medium text-foreground">{p.name}</div>
                        </div>
                        <div className="h-4 w-4 rounded-full" style={{ background: darkPrimary }} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[12px] font-medium text-primary hover:underline"
              >
                {showAdvanced ? "Hide" : "Show"} advanced color controls
              </button>
            </div>

            {showAdvanced && (
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3">
                {TOKEN_KEYS.map(({ key, label }) => {
                  const currentVal = overrides[key] || resolveTokens(activeStyleId, activePalette || null, ui?.isDark ? "dark" : "light")[key];
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hslToHex(currentVal)}
                        onChange={(e) => setOverride(key, hexToHsl(e.target.value))}
                        className="h-7 w-10 cursor-pointer rounded border border-border bg-background"
                      />
                      <span className="text-[11px] text-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Shape */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Shape</h2>
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[13px] text-foreground">Corner radius</label>
                <span className="text-[11px] text-muted-foreground">{currentRadius}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.125"
                value={parseFloat(currentRadius) || 0.5}
                onChange={(e) => setRadius(e.target.value + "rem")}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </section>

        {/* Background */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Background</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            <button
              onClick={() => setWallpaper("")}
              className={cn(
                "rounded-lg border p-2 text-[11px] transition",
                !wallpaperId ? "border-primary ring-1 ring-primary/40" : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              None
            </button>
            {wallpapers.map((w) => (
              <button
                key={w.id}
                onClick={() => setWallpaper(w.id)}
                className={cn(
                  "overflow-hidden rounded-lg border text-left transition",
                  wallpaperId === w.id ? "border-primary ring-1 ring-primary/40" : "border-border"
                )}
              >
                <div
                  className="h-12 w-full"
                  style={{
                    backgroundImage: w.style?.layer,
                    backgroundSize: w.style?.size,
                  }}
                />
                <div className="truncate px-2 py-1 text-[10px] text-foreground">{w.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Accessibility */}
        <section>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">Accessibility</h2>
          <div className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-[13px] text-foreground">Font size scale</label>
                <span className="text-[11px] text-muted-foreground">{fontSize}%</span>
              </div>
              <input
                type="range"
                min="85"
                max="130"
                step="5"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Reduce motion is handled by your system setting (prefers-reduced-motion).
            </p>
          </div>
        </section>

        {/* Reset */}
        <section className="flex justify-end">
          <button
            onClick={resetStyle}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[12px] text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset to style defaults
          </button>
        </section>
      </div>
    </div>
  );
}