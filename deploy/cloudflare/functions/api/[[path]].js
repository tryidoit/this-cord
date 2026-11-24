// Cloudflare Pages Function: proxies /api/* to your backend (streams SSE through).
export async function onRequest({ request, env }) {
  const backend = (env.BACKEND_URL || "").replace(/\/$/, "");
  if (!backend) return new Response("BACKEND_URL is not set", { status: 500 });
  const url = new URL(request.url);
  const target = backend + url.pathname + url.search;
  const headers = new Headers(request.headers);
  headers.set("x-forwarded-host", url.host);
  headers.set("x-forwarded-proto", "https");
  return fetch(new Request(target, { method: request.method, headers, body: request.body, redirect: "manual" }));
}
