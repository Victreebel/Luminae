import { useState, type CSSProperties } from "react";
import { Check, LockKeyhole, RadioTower, ShieldAlert } from "lucide-react";
import {
  BLUEPRINT_DEFINITIONS,
  type AffinityKey,
  type BlueprintId,
} from "@workspace/game-types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { AFFINITY_META } from "@/lib/affinityMeta";
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

interface HorizontalBlueprintCardProps {
  blueprintId: BlueprintId;
  state: HorizontalBlueprintCardState;
  matchedComponents: number;
  artwork: string;
  artworkAlt: string;
  category: string;
  publicStateLabel: string;
  components: readonly HorizontalBlueprintComponentRecord[];
  testId: string;
  componentPanelTestId: string;
  tone: "catastrophe" | "industry" | "institution" | "covenant";
  privateLabel?: string;
  publicLabel?: string;
  secondaryRule?: { label: string; text: string } | null;
}

export function HorizontalBlueprintCard({
  blueprintId,
  state,
  matchedComponents,
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
}: HorizontalBlueprintCardProps) {
  const definition = BLUEPRINT_DEFINITIONS[blueprintId];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const manifested = state === "manifested";
  const completedCount = manifested
    ? components.length
    : Math.max(0, Math.min(matchedComponents, components.length));
  const selectedComponent = selectedIndex === null ? null : components[selectedIndex];
  const selectedDefinition = selectedComponent
    ? definition.components.find((component) => component.artifactId === selectedComponent.artifactId)
    : undefined;
  const selectedMatched = selectedIndex !== null && selectedIndex < completedCount;

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
        data-blueprint-presentation="card"
        data-testid={testId}
        aria-label={`${definition.name} horizontal card, ${
          manifested
            ? `manifested and ${publicStateLabel.toLowerCase()}`
            : `${completedCount} of ${components.length} components assembled`
        }`}
      >
        <img
          className="horizontal-blueprint-card__artwork"
          src={artwork}
          alt={artworkAlt}
          draggable={false}
        />
        <div className="horizontal-blueprint-card__scrim" aria-hidden="true" />

        <header className="horizontal-blueprint-card__header">
          <span>{definition.presentation.scaleLabel} Blueprint / {definition.presentation.serialCode}</span>
          <span className="horizontal-blueprint-card__privacy">
            {manifested ? <RadioTower aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
            {manifested ? publicLabel : privateLabel}
          </span>
        </header>

        <div
          className="horizontal-blueprint-card__hotspots"
          aria-label={`${definition.name} component inspection points`}
        >
          {components.map((component, index) => {
            const complete = index < completedCount;
            const stage = definition.components.find(
              (candidate) => candidate.artifactId === component.artifactId,
            )?.stage ?? `Component ${index + 1}`;
            return (
              <button
                type="button"
                key={component.artifactId}
                className="horizontal-blueprint-card__hotspot"
                style={component.hotspot}
                data-complete={complete}
                data-label={stage}
                onClick={() => setSelectedIndex(index)}
                aria-label={`Open ${component.artifactName} component record`}
              >
                {complete ? <Check aria-hidden="true" /> : <span>{index + 1}</span>}
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
          {secondaryRule && (
            <div className="horizontal-blueprint-card__secondary-rule" role="note">
              <ShieldAlert aria-hidden="true" />
              <strong>{secondaryRule.label}</strong>
              <span>{secondaryRule.text}</span>
            </div>
          )}
        </section>

        <footer className="horizontal-blueprint-card__status">
          <span>{manifested ? "Device State" : "Assembly"}</span>
          <strong>{manifested ? publicStateLabel : `${completedCount} / ${components.length}`}</strong>
          {!manifested && (
            <div className="horizontal-blueprint-card__meter" aria-hidden="true">
              {components.map((component, index) => (
                <i key={component.artifactId} data-filled={index < completedCount} />
              ))}
            </div>
          )}
        </footer>
      </article>

      {selectedComponent && selectedDefinition && (
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
                Component {String(selectedIndex! + 1).padStart(2, "0")} / {String(components.length).padStart(2, "0")}
              </figcaption>
            </figure>

            <div className="blueprint-component-sheet__record">
              <p className="blueprint-component-sheet__eyebrow">
                {definition.name} / {selectedDefinition.stage} / {selectedComponent.artifactId}
              </p>
              <SheetTitle className="blueprint-component-sheet__title">
                {selectedComponent.artifactName}
              </SheetTitle>
              <span className="blueprint-component-sheet__section-label">Blueprint Function</span>
              <SheetDescription className="blueprint-component-sheet__description">
                {selectedDefinition.function}
              </SheetDescription>

              <div className="blueprint-component-sheet__facts">
                <div><span>Affinity</span><strong>{AFFINITY_META[selectedComponent.affinity].name}</strong></div>
                <div><span>Tier</span><strong>{selectedComponent.tier}</strong></div>
                <div><span>Scale</span><strong>{selectedComponent.engineeringScale}</strong></div>
                <div>
                  <span>Assembly State</span>
                  <strong data-matched={selectedMatched}>{selectedMatched ? "Matched" : "Required"}</strong>
                </div>
              </div>

              <section className="blueprint-component-sheet__economy">
                <div>
                  <span>Forge Cost</span>
                  <div className="blueprint-component-sheet__costs">
                    {selectedComponent.cost.map((cost) => {
                      const affinity = AFFINITY_META[cost.affinity];
                      return (
                        <span key={cost.affinity} title={`${cost.amount} ${affinity.name}`}>
                          <strong>{cost.amount}</strong>
                          <img src={affinity.image} alt={affinity.name} />
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div><span>Eminence</span><strong>{selectedComponent.eminence}</strong></div>
              </section>

              <section className="blueprint-component-sheet__requirement">
                <span>Socket Requirement</span>
                <strong>{selectedComponent.requirement}</strong>
              </section>

              <section className="blueprint-component-sheet__lore">
                <span>Artifact Lore</span>
                <p>{selectedComponent.flavor}</p>
              </section>

              <dl className="blueprint-component-sheet__metadata">
                <div><dt>Artifact Form</dt><dd>{selectedComponent.artifactForm}</dd></div>
                <div><dt>Blueprint Role</dt><dd>{selectedComponent.blueprintRole}</dd></div>
                <div><dt>Blueprint Families</dt><dd>{selectedComponent.blueprintFamilies}</dd></div>
                <div><dt>Civilization Lane</dt><dd>{selectedComponent.civilizationLane}</dd></div>
              </dl>
            </div>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
