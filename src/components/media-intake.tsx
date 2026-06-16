"use client";

import { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { isImageFile, isVideoFile } from "@/lib/footage-intake";

function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface DropZoneProps {
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  validate: (file: File) => boolean;
  invalidMessage: string;
}

function DropZone({
  label,
  hint,
  accept,
  multiple,
  files,
  onFiles,
  validate,
  invalidMessage,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingest = useCallback(
    (list: FileList | null) => {
      if (!list?.length) return;
      const picked = Array.from(list);
      const valid = picked.filter(validate);
      if (valid.length === 0) {
        setError(invalidMessage);
        return;
      }
      setError(null);
      onFiles(multiple ? [...files, ...valid] : valid.slice(0, 1));
    },
    [files, invalidMessage, multiple, onFiles, validate],
  );

  return (
    <div className="mt-4">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <p id={`${inputId}-hint`} className="mt-0.5 text-xs text-ink-mute">
        {hint}
      </p>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          ingest(e.dataTransfer.files);
        }}
        className={cn(
          "mt-2 block cursor-pointer rounded-xl border border-dashed px-4 py-8 text-center transition-colors",
          dragging
            ? "border-accent bg-accent/10"
            : "border-line bg-surface-2 hover:border-line-strong",
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          aria-describedby={`${inputId}-hint`}
          className="sr-only"
          onChange={(e) => {
            ingest(e.target.files);
            e.target.value = "";
          }}
        />
        <p className="text-sm text-ink-soft">
          Drop {multiple ? "files" : "a file"} here or click to browse
        </p>
        <p className="mt-1 text-xs text-ink-faint">Stored locally in this browser only</p>
      </label>

      {error && (
        <p className="mt-2 text-xs text-bad" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-base px-3 py-2 text-sm"
            >
              <span className="truncate text-ink">{f.name}</span>
              <span className="shrink-0 text-xs text-ink-mute">{formatBytes(f.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onFiles(files.filter((_, j) => j !== i));
                }}
                className="shrink-0 text-xs text-ink-mute hover:text-ink"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export interface MediaIntakeState {
  recordingFile: File | null;
  screenshotFiles: File[];
}

interface MediaIntakeProps {
  showRecording: boolean;
  showScreenshots: boolean;
  recordingFile: File | null;
  screenshotFiles: File[];
  onRecordingChange: (file: File | null) => void;
  onScreenshotsChange: (files: File[]) => void;
}

export function MediaIntake({
  showRecording,
  showScreenshots,
  recordingFile,
  screenshotFiles,
  onRecordingChange,
  onScreenshotsChange,
}: MediaIntakeProps) {
  if (!showRecording && !showScreenshots) return null;

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
      {showRecording && (
        <DropZone
          label="Screen recording"
          hint="WebM, MP4, or MOV — up to ~500 MB"
          accept="video/webm,video/mp4,video/quicktime,.webm,.mp4,.mov"
          files={recordingFile ? [recordingFile] : []}
          onFiles={(files) => onRecordingChange(files[0] ?? null)}
          validate={isVideoFile}
          invalidMessage="Choose a video file (WebM, MP4, or MOV)."
        />
      )}

      {showScreenshots && (
        <DropZone
          label="Product screenshots"
          hint="PNG, JPG, or WebP — up to 12 images, stitched into a demo reel"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          multiple
          files={screenshotFiles}
          onFiles={onScreenshotsChange}
          validate={isImageFile}
          invalidMessage="Choose image files (PNG, JPG, or WebP)."
        />
      )}

      {showRecording && showScreenshots && (recordingFile || screenshotFiles.length > 0) && (
        <p className="mt-3 text-xs text-ink-mute">
          {recordingFile
            ? "Recording takes priority over screenshots for moment detection."
            : "Screenshots will be stitched into a short slideshow video."}
        </p>
      )}
    </div>
  );
}
