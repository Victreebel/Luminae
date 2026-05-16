import React from "react";

/**
 * Tutorial keyword highlighting registry.
 *
 * Each entry defines:
 *   - pattern  : word-boundary-aware regex (case-sensitive, matching Lumii's exact phrasing)
 *   - color    : primary display color
 *   - glowColor: optional drop-shadow / text-shadow color for the shimmer span
 *
 * To add a new term, append an entry to KEYWORDS below.
 */
export interface KeywordDef {
  pattern: RegExp;
  color: string;
  glowColor?: string;
}

export const KEYWORDS: KeywordDef[] = [
  // ── Forge / Forged ─────────────────────────────────────────────────────
  {
    pattern: /\b(Forge[ds]?|Forging)\b/g,
    color: "#F59E0B",       // warm amber-gold
    glowColor: "#F59E0B",
  },

  // ── Eminence ────────────────────────────────────────────────────────────
  {
    pattern: /\bEminence\b/g,
    color: "#FDE68A",       // radiant pale-gold
    glowColor: "#FDE68A",
  },

  // ── Affinities / Affinity ───────────────────────────────────────────────
  {
    pattern: /\bAffinit(?:ies|y)\b/g,
    color: "#E2E8F0",       // prismatic white (matches --color-gem-pearl)
    glowColor: "#C4B5FD",   // soft violet glow to hint at prismatic spectrum
  },

  // ── Singularity ─────────────────────────────────────────────────────────
  {
    pattern: /\bSingularity\b/g,
    color: "#FFC43D",       // flux-yellow (matches --color-gem-flux)
    glowColor: "#FFC43D",
  },

  // ── Luminaries / Luminary ───────────────────────────────────────────────
  {
    pattern: /\bLuminar(?:ies|y)\b/g,
    color: "#C084FC",       // violet/purple
    glowColor: "#A855F7",
  },

  // ── Reserve / Reserving / Reserved ──────────────────────────────────────
  {
    pattern: /\bReserv(?:e[ds]?|ing)\b/g,
    color: "#60A5FA",       // blue (matches Continuum / sapphire palette)
    glowColor: "#3B82F6",
  },

  // ── Artifact / Artifacts ────────────────────────────────────────────────
  {
    pattern: /\bArtifacts?\b/g,
    color: "#FB923C",       // warm orange-amber (artifact feel, distinct from Forge)
    glowColor: "#F97316",
  },

  // ── Harvest / Harness ───────────────────────────────────────────────────
  {
    pattern: /\bHar(?:vest|ness)(?:ing|ed)?\b/g,
    color: "#4ADE80",       // verdant green (matches --color-gem-emerald)
    glowColor: "#22C55E",
  },

  // ── Discounted / Discounts ──────────────────────────────────────────────
  {
    pattern: /\bDiscounts?\b|\bDiscounted\b/g,
    color: "#2DD4BF",       // teal-cyan
    glowColor: "#14B8A6",
  },

  // ── Needed ──────────────────────────────────────────────────────────────
  {
    pattern: /\bNeeded\b/g,
    color: "#F87171",       // soft coral-red (shortfall / gap feel)
    glowColor: "#EF4444",
  },

  // ── Verdance ────────────────────────────────────────────────────────────
  {
    pattern: /\bVerdance\b/g,
    color: "#34D399",       // emerald-green
    glowColor: "#10B981",
  },
];

/**
 * Splits `text` into alternating plain and keyword segments and returns a
 * React fragment. Keyword spans carry inline color + a CSS class that drives
 * the lumii-keyword-shimmer brightness-pulse animation defined in index.css.
 *
 * Usage:
 *   <p>{renderKeywords(text)}</p>
 */
export function renderKeywords(text: string): React.ReactNode {
  if (!text) return text;

  // Build a single combined regex that preserves capture groups so we can
  // identify which keyword matched.
  const sources = KEYWORDS.map((k) => `(${k.pattern.source})`);
  const combined = new RegExp(sources.join("|"), "g");

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = combined.exec(text)) !== null) {
    // Push any plain text before this match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    // Determine which keyword group matched
    const matchedText = match[0];
    let keyword: KeywordDef | undefined;

    // Each KEYWORD contributes 1 capture group (its own source pattern).
    // match[1] is the first group, match[2] the second, etc.
    for (let i = 0; i < KEYWORDS.length; i++) {
      if (match[i + 1] !== undefined) {
        keyword = KEYWORDS[i];
        break;
      }
    }

    if (keyword) {
      nodes.push(
        <span
          key={`kw-${match.index}`}
          className="lumii-keyword-shimmer"
          style={{
            color: keyword.color,
            fontWeight: 700,
            letterSpacing: "0.02em",
            textShadow: keyword.glowColor
              ? `0 0 8px ${keyword.glowColor}55`
              : undefined,
          }}
        >
          {matchedText}
        </span>
      );
    } else {
      nodes.push(matchedText);
    }

    lastIndex = match.index + matchedText.length;
  }

  // Push trailing plain text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes}</>;
}
