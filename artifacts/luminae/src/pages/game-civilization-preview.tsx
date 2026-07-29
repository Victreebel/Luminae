import { KardashevScene } from '@/components/KardashevScene';
import type { AffinityPalette, KardashevTier } from '@/lib/kardashev';

export type CivilizationPreviewPlacement = 'left' | 'rail';

export interface CivilizationPreviewModel {
  name: string;
  tier: KardashevTier;
  palette: AffinityPalette;
  forgedCount: number;
}

interface CivilizationPreviewModuleProps {
  placement: CivilizationPreviewPlacement;
  playerEminence: number;
  civilizationModel: CivilizationPreviewModel;
  progressFraction: number;
}

function CivilizationPreviewModule({
  placement,
  playerEminence,
  civilizationModel,
  progressFraction,
}: CivilizationPreviewModuleProps) {
  return (
    <section
      key={`civilization-preview-${placement}`}
      className="board-aux-module board-aux-module--civ"
      aria-label="Civilization preview"
      data-civilization-drop-target={placement}
    >
      <div className="board-aux-module-header">
        <span>Civilization</span>
        <span>{playerEminence} Eminence</span>
      </div>
      <div className="board-aux-civ-scene">
        <KardashevScene
          tier={civilizationModel.tier}
          palette={civilizationModel.palette}
          progressFraction={progressFraction}
          paused
          maxDpr={1}
          className="relative h-full w-full overflow-hidden bg-black"
        />
      </div>
      <div className="board-aux-civ-footer">
        <span
          className="truncate"
          style={{ color: civilizationModel.palette.primary }}
        >
          {civilizationModel.name}
        </span>
        <span>{civilizationModel.forgedCount} forged</span>
      </div>
    </section>
  );
}

type BoardAuxModulesProps = CivilizationPreviewModuleProps;

export function BoardAuxModules({
  placement = 'rail',
  playerEminence,
  civilizationModel,
  progressFraction,
}: BoardAuxModulesProps) {
  return (
    <aside
      key={`board-aux-${placement}`}
      className={`board-aux-modules board-aux-modules--${placement}`}
      aria-label={placement === 'left' ? 'Left supplemental board modules' : 'Supplemental board modules'}
    >
      <CivilizationPreviewModule
        placement={placement}
        playerEminence={playerEminence}
        civilizationModel={civilizationModel}
        progressFraction={progressFraction}
      />
    </aside>
  );
}
