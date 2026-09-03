import { CivilizationMiniatureScene } from '@/components/CivilizationScenePanel';
import React from 'react';
import type { AffinityPalette, KardashevTier } from '@/lib/kardashev';
import type { CivilizationProfile } from '@/lib/civilizationProfile';
import {
  prioritizeRecentCivilizationSiteIds,
  type CivilizationDeploymentSite,
} from '@/lib/civilizationDeploymentSites';

export type CivilizationPreviewPlacement = 'left' | 'rail';

const RECENT_CIVILIZATION_PREVIEW_ECHO_MS = 8000;

type CivilizationImpactKind = 'artifact' | 'blueprint' | 'luminary' | 'protocol' | 'chronicle';

export interface CivilizationPreviewModel {
  name: string;
  tier: KardashevTier;
  palette: AffinityPalette;
  profile: CivilizationProfile;
  forgedCount: number;
}

function getRegistrationKicker(site: CivilizationDeploymentSite | undefined): string {
  if (!site) return 'Civilization reshaped';
  if (site.kind === 'blueprint') return 'Blueprint reshapes civilization';
  if (site.kind === 'luminary') return 'Luminary pressure detected';
  if (site.kind === 'protocol') return 'Sealed protocol active';
  if (site.kind === 'chronicle') return 'Chronicle thread restored';
  return 'Artifact trace integrated';
}

function getImpactKind(site: CivilizationDeploymentSite | undefined): CivilizationImpactKind {
  if (site?.kind === 'blueprint') return 'blueprint';
  if (site?.kind === 'luminary') return 'luminary';
  if (site?.kind === 'protocol') return 'protocol';
  if (site?.kind === 'chronicle') return 'chronicle';
  return 'artifact';
}

function getImpactBadgeLabel(kind: CivilizationImpactKind): string {
  if (kind === 'blueprint') return 'BP';
  if (kind === 'luminary') return 'LUM';
  if (kind === 'protocol') return 'SEAL';
  if (kind === 'chronicle') return 'CHR';
  return 'ART';
}

function getNoticeRegistrationKicker(site: CivilizationDeploymentSite | undefined): string {
  if (!site) return 'Civilization reshaped';
  if (site.kind === 'blueprint') return 'Blueprint online';
  if (site.kind === 'luminary') return 'Luminary pressure';
  if (site.kind === 'protocol') return 'Protocol sealed';
  if (site.kind === 'chronicle') return 'Chronicle restored';
  return 'New artifact trace';
}

function findSiteByIdOrder(
  sites: readonly CivilizationDeploymentSite[],
  siteIds: readonly string[],
): CivilizationDeploymentSite | undefined {
  for (const siteId of siteIds) {
    const site = sites.find((entry) => entry.id === siteId);
    if (site) return site;
  }
  return undefined;
}

function selectPreviewImpactSites(
  sites: readonly CivilizationDeploymentSite[],
  recentSiteIds: readonly string[],
  limit: number,
): CivilizationDeploymentSite[] {
  const selected: CivilizationDeploymentSite[] = [];
  const recentIdSet = new Set(recentSiteIds);
  const nonRecentSites = sites.filter((site) => !recentIdSet.has(site.id));
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= limit) return;
    selected.push(site);
  };

  const sorted = [...nonRecentSites].sort((left, right) => (
    right.priority - left.priority ||
    left.title.localeCompare(right.title)
  ));

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find((site) => site.kind === 'luminary'));
  add(sorted.find((site) => site.kind === 'chronicle'));
  add(sorted.find((site) => site.kind === 'artifact'));
  for (const site of sorted) add(site);
  if (selected.length === 0) {
    for (const siteId of recentSiteIds) {
      add(sites.find((site) => site.id === siteId));
    }
  }

  return selected;
}

interface CivilizationPreviewModuleProps {
  placement: CivilizationPreviewPlacement;
  playerEminence: number;
  civilizationModel: CivilizationPreviewModel;
  deploymentSites: readonly CivilizationDeploymentSite[];
  recentSiteIds: readonly string[];
  progressFraction: number;
  onRecentSiteIdsSeen?: (siteIds: readonly string[]) => void;
  onOpenCivilization?: () => void;
}

export interface BoardCivilizationTraceNoticeProps {
  deploymentSites: readonly CivilizationDeploymentSite[];
  recentSiteIds: readonly string[];
  palette: AffinityPalette;
  civilizationModel?: CivilizationPreviewModel;
  progressFraction?: number;
  onRecentSiteIdsSeen?: (siteIds: readonly string[]) => void;
  onOpenCivilization: () => void;
}

export function BoardCivilizationTraceNotice({
  deploymentSites,
  recentSiteIds,
  palette,
  civilizationModel,
  progressFraction = 1,
  onRecentSiteIdsSeen,
  onOpenCivilization,
}: BoardCivilizationTraceNoticeProps) {
  const [dismissedRecentSiteIds, setDismissedRecentSiteIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setDismissedRecentSiteIds((current) => current.filter((siteId) => recentSiteIds.includes(siteId)));
  }, [recentSiteIds]);

  const visibleRecentSiteIds = React.useMemo(() => {
    const dismissedIds = new Set(dismissedRecentSiteIds);
    return recentSiteIds.filter((siteId) => (
      !dismissedIds.has(siteId) && deploymentSites.some((site) => site.id === siteId)
    ));
  }, [deploymentSites, dismissedRecentSiteIds, recentSiteIds]);

  React.useEffect(() => {
    if (visibleRecentSiteIds.length === 0) return undefined;
    const displayableIds = [...visibleRecentSiteIds];
    const timeoutId = window.setTimeout(() => {
      setDismissedRecentSiteIds((current) => [...new Set([...current, ...displayableIds])]);
      onRecentSiteIdsSeen?.(displayableIds);
    }, RECENT_CIVILIZATION_PREVIEW_ECHO_MS);

    return () => window.clearTimeout(timeoutId);
  }, [onRecentSiteIdsSeen, visibleRecentSiteIds]);

  const recentTraceSite = findSiteByIdOrder(deploymentSites, visibleRecentSiteIds);
  if (!recentTraceSite) return null;
  const impactKind = getImpactKind(recentTraceSite);

  return (
    <button
      type="button"
      className="board-civ-trace-notice"
      style={{ '--civ-recent-tone': palette.primary } as React.CSSProperties}
      onClick={onOpenCivilization}
      data-testid="board-civilization-trace-notice"
      data-impact-kind={impactKind}
      aria-label={`Open Civilization scan for ${recentTraceSite.title}`}
    >
      <span className="board-civ-trace-notice__thumbnail" aria-hidden="true">
        {civilizationModel ? (
          <CivilizationMiniatureScene
            tier={civilizationModel.tier}
            palette={civilizationModel.palette}
            profile={civilizationModel.profile}
            progressFraction={progressFraction}
            paused
            deploymentSites={deploymentSites}
            recentSiteIds={visibleRecentSiteIds}
            showRecentCard={false}
            presentation="thumbnail"
            className="board-civ-trace-notice__thumbnail-scene"
          />
        ) : null}
        <span className="board-civ-trace-notice__beacon">
          <span className="board-aux-civ-registration__beacon-head" />
          <span className="board-aux-civ-registration__beacon-stem" />
          <span className="board-aux-civ-registration__beacon-foot" />
        </span>
      </span>
      <span className="board-civ-trace-notice__copy">
        <span className="board-civ-trace-notice__meta">
          <span className="board-civ-trace-notice__kicker">
            {getNoticeRegistrationKicker(recentTraceSite)}
          </span>
          <span className="board-civ-trace-notice__badge">
            {getImpactBadgeLabel(impactKind)}
          </span>
        </span>
        <span className="board-civ-trace-notice__title">{recentTraceSite.title}</span>
        {recentTraceSite.visibleAs && (
          <span className="board-civ-trace-notice__visible-as">{recentTraceSite.visibleAs}</span>
        )}
      </span>
      <span className="board-civ-trace-notice__action">Scan</span>
    </button>
  );
}

export function CivilizationPreviewModule({
  placement,
  playerEminence,
  civilizationModel,
  deploymentSites,
  recentSiteIds,
  progressFraction,
  onRecentSiteIdsSeen,
  onOpenCivilization,
}: CivilizationPreviewModuleProps) {
  const [echoedRecentSiteIds, setEchoedRecentSiteIds] = React.useState<string[]>([]);
  const [dismissedRecentSiteIds, setDismissedRecentSiteIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    setDismissedRecentSiteIds((current) => current.filter((siteId) => recentSiteIds.includes(siteId)));
  }, [recentSiteIds]);

  React.useEffect(() => {
    const dismissedIds = new Set(dismissedRecentSiteIds);
    const displayableIds = recentSiteIds.filter((siteId) => (
      !dismissedIds.has(siteId) && deploymentSites.some((site) => site.id === siteId)
    ));
    if (displayableIds.length === 0) return undefined;

    setEchoedRecentSiteIds((current) => prioritizeRecentCivilizationSiteIds(displayableIds, current));

    const timeoutId = window.setTimeout(() => {
      setEchoedRecentSiteIds((current) => current.filter((siteId) => !displayableIds.includes(siteId)));
      setDismissedRecentSiteIds((current) => [...new Set([...current, ...displayableIds])]);
      onRecentSiteIdsSeen?.(displayableIds);
    }, RECENT_CIVILIZATION_PREVIEW_ECHO_MS);

    return () => window.clearTimeout(timeoutId);
  }, [deploymentSites, dismissedRecentSiteIds, onRecentSiteIdsSeen, recentSiteIds]);

  const dismissedRecentSiteIdSet = React.useMemo(() => new Set(dismissedRecentSiteIds), [dismissedRecentSiteIds]);
  const visibleRecentSiteIds = echoedRecentSiteIds.length > 0
    ? echoedRecentSiteIds
    : recentSiteIds.filter((siteId) => !dismissedRecentSiteIdSet.has(siteId));
  const recentTraceSite = findSiteByIdOrder(deploymentSites, visibleRecentSiteIds);
  const recentTraceTitle = recentTraceSite?.title;
  const recentRegistrationKicker = getRegistrationKicker(recentTraceSite);
  const footerStatus = visibleRecentSiteIds.length > 0
    ? `${visibleRecentSiteIds.length} new trace${visibleRecentSiteIds.length === 1 ? '' : 's'}`
    : `${civilizationModel.forgedCount} forged`;
  const hasRecentTrace = visibleRecentSiteIds.length > 0;
  const recentImpactKind = getImpactKind(recentTraceSite);
  const impactSites = React.useMemo(() => (
    selectPreviewImpactSites(deploymentSites, visibleRecentSiteIds, 3)
  ), [deploymentSites, visibleRecentSiteIds]);

  return (
    <section
      key={`civilization-preview-${placement}`}
      className={`board-aux-module board-aux-module--civ ${hasRecentTrace ? 'board-aux-module--civ-recent' : ''}`}
      aria-label="Civilization preview"
      data-civilization-drop-target={placement}
      data-civilization-recent={hasRecentTrace ? 'true' : undefined}
      style={{ '--civ-recent-tone': civilizationModel.palette.primary } as React.CSSProperties}
    >
      <div className="board-aux-module-header">
        <span className="board-aux-civ-header-title">
          Civilization
          {hasRecentTrace && (
            <span className="board-aux-civ-header-pulse" data-testid="civilization-preview-header-pulse">
              New
            </span>
          )}
        </span>
        <span>{playerEminence} Eminence</span>
      </div>
      {recentTraceTitle && (
        <div
          className="board-aux-civ-registration"
          style={{
            borderColor: `${civilizationModel.palette.primary}8F`,
            boxShadow: `0 16px 34px rgba(0,0,0,0.46), 0 0 24px ${civilizationModel.palette.primary}35`,
          }}
          data-testid="civilization-preview-registration"
          data-impact-kind={recentImpactKind}
          aria-live="polite"
        >
          <span className="board-aux-civ-registration__beacon" aria-hidden="true">
            <span className="board-aux-civ-registration__beacon-head" />
            <span className="board-aux-civ-registration__beacon-stem" />
            <span className="board-aux-civ-registration__beacon-foot" />
          </span>
          <span className="board-aux-civ-registration__copy">
            <span className="board-aux-civ-registration__meta">
              <span
                className="board-aux-civ-registration__kicker"
                style={{ color: civilizationModel.palette.primary }}
              >
                {recentRegistrationKicker}
              </span>
              <span className="board-aux-civ-registration__badge">
                {getImpactBadgeLabel(recentImpactKind)}
              </span>
            </span>
            <span className="board-aux-civ-registration__title">
              {recentTraceTitle}
            </span>
            {recentTraceSite?.visibleAs && (
              <span className="board-aux-civ-registration__visible-as">
                {recentTraceSite.visibleAs}
              </span>
            )}
          </span>
        </div>
      )}
      <div className="board-aux-civ-scene">
        {hasRecentTrace && (
          <div
            className="board-aux-civ-scene-registration-sweep"
            data-testid="civilization-preview-registration-sweep"
            aria-hidden="true"
          />
        )}
        <CivilizationMiniatureScene
          tier={civilizationModel.tier}
          palette={civilizationModel.palette}
          profile={civilizationModel.profile}
          progressFraction={progressFraction}
          paused
          deploymentSites={deploymentSites}
          recentSiteIds={visibleRecentSiteIds}
          showRecentCard={false}
          className="relative h-full w-full overflow-hidden bg-black"
        />
      </div>
      {impactSites.length > 0 && (
        <div
          className="board-aux-civ-impact-ledger"
          data-testid="civilization-preview-impact-ledger"
          aria-label="Civilization impact ledger"
        >
          {impactSites.map((site) => {
            const recent = visibleRecentSiteIds.includes(site.id);
            return (
              <div
                key={site.id}
                className="board-aux-civ-impact-row"
                data-recent={recent ? 'true' : undefined}
                data-impact-kind={getImpactKind(site)}
                style={{ '--impact-tone': recent ? civilizationModel.palette.primary : undefined } as React.CSSProperties}
              >
                <span className="board-aux-civ-impact-row__marker" aria-hidden="true" />
                <span className="board-aux-civ-impact-row__copy">
                  <span>{site.title}</span>
                  <span>{site.kind === 'artifact' ? site.laneLabel : getRegistrationKicker(site)}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
      <div className="board-aux-civ-footer">
        <span
          className="truncate"
          style={{ color: civilizationModel.palette.primary }}
        >
          {civilizationModel.name}
        </span>
        <span className="board-aux-civ-footer__status truncate">{footerStatus}</span>
        {onOpenCivilization && (
          <button
            type="button"
            className="board-aux-civ-footer__action"
            onClick={onOpenCivilization}
            aria-label={hasRecentTrace ? 'Open Civilization scan for new traces' : 'Open Civilization scan'}
          >
            Scan
          </button>
        )}
      </div>
    </section>
  );
}

type BoardAuxModulesProps = CivilizationPreviewModuleProps;

export function BoardAuxModules({
  placement = 'rail',
  playerEminence,
  civilizationModel,
  deploymentSites,
  recentSiteIds,
  progressFraction,
  onRecentSiteIdsSeen,
  onOpenCivilization,
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
        deploymentSites={deploymentSites}
        recentSiteIds={recentSiteIds}
        progressFraction={progressFraction}
        onRecentSiteIdsSeen={onRecentSiteIdsSeen}
        onOpenCivilization={onOpenCivilization}
      />
    </aside>
  );
}
