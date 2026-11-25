// ACTORVERSE — Community (Phase 4)
// A simple board for actors: short posts, newest first. Starts EMPTY —
// no fake posts. Signed-in users can post and delete their own posts.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase";
import { createPost, deleteMyPost, listPosts } from "@/lib/community";
import type { PostWithAuthor } from "@/lib/community";
import { showToast } from "@/components/Toast";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function CommunityPage() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageOk, setMessageOk] = useState(false);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const refreshList = useCallback(async () => {
    setPosts(await listPosts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setSignedIn(false);
        return;
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled) return;
        setSignedIn(Boolean(user));
        setUserId(user ? user.id : null);
        if (user && !loadedOnce.current) {
          loadedOnce.current = true;
          await refreshList();
        }
      } catch {
        if (!cancelled) setSignedIn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshList]);

  async function handlePost() {
    setPosting(true);
    setMessage(null);
    const result = await createPost(body);
    setPosting(false);
    setMessageOk(result.ok);
    setMessage(result.message);
    if (result.ok) {
      setBody("");
      await refreshList();
      showToast("Posted.");
    }
  }

  async function handleDelete(post: PostWithAuthor) {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setRowBusy(post.id);
    const error = await deleteMyPost(post.id);
    setRowBusy(null);
    if (error) {
      setMessageOk(false);
      setMessage(error);
      return;
    }
    setMessageOk(true);
    setMessage("Deleted.");
    showToast("Post deleted.");
    await refreshList();
  }

  return (
    <section className="section" data-page="community">
      <h2>Community</h2>
      <p className="sub">
        Actors helping actors. Share a win, a question, or a tip. Keep it
        kind — posts are public to every signed-in actor here.
      </p>

      {signedIn === false && (
        <p className="note">
          Sign in to read the community and post. Posts are only visible to
          signed-in actors.
        </p>
      )}

      {signedIn === true && (
        <>
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Write a post</h3>
            <div className="form">
              <textarea
                rows={3}
                maxLength={500}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Share something with the community…"
                aria-label="Your post"
              />
              <p className="sub" style={{ marginBottom: 0 }}>
                {body.length} / 500 characters
              </p>
              <button
                type="button"
                className="btn btn-gold"
                disabled={posting || !body.trim()}
                onClick={() => void handlePost()}
              >
                {posting ? (
                  <>
                    <span className="spinner" aria-hidden="true" /> Posting…
                  </>
                ) : (
                  "Post"
                )}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Latest posts</h3>
            {posts.length === 0 && (
              <p className="empty">
                <strong>No posts yet.</strong>Be the first to share something.
              </p>
            )}
            {posts.length > 0 && (
              <ul className="session-list">
                {posts.map((post) => (
                  <li key={post.id} style={{ display: "block" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "baseline",
                      }}
                    >
                      <strong>{post.authorName}</strong>
                      <span className="muted">
                        {formatDate(post.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                      {post.body}
                    </p>
                    {post.user_id === userId && (
                      <div className="rowbtns">
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={rowBusy === post.id}
                          onClick={() => void handleDelete(post)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {message && (
        <p className={messageOk ? "success" : "error"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}
