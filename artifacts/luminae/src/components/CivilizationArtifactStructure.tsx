import React from 'react';
import type {
  ArtifactManifestationFamily,
  CivilizationCameraScale,
} from '@workspace/game-types';
import type { ArtifactManifestationProfile } from '@/lib/civilizationArtifactManifestations';
import {
  getCivilizationArtifactRendering,
  getCivilizationStandaloneArtifactArt,
} from '@/lib/civilizationManifestationArtRegistry';

type StructureForm =
  | 'reactor'
  | 'garden'
  | 'chronometer'
  | 'foundry'
  | 'beacon'
  | 'gate'
  | 'archive'
  | 'vault'
  | 'observatory'
  | 'habitat'
  | 'network';

type LineageCode = 'r' | 's' | 'e' | 'o' | 'p';

const FAMILY_FORM: Record<ArtifactManifestationFamily, StructureForm> = {
  power_core: 'reactor',
  biological_catalyst: 'garden',
  chronology_device: 'chronometer',
  thermal_system: 'foundry',
  civic_signal: 'beacon',
  transit_system: 'gate',
  archive_system: 'archive',
  fabrication_system: 'foundry',
  containment_system: 'vault',
  concealment_system: 'vault',
  observation_system: 'observatory',
  habitat_system: 'habitat',
  ecology_system: 'garden',
  reclamation_system: 'foundry',
  boundary_system: 'gate',
  computation_system: 'network',
  accord_system: 'beacon',
  stellar_industry: 'reactor',
  galactic_network: 'network',
};

function getArtifactVariant(artifactId: string): number {
  const match = artifactId.match(/(\d+)$/);
  return match ? Math.max(1, Number(match[1])) : 1;
}

function getLineageCode(artifactId: string): LineageCode {
  const code = artifactId.match(/^t\d([rseop])/i)?.[1]?.toLowerCase();
  return code === 'r' || code === 's' || code === 'e' || code === 'o' || code === 'p'
    ? code
    : 'p';
}

export function getArtifactStructureSignature(
  artifactId: string,
  profile: ArtifactManifestationProfile,
): string {
  return `${artifactId}:${profile.nativeCameraScale}:${profile.manifestationFamily}:${getArtifactVariant(artifactId)}:${getLineageCode(artifactId)}`;
}

function LineageOrnament({
  lineage,
  tone,
  variant,
}: {
  lineage: LineageCode;
  tone: string;
  variant: number;
}) {
  const offset = (variant % 3) - 1;
  if (lineage === 'r') {
    return (
      <g stroke={tone} strokeWidth="1.2" strokeLinecap="round">
        <path d={`M22 ${42 + offset} L32 31 L42 ${42 - offset}`} fill="none" opacity="0.9" />
        <path d="M27 45 L32 38 L37 45" fill={`${tone}44`} opacity="0.84" />
      </g>
    );
  }
  if (lineage === 's') {
    return (
      <g fill="none" stroke={tone} strokeWidth="1">
        <ellipse cx="32" cy="38" rx={10 + (variant % 2) * 2} ry="4.8" opacity="0.86" />
        <ellipse cx="32" cy="38" rx="5.4" ry="11" transform="rotate(28 32 38)" opacity="0.52" />
      </g>
    );
  }
  if (lineage === 'e') {
    return (
      <g fill={`${tone}38`} stroke={tone} strokeWidth="0.9">
        <path d="M31 43 C22 41 21 33 23 29 C29 30 33 35 31 43 Z" />
        <path d="M33 43 C42 40 44 33 42 28 C36 30 32 35 33 43 Z" />
        <path d="M32 44 V29" fill="none" stroke="rgba(241,238,216,0.72)" strokeWidth="0.7" />
      </g>
    );
  }
  if (lineage === 'o') {
    return (
      <g fill="none" stroke={tone} strokeWidth="1.1">
        <path d="M24 34 C27 25 42 27 43 37 C40 33 34 32 29 35 C27 37 26 40 27 44 C23 42 22 38 24 34 Z" fill={`${tone}2E`} />
        <path d="M22 39 H44" opacity="0.48" />
      </g>
    );
  }
  return (
    <g fill={`${tone}32`} stroke={tone} strokeWidth="0.9">
      <path d="M32 27 L40 37 L32 47 L24 37 Z" />
      <path d="M32 30 V44 M27 37 H37" fill="none" stroke="rgba(250,243,219,0.76)" strokeWidth="0.75" />
    </g>
  );
}

function SurfaceStructure({
  form,
  tone,
  variant,
}: {
  form: StructureForm;
  tone: string;
  variant: number;
}) {
  const height = 2 + (variant % 4) * 2;
  const side = `${tone}28`;
  const light = 'rgba(237,225,198,0.82)';
  const dark = 'rgba(7,9,14,0.96)';

  if (form === 'garden') {
    return (
      <g>
        <path d="M15 57 C15 45 20 36 26 31 C28 39 27 49 24 57 Z" fill={dark} stroke={light} strokeWidth="0.7" />
        <path d="M49 57 C49 45 44 36 38 31 C36 39 37 49 40 57 Z" fill={dark} stroke={light} strokeWidth="0.7" />
        <path d={`M26 57 C25 ${38 - height} 29 ${24 - height} 32 ${19 - height} C36 ${25 - height} 39 ${38 - height} 38 57 Z`} fill={side} stroke={tone} strokeWidth="1" />
        <path d="M32 56 V24 M22 49 L32 38 L43 47" fill="none" stroke={light} strokeWidth="0.85" opacity="0.72" />
      </g>
    );
  }
  if (form === 'chronometer') {
    return (
      <g>
        <path d={`M27 57 L28 ${24 - height} L32 ${17 - height} L36 ${24 - height} L37 57 Z`} fill={dark} stroke={light} strokeWidth="0.8" />
        <ellipse cx="32" cy={34 - height} rx={13 + (variant % 2) * 2} ry="5.5" fill="none" stroke={tone} strokeWidth="1.1" />
        <ellipse cx="32" cy={34 - height} rx="6" ry="15" fill="none" stroke={tone} strokeWidth="0.75" opacity="0.66" transform={`rotate(${18 + variant * 3} 32 ${34 - height})`} />
        <circle cx="32" cy={34 - height} r="3" fill={light} stroke={tone} strokeWidth="1" />
      </g>
    );
  }
  if (form === 'foundry') {
    return (
      <g>
        <path d={`M13 57 V${40 - height} L22 ${34 - height} V${42 - height} L31 ${35 - height} V57 Z`} fill={dark} stroke={light} strokeWidth="0.75" />
        <path d={`M34 57 L36 ${20 - height} H43 L45 57 Z M47 57 L49 ${29 - height} H55 L56 57 Z`} fill={dark} stroke={light} strokeWidth="0.7" />
        <path d="M17 50 H27 M37 45 H44 M49 48 H55" stroke={tone} strokeWidth="2" strokeLinecap="round" />
        <path d={`M39 ${18 - height} C35 ${13 - height} 42 ${9 - height} 39 ${5 - height}`} fill="none" stroke={tone} strokeWidth="1.1" opacity="0.3" />
      </g>
    );
  }
  if (form === 'beacon') {
    return (
      <g>
        <path d={`M24 57 L28 ${22 - height} L32 ${13 - height} L36 ${22 - height} L41 57 Z`} fill={dark} stroke={light} strokeWidth="0.8" />
        <path d="M19 57 L22 40 H27 L27 57 Z M37 57 L38 40 H43 L46 57 Z" fill={side} stroke={tone} strokeWidth="0.65" />
        <circle cx="32" cy={16 - height} r="3.6" fill={tone} stroke={light} strokeWidth="0.8" />
        <path d={`M20 ${18 - height} Q32 ${8 - height} 44 ${18 - height} M16 ${24 - height} Q32 ${9 - height} 48 ${24 - height}`} fill="none" stroke={tone} strokeWidth="0.7" opacity="0.54" />
      </g>
    );
  }
  if (form === 'gate') {
    return (
      <g>
        <path d={`M12 57 V${37 - height} C12 ${18 - height} 23 ${12 - height} 32 ${12 - height} C43 ${12 - height} 52 ${21 - height} 52 ${37 - height} V57 H43 V${37 - height} C43 ${28 - height} 39 ${23 - height} 32 ${23 - height} C25 ${23 - height} 21 ${28 - height} 21 ${37 - height} V57 Z`} fill={dark} stroke={light} strokeWidth="0.85" />
        <path d={`M23 54 V${38 - height} C23 ${31 - height} 26 ${27 - height} 32 ${27 - height} C38 ${27 - height} 41 ${31 - height} 41 ${38 - height} V54`} fill={side} stroke={tone} strokeWidth="1.1" />
        <path d={`M15 ${38 - height} Q32 ${15 - height} 49 ${38 - height}`} fill="none" stroke={tone} strokeWidth="1.25" opacity="0.72" />
      </g>
    );
  }
  if (form === 'archive') {
    return (
      <g>
        <path d={`M20 57 L23 ${26 - height} L32 ${14 - height} L41 ${26 - height} L44 57 Z`} fill={dark} stroke={light} strokeWidth="0.8" />
        <path d={`M27 ${29 - height} H37 M26 ${36 - height} H38 M25 ${44 - height} H39`} stroke={tone} strokeWidth="1.15" />
        <path d={`M32 ${17 - height} V54`} stroke={light} strokeWidth="0.6" opacity="0.5" />
      </g>
    );
  }
  if (form === 'vault') {
    return (
      <g>
        <path d={`M13 57 V${38 - height} C13 ${22 - height} 21 ${16 - height} 32 ${16 - height} C43 ${16 - height} 51 ${22 - height} 51 ${38 - height} V57 Z`} fill={dark} stroke={light} strokeWidth="0.9" />
        <path d={`M20 57 V${39 - height} C20 ${29 - height} 25 ${24 - height} 32 ${24 - height} C39 ${24 - height} 44 ${29 - height} 44 ${39 - height} V57`} fill="none" stroke={tone} strokeWidth="1.1" />
        <circle cx="32" cy={38 - height} r={4 + (variant % 2)} fill={side} stroke={tone} strokeWidth="1" />
      </g>
    );
  }
  if (form === 'observatory') {
    return (
      <g>
        <path d={`M27 57 V${36 - height} H37 V57 Z`} fill={dark} stroke={light} strokeWidth="0.7" />
        <path d={`M15 ${25 - height} Q32 ${39 - height} 49 ${25 - height} Q42 ${10 - height} 32 ${10 - height} Q22 ${10 - height} 15 ${25 - height} Z`} fill={dark} stroke={light} strokeWidth="0.8" />
        <path d={`M20 ${24 - height} Q32 ${33 - height} 44 ${24 - height}`} fill="none" stroke={tone} strokeWidth="1.2" />
        <circle cx="32" cy={24 - height} r="2.8" fill={tone} />
      </g>
    );
  }
  if (form === 'habitat') {
    return (
      <g>
        <path d={`M7 57 V${43 - height} C7 ${30 - height} 13 ${25 - height} 20 ${25 - height} C27 ${25 - height} 32 ${31 - height} 32 ${43 - height} V57 Z`} fill={dark} stroke={light} strokeWidth="0.75" />
        <path d={`M30 57 V${36 - height} C30 ${19 - height} 37 ${13 - height} 45 ${13 - height} C54 ${13 - height} 58 ${22 - height} 58 ${36 - height} V57 Z`} fill={dark} stroke={light} strokeWidth="0.75" />
        <path d={`M12 ${43 - height} H27 M35 ${36 - height} H53`} stroke={tone} strokeWidth="1.6" />
        <path d={`M20 ${26 - height} V56 M45 ${14 - height} V56`} stroke={tone} strokeWidth="0.6" opacity="0.46" />
      </g>
    );
  }
  if (form === 'network') {
    return (
      <g>
        {[18, 32, 46].map((x, index) => (
          <g key={x}>
            <path d={`M${x - 3} 57 L${x - 2} ${32 - height - index * 4} H${x + 2} L${x + 3} 57 Z`} fill={dark} stroke={light} strokeWidth="0.65" />
            <circle cx={x} cy={30 - height - index * 4} r="2.8" fill={tone} stroke={light} strokeWidth="0.55" />
          </g>
        ))}
        <path d={`M18 ${30 - height} L32 ${26 - height} L46 ${22 - height} M18 ${30 - height} L46 ${22 - height}`} fill="none" stroke={tone} strokeWidth="0.8" opacity="0.7" />
      </g>
    );
  }
  return (
    <g>
      <path d={`M20 57 L23 ${25 - height} L28 ${18 - height} H36 L41 ${25 - height} L44 57 Z`} fill={dark} stroke={light} strokeWidth="0.85" />
      <path d={`M27 48 L29 ${27 - height} H35 L37 48 Z`} fill={side} stroke={tone} strokeWidth="1" />
      <circle cx="32" cy={31 - height} r={4 + (variant % 3)} fill={tone} stroke={light} strokeWidth="0.75" />
      <path d="M13 53 H22 M42 53 H51" stroke={tone} strokeWidth="1.6" />
    </g>
  );
}

