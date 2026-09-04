import { Fragment, type CSSProperties } from "react";
import { AffinityEmblem } from "@/components/AffinityEmblem";
import { AFFINITY_META, type AffinityKey } from "@/lib/affinityMeta";
import { TUTORIAL_CARDS } from "@/lib/tutorialData";
import "./TutorialSemanticText.css";

type TutorialSemanticKind =
  | "affinity"
  | "artifact"
  | "concept"
  | "field"
  | "mechanic"
  | "role"
  | "score"
  | "system"
  | "value";

interface TutorialSemanticToken {
  text: string;
  kind: TutorialSemanticKind;
  semanticId: string;
  affinity?: AffinityKey;
}

interface TutorialTextPart {
  offset: number;
  text: string;
  token?: TutorialSemanticToken;
}

type TutorialTermStyle = CSSProperties & {
  "--tutorial-term-color"?: string;
  "--tutorial-term-glow"?: string;
  "--tutorial-term-delay"?: string;
};

const AFFINITY_NAMES = [
  "Radiance",
  "Flare",
  "Continuum",
  "Verdance",
  "Abyss",
  "Singularity",
] as const;

const AFFINITY_BY_NAME = new Map<string, AffinityKey>(
  AFFINITY_NAMES.map((name) => [name.toLowerCase(), name.toLowerCase() as AffinityKey]),
);

const ARTIFACT_BY_NAME = new Map(
  Object.values(TUTORIAL_CARDS).map((card) => [card.name.toLowerCase(), card] as const),
);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const artifactPattern = [...ARTIFACT_BY_NAME.values()]
  .map((card) => escapeRegExp(card.name))
  .sort((a, b) => b.length - a.length)
  .join("|");
const affinityPattern = AFFINITY_NAMES.join("|");

const TUTORIAL_SEMANTIC_RE = new RegExp(
  [
    `[+x\\u00d7]?\\d+\\s+(?:${affinityPattern})`,
    artifactPattern,
    "Verdant Oracle",
    affinityPattern,
    "Civilization tab",
    "final round",
    "LUMINAe",
    "Affinit(?:y|ies)",
    "Artifacts?",
    "Architects?",
    "Forg(?:e|ed|ing)",
    "Harness(?:ed|ing)?",
    "Encrypt(?:ion|ed)?",
    "Eminence",
    "Luminar(?:y|ies)",
    "Well",
    "Domain",
    "signature",
    "interference",
    "[+x\\u00d7]?\\d+",
  ].filter(Boolean).join("|"),
  "gi",
);

const KINETIC_INTRODUCTIONS = new Set([
  "b2_lumii_intro:1:role:architect",
  "b3_architect:2:system:luminae",
  "b5_affinities:1:concept:affinity",
  "b6_forge_appears:0:mechanic:forge",
  "b6_forge_appears:0:concept:artifact",
  "b7_artifact_cost:1:value:10",
  "b8_first_harness:0:artifact:t1e01",
  "b8_first_harness:0:mechanic:harness",
  "b9b_affinity_returns:0:concept:well",
  "b9b_forge_complete:0:value:+1:verdance",
  "b9b_forge_complete:2:value:3:verdance",
  "b9b_forge_complete:2:value:2",
  "b9d_signature:0:field:signature",
  "b9e_interference:0:field:interference",
  "b9e_interference:2:system:civilization-tab",
  "b10_encrypt_principle:0:mechanic:encryption",
  "b10b_reserve_granted:0:affinity:singularity",
  "b14_win_condition:0:score:eminence",
  "b14_win_condition:5:role:luminary",
  "b15b_luminary_signal:0:luminary:verdant-oracle",
]);

const CONTEXTUAL_AFFINITIES = new Map<string, AffinityKey>([
  ["b9b_forge_complete:2:value:2", "verdance"],
]);

function affinityFromText(text: string): AffinityKey | undefined {
  const match = AFFINITY_NAMES.find((name) =>
    text.toLowerCase().endsWith(name.toLowerCase()),
  );
  return match ? AFFINITY_BY_NAME.get(match.toLowerCase()) : undefined;
}

