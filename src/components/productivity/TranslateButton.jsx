import React, { useState } from "react";
import { Languages, ExternalLink, Check, Loader2 } from "lucide-react";
import { translateMessage } from "@/lib/productivity";

export default function TranslateButton({ text }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleTranslate = async () => {
    if (showResult) {
      setShowResult(false);
      return;
    }
    setLoading(true);
    const res = await translateMessage(text);
    setResult(res);
    setShowResult(true);
    setLoading(false);
  };

  return (
    <div className="relative">
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
        title="Translate"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
        Translate
      </button>
      {showResult && result && (
        <div className="absolute right-0 top-full z-20 mt-1 max-w-xs rounded-lg border border-border bg-popover p-2.5 shadow-xl">
          {result.translated ? (
            <>
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                <Check className="h-2.5 w-2.5 text-success" /> Translated
              </div>
              <p className="text-xs text-foreground">{result.translated}</p>
            </>
          ) : (
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Open in Google Translate
            </a>
          )}
        </div>
      )}
    </div>
  );
}