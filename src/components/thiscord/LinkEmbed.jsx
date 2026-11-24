import React from "react";
import { X, ExternalLink } from "lucide-react";

const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/;
const VIMEO_RE = /vimeo\.com\/(\d+)/;
const SPOTIFY_RE = /open\.spotify\.com\/(track|episode|show|album|artist|playlist)\/([\w]+)/;
const TWITCH_RE = /twitch\.tv\/([\w]+)/;

function isImageUrl(url) {
  return /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(url);
}
function isVideoUrl(url) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}
function isAudioUrl(url) {
  return /\.(mp3|wav|flac|aac|m4a|ogg)(\?|$)/i.test(url);
}

export default function LinkEmbed({ url, onSuppress }) {
  if (!url) return null;

  let embed = null;

  // YouTube
  const ytMatch = url.match(YOUTUBE_RE);
  if (ytMatch) {
    embed = (
      <iframe
        src={`https://www.youtube.com/embed/${ytMatch[1]}`}
        className="aspect-video w-full rounded-xl border border-border"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Vimeo
  const vimeoMatch = url.match(VIMEO_RE);
  if (!embed && vimeoMatch) {
    embed = (
      <iframe
        src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
        className="aspect-video w-full rounded-xl border border-border"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }

  // Spotify
  const spotifyMatch = url.match(SPOTIFY_RE);
  if (!embed && spotifyMatch) {
    embed = (
      <iframe
        src={`https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`}
        className="h-24 w-full rounded-xl border border-border"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      />
    );
  }

  // Twitch
  const twitchMatch = url.match(TWITCH_RE);
  if (!embed && twitchMatch) {
    embed = (
      <iframe
        src={`https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${window.location.hostname}`}
        className="aspect-video w-full rounded-xl border border-border"
        allow="autoplay; fullscreen"
        allowFullScreen
      />
    );
  }

  // Direct image
  if (!embed && isImageUrl(url)) {
    embed = (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="" className="max-h-72 max-w-full rounded-xl border border-border" />
      </a>
    );
  }

  // Direct video
  if (!embed && isVideoUrl(url)) {
    embed = <video src={url} controls className="max-h-72 max-w-full rounded-xl border border-border" />;
  }

  // Direct audio
  if (!embed && isAudioUrl(url)) {
    embed = <audio src={url} controls className="w-full" />;
  }

  // Simple card for other links
  if (!embed) {
    let domain;
    try { domain = new URL(url).hostname.replace("www.", ""); } catch { domain = url; }
    embed = (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 transition hover:bg-muted/50">
        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" className="h-4 w-4 rounded" onError={(e) => e.target.style.display = "none"} />
        <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">{domain}</span>
        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
      </a>
    );
  }

  return (
    <div className="group relative mt-1">
      {embed}
      {onSuppress && (
        <button
          onClick={onSuppress}
          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-lg bg-background/80 text-muted-foreground opacity-0 transition hover:text-foreground group-hover:opacity-100"
          title="Suppress embed"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}