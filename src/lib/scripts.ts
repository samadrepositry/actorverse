// ACTORVERSE — Script Vault: PDF scripts in Supabase Storage (Phase 3)
// Scripts upload to the private `scripts` Storage bucket and one row is
// written to the public.scripts table. Everything is own-rows-only: a user
// can only see, open, rename and delete their own scripts. PDF only,
// max about 10 MB. The words are read out of the PDF automatically
// (pdf.js, in the browser) and saved as the script text, so tapping the
// PDF in the Teleprompter puts its words straight in the reading box.
// A pasted text, if given, wins over the extracted one.
//
// Speed: the file is uploaded and the row is saved FIRST, and the user
// gets "Saved" right away. The PDF text is then read in the background
// and saved onto the row when it finishes — a big novel PDF takes
// minutes to read on a phone, and the upload must never wait for it.
// If background extraction fails, the text stays empty and the
// Teleprompter reads it again when the PDF is tapped.
//
// Upload progress: the file goes up over a raw XHR POST so the UI can
// show a live percentage (supabase-js has no progress callback). A
// stalled upload — no bytes for 60 seconds — or one running past 5
// minutes is stopped with a plain message, and the user can cancel and
// retry. If the XHR path errors, the plain supabase-js upload runs as
// a fallback.

import { createClient, isSupabaseConfigured } from "./supabase";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase-shared";
import { extractPdfText } from "./pdfText";

export const SCRIPTS_BUCKET = "scripts";
export const MAX_SCRIPT_BYTES = 10 * 1024 * 1024; // about 10 MB

export interface ScriptRow {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  script_text: string | null;
  created_at: string;
}

export interface ScriptResult {
  ok: boolean;
  message: string;
  row?: ScriptRow;
  /** True when the user cancelled the upload. */
  cancelled?: boolean;
  /** True when the text was read out of the PDF automatically. */
  textExtracted?: boolean;
  /**
   * Present when the PDF text is still being read in the background.
   * Resolves to true when the text landed on the row, false when it
   * could not be read (scanned PDF or extraction error). The caller
   * can await it to refresh the list — it never blocks the save.
   */
  extractionDone?: Promise<boolean>;
}

/** Options for uploadScript: live progress + user cancel. */
export interface UploadScriptOptions {
  /** Called with 0–100 as bytes go up, or null when the total is unknown. */
  onProgress?: (percent: number | null) => void;
  /** Abort this to cancel the upload. */
  signal?: AbortSignal;
}

const SLOW_UPLOAD_MESSAGE =
  "Upload stopped — the internet is slow. Please try again.";
/** No progress at all for this long means the upload has stalled. */
const STALL_TIMEOUT_MS = 60_000;
/** Hard cap on the whole upload, however slow the connection is. */
const TOTAL_TIMEOUT_MS = 5 * 60_000;

type XhrUploadOutcome =
  | { ok: true }
  | {
      ok: false;
      aborted: "cancelled" | "stall" | "timeout";
      message: string;
    }
  | { ok: false; aborted: null; message: string };

/**
 * Upload a file to Supabase Storage with a raw XHR POST, so the UI can
 * show a live percentage. supabase-js `.upload()` has no progress
 * callback, so it is kept only as a fallback below. Aborts when the
 * caller cancels, when no bytes move for 60 seconds, or after 5
 * minutes total — a stalled upload on a slow phone connection must
 * fail fast with a plain message instead of spinning forever.
 */
function uploadViaXhr(
  supabase: ReturnType<typeof createClient>,
  path: string,
  file: File,
  onProgress: (percent: number | null) => void,
  signal: AbortSignal,
): Promise<XhrUploadOutcome> {
  return new Promise((resolve) => {
    let xhr: XMLHttpRequest | null = null;
    let settled = false;
    let abortReason: "cancelled" | "stall" | "timeout" | null = null;
    let lastProgressAt = Date.now();
    let stallTimer: ReturnType<typeof setInterval> | undefined;
    let totalTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (outcome: XhrUploadOutcome) => {
      if (settled) return;
      settled = true;
      if (stallTimer) clearInterval(stallTimer);
      if (totalTimer) clearTimeout(totalTimer);
      signal.removeEventListener("abort", onSignalAbort);
      resolve(outcome);
    };
    const onSignalAbort = () => {
      abortReason = "cancelled";
      if (xhr) xhr.abort();
    };

    if (signal.aborted) {
      resolve({ ok: false, aborted: "cancelled", message: "Upload cancelled." });
      return;
    }
    signal.addEventListener("abort", onSignalAbort);

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (settled) return;
      const token = session?.access_token;
      if (!token) {
        finish({
          ok: false,
          aborted: null,
          message: "Sign in to save scripts online.",
        });
        return;
      }
      if (signal.aborted) {
        finish({ ok: false, aborted: "cancelled", message: "Upload cancelled." });
        return;
      }
      const encodedPath = path
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
      const url = `${SUPABASE_URL}/storage/v1/object/${SCRIPTS_BUCKET}/${encodedPath}`;
      xhr = new XMLHttpRequest();
      stallTimer = setInterval(() => {
        if (Date.now() - lastProgressAt > STALL_TIMEOUT_MS) {
          abortReason = "stall";
          if (xhr) xhr.abort();
        }
      }, 5000);
      totalTimer = setTimeout(() => {
        abortReason = "timeout";
        if (xhr) xhr.abort();
      }, TOTAL_TIMEOUT_MS);
      xhr.open("POST", url);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
      xhr.setRequestHeader("Content-Type", "application/pdf");
      xhr.setRequestHeader("x-upsert", "false");
      xhr.upload.onprogress = (event) => {
        lastProgressAt = Date.now();
        if (event.lengthComputable && event.total > 0) {
          onProgress(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          );
        } else {
          onProgress(null);
        }
      };
      xhr.onload = () => {
        if (!xhr) return;
        if (xhr.status === 200 || xhr.status === 201) {
          finish({ ok: true });
        } else {
          let detail = "";
          try {
            const parsed = JSON.parse(xhr.responseText);
            detail = parsed?.message || parsed?.error || "";
          } catch {
            detail = xhr.responseText || "";
          }
          finish({
            ok: false,
            aborted: null,
            message: detail || `Upload failed (status ${xhr.status}).`,
          });
        }
      };
      xhr.onerror = () => {
        finish({
          ok: false,
          aborted: null,
          message: "Could not reach the upload server.",
        });
      };
      xhr.onabort = () => {
        if (abortReason === "cancelled") {
          finish({
            ok: false,
            aborted: "cancelled",
            message: "Upload cancelled.",
          });
        } else {
          finish({
            ok: false,
            aborted: abortReason ?? "stall",
            message: SLOW_UPLOAD_MESSAGE,
          });
        }
      };
      xhr.send(file);
    })();
  });
}

function friendlyUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("bucket not found") || lower.includes("not found")) {
    return (
      "The scripts storage is not set up yet. Run " +
      "supabase/storage-scripts-bucket.sql once in the Supabase SQL Editor, then try again."
    );
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    return (
      "The upload was blocked by a storage rule. Run " +
      "supabase/storage-scripts-bucket.sql once in the Supabase SQL Editor, then try again."
    );
  }
  if (lower.includes("payload too large") || lower.includes("too large")) {
    return "This PDF is too large. The limit is about 10 MB.";
  }
  return `Upload failed: ${message}.`;
}

/** Check a file before upload. Returns an error message or null. */
export function validateScriptFile(file: File): string | null {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files are allowed in the Script Vault.";
  if (file.size > MAX_SCRIPT_BYTES) {
    return "This PDF is bigger than 10 MB. Choose a smaller file.";
  }
  if (file.size === 0) return "This file is empty. Choose another PDF.";
  return null;
}

/**
 * Upload a PDF script and write its row — fast. The file is uploaded,
 * the row is saved, and the user gets success right away. When no text
 * was pasted, the PDF text is then read in the background (pdf.js) and
 * saved onto the row when it finishes; `result.extractionDone` resolves
 * when that happens. `onStage` reports the two visible steps so the UI
 * can show "Uploading…" then "Saving…" instead of one stuck
 * "Uploading…" spinner. `options.onProgress` reports a live 0–100
 * percentage while the file goes up, and `options.signal` lets the
 * caller cancel; a stalled upload (no progress for 60 seconds) or one
 * running past 5 minutes is stopped with a plain message. The XHR
 * upload is tried first; if it errors (auth/CORS/network quirk), the
 * plain supabase-js upload runs as a fallback — the user is never left
 * with no upload path.
 */
