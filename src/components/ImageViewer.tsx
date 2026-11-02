"use client";
import { useState, type RefObject } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
export default function ImageViewer({
  src,
  alt,
  panelRef,
  onClose,
}: {
  src: string;
  alt: string;
  panelRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  return (
    <div
      className="nx-image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Enlarged image"
      ref={panelRef}
      tabIndex={-1}
    >
      <header className="nx-viewer-toolbar">
        <span>{alt || "Image preview"}</span>
        <div>
          <button
            aria-label="Zoom out"
            disabled={scale <= 1}
            onClick={() => setScale((s) => Math.max(1, s - 0.5))}
          >
            <ZoomOut size={20} />
          </button>
          <output aria-live="polite">{Math.round(scale * 100)}%</output>
          <button
            aria-label="Zoom in"
            disabled={scale >= 3}
            onClick={() => setScale((s) => Math.min(3, s + 0.5))}
          >
            <ZoomIn size={20} />
          </button>
          <button aria-label="Fit image to screen" onClick={() => setScale(1)}>
            <RotateCcw size={19} />
          </button>
          <button aria-label="Close enlarged image" onClick={onClose}>
            <X size={23} />
          </button>
        </div>
      </header>
      <div
        className="nx-viewer-scroll"
        key={scale}
        tabIndex={0}
        aria-label="Image area. Scroll to explore when zoomed."
      >
        <div
          className="nx-viewer-canvas"
          style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            onClick={() => setScale((s) => (s === 1 ? 2 : 1))}
            style={{ cursor: scale === 1 ? "zoom-in" : "zoom-out" }}
          />
        </div>
      </div>
      <footer>
        Click the image to zoom · Scroll or swipe to explore · Esc to close
      </footer>
    </div>
  );
}
