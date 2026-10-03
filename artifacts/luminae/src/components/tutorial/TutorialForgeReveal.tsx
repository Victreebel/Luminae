import { useState, type ReactNode } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import {
  ForgeMoldCavity,
  ForgeReplacementDealAnimation as ForgeMoltenFormationAnimation,
} from '@/components/ForgeReplacementDealAnimation';
import { ArtifactCardView } from '@/pages/game-card';
import { CompactForgeCardReadout } from '@/pages/game-board-forge-card-slot';

/** Tutorial paths form in place with the same material and timing as live play. */
export function TutorialForgeReveal({
  children, card, costs, shouldAnimate, slotKey, delay = 420, onComplete,
}: {
  children: ReactNode;
  card: ArtifactCard;
  costs: Partial<ArtifactCard['cost']>;
  shouldAnimate: boolean;
  slotKey: string;
  delay?: number;
  onComplete: () => void;
}) {
  const [formed, setFormed] = useState(false);
  if (!shouldAnimate || formed) return <>{children}</>;
  return <>
    <div data-slot-key={slotKey} className="forge-foundry-mold forge-depth-mold board-forge-compact-chip relative min-w-0 overflow-hidden">
      <ForgeMoldCavity />
    </div>
    <ForgeMoltenFormationAnimation
      animKey={`tutorial-reveal-${card.id}`}
      cardId={card.id}
      tier={card.tier}
      bonusAffinity={card.bonusAffinity}
      cost={card.cost}
      compact
      targetSlotKey={slotKey}
      slotRect={{ x: 0, y: 0, w: 73, h: 104 }}
      delayMs={delay}
      cardFace={<ArtifactCardView card={card} tier={card.tier} artOnly />}
      cardOverlay={<CompactForgeCardReadout card={card} costs={costs} />}
      onComplete={() => { setFormed(true); onComplete(); }}
    />
  </>;
}
