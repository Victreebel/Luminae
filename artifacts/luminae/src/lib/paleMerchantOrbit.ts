const ORBIT_TOKEN_GAP = 8;

export interface PaleMerchantOrbitSlot {
  ringIndex: number;
  ringTokenIndex: number;
  ringTokenCount: number;
  radius: number;
  angle: number;
}

export function buildPaleMerchantOrbitSlots(
  total: number,
  tokenSize: number,
  baseRadius: number,
): PaleMerchantOrbitSlot[] {
  const slots: PaleMerchantOrbitSlot[] = [];
  let assigned = 0;
  let ringIndex = 0;

  while (assigned < total) {
    const radius = baseRadius + ringIndex * (tokenSize + ORBIT_TOKEN_GAP);
    const minimumChord = tokenSize + ORBIT_TOKEN_GAP;
    const chordRatio = Math.min(1, minimumChord / Math.max(1, radius * 2));
    const minimumAngle = 2 * Math.asin(chordRatio);
    const capacity = Math.max(1, Math.floor((Math.PI * 2) / Math.max(0.01, minimumAngle)));
    const ringTokenCount = Math.min(capacity, total - assigned);

    for (let ringTokenIndex = 0; ringTokenIndex < ringTokenCount; ringTokenIndex += 1) {
      slots.push({
        ringIndex,
        ringTokenIndex,
        ringTokenCount,
        radius,
        angle: -Math.PI / 2
          + (ringTokenIndex / Math.max(1, ringTokenCount)) * Math.PI * 2
          + ringIndex * 0.23,
      });
    }

    assigned += ringTokenCount;
    ringIndex += 1;
  }

  return slots;
}
