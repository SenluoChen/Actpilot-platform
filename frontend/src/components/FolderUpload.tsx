import React, { useMemo, useRef, useState } from "react";

import styles from "./FolderUpload.module.css";

type UploadedFilePayload = {
  filename: string;
  relativePath?: string;
  content: string;
};

type UploadedFact = { key: string; value: unknown; source?: string };

type FolderUploadProps = {
  apiBaseUrl: string;
  onFacts: (facts: UploadedFact[]) => void;
};

const ALLOWED_EXTENSIONS = new Set([
  // Plain text + docs
  "txt",
  "md",
  "markdown",
  "rst",
  "rtf",
  "log",

  // Data/config
  "json",
  "jsonl",
  "ndjson",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "properties",
  "env",
  "xml",
  "csv",
  "tsv",

  // Common “text as code” formats
  "sql",
  "py",
  "js",
  "jsx",
  "ts",
  "tsx",
  "java",
  "cs",
  "go",
  "rb",
  "php",
  "sh",
  "ps1",
  "bat",
  "yarnrc",
  "npmrc",
]);

const ALLOWED_BASENAMES = new Set([
  "readme",
  "license",
  "changelog",
  "makefile",
  "dockerfile",
  ".env",
  ".gitignore",
  ".dockerignore",
]);

// No frontend-imposed file count or total size limits per user request.
const MAX_TEXT_FILE_BYTES = Infinity; // kept for compatibility but not enforced
const MAX_TOTAL_UPLOAD_BYTES = Infinity;

const hiddenInputStyle: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
  opacity: 0,
};

function extOf(name: string): string {
  const m = name.toLowerCase().match(/\.([^.]+)$/);
  return m ? m[1] : "";
}

function isSupportedTextFile(file: File): boolean {
  const filenameLower = file.name.toLowerCase();
  if (ALLOWED_BASENAMES.has(filenameLower)) return true;

  // Many repos have useful docs without an extension (e.g., README, LICENSE).
  // If it's extension-less and not huge, treat it as text.
  const hasDot = filenameLower.includes(".");
  if (!hasDot && file.size <= MAX_TEXT_FILE_BYTES) return true;

  const ext = extOf(filenameLower);
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return true;

  // Fallback: some browsers populate MIME types for extension-less files.
  const t = (file.type || "").toLowerCase();
  if (t.startsWith("text/")) return true;
  if (
    t === "application/json" ||
    t === "application/xml" ||
    t === "text/xml" ||
    t === "application/yaml" ||
    t === "application/x-yaml" ||
    t === "text/yaml"
  ) {
    return true;
  }

  return false;
}

const FolderUpload: React.FC<FolderUploadProps> = ({ apiBaseUrl, onFacts }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastUploadedCount, setLastUploadedCount] = useState<number | undefined>(undefined);

  const filteredFiles = useMemo(() => {
    return selectedFiles.filter(isSupportedTextFile);
  }, [selectedFiles]);

  const handlePickFiles: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    setError(undefined);
    const list = Array.from(e.target.files || []);

    try {
      // eslint-disable-next-line no-console
      console.debug(
        "FolderUpload picked files:",
        list.map((f) => ({ name: f.name, relativePath: (f as any).webkitRelativePath }))
      );
    } catch (_) {}

    const supported = list.filter(isSupportedTextFile);
    setSelectedFiles((prev) => {
      const seen = new Set(prev.map((f) => `${(f as any).webkitRelativePath || f.name}::${f.name}`));
      const added = supported.filter((f) => {
        const key = `${(f as any).webkitRelativePath || f.name}::${f.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return [...prev, ...added];
    });

    setLastUploadedCount(undefined);
  };

  const handleUpload = async () => {
    setUploading(true);
    setError(undefined);

    try {
      if (!apiBaseUrl) {
        throw new Error("API base URL is not configured. Set VITE_API_BASE_URL in the frontend env.");
      }

      const files: UploadedFilePayload[] = [];
      for (const f of filteredFiles) {
        const content = await f.text();
        files.push({
          filename: f.name,
          relativePath: (f as any).webkitRelativePath || undefined,
          content,
        });
      }

      const url = `${apiBaseUrl}/parser/upload-folder`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (${res.status}) at ${url}`);
      }

      const json = await res.json();
      const facts: UploadedFact[] = Array.isArray(json?.facts) ? json.facts : [];
      onFacts(facts);
      setLastUploadedCount(filteredFiles.length);
    } catch (e: any) {
      const msg = e?.message || "Upload failed";
      if (/failed to fetch/i.test(msg)) {
        setError(
          "Upload failed (network/CORS). Check that VITE_API_BASE_URL points to your deployed API and that /parser/upload-folder allows CORS."
        );
      } else {
        setError(msg);
      }
    } finally {
      setUploading(false);
    }
  };

  const inputRefFiles = useRef<HTMLInputElement | null>(null);

  return (
    <div className={styles["form-section"]}>
      <div className={styles["form-section-title"]}>AI Form Prefill</div>
      <div className={styles["form-section-subtitle"]}>
        May select multiple AI system files to AI-prefill the form.
        <br />
        Supported: README/text, JSON, YAML, CSV, config, and common source files.
      </div>

      <div className={styles["form-fields"]}>
        <div className={styles["form-field"]}>
          <div className={styles["upload-row"]}>
            <div className={styles["select-control"]}>
              <input
                ref={inputRefFiles}
                type="file"
                multiple
                onChange={handlePickFiles}
                style={hiddenInputStyle}
                tabIndex={-1}
              />

              <div style={{ position: "relative", display: "inline-block" }}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={(e) => {
                    e.stopPropagation();
                    const input = inputRefFiles.current;
                    if (!input) return;

                    input.removeAttribute("webkitdirectory");
                    input.removeAttribute("directory");
                    try {
                      (input as any).webkitdirectory = false;
                      (input as any).directory = false;
                    } catch (_) {}

                    input.value = "";
                    input.click();
                  }}
                  disabled={uploading}
                >
                  Add files
                </button>
              </div>
            </div>

            <div className={styles["file-count"]} style={{ marginRight: 8 }}>
              {filteredFiles.length} files
            </div>

            <div className={styles["upload-action"]}>
              <button
                className={`${styles.btn} ${styles["btn-primary"]}`}
                disabled={uploading || filteredFiles.length === 0}
                onClick={handleUpload}
              >
                {uploading ? "Prefilling..." : "AI Prefill"}
              </button>
            </div>
          </div>

          <div className={styles["upload-hint"]}>Select multiple files</div>

          {error && <div className={styles["folder-upload-error"]}>{error}</div>}
        </div>
      </div>
    </div>
  );
};

export default FolderUpload;

