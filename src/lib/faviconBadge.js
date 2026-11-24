let originalHref = null;
let canvas = null;
let ctx = null;

function ensureCanvas() {
  if (typeof document === "undefined") return null;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    ctx = canvas.getContext("2d");
  }
  return ctx;
}

function getOriginalFavicon() {
  const link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
  if (link && link.href) return link.href;
  return "/favicon.ico";
}

export function drawFaviconBadge(count, mentions = 0) {
  if (typeof document === "undefined") return;
  const ctx = ensureCanvas();
  if (!ctx) return;

  if (originalHref === null) {
    originalHref = getOriginalFavicon();
  }

  if (count <= 0) {
    const link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
    if (link && originalHref) {
      link.href = originalHref;
    }
    return;
  }

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.clearRect(0, 0, 32, 32);
    ctx.drawImage(img, 0, 0, 32, 32);

    const radius = 10;
    const cx = 32 - radius - 1;
    const cy = radius + 1;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fillStyle = mentions > 0 ? "#f04747" : "#5865f2";
    ctx.fill();

    ctx.strokeStyle = "#1e1f22";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = count > 99 ? "99+" : String(count);
    ctx.fillText(label, cx, cy + 0.5);

    const link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
    if (link) {
      link.href = canvas.toDataURL("image/png");
    }
  };
  img.onerror = () => {
    // If the favicon can't be loaded (CORS), just draw the badge on a solid circle
    ctx.clearRect(0, 0, 32, 32);
    const radius = 12;
    ctx.beginPath();
    ctx.arc(16, 16, radius, 0, 2 * Math.PI);
    ctx.fillStyle = mentions > 0 ? "#f04747" : "#5865f2";
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = count > 99 ? "99+" : String(count);
    ctx.fillText(label, 16, 16);

    const link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
    if (link) {
      link.href = canvas.toDataURL("image/png");
    }
  };
  img.src = originalHref;
}