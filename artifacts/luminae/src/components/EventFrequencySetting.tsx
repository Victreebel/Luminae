import { useId } from 'react';
import { EVENT_FREQUENCIES, EVENT_FREQUENCY_LABELS, type EventFrequency } from '@workspace/game-types';

const EVENT_FREQUENCY_DETAILS: Record<EventFrequency, string> = {
  off: 'No random Events occur.',
  standard: '3 random Events: 1 per tier in a separate Event deck. No duplicates.',
  frequent: '6 random Events: 2 per tier in a separate Event deck. No duplicates.',
};

export function EventFrequencySetting({ value, onChange, disabled = false }: {
  value: EventFrequency;
  onChange?: (value: EventFrequency) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <fieldset className="min-w-0 space-y-2" disabled={disabled} aria-describedby={`${id}-detail`}>
      <legend className="text-sm font-semibold">Events{!onChange && `: ${EVENT_FREQUENCY_LABELS[value]}`}</legend>
      {onChange && (
        <div className="grid grid-cols-3 gap-1 rounded-md border border-border/40 bg-input/40 p-1">
          {EVENT_FREQUENCIES.map((frequency) => (
            <label key={frequency} className="min-w-0 cursor-pointer">
              <input
                type="radio"
                name={`${id}-frequency`}
                value={frequency}
                checked={value === frequency}
                onChange={() => onChange(frequency)}
                className="peer sr-only"
              />
              <span className="block rounded px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground transition-colors peer-checked:bg-primary/20 peer-checked:text-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-ring peer-disabled:cursor-wait peer-disabled:opacity-60">
                {EVENT_FREQUENCY_LABELS[frequency]}
              </span>
            </label>
          ))}
        </div>
      )}
      <p id={`${id}-detail`} className="text-xs leading-relaxed text-muted-foreground">
        {EVENT_FREQUENCY_DETAILS[value]}
        {value !== 'off' && ' After the countdown, the next Artifact forged reveals an Event. Encounters depend on match length.'}
      </p>
    </fieldset>
  );
}