export async function uploadScript(
  file: File,
  title: string,
  scriptText: string,
  onStage?: (stage: "uploading" | "saving") => void,
  options?: UploadScriptOptions,
): Promise<ScriptResult> {
  const problem = validateScriptFile(file);
  if (problem) return { ok: false, message: problem };
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Sign-in is not set up yet, so scripts cannot be saved online.",
    };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, message: "Sign in to save scripts online." };
    }
    const cleanTitle = title.trim() || file.name.replace(/\.pdf$/i, "");
    const path = `${user.id}/${Date.now()}.pdf`;
    onStage?.("uploading");
    const onProgress = options?.onProgress ?? (() => {});
    const signal =
      options?.signal ?? new AbortController().signal;
    const xhrOutcome = await uploadViaXhr(
      supabase,
      path,
      file,
      onProgress,
      signal,
    );
    if (xhrOutcome.ok) {
      // Uploaded — fall through to saving the row.
    } else if (xhrOutcome.aborted === "cancelled") {
      return { ok: false, cancelled: true, message: "Upload cancelled." };
    } else if (
      xhrOutcome.aborted === "stall" ||
      xhrOutcome.aborted === "timeout"
    ) {
      return { ok: false, message: SLOW_UPLOAD_MESSAGE };
    } else {
      // XHR failed (auth/CORS/network quirk) — fall back to the plain
      // supabase-js upload, which has no progress reporting but always
      // works when the session is valid.
      onProgress(null);
      const { error: uploadError } = await supabase.storage
        .from(SCRIPTS_BUCKET)
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) {
        return { ok: false, message: friendlyUploadError(uploadError.message) };
      }
    }
    // Save the row right away — pasted text if given, otherwise no text
    // yet. The PDF text is read in the background below; the user never
    // waits for it (a big novel takes minutes to read on a phone).
    const textToSave: string | null = scriptText.trim()
      ? scriptText.trim()
      : null;
    onStage?.("saving");
    const { data, error: insertError } = await supabase
      .from("scripts")
      .insert({
        user_id: user.id,
        title: cleanTitle,
        storage_path: path,
        script_text: textToSave,
      })
      .select("id, user_id, title, storage_path, script_text, created_at")
      .single();
    if (insertError) {
      const lower = insertError.message.toLowerCase();
      if (
        lower.includes("could not find the table") ||
        (lower.includes("relation") && lower.includes("does not exist"))
      ) {
        return {
          ok: false,
          message:
            "The PDF uploaded, but the scripts list is not set up yet. Run supabase/migrations/0007_scripts.sql once in the Supabase SQL Editor, then try again.",
        };
      }
      return {
        ok: false,
        message: `The PDF uploaded, but its entry could not be saved: ${insertError.message}.`,
      };
    }
    const row = data as ScriptRow;
    // No pasted text? Read the words out of the PDF in the background.
    // Fire-and-forget: the caller gets success now and can await
    // `extractionDone` to refresh the list when the text lands. If it
    // fails, the text stays empty and the Teleprompter reads the PDF
    // again when it is tapped.
    if (!textToSave) {
      const extractionDone: Promise<boolean> = (async () => {
        try {
          const extracted = await extractPdfText(await file.arrayBuffer());
          if (!extracted) return false;
          return await saveScriptText(row.id, extracted);
        } catch {
          return false;
        }
      })();
      return {
        ok: true,
        message:
          "Saved. Reading the text from the PDF in the background…",
        row,
        textExtracted: false,
        extractionDone,
      };
    }
    return {
      ok: true,
      message: "Script saved.",
      row,
      textExtracted: false,
    };
  } catch (err) {
    return {
      ok: false,
      message: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
  }
}

/**
 * Save extracted text for a script row, so the Teleprompter can load it
 * instantly next time. Used after the Teleprompter reads a PDF that had
 * no saved text yet. Returns true on success.
 */
export async function saveScriptText(
  id: string,
  text: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("scripts")
      .update({ script_text: text })
      .eq("id", id);
    return !error;
  } catch {
    return false;
  }
}

/** Load the signed-in user's scripts, newest first. */
export async function listMyScripts(): Promise<ScriptRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("scripts")
      .select("id, user_id, title, storage_path, script_text, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as ScriptRow[];
  } catch {
    return [];
  }
}

/** Load one of the signed-in user's scripts by id (for the Teleprompter). */
export async function getMyScript(id: string): Promise<ScriptRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("scripts")
      .select("id, user_id, title, storage_path, script_text, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !data) return null;
    return data as ScriptRow;
  } catch {
    return null;
  }
}

/** A short-lived link to view or download one script. */
export async function signedScriptUrl(
  storagePath: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(SCRIPTS_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Rename one script. Returns an error message or null. */
export async function renameMyScript(
  id: string,
  title: string,
): Promise<string | null> {
  const clean = title.trim();
  if (!clean) return "Write a title first.";
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from("scripts")
      .update({ title: clean })
      .eq("id", id);
    if (error) return `Could not rename: ${error.message}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Rename failed. Try again.";
  }
}

/** Delete one script: the file in Storage and its row. */
export async function deleteMyScript(
  row: ScriptRow,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from(SCRIPTS_BUCKET)
      .remove([row.storage_path]);
    if (storageError)
      return `Could not delete the PDF file: ${storageError.message}`;
    const { error: rowError } = await supabase
      .from("scripts")
      .delete()
      .eq("id", row.id);
    if (rowError) return `Could not delete the entry: ${rowError.message}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Delete failed. Try again.";
  }
}
