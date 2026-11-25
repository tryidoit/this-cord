// GitHub Pages serves the app from a sub-path with no server-side routing, so routes live in the URL hash (#/login).
// hardNavigate = "go there and reload", which is what the old `window.location.href = "/x"` did.
export function hardNavigate(path = "/") {
  window.location.hash = path.startsWith("/") ? path : "/" + path;
  window.location.reload();
}
export const currentRoute = () => window.location.hash.replace(/^#/, "") || "/";
