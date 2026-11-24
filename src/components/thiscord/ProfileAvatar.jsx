import React, { useEffect, useState } from "react";
import { getAvatar } from "@/lib/avatars";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

function UploadedAvatar({ avatarId, size, className, glow }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let alive = true;
    getAssetUrl(avatarId).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [avatarId]);
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-[28%] bg-secondary", className)}
      style={{ width: size, height: size, boxShadow: glow ? `0 0 ${Math.max(8, size / 6)}px -4px hsl(var(--primary) / 0.9)` : undefined }}
    >
      {url ? (
        <img src={url} alt="Profile picture" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="h-full w-full animate-pulse bg-muted/50" />
      )}
    </div>
  );
}

const SPIN = { transformBox: "view-box", transformOrigin: "50px 50px" };

function MotionLayer({ motion, c3 }) {
  if (!motion) return null;

  if (motion === "clock") {
    return (
      <g opacity="0.9">
        <circle cx="50" cy="50" r="37" fill="none" stroke={c3} strokeWidth="1.3" opacity="0.45" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="14"
            x2="50"
            y2="18"
            stroke={c3}
            strokeWidth="1.5"
            opacity="0.7"
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <line x1="50" y1="50" x2="50" y2="29" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" style={{ ...SPIN, animation: "tc-tick 12s linear infinite" }} />
        <line x1="50" y1="50" x2="50" y2="21" stroke={c3} strokeWidth="1.5" strokeLinecap="round" style={{ ...SPIN, animation: "tc-tick 4s linear infinite" }} />
        <circle cx="50" cy="50" r="2.1" fill="#ffffff" />
      </g>
    );
  }

  if (motion === "leaves" || motion === "snow") {
    const soft = motion === "snow";
    return (
      <g opacity="0.95">
        {Array.from({ length: 5 }).map((_, i) => (
          <g key={i} style={{ transformBox: "view-box", animation: `tc-leaf-fall ${soft ? 7 + i : 5 + i * 0.8}s linear ${i * 1.15}s infinite` }}>
            {soft ? (
              <circle cx={16 + i * 17} cy="2" r={1.6 + (i % 3) * 0.7} fill="#ffffff" opacity="0.85" />
            ) : (
              <path
                d="M0 0 C4.5 -4 9.5 -1.5 10 3.5 C5.5 7.5 0.5 5 0 0 Z"
                fill={i % 2 ? c3 : "#ffffff"}
                opacity="0.85"
                transform={`translate(${12 + i * 18} 0)`}
              />
            )}
          </g>
        ))}
      </g>
    );
  }

  if (motion === "rain") {
    return (
      <g opacity="0.8">
        {Array.from({ length: 7 }).map((_, i) => (
          <g key={i} style={{ transformBox: "view-box", animation: `tc-rain-fall ${0.9 + (i % 3) * 0.25}s linear ${i * 0.22}s infinite` }}>
            <line x1={10 + i * 13} y1="0" x2={7 + i * 13} y2="12" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" opacity="0.75" />
          </g>
        ))}
      </g>
    );
  }

  if (motion === "orbit") {
    return (
      <g opacity="0.95">
        <circle cx="50" cy="50" r="38" fill="none" stroke={c3} strokeWidth="0.9" opacity="0.5" strokeDasharray="4 9" />
        <g style={{ ...SPIN, animation: "tc-orbit 9s linear infinite" }}>
          <circle cx="50" cy="12" r="3.2" fill="#ffffff" />
        </g>
        <g style={{ ...SPIN, animation: "tc-orbit 14s linear infinite reverse" }}>
          <circle cx="50" cy="16" r="2.2" fill={c3} />
        </g>
        <g style={{ ...SPIN, animation: "tc-orbit 22s linear infinite" }}>
          <circle cx="50" cy="6" r="1.6" fill="#ffffff" opacity="0.8" />
        </g>
      </g>
    );
  }

  if (motion === "aurora") {
    return (
      <g opacity="0.75">
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            d={`M-5 ${30 + i * 16} C 20 ${14 + i * 16}, 40 ${44 + i * 16}, 60 ${26 + i * 16} S 90 ${38 + i * 16}, 108 ${22 + i * 16}`}
            fill="none"
            stroke={i % 2 ? c3 : "#ffffff"}
            strokeWidth={7 - i}
            strokeLinecap="round"
            className="av-pulse"
            opacity={0.4}
            style={{ animationDelay: `${i * 0.5}s` }}
          />
        ))}
      </g>
    );
  }

  if (motion === "bubbles") {
    return (
      <g opacity="0.85">
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i} style={{ transformBox: "view-box", animation: `tc-rise ${4 + i * 0.7}s linear ${i * 0.55}s infinite` }}>
            <circle cx={14 + i * 14} cy="96" r={1.8 + (i % 3) * 0.8} fill="#ffffff" opacity="0.7" />
          </g>
        ))}
      </g>
    );
  }

  if (motion === "comet") {
    return (
      <g style={{ ...SPIN, animation: "tc-orbit 6s linear infinite" }}>
        <line x1="50" y1="12" x2="50" y2="26" stroke={c3} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <circle cx="50" cy="11" r="2.8" fill="#ffffff" />
      </g>
    );
  }

  if (motion === "pulse") {
    return (
      <g>
        {[0, 1].map((i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r="34"
            fill="none"
            stroke={c3}
            strokeWidth="1.6"
            className="av-ping"
            style={{ transformBox: "fill-box", transformOrigin: "center", animationDelay: `${i * 1.2}s` }}
          />
        ))}
      </g>
    );
  }

  // prism
  return (
    <g style={{ ...SPIN, animation: "tc-orbit 18s linear infinite" }} opacity="0.85">
      {[0, 1, 2].map((i) => (
        <polygon key={i} points="50,10 58,24 42,24" fill={i % 2 ? c3 : "#ffffff"} opacity="0.55" transform={`rotate(${i * 120} 50 50)`} />
      ))}
    </g>
  );
}

