import type { ArtifactCard } from '@workspace/api-client-react';
import type { AffinityKey } from '@/lib/affinityMeta';

export type ActiveTab = 'board' | 'hand' | 'log';

export type BoardLayoutMode = 'base' | 'left-civ' | 'rail-civ';

export type BoardDensityMode = 'stacked' | 'cockpit' | 'efficient' | 'comfortable' | 'showcase';

export type CostMode = 'printed' | 'after_bonuses' | 'needed_now';

export type ForgeDestinationKind = 'civilization' | 'tab';

export type ForgeDestination = {
  kind: ForgeDestinationKind;
  targetSelector: string;
  pos: { x: number; y: number };
};

export interface SelectedCard {
  card: ArtifactCard;
  fromReserve: boolean;
  fromArchiveTop?: boolean;
  canBuy: boolean;
  canReserve: boolean;
  effectiveCosts?: Partial<Record<AffinityKey, number>>;
  readOnly?: boolean;
}
