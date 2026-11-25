// ACTORVERSE — Script Vault: PDF scripts in Supabase Storage (Phase 3)
// Scripts upload to the private `scripts` Storage bucket and one row is
// written to the public.scripts table. Everything is own-rows-only: a user
// can only see, open, rename and delete their own scripts. PDF only,
// max about 10 MB. An optional pasted script text can be saved with the
// PDF so it can be sent to the Teleprompter.

import { createClient, isSupabaseConfigured } from "./supabase";

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

/** Upload a PDF script and write its row. */
export async function uploadScript(
  file: File,
  title: string,
  scriptText: string,
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
    const { error: uploadError } = await supabase.storage
      .from(SCRIPTS_BUCKET)
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) {
      return { ok: false, message: friendlyUploadError(uploadError.message) };
    }
    const { data, error: insertError } = await supabase
      .from("scripts")
      .insert({
        user_id: user.id,
        title: cleanTitle,
        storage_path: path,
        script_text: scriptText.trim() ? scriptText.trim() : null,
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
    return { ok: true, message: "Script saved.", row: data as ScriptRow };
  } catch (err) {
    return {
      ok: false,
      message: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}.`,
    };
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