// Illustrated portraits — actual things (leaves, clocks, cats, flowers…) that
// carry their own animation instead of a floating abstract glyph.
function SceneArt({ scene, c2, c3 }) {
  const ink = "#ffffff";
  if (scene === "clock") {
    return (
      <g>
        <circle cx="50" cy="52" r="32" fill={c2} stroke={ink} strokeWidth="2.2" />
        <circle cx="50" cy="52" r="26" fill="none" stroke={ink} strokeWidth="0.8" opacity="0.35" />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="50" y1="25" x2="50" y2={i % 3 === 0 ? 30 : 28} stroke={ink} strokeWidth={i % 3 === 0 ? 2 : 1.1} opacity="0.85" transform={`rotate(${i * 30} 50 52)`} />
        ))}
        <line x1="50" y1="52" x2="50" y2="33" stroke={ink} strokeWidth="2.4" strokeLinecap="round" style={{ ...SPIN, transformOrigin: "50px 52px", animation: "tc-tick 18s linear infinite" }} />
        <line x1="50" y1="52" x2="50" y2="27" stroke={c3} strokeWidth="1.8" strokeLinecap="round" style={{ ...SPIN, transformOrigin: "50px 52px", animation: "tc-tick 3s steps(12) infinite" }} />
        <circle cx="50" cy="52" r="2.6" fill={ink} />
      </g>
    );
  }
  if (scene === "leaf") {
    return (
      <g>
        <g style={{ transformBox: "view-box", transformOrigin: "50px 60px", animation: "av-sway 5.5s ease-in-out infinite" }}>
          <path d="M50 8 C74 24 86 46 84 66 C82 86 66 95 50 95 C34 95 18 86 16 66 C14 46 26 24 50 8 Z" fill={c2} />
          <path d="M50 14 L50 92" stroke={ink} strokeWidth="1.8" opacity="0.75" />
          <path d="M50 32 L30 44 M50 44 L72 56 M50 56 L31 67 M50 68 L68 78" stroke={ink} strokeWidth="1.2" opacity="0.5" />
        </g>
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={i} style={{ transformBox: "view-box", animation: `tc-leaf-fall ${6 + i}s linear ${i * 1.4}s infinite` }}>
            <path d="M0 0 C5 -4 10 -1 10 4 C5 8 0 5 0 0 Z" fill={i % 2 ? c3 : ink} opacity="0.8" transform={`translate(${8 + i * 22} 0)`} />
          </g>
        ))}
      </g>
    );
  }
  if (scene === "cat") {
    return (
      <g>
        <path d="M22 40 L18 14 L40 28" fill={c2} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M78 40 L82 14 L60 28" fill={c2} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="50" cy="54" r="30" fill={c2} />
        <g style={{ animation: "av-blink 4.2s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center" }}>
          <ellipse cx="39" cy="50" rx="4" ry="5.5" fill={ink} />
          <ellipse cx="61" cy="50" rx="4" ry="5.5" fill={ink} />
        </g>
        <path d="M50 60 L45 66 H55 Z" fill={c3} />
        <path d="M50 66 C50 72 44 73 42 70 M50 66 C50 72 56 73 58 70" stroke={ink} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M20 56 L34 58 M20 64 L34 62 M80 56 L66 58 M80 64 L66 62" stroke={ink} strokeWidth="1.1" opacity="0.65" strokeLinecap="round" />
      </g>
    );
  }
  if (scene === "flower") {
    return (
      <g>
        <g style={{ ...SPIN, animation: "tc-orbit 24s linear infinite" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <ellipse key={i} cx="50" cy="26" rx="9" ry="15" fill={c3} opacity="0.9" transform={`rotate(${i * 45} 50 50)`} />
          ))}
        </g>
        <circle cx="50" cy="50" r="11" fill={c2} stroke={ink} strokeWidth="1.2" />
        <circle cx="50" cy="50" r="4" fill={ink} opacity="0.8" />
      </g>
    );
  }
  if (scene === "fish") {
    return (
      <g>
        <g style={{ transformBox: "view-box", animation: "av-sway 4s ease-in-out infinite" }}>
          <path d="M26 52 C34 34 66 32 78 52 C66 72 34 70 26 52 Z" fill={c2} />
          <path d="M26 52 L10 38 L12 66 Z" fill={c3} />
          <circle cx="64" cy="47" r="3" fill={ink} />
          <path d="M44 40 C48 30 56 30 58 40" stroke={ink} strokeWidth="1.6" fill="none" opacity="0.7" />
        </g>
        {Array.from({ length: 3 }).map((_, i) => (
          <g key={i} style={{ transformBox: "view-box", animation: `tc-rise ${3.5 + i}s linear ${i * 0.8}s infinite` }}>
            <circle cx={76 + i * 4} cy="70" r={2 + i * 0.6} fill={ink} opacity="0.55" />
          </g>
        ))}
      </g>
    );
  }
  if (scene === "butterfly") {
    return (
      <g>
        <g style={{ transformBox: "view-box", transformOrigin: "50px 50px", animation: "av-flap 0.9s ease-in-out infinite" }}>
          <ellipse cx="28" cy="38" rx="19" ry="16" fill={c3} opacity="0.95" transform="rotate(-18 28 38)" />
          <ellipse cx="72" cy="38" rx="19" ry="16" fill={c3} opacity="0.95" transform="rotate(18 72 38)" />
          <ellipse cx="32" cy="64" rx="14" ry="12" fill={c2} opacity="0.95" transform="rotate(14 32 64)" />
          <ellipse cx="68" cy="64" rx="14" ry="12" fill={c2} opacity="0.95" transform="rotate(-14 68 64)" />
        </g>
        <ellipse cx="50" cy="52" rx="3.4" ry="21" fill={ink} opacity="0.9" />
        <path d="M50 32 C46 22 42 20 38 18 M50 32 C54 22 58 20 62 18" stroke={ink} strokeWidth="1.4" fill="none" />
      </g>
    );
  }
  if (scene === "snowflake") {
    return (
      <g style={{ ...SPIN, animation: "tc-orbit 20s linear infinite" }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i} transform={`rotate(${i * 60} 50 50)`}>
            <line x1="50" y1="14" x2="50" y2="86" stroke={c3} strokeWidth="3" strokeLinecap="round" />
            <line x1="50" y1="30" x2="38" y2="20" stroke={ink} strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="30" x2="62" y2="20" stroke={ink} strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="58" x2="38" y2="48" stroke={ink} strokeWidth="2" strokeLinecap="round" />
            <line x1="50" y1="58" x2="62" y2="48" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}
        <circle cx="50" cy="50" r="4" fill={ink} />
      </g>
    );
  }
  if (scene === "flame") {
    return (
      <g>
        <path d="M50 12 C64 34 82 42 82 62 C82 82 68 94 50 94 C32 94 18 82 18 62 C18 44 34 40 38 22 C43 40 50 40 50 22 Z" fill={c2} />
        <path d="M50 44 C58 58 66 62 66 72 C66 82 59 88 50 88 C41 88 34 82 34 72 C34 62 44 58 50 44 Z" fill={c3} className="av-pulse" />
        <path d="M50 62 C54 68 57 70 57 75 C57 80 54 83 50 83 C46 83 43 80 43 75 C43 70 47 68 50 62 Z" fill={ink} opacity="0.85" />
      </g>
    );
  }
  if (scene === "robot") {
    return (
      <g>
        <line x1="50" y1="14" x2="50" y2="24" stroke={ink} strokeWidth="2" />
        <circle cx="50" cy="12" r="3.4" fill={c3} className="av-pulse" />
        <rect x="22" y="26" width="56" height="52" rx="14" fill={c2} stroke={ink} strokeWidth="1.8" />
        <g style={{ animation: "av-blink 3.6s ease-in-out infinite", transformBox: "fill-box", transformOrigin: "center" }}>
          <circle cx="39" cy="48" r="5" fill={ink} />
          <circle cx="61" cy="48" r="5" fill={ink} />
        </g>
        <rect x="38" y="62" width="24" height="7" rx="3.5" fill={c3} />
        <rect x="14" y="42" width="6" height="16" rx="3" fill={c3} />
        <rect x="80" y="42" width="6" height="16" rx="3" fill={c3} />
      </g>
    );
  }
  if (scene === "ghost") {
    return (
      <g style={{ transformBox: "view-box", animation: "av-float 4.5s ease-in-out infinite" }}>
        <path d="M24 88 V52 C24 34 36 22 50 22 C64 22 76 34 76 52 V88 L67 81 L58 89 L50 81 L42 89 L33 81 Z" fill={c2} opacity="0.95" />
        <ellipse cx="41" cy="50" rx="4.2" ry="5.6" fill={ink} />
        <ellipse cx="59" cy="50" rx="4.2" ry="5.6" fill={ink} />
        <ellipse cx="50" cy="64" rx="4" ry="3" fill={ink} opacity="0.55" />
      </g>
    );
  }
  if (scene === "crown") {
    return (
      <g>
        <path d="M18 72 L14 30 L34 46 L50 20 L66 46 L86 30 L82 72 Z" fill={c2} stroke={ink} strokeWidth="1.6" strokeLinejoin="round" />
        <rect x="18" y="74" width="64" height="10" rx="4" fill={c3} />
        <circle cx="50" cy="79" r="3" fill={ink} />
        <circle cx="30" cy="55" r="2.6" fill={ink} className="av-pulse" />
        <circle cx="70" cy="55" r="2.6" fill={ink} className="av-pulse" style={{ animationDelay: "0.7s" }} />
        <circle cx="50" cy="42" r="2.6" fill={ink} className="av-pulse" style={{ animationDelay: "1.4s" }} />
      </g>
    );
  }
  // mushroom
  return (
    <g>
      <path d="M38 60 H62 V84 C62 88 58 91 50 91 C42 91 38 88 38 84 Z" fill={c3} opacity="0.95" />
      <path d="M12 60 C12 38 28 22 50 22 C72 22 88 38 88 60 Z" fill={c2} />
      <circle cx="34" cy="44" r="5" fill={ink} opacity="0.8" className="av-pulse" />
      <circle cx="58" cy="36" r="4" fill={ink} opacity="0.8" className="av-pulse" style={{ animationDelay: "0.8s" }} />
      <circle cx="68" cy="52" r="3.4" fill={ink} opacity="0.8" className="av-pulse" style={{ animationDelay: "1.5s" }} />
    </g>
  );
}