function OrbitalStructure({ tone, variant, form }: { tone: string; variant: number; form: StructureForm }) {
  const wide = form === 'gate' || form === 'habitat' || form === 'network';
  const rotation = ((variant % 5) - 2) * 5;
  return (
    <g transform={`rotate(${rotation} 32 36)`}>
      <ellipse cx="32" cy="58" rx="17" ry="3.4" fill="rgba(0,0,0,0.62)" />
      <path d={wide ? 'M13 35 Q32 20 51 35 Q32 50 13 35 Z' : 'M20 27 H44 L50 35 L44 43 H20 L14 35 Z'} fill="rgba(8,11,18,0.96)" stroke="rgba(235,229,211,0.72)" strokeWidth="0.9" />
      <path d="M4 31 H15 V39 H4 Z M49 31 H60 V39 H49 Z" fill={`${tone}32`} stroke={tone} strokeWidth="0.8" />
      <path d="M4 35 H60" stroke={tone} strokeWidth="1" opacity="0.64" />
      <ellipse cx="32" cy="35" rx={7 + (variant % 3)} ry="13" fill="none" stroke={tone} strokeWidth="1" transform={`rotate(${28 + variant * 4} 32 35)`} />
      <circle cx="32" cy="35" r="4" fill={tone} stroke="rgba(255,246,218,0.78)" strokeWidth="0.8" />
    </g>
  );
}

