import { Focus, Rotate3D, ZoomIn, ZoomOut } from "lucide-react";
import "./BlueprintModelControls.css";

type BlueprintModelControlsProps = {
  visible: boolean;
  onRotate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
};

export function BlueprintModelControls({
  visible,
  onRotate,
  onZoomIn,
  onZoomOut,
  onReset,
}: BlueprintModelControlsProps) {
  if (!visible) return null;

  return (
    <div className="blueprint-model-controls" role="group" aria-label="3D viewing controls">
      <button type="button" onClick={onRotate} aria-label="Rotate device" title="Rotate device">
        <Rotate3D aria-hidden="true" />
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
        <ZoomOut aria-hidden="true" />
      </button>
      <button type="button" onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
        <ZoomIn aria-hidden="true" />
      </button>
      <button type="button" onClick={onReset} aria-label="Reset 3D view" title="Reset 3D view">
        <Focus aria-hidden="true" />
      </button>
    </div>
  );
}