export default function ProfileAvatar({ avatarId, size = 48, className, showTier = false, glow = true }) {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const uploaded = typeof avatarId === "string" && (/^https?:\/\//.test(avatarId) || avatarId.startsWith("asset:"));
  const avatar = getAvatar(avatarId);
  const [c1, c2, c3] = avatar.colors;
  const gid = `g${uid}`;
  const rid = `r${uid}`;
  const gid2 = `s${uid}`;
  const { rings, dots, ghosts, glow: glowStrength } = avatar.variant;

  if (uploaded) {
    return (
      <UploadedAvatar avatarId={avatarId} size={size} className={className} glow={glow} />
    );
  }

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-[28%]", className)}
      style={{
        width: size,
        height: size,
        boxShadow: glow ? `0 0 ${Math.max(8, size / 5)}px -4px ${c3}` : undefined,
      }}
      title={avatar.name}
    >
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-label={avatar.name} role="img">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <radialGradient id={rid} cx="0.5" cy="0.42" r="0.7">
            <stop offset="0%" stopColor={c3} stopOpacity={0.85 * glowStrength} />
            <stop offset="100%" stopColor={c3} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={gid2} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={c3} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        <rect width="100" height="100" fill={`url(#${gid})`} />
        <circle cx="50" cy="44" r="50" fill={`url(#${rid})`} />

        {avatar.motion && <MotionLayer motion={avatar.motion} c3={c3} />}

        {Array.from({ length: ghosts }).map((_, i) => (
          <g
            key={`ghost-${i}`}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            className={avatar.animated ? (i % 2 === 0 ? "av-spin-slow" : "av-spin-rev") : ""}
            opacity={0.14}
          >
            <path
              d={avatar.glyph}
              fillRule="evenodd"
              fill="#ffffff"
              transform={`rotate(${(360 / ghosts) * i} 50 50) translate(50 50) scale(${0.86 - i * 0.1}) translate(-50 -50)`}
            />
          </g>
        ))}

        {avatar.scene ? (
          <SceneArt scene={avatar.scene} c2={c2} c3={c3} />
        ) : (
          <g className={avatar.animated ? "av-float" : ""} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <path
              d={avatar.glyph}
              fillRule="evenodd"
              fill={`url(#${gid2})`}
              transform="translate(50 50) scale(0.56) translate(-50 -50)"
              style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.45))" }}
            />
          </g>
        )}

        {rings > 0 && (
          <g className={avatar.animated ? "av-spin-slow" : ""} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke={c3} strokeWidth="1.2" strokeDasharray="7 10" opacity="0.75" />
            {rings > 1 && <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" strokeWidth="0.8" strokeDasharray="3 9" opacity="0.4" />}
          </g>
        )}

        {dots > 0 &&
          Array.from({ length: dots }).map((_, i) => (
            <g
              key={`dot-${i}`}
              className={avatar.animated ? "av-spin" : ""}
              style={{
                transformBox: "fill-box",
                transformOrigin: "center",
                animationDuration: `${5 + i * 2.5}s`,
                animationDirection: i % 2 ? "reverse" : "normal",
              }}
            >
              <circle cx="50" cy={12 + i * 3} r={2.4 - i * 0.4} fill="#ffffff" opacity="0.9" />
            </g>
          ))}

        {avatar.animated && !avatar.motion && (
          <circle
            cx="50"
            cy="50"
            r="49"
            fill="none"
            stroke={c3}
            strokeWidth="1.5"
            opacity="0.5"
            className="av-ping"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          />
        )}
      </svg>

      {showTier && (
        <span
          className="absolute bottom-0 left-0 right-0 bg-background/55 text-center text-[8px] font-semibold uppercase tracking-widest backdrop-blur-sm"
          style={{ color: c3 }}
        >
          {avatar.tierLabel}
        </span>
      )}
    </div>
  );
}