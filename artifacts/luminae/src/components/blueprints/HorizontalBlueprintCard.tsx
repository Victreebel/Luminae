import { useState, type CSSProperties } from "react";
import {
  Check,
  ListChecks,
  LockKeyhole,
  RadioTower,
  RotateCw,
  ShieldAlert,
} from "lucide-react";
import type {
  AffinityKey,
  BlueprintManifestationScale,
} from "@workspace/game-types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { AFFINITY_META } from "@/lib/affinityMeta";
import { ArtifactFunctionTags } from "@/components/ArtifactFunctionTags";
import "./HorizontalBlueprintCard.css";

export type HorizontalBlueprintCardState = "assembling" | "manifested";

export interface HorizontalBlueprintComponentRecord {
  artifactId: string;
  artifactName: string;
  artwork: string;
  affinity: AffinityKey;
  tier: "Tier I" | "Tier II" | "Tier III";
  eminence: number;
  cost: readonly { affinity: AffinityKey; amount: number }[];
  requirement: string;
  flavor: string;
  artifactForm: string;
  blueprintRole: string;
  blueprintFamilies: string;
  civilizationLane: string;
  engineeringScale: string;
  hotspot: CSSProperties;
}

const BLUEPRINT_MANIFESTATION_SCALE_LABELS: Record<
  BlueprintManifestationScale,
  string
> = {
  installation: "Installation-scale manifestation",
  satellite: "Satellite-scale manifestation",
  planetary: "Planetary-scale manifestation",
  stellar: "Stellar-scale manifestation",
  distributed: "Distributed manifestation",
};

interface HorizontalBlueprintCardProps {
  definition: {
    name: string;
    publicEffect: string;
    presentation: {
      scaleLabel: string;
      serialCode: string;
      manifestationScale: BlueprintManifestationScale;
    };
    components: readonly { artifactId: string; stage: string; function: string }[];
  };
  state: HorizontalBlueprintCardState;
  matchedComponents: number;
  matchedComponentIds?: readonly string[];
  artwork: string | readonly string[];
  artworkAlt: string;
  category: string;
  publicStateLabel: string;
  components: readonly HorizontalBlueprintComponentRecord[];
  testId: string;
  componentPanelTestId: string;
  tone: "catastrophe" | "industry" | "covenant";
  privateLabel?: string;
  publicLabel?: string;
  secondaryRule?: { label: string; text: string } | null;
  secondaryRulePlacement?: "front_and_back" | "back";
  knownComponentIds?: readonly string[];
}