function StellarStructure({ tone, variant }: { tone: string; variant: number }) {
  const nodeCount = 3 + (variant % 4);
  return (
    <g>
      <ellipse cx="32" cy="58" rx="19" ry="3" fill="rgba(0,0,0,0.58)" />
      <circle cx="32" cy="34" r="5" fill="rgba(249,237,199,0.9)" stroke={tone} strokeWidth="1" />
      <circle cx="32" cy="34" r="11" fill={`${tone}18`} stroke={tone} strokeWidth="0.8" opacity="0.88" />
      <ellipse cx="32" cy="34" rx={20 + (variant % 2) * 3} ry={8 + (variant % 3)} fill="none" stroke={tone} strokeWidth="0.8" transform={`rotate(${variant * 11} 32 34)`} />
      {Array.from({ length: nodeCount }, (_, index) => {
        const angle = ((index / nodeCount) * Math.PI * 2) + variant * 0.23;
        const x = 32 + Math.cos(angle) * 22;
        const y = 34 + Math.sin(angle) * 9;
        return <circle key={index} cx={x} cy={y} r={index % 2 ? 1.4 : 2} fill={index % 2 ? tone : 'rgba(247,239,213,0.9)'} />;
      })}
      <path d="M32 45 V57 M25 57 H39" stroke="rgba(225,218,199,0.62)" strokeWidth="0.8" />
    </g>
  );
}

function GalacticStructure({ tone, variant }: { tone: string; variant: number }) {
  const nodeCount = 4 + (variant % 4);
  return (
    <g>
      <ellipse cx="32" cy="35" rx="25" ry="10" fill={`${tone}0F`} stroke={tone} strokeWidth="0.7" opacity="0.82" transform={`rotate(${(variant % 5 - 2) * 8} 32 35)`} />
      <path d={`M10 40 C18 ${18 + variant} 44 ${19 - variant} 55 34 C44 51 24 54 13 42`} fill="none" stroke={tone} strokeWidth="1" opacity="0.74" />
      {Array.from({ length: nodeCount }, (_, index) => {
        const angle = (index / nodeCount) * Math.PI * 2 + variant * 0.31;
        const radiusX = 13 + (index % 3) * 5;
        const radiusY = 5 + (index % 2) * 4;
        return (
          <circle
            key={index}
            cx={32 + Math.cos(angle) * radiusX}
            cy={35 + Math.sin(angle) * radiusY}
            r={index === 0 ? 2.2 : 1.1}
            fill={index % 2 ? tone : 'rgba(248,240,215,0.92)'}
          />
        );
      })}
      <circle cx="32" cy="35" r="3.2" fill={tone} />
    </g>
  );
}

