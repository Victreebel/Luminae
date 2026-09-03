const MAX_PORTRAIT_CARD_ASPECT = 0.86;

/**
 * Wide Forge molds present an Artifact as an artwork crop. Portrait frames retain
 * the complete card face so its chrome and rules remain proportionally correct.
 */
export function artifactFrameUsesArtCrop(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  return width / height > MAX_PORTRAIT_CARD_ASPECT;
}
