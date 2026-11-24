import React, { useEffect, useState } from "react";
import { getAssetUrl } from "@/lib/assets";
import { cn } from "@/lib/utils";

// Renders an image from a URL or an "asset:<id>" reference.
// Shows a skeleton placeholder while the asset loads lazily.
export default function AssetImage({ src, alt = "", className, placeholderClassName }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    if (!src) { setUrl(null); setLoading(false); return; }
    if (/^https?:\/\//.test(src)) { setUrl(src); setLoading(false); return; }
    getAssetUrl(src).then((resolved) => {
      if (alive) { setUrl(resolved); setLoading(false); }
    });
    return () => { alive = false; };
  }, [src]);

  if (loading) {
    return <div className={cn("animate-pulse bg-muted/50", placeholderClassName || className)} />;
  }
  if (!url) {
    return <div className={cn("bg-muted/30", placeholderClassName || className)} />;
  }
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}