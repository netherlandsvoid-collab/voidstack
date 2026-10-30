"use client";
import { useEffect, useRef, useState } from "react";
import {
  Upload,
  FileArchive,
  CheckCircle2,
  Pause,
  Play,
  X,
  RotateCcw,
} from "lucide-react";
import { uploadDirect } from "@/lib/direct-upload";
import { formatBytes, DEFAULT_PRODUCT_MAX_BYTES } from "@/lib/upload-limits";
import type { UploadControls } from "@/lib/resumable-upload";
type StoredFile = { name: string; size: number };
export default function ProductFilePicker({
  api,
  onUploaded,
  onBusyChange,
  maxBytes = DEFAULT_PRODUCT_MAX_BYTES,
  existing,
  disabled = false,
}: {
  api: (action: string, body: Record<string, any>) => Promise<any>;
  onUploaded: (file: { id: string; name: string; size: number } | null) => void;
  onBusyChange: (busy: boolean) => void;
  maxBytes?: number;
  existing?: StoredFile;
  disabled?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "uploading" | "paused" | "uploaded" | "error" | "cancelled"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const controls = useRef<UploadControls | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [],
  );
  const active = phase === "uploading" || phase === "paused";
  async function start(chosen: File) {
    setFile(chosen);
    setPhase("uploading");
    setProgress(0);
    setError("");
    onUploaded(null);
    onBusyChange(true);
    controls.current = null;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const result = await uploadDirect(chosen, true, api, {
        purpose: "product",
        maxBytes,
        signal: abort.signal,
        onProgress: setProgress,
        onControls: (c) => {
          controls.current = c;
        },
      });
      setPhase("uploaded");
      onUploaded({ id: result.id, name: chosen.name, size: chosen.size });
    } catch (failure) {
      if ((failure as Error).name === "AbortError") setPhase("cancelled");
      else {
        setPhase("error");
        setError((failure as Error).message);
      }
    } finally {
      onBusyChange(false);
      controls.current = null;
    }
  }
  return (
    <div className="product-file-picker">
      <label className="upload-zone compact">
        <Upload size={24} />
        <strong>
          {existing ? "Replace the buyer’s file" : "Choose the buyer’s file"}
        </strong>
        <span>
          ZIP, original artwork or project file · up to {formatBytes(maxBytes)}
        </span>
        <input
          type="file"
          aria-label="Buyer’s downloadable file"
          className="product-file-input"
          disabled={disabled || active}
          onChange={(event) => {
            const selected = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (selected) void start(selected);
          }}
        />
      </label>
      {file ? (
        <div className={`selected-product-file ${phase}`}>
          {phase === "uploaded" ? (
            <CheckCircle2 size={23} />
          ) : (
            <FileArchive size={23} />
          )}
          <div className="selected-file-info">
            <strong>{file.name}</strong>
            <span>
              {formatBytes(file.size)} ·{" "}
              {phase === "uploaded"
                ? "Uploaded and ready to sell"
                : phase === "paused"
                  ? "Paused — keep this window open"
                  : phase === "uploading"
                    ? progress >= 99
                      ? "Finishing and verifying…"
                      : `Uploading ${progress}%`
                    : phase === "cancelled"
                      ? "Upload cancelled — not attached"
                      : "Upload failed — not attached"}
            </span>
          </div>
          <div className="selected-file-controls">
            {active && progress < 99 && (
              <>
                {phase === "paused" ? (
                  <button
                    type="button"
                    aria-label="Resume file upload"
                    onClick={() => {
                      controls.current?.resume();
                      setPhase("uploading");
                    }}
                  >
                    <Play size={17} />
                  </button>
                ) : controls.current && progress < 99 ? (
                  <button
                    type="button"
                    aria-label="Pause file upload"
                    onClick={async () => {
                      const current = controls.current;
                      await current?.pause();
                      if (current && controls.current === current)
                        setPhase("paused");
                    }}
                  >
                    <Pause size={17} />
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Cancel file upload"
                  onClick={() => controller.current?.abort()}
                >
                  <X size={17} />
                </button>
              </>
            )}
            {!active && (
              <button
                type="button"
                disabled={disabled}
                aria-label="Remove selected file"
                onClick={() => {
                  setFile(null);
                  setPhase("idle");
                  setError("");
                  onUploaded(null);
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
          {active && (
            <progress
              max={100}
              value={progress}
              aria-label="File upload progress"
            />
          )}
          {error && (
            <p className="file-upload-error" role="alert">
              {error}
            </p>
          )}
          {(phase === "error" || phase === "cancelled") && (
            <button
              type="button"
              className="text-button file-retry"
              disabled={disabled}
              onClick={() => void start(file)}
            >
              <RotateCcw size={15} /> Retry upload
            </button>
          )}
        </div>
      ) : existing ? (
        <div className="existing-product-file">
          <FileArchive size={19} />
          <span>
            Current file: <strong>{existing.name}</strong> ·{" "}
            {formatBytes(existing.size)}
          </span>
        </div>
      ) : null}
      <p className="fine-print">
        The buyer’s file stays private. Keep this window open during upload;
        connection interruptions are retried automatically.
      </p>
    </div>
  );
}
