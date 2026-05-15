let _pendingBeat: number | null = null;

export function setPendingStartBeat(beat: number | null): void {
  _pendingBeat = beat;
}

export function consumePendingStartBeat(): number | null {
  const v = _pendingBeat;
  _pendingBeat = null;
  return v;
}