function classifyTutorialTerm(text: string): TutorialSemanticToken {
  const normalized = text.toLowerCase();
  const quantityMatch = normalized.match(/^([+x\u00d7]?\d+)\s+([a-z]+)$/);
  if (quantityMatch) {
    const affinity = AFFINITY_BY_NAME.get(quantityMatch[2]);
    if (affinity) {
      return {
        text,
        kind: "value",
        semanticId: `value:${quantityMatch[1]}:${affinity}`,
        affinity,
      };
    }
  }

  const affinity = affinityFromText(text);
  if (affinity && AFFINITY_BY_NAME.has(normalized)) {
    return {
      text,
      kind: "affinity",
      semanticId: `affinity:${affinity}`,
      affinity,
    };
  }

  const artifact = ARTIFACT_BY_NAME.get(normalized);
  if (artifact) {
    return {
      text,
      kind: "artifact",
      semanticId: `artifact:${artifact.id}`,
      affinity: artifact.bonusAffinity,
    };
  }

  if (normalized === "verdant oracle") {
    return {
      text,
      kind: "role",
      semanticId: "luminary:verdant-oracle",
      affinity: "verdance",
    };
  }
  if (normalized === "luminae") {
    return { text, kind: "system", semanticId: "system:luminae" };
  }
  if (normalized === "civilization tab") {
    return { text, kind: "system", semanticId: "system:civilization-tab" };
  }
  if (/^architects?$/.test(normalized)) {
    return { text, kind: "role", semanticId: "role:architect" };
  }
  if (/^luminar(?:y|ies)$/.test(normalized)) {
    return { text, kind: "role", semanticId: "role:luminary" };
  }
  if (/^forg(?:e|ed|ing)$/.test(normalized)) {
    return { text, kind: "mechanic", semanticId: "mechanic:forge" };
  }
  if (/^harness(?:ed|ing)?$/.test(normalized)) {
    return { text, kind: "mechanic", semanticId: "mechanic:harness" };
  }
  if (/^encrypt(?:ion|ed)?$/.test(normalized)) {
    return { text, kind: "mechanic", semanticId: "mechanic:encryption" };
  }
  if (/^artifacts?$/.test(normalized)) {
    return { text, kind: "concept", semanticId: "concept:artifact" };
  }
  if (/^affinit(?:y|ies)$/.test(normalized)) {
    return { text, kind: "concept", semanticId: "concept:affinity" };
  }
  if (normalized === "well") {
    return { text, kind: "concept", semanticId: "concept:well" };
  }
  if (normalized === "domain") {
    return { text, kind: "concept", semanticId: "concept:domain" };
  }
  if (normalized === "signature" || normalized === "interference") {
    return { text, kind: "field", semanticId: `field:${normalized}` };
  }
  if (normalized === "eminence") {
    return { text, kind: "score", semanticId: "score:eminence" };
  }
  if (normalized === "final round") {
    return { text, kind: "score", semanticId: "score:final-round" };
  }

  return { text, kind: "value", semanticId: `value:${normalized}` };
}

export function tokenizeTutorialSemanticText(text: string): TutorialTextPart[] {
  const parts: TutorialTextPart[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TUTORIAL_SEMANTIC_RE)) {
    const offset = match.index ?? cursor;
    if (offset > cursor) {
      parts.push({ offset: cursor, text: text.slice(cursor, offset) });
    }
    parts.push({
      offset,
      text: match[0],
      token: classifyTutorialTerm(match[0]),
    });
    cursor = offset + match[0].length;
  }

  if (cursor < text.length) {
    parts.push({ offset: cursor, text: text.slice(cursor) });
  }

  return parts;
}

export function TutorialSemanticText({
  text,
  beatId,
  lineIndex,
  animateIntroductions = true,
}: {
  text: string;
  beatId: string;
  lineIndex: number;
  animateIntroductions?: boolean;
}) {
  const parts = tokenizeTutorialSemanticText(text);
  let semanticIndex = 0;

  return (
    <>
      {parts.map((part) => {
        if (!part.token) {
          return <Fragment key={`text-${part.offset}`}>{part.text}</Fragment>;
        }

        const token = part.token;
        const introductionKey = `${beatId}:${lineIndex}:${token.semanticId}`;
        const isIntroduction = animateIntroductions && KINETIC_INTRODUCTIONS.has(introductionKey);
        const affinity = token.affinity ?? CONTEXTUAL_AFFINITIES.get(introductionKey);
        const isForgeCostComparison = beatId === "b9b_forge_complete"
          && lineIndex === 2
          && token.kind === "value"
          && affinity === "verdance";
        const visibleText = isForgeCostComparison
          ? token.text.match(/^[+x\u00d7]?\d+/)?.[0] ?? token.text
          : token.text;
        const termIndex = semanticIndex++;
        const style: TutorialTermStyle = {
          "--tutorial-term-delay": `${Math.min(termIndex * 55, 220)}ms`,
        };
        if (affinity) {
          style["--tutorial-term-color"] = AFFINITY_META[affinity].hex;
          style["--tutorial-term-glow"] = AFFINITY_META[affinity].glowHex;
        }

        const modifier = token.semanticId === "mechanic:encryption"
          ? " tutorial-semantic-term--encryption"
          : affinity === "singularity"
            ? " tutorial-semantic-term--singularity"
            : "";

        return (
          <span
            key={`term-${part.offset}`}
            className={`tutorial-semantic-term tutorial-semantic-term--${token.kind}${modifier}`}
            data-introduction={isIntroduction ? "true" : undefined}
            data-semantic-id={token.semanticId}
            aria-label={isForgeCostComparison ? `${visibleText} ${AFFINITY_META[affinity].name}` : undefined}
            style={style}
          >
            <span aria-hidden={isForgeCostComparison ? "true" : undefined}>{visibleText}</span>
            {affinity && (
              <span className="tutorial-semantic-term__emblem" aria-hidden="true">
                <AffinityEmblem color={affinity} size={11} />
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}