function StandaloneStructure({
  artifactId,
  renderingId,
}: {
  artifactId: string;
  renderingId?: string;
}) {
  const art = getCivilizationStandaloneArtifactArt(artifactId, renderingId);
  if (!art) return null;
  const atlas = art.atlas;
  const groundOffset = Math.max(0, Math.min(1, 1 - art.groundLine));
  return (
    <span
      className="absolute bottom-0 left-1/2 block overflow-visible"
      style={{
        width: `${art.scale * 100}%`,
        aspectRatio: String(art.cellAspectRatio),
        clipPath: groundOffset > 0
          ? `inset(0 0 ${(groundOffset * 100).toFixed(1)}% 0)`
          : undefined,
        transform: `translate(-50%, ${(groundOffset * 100).toFixed(1)}%)`,
      }}
      data-render-medium="authored-standalone-artifact-sprite"
      data-artifact-ground-line={art.groundLine}
    >
      <span className="absolute inset-0 overflow-hidden">
        <img
          src={art.src}
          alt=""
          className={atlas ? 'absolute max-w-none' : 'absolute inset-0 h-full w-full object-contain'}
          style={{
            ...(atlas ? {
              width: `${atlas.columns * 100}%`,
              height: `${atlas.rows * 100}%`,
              left: `${-atlas.column * 100}%`,
              top: `${-atlas.row * 100}%`,
            } : {}),
          }}
          decoding="async"
          draggable={false}
        />
      </span>
    </span>
  );
}

export function CivilizationArtifactStructure({
  artifactId,
  profile,
  tone,
  scene,
  renderingId,
}: {
  artifactId: string;
  profile: ArtifactManifestationProfile;
  tone: string;
  scene: CivilizationCameraScale;
  renderingId?: string;
}) {
  const rendering = getCivilizationArtifactRendering(artifactId, renderingId);
  const standalone = rendering?.art ?? null;
  const variant = getArtifactVariant(artifactId);
  const lineage = getLineageCode(artifactId);
  const form = FAMILY_FORM[profile.manifestationFamily];
  const id = `artifact-structure-${artifactId.replace(/[^a-z0-9_-]/gi, '-')}`;
  const signature = getArtifactStructureSignature(artifactId, profile);

  if (standalone) {
    return (
      <span
        className="absolute inset-0"
        data-artifact-structure-signature={signature}
        data-artifact-structure-form="authored-standalone"
        data-artifact-rendering-id={rendering?.id}
      >
        <StandaloneStructure artifactId={artifactId} renderingId={rendering?.id} />
      </span>
    );
  }

  return (
    <svg
      className="h-full w-full overflow-visible"
      viewBox="0 0 64 72"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      data-artifact-structure-signature={signature}
      data-artifact-structure-form={form}
    >
      <defs>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(239,224,194,0.64)" />
          <stop offset="0.35" stopColor="rgba(35,38,45,0.96)" />
          <stop offset="1" stopColor="rgba(5,7,12,0.98)" />
        </linearGradient>
        <radialGradient id={`${id}-core`} cx="50%" cy="44%" r="58%">
          <stop offset="0" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="0.28" stopColor={tone} />
          <stop offset="1" stopColor={tone} stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="62" rx="22" ry="5" fill="rgba(0,0,0,0.72)" />
      {scene === 'surface' && <SurfaceStructure form={form} tone={tone} variant={variant} />}
      {scene === 'orbit' && <OrbitalStructure form={form} tone={tone} variant={variant} />}
      {scene === 'stellar' && <StellarStructure tone={tone} variant={variant} />}
      {scene === 'galaxy' && <GalacticStructure tone={tone} variant={variant} />}
      <LineageOrnament lineage={lineage} tone={tone} variant={variant} />
      <path d="M13 58 L20 54 H44 L51 58 L45 64 H19 Z" fill={`url(#${id}-base)`} stroke={`${tone}88`} strokeWidth="0.8" />
      <ellipse cx="32" cy="57" rx={7 + (variant % 3)} ry="2.4" fill={`url(#${id}-core)`} opacity="0.9" />
      {Array.from({ length: 1 + (variant % 3) }, (_, index) => (
        <circle
          key={index}
          cx={19 + index * (26 / Math.max(1, variant % 3))}
          cy={59 - (index % 2) * 2}
          r="0.9"
          fill={tone}
          opacity="0.82"
        />
      ))}
    </svg>
  );
}
