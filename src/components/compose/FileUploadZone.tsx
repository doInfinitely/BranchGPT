"use client";

import { useRef, useCallback, useState } from "react";
import { nanoid } from "nanoid";
import type { Attachment } from "@/types";

interface FileUploadZoneProps {
  attachments: Attachment[];
  onAttach: (attachments: Attachment[]) => void;
  onRemove: (id: string) => void;
  label?: string;
  compact?: boolean;
}

const MAX_IMAGE_DIM = 1024;
const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
];

export function FileUploadZone({
  attachments,
  onAttach,
  onRemove,
  label,
  compact = false,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const results: Attachment[] = [];

      for (const file of Array.from(files)) {
        if (!ACCEPTED_TYPES.includes(file.type)) continue;

        if (file.type.startsWith("image/")) {
          const attachment = await processImage(file);
          if (attachment) results.push(attachment);
        } else {
          const data = await readAsBase64(file);
          results.push({
            id: nanoid(),
            fileName: file.name,
            mimeType: file.type,
            data,
          });
        }
      }

      if (results.length > 0) onAttach(results);
    },
    [onAttach]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-1 nodrag nopan nowheel">
      {/* Thumbnails */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative group rounded border overflow-hidden"
              style={{
                borderColor: "var(--color-border)",
                width: compact ? 32 : 48,
                height: compact ? 32 : 48,
              }}
            >
              {att.mimeType.startsWith("image/") ? (
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.fileName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[7px]"
                  style={{ backgroundColor: "var(--color-bg-tertiary)", color: "var(--color-text-secondary)" }}
                >
                  {att.fileName.split(".").pop()?.toUpperCase()}
                </div>
              )}
              <button
                onClick={() => onRemove(att.id)}
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full text-[8px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                style={{ backgroundColor: "var(--color-error)", color: "white" }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="rounded border border-dashed cursor-pointer transition-colors flex items-center justify-center"
        style={{
          borderColor: dragOver ? "var(--color-accent)" : "var(--color-border)",
          backgroundColor: dragOver ? "var(--color-accent-light)" : "transparent",
          padding: compact ? "3px 6px" : "6px 10px",
        }}
      >
        <span
          className="text-center"
          style={{
            color: "var(--color-text-tertiary)",
            fontSize: compact ? "8px" : "10px",
          }}
        >
          {label || (compact ? "+" : "Drop files or click to upload")}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

async function processImage(file: File): Promise<Attachment | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Resize if too large
        if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
          const scale = MAX_IMAGE_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, 0.85);
        const base64 = dataUrl.split(",")[1];

        resolve({
          id: nanoid(),
          fileName: file.name,
          mimeType,
          data: base64,
          width,
          height,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  });
}
