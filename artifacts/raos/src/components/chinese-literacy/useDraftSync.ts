import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, clRequest, formUrl } from "./api";
import type { ClEnvelope, ClInput } from "./types";

export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error" | "conflict";
export type LocalDraftRecovery = { baseRevision: number; input: ClInput };

const recoveryKey = (token: string) => `raos:chinese-literacy:draft-recovery:${token}`;

export function readDraftRecovery(token: string): LocalDraftRecovery | null {
  try {
    const raw = window.sessionStorage.getItem(recoveryKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalDraftRecovery>;
    if (!Number.isInteger(parsed.baseRevision) || !parsed.input || typeof parsed.input !== "object") return null;
    return parsed as LocalDraftRecovery;
  } catch {
    return null;
  }
}

export function clearDraftRecovery(token: string) {
  try { window.sessionStorage.removeItem(recoveryKey(token)); } catch { /* Server autosave remains authoritative. */ }
}

function writeDraftRecovery(token: string, input: ClInput, baseRevision: number) {
  try { window.sessionStorage.setItem(recoveryKey(token), JSON.stringify({ baseRevision, input })); } catch { /* Server autosave remains authoritative. */ }
}

/** Serialized autosave: one PUT at a time, latest local input always wins, 409 pauses autosave until the user chooses. */
export function useDraftSync(opts: { token: string; enabled: boolean; initialRevision: number }) {
  const { token, enabled } = opts;
  const revisionRef = useRef(opts.initialRevision);
  const inputRef = useRef<ClInput | null>(null);
  const version = useRef(0);
  const saved = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<number | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const put = useCallback(async (input: ClInput) => {
    const env = await clRequest<ClEnvelope>(formUrl(token), { method: "PUT", body: { revision: revisionRef.current, input } });
    revisionRef.current = env.administration.revision;
  }, [token]);

  const conflict = useRef(false);

  const run = useCallback(async () => {
    if (!enabled || conflict.current || !inputRef.current || version.current === saved.current) return;
    const v = version.current; const snap = inputRef.current;
    setStatus("saving");
    try {
      await put(snap);
      saved.current = v; setSavedAt(new Date());
      if (version.current === v) clearDraftRecovery(token);
      else if (inputRef.current) writeDraftRecovery(token, inputRef.current, revisionRef.current);
      setStatus(version.current === v ? "saved" : "pending");
      if (version.current === v) setMessage(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Never rebase silently: autosave stops, the old revision is kept, local edits stay on screen.
        conflict.current = true;
        setStatus("conflict"); setMessage(e.message);
      } else {
        setStatus("error");
        setMessage(e instanceof ApiError && e.issues.length ? `${e.message}: ${e.issues.join("; ")}` : (e as Error).message || "Could not save.");
      }
    }
  }, [enabled, put, token]);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    chain.current = chain.current.then(run, run);
    await chain.current;
    return !enabled || (!conflict.current && saved.current === version.current);
  }, [run, enabled]);

  const markDirty = useCallback((input: ClInput) => {
    inputRef.current = input; version.current += 1;
    if (enabled) writeDraftRecovery(token, input, revisionRef.current);
    if (!enabled || conflict.current) return;
    setStatus("pending");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(); }, 1200);
  }, [enabled, flush, token]);

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (enabled && version.current !== saved.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h);
  }, [enabled]);

  /** Explicit choice 1: the user discarded local edits and loaded the server revision. */
  const resolveReload = useCallback((revision: number) => {
    revisionRef.current = revision; saved.current = version.current; conflict.current = false; clearDraftRecovery(token); setStatus("idle"); setMessage(null);
  }, [token]);
  /** Explicit choice 2: the user confirmed overwriting with local edits against the latest revision. */
  const overwrite = useCallback(async (): Promise<boolean> => {
    const latest = await clRequest<ClEnvelope>(formUrl(token));
    revisionRef.current = latest.administration.revision; conflict.current = false; setMessage(null);
    return flush();
  }, [token, flush]);

  return { status, message, savedAt, markDirty, flush, revisionRef, resolveReload, overwrite };
}