export function HorizontalBlueprintCard({
  definition,
  state,
  matchedComponents,
  matchedComponentIds,
  artwork,
  artworkAlt,
  category,
  publicStateLabel,
  components,
  testId,
  componentPanelTestId,
  tone,
  privateLabel = "Owner Eyes Only",
  publicLabel = "Public Device",
  secondaryRule = null,
  secondaryRulePlacement = "front_and_back",
  knownComponentIds,
}: HorizontalBlueprintCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showBack, setShowBack] = useState(false);
  const manifested = state === "manifested";
  const matchedComponentSet = matchedComponentIds
    ? new Set(matchedComponentIds)
    : null;
  const componentComplete = (
    component: HorizontalBlueprintComponentRecord,
    index: number,
  ) =>
    manifested ||
    (matchedComponentSet
      ? matchedComponentSet.has(component.artifactId)
      : index < Math.max(0, Math.min(matchedComponents, components.length)));
  const completedCount = components.filter(componentComplete).length;
  const knownComponentSet = knownComponentIds
    ? new Set(knownComponentIds)
    : null;
  const componentKnown = (component: HorizontalBlueprintComponentRecord) =>
    knownComponentSet ? knownComponentSet.has(component.artifactId) : true;
  const knownCount = knownComponentSet
    ? components.filter((component) => componentKnown(component)).length
    : completedCount;
  const selectedComponent =
    selectedIndex === null ? null : components[selectedIndex];
  const selectedDefinition = selectedComponent
    ? definition.components.find(
        (component) => component.artifactId === selectedComponent.artifactId,
      )
    : undefined;
  const selectedKnown = selectedComponent
    ? componentKnown(selectedComponent)
    : false;
  const selectedMatched =
    selectedIndex !== null && selectedComponent
      ? componentComplete(selectedComponent, selectedIndex)
      : false;

  return (
    <Sheet
      open={selectedComponent !== null}
      onOpenChange={(open) => {
        if (!open) setSelectedIndex(null);
      }}
    >
      <article
        className="horizontal-blueprint-card"
        data-tone={tone}
        data-blueprint-state={state}
        data-blueprint-side={showBack ? "back" : "front"}
        data-blueprint-presentation="card"
        data-testid={testId}
        aria-label={`${definition.name} horizontal card, ${
          manifested
            ? `manifested and ${publicStateLabel.toLowerCase()}`
            : `${completedCount} of ${components.length} components assembled`
        }`}
      >
        <button
          type="button"
          className="horizontal-blueprint-card__flip"
          onClick={() => setShowBack((value) => !value)}
          aria-pressed={showBack}
          aria-label={
            showBack ? "Show Blueprint front" : "Show Blueprint components"
          }
          title={showBack ? "Show front" : "Show components"}
        >
          {showBack ? (
            <RotateCw aria-hidden="true" />
          ) : (
            <ListChecks aria-hidden="true" />
          )}
          <span>{showBack ? "Front" : "Components"}</span>
        </button>

        {!showBack && (
          <div className="horizontal-blueprint-card__face horizontal-blueprint-card__face--front">
            {typeof artwork === "string" ? (
              <img
                className="horizontal-blueprint-card__artwork"
                src={artwork}
                alt={artworkAlt}
                draggable={false}
              />
            ) : (
              <div
                className="horizontal-blueprint-card__artwork-grid"
                role="img"
                aria-label={artworkAlt}
              >
                {artwork.map((source, index) => (
                  <img
                    key={source}
                    src={source}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    style={{ zIndex: artwork.length - index }}
                  />
                ))}
              </div>
            )}
            <div
              className="horizontal-blueprint-card__scrim"
              aria-hidden="true"
            />

            <header className="horizontal-blueprint-card__header">
              <span className="horizontal-blueprint-card__header-meta">
                <span>
                  {definition.presentation.scaleLabel} Blueprint /{" "}
                  {definition.presentation.serialCode}
                </span>
                <span className="horizontal-blueprint-card__scale-tag">
                  {
                    BLUEPRINT_MANIFESTATION_SCALE_LABELS[
                      definition.presentation.manifestationScale
                    ]
                  }
                </span>
              </span>
              <span className="horizontal-blueprint-card__privacy">
                {manifested ? (
                  <RadioTower aria-hidden="true" />
                ) : (
                  <LockKeyhole aria-hidden="true" />
                )}
                {manifested ? publicLabel : privateLabel}
              </span>
            </header>

            <div
              className="horizontal-blueprint-card__hotspots"
              aria-label={`${definition.name} component inspection points`}
            >
              {components.map((component, index) => {
                const complete = componentComplete(component, index);
                const known = componentKnown(component);
                const stage =
                  definition.components.find(
                    (candidate) =>
                      candidate.artifactId === component.artifactId,
                  )?.stage ?? `Component ${index + 1}`;
                return (
                  <button
                    type="button"
                    key={component.artifactId}
                    className="horizontal-blueprint-card__hotspot"
                    style={component.hotspot}
                    data-complete={complete}
                    data-known={known}
                    data-label={known ? stage : "Unknown component"}
                    onClick={() => {
                      if (known) setSelectedIndex(index);
                    }}
                    tabIndex={showBack || !known ? -1 : 0}
                    disabled={!known}
                    aria-label={
                      known
                        ? `Open ${component.artifactName} component record`
                        : `Unknown Blueprint component ${index + 1}`
                    }
                  >
                    {complete && known ? (
                      <Check aria-hidden="true" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <section className="horizontal-blueprint-card__identity">
              <p>{category}</p>
              <h2>{definition.name}</h2>
              <div className="horizontal-blueprint-card__effect">
                <strong>Effect</strong>
                <span>{definition.publicEffect}</span>
              </div>
              {secondaryRule && secondaryRulePlacement === "front_and_back" && (
                <div
                  className="horizontal-blueprint-card__secondary-rule"
                  role="note"
                >
                  <ShieldAlert aria-hidden="true" />
                  <strong>{secondaryRule.label}</strong>
                  <span>{secondaryRule.text}</span>
                </div>
              )}
            </section>

            <footer className="horizontal-blueprint-card__status">
              <span>{manifested ? "Device State" : "Assembly"}</span>
              <strong>
                {manifested
                  ? publicStateLabel
                  : `${completedCount} / ${components.length}`}
              </strong>
              {!manifested && (
                <div
                  className="horizontal-blueprint-card__meter"
                  aria-hidden="true"
                >
                  {components.map((component, index) => (
                    <i
                      key={component.artifactId}
                      data-filled={index < completedCount}
                    />
                  ))}
                </div>
              )}
            </footer>
          </div>
        )}

        {showBack && (
          <section className="horizontal-blueprint-card__face horizontal-blueprint-card__face--back">
            <header className="horizontal-blueprint-card__back-header">
              <div>
                <p>{definition.presentation.serialCode} / Reverse</p>
                <h3>{definition.name}</h3>
              </div>
              <span>
                {knownComponentSet
                  ? `${knownCount} / ${components.length} known`
                  : `${completedCount} / ${components.length} assembled`}
              </span>
            </header>

            <div className="horizontal-blueprint-card__back-body">
              <div className="horizontal-blueprint-card__component-list">
                <span>Required Components</span>
                {components.map((component, index) => {
                  const known = componentKnown(component);
                  const stage =
                    definition.components.find(
                      (candidate) =>
                        candidate.artifactId === component.artifactId,
                    )?.stage ?? `Socket ${index + 1}`;
                    const matched = componentComplete(component, index);
                  return (
                    <button
                      key={component.artifactId}
                      type="button"
                      className="horizontal-blueprint-card__component-row"
                      data-known={known}
                      data-matched={matched}
                      disabled={!known}
                      tabIndex={!showBack || !known ? -1 : 0}
                      onClick={() => {
                        if (known) setSelectedIndex(index);
                      }}
                      aria-label={
                        known
                          ? `Open ${component.artifactName} component record`
                          : `Unknown Blueprint component ${index + 1}`
                      }
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>
                          {known ? component.artifactName : "Unknown component"}
                        </strong>
                        <small>
                          {known
                            ? stage
                            : "Forge this artifact once to identify this socket."}
                        </small>
                      </div>
                      {known ? (
                        <em>
                          <img
                            src={AFFINITY_META[component.affinity].image}
                            alt=""
                            aria-hidden="true"
                          />
                          {component.tier}
                        </em>
                      ) : (
                        <em>Sealed</em>
                      )}
                    </button>
                  );
                })}
              </div>

              <aside className="horizontal-blueprint-card__back-effect">
                <span>Effect</span>
                <p>{definition.publicEffect}</p>
                {secondaryRule && (
                  <div role="note">
                    <ShieldAlert aria-hidden="true" />
                    <strong>{secondaryRule.label}</strong>
                    <small>{secondaryRule.text}</small>
                  </div>
                )}
              </aside>
            </div>
          </section>
        )}
      </article>

      {selectedComponent && selectedDefinition && selectedKnown && (
        <SheetContent
          side="bottom"
          className="blueprint-component-sheet"
          data-affinity={selectedComponent.affinity}
          data-testid={componentPanelTestId}
        >
          <div className="blueprint-component-sheet__inner">
            <figure className="blueprint-component-sheet__art">
              <img
                src={selectedComponent.artwork}
                alt={selectedComponent.artifactName}
                draggable={false}
              />
              <figcaption>
                Component {String(selectedIndex! + 1).padStart(2, "0")} /{" "}
                {String(components.length).padStart(2, "0")}
              </figcaption>
            </figure>

            <div className="blueprint-component-sheet__record">
              <p className="blueprint-component-sheet__eyebrow">
                {definition.name} / {selectedDefinition.stage} /{" "}
                {selectedComponent.artifactId}
              </p>
              <SheetTitle className="blueprint-component-sheet__title">
                {selectedComponent.artifactName}
              </SheetTitle>
              <span className="blueprint-component-sheet__section-label">
                Blueprint Function
              </span>
              <SheetDescription className="blueprint-component-sheet__description">
                {selectedDefinition.function}
              </SheetDescription>

              <div className="blueprint-component-sheet__facts">
                <div>
                  <span>Affinity</span>
                  <strong>
                    {AFFINITY_META[selectedComponent.affinity].name}
                  </strong>
                </div>
                <div>
                  <span>Tier</span>
                  <strong>{selectedComponent.tier}</strong>
                </div>
                <div>
                  <span>Scale</span>
                  <strong>{selectedComponent.engineeringScale}</strong>
                </div>
                <div>
                  <span>Assembly State</span>
                  <strong data-matched={selectedMatched}>
                    {selectedMatched ? "Matched" : "Required"}
                  </strong>
                </div>
              </div>

              <section className="blueprint-component-sheet__economy">
                <div>
                  <span>Forge Cost</span>
                  <div className="blueprint-component-sheet__costs">
                    {selectedComponent.cost.map((cost) => {
                      const affinity = AFFINITY_META[cost.affinity];
                      return (
                        <span
                          key={cost.affinity}
                          title={`${cost.amount} ${affinity.name}`}
                        >
                          <strong>{cost.amount}</strong>
                          <img src={affinity.image} alt={affinity.name} />
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <span>Eminence</span>
                  <strong>{selectedComponent.eminence}</strong>
                </div>
              </section>

              <section className="blueprint-component-sheet__requirement">
                <span>Socket Requirement</span>
                <strong>{selectedComponent.requirement}</strong>
              </section>

              <section className="blueprint-component-sheet__lore">
                <span>Artifact Lore</span>
                <p>{selectedComponent.flavor}</p>
              </section>

              <ArtifactFunctionTags artifactId={selectedComponent.artifactId} />

              <dl className="blueprint-component-sheet__metadata">
                <div>
                  <dt>Artifact Form</dt>
                  <dd>{selectedComponent.artifactForm}</dd>
                </div>
                <div>
                  <dt>Blueprint Role</dt>
                  <dd>{selectedComponent.blueprintRole}</dd>
                </div>
                <div>
                  <dt>Blueprint Families</dt>
                  <dd>{selectedComponent.blueprintFamilies}</dd>
                </div>
                <div>
                  <dt>Civilization Lane</dt>
                  <dd>{selectedComponent.civilizationLane}</dd>
                </div>
              </dl>
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
