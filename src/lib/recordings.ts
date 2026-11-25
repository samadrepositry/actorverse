// ACTORVERSE — saved takes: Supabase Storage + recordings table (Phase 2)
// Video takes upload to the private `recordings` Storage bucket and one row
// is written to the public.recordings table. Everything is own-rows-only:
// a user can only see, play and delete their own takes.

import { createClient, isSupabaseConfigured } from "./supabase";
import type { Take } from "./recorder";

export const RECORDINGS_BUCKET = "recordings";

export interface RecordingRow {
  id: string;
  user_id: string;
  title: string;
  storage_path: string;
  duration_seconds: number;
  created_at: string;
}

export interface UploadResult {
  ok: boolean;
  message: string;
  row?: RecordingRow;
}

function friendlyUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("bucket not found") || lower.includes("not found")) {
    return (
      "The recordings storage is not set up yet. Run " +
      "supabase/storage-recordings-bucket.sql once in the Supabase SQL Editor, then try again. " +
      "Your take is still on this page — tap Save to phone to keep it."
    );
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    return (
      "The save was blocked by a storage rule. Run " +
      "supabase/storage-recordings-bucket.sql once in the Supabase SQL Editor, then try again. " +
      "Your take is still on this page — tap Save to phone to keep it."
    );
  }
  if (lower.includes("payload too large") || lower.includes("too large")) {
    return (
      "This take is too large to save online. Try a shorter take. " +
      "This take is still on this page — tap Save to phone to keep it."
    );
  }
  return `Upload failed: ${message}. Your take is still on this page — tap Save to phone to keep it.`;
}

/** Upload a finished take and write its row. Returns a plain message. */
export async function uploadTake(
  take: Take,
  title: string,
): Promise<UploadResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message:
        "Sign-in is not set up yet, so this take cannot be saved online. Tap Save to phone to keep it on your device.",
    };
  }
  if (take.tooLarge) {
    return {
      ok: false,
      message:
        "This take is too large to save online. Try a shorter take. This take is still on this page — tap Save to phone to keep it.",
    };
  }
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return {
        ok: false,
        message:
          "Sign in to save takes online. This take is still on this page — tap Save to phone to keep it.",
      };
    }
    const cleanTitle = title.trim() || "Untitled take";
    const path = `${user.id}/${Date.now()}.${take.extension}`;
    const { error: uploadError } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .upload(path, take.blob, {
        contentType: take.mimeType || undefined,
        upsert: false,
      });
    if (uploadError) {
      return { ok: false, message: friendlyUploadError(uploadError.message) };
    }
    const { data, error: insertError } = await supabase
      .from("recordings")
      .insert({
        user_id: user.id,
        title: cleanTitle,
        storage_path: path,
        duration_seconds: take.durationSeconds,
      })
      .select("id, user_id, title, storage_path, duration_seconds, created_at")
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
            "The video file uploaded, but the recordings list is not set up yet. Run supabase/migrations/0006_recordings.sql once in the Supabase SQL Editor, then try again.",
        };
      }
      return {
        ok: false,
        message: `The video uploaded, but its entry could not be saved: ${insertError.message}.`,
      };
    }
    return { ok: true, message: "Saved. Find it in Studio → My Private Recordings.", row: data as RecordingRow };
  } catch (err) {
    return {
      ok: false,
      message: `Upload failed: ${err instanceof Error ? err.message : "unknown error"}. Your take is still on this page — tap Save to phone to keep it.`,
    };
  }
}

/** Load the signed-in user's saved takes, newest first. */
export async function listMyRecordings(): Promise<RecordingRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("recordings")
      .select("id, user_id, title, storage_path, duration_seconds, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []) as RecordingRow[];
  } catch {
    return [];
  }
}

/** A short-lived link to play or download one saved take. */
export async function signedTakeUrl(
  storagePath: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** Delete one take: the file in Storage and its row. Returns an error message or null. */
export async function deleteMyRecording(
  row: RecordingRow,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return "Sign-in is not set up yet.";
  try {
    const supabase = createClient();
    const { error: storageError } = await supabase.storage
      .from(RECORDINGS_BUCKET)
      .remove([row.storage_path]);
    if (storageError) return `Could not delete the video file: ${storageError.message}`;
    const { error: rowError } = await supabase
      .from("recordings")
      .delete()
      .eq("id", row.id);
    if (rowError) return `Could not delete the entry: ${rowError.message}`;
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Delete failed. Try again.";
  }
}
