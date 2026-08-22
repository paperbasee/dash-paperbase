"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2, Plus, Check, X, Pencil } from "lucide-react";

import {
  listPasskeys,
  enrollPasskey,
  renamePasskey,
  deletePasskey,
  type PasskeyInfo,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";

/**
 * Manage the current user's passkeys: list, add another, rename, or remove.
 * Available to every signed-in user (owners and staff) since everyone signs in
 * with passkeys now.
 */
export default function PasskeysManager() {
  const [passkeys, setPasskeys] = useState<PasskeyInfo[] | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && browserSupportsWebAuthn();

  const load = useCallback(async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch {
      setError("Couldn't load your passkeys.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    setError("");
    if (!supported) {
      setError("This device doesn't support passkeys.");
      return;
    }
    setAdding(true);
    try {
      await enrollPasskey({});
      await load();
    } catch (err) {
      if (!isPasskeyCancellation(err)) setError("Couldn't add a passkey. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    const name = editName.trim();
    setEditingId(null);
    if (!name) return;
    setBusyId(id);
    try {
      await renamePasskey(id, name);
      await load();
    } catch {
      setError("Couldn't rename that passkey.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    const isLast = (passkeys?.length ?? 0) <= 1;
    const message = isLast
      ? `Remove "${name}"? This is your only passkey — to sign in again you'll need an email sign-in link, then create a new passkey. Continue?`
      : `Remove "${name}"? You can no longer sign in with this device.`;
    if (typeof window !== "undefined" && !window.confirm(message)) return;
    setError("");
    setBusyId(id);
    try {
      await deletePasskey(id);
      await load();
    } catch {
      setError("Couldn't remove that passkey.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-card border border-border bg-background p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <KeyRound size={18} /> Passkeys
          </h3>
          <p className="text-sm text-muted-foreground">
            Passkeys let you sign in with your device — Touch ID, Windows Hello,
            or a security key. Add one per device so you&apos;re never locked out.
          </p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" loading={adding} onClick={() => void handleAdd()}>
          <Plus size={15} /> Add a passkey
        </Button>
      </div>

      {error && (
        <p className="rounded-ui border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {passkeys === null ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : passkeys.length === 0 ? (
        <p className="rounded-ui border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No passkeys yet. Add one to sign in without email links.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-ui border border-border">
          {passkeys.map((pk) => (
            <li key={pk.public_id} className="flex items-center gap-3 px-4 py-3">
              <KeyRound size={16} className="shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {editingId === pk.public_id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleRename(pk.public_id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button
                      type="button"
                      aria-label="Save name"
                      onClick={() => void handleRename(pk.public_id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={() => setEditingId(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-foreground">
                      {pk.name || "Passkey"}
                      {pk.synced && (
                        <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                          synced
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {pk.last_used_at
                        ? `Last used ${new Date(pk.last_used_at).toLocaleDateString()}`
                        : `Added ${new Date(pk.created_at).toLocaleDateString()}`}
                    </p>
                  </>
                )}
              </div>
              {editingId !== pk.public_id && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Rename passkey"
                    disabled={busyId === pk.public_id}
                    onClick={() => {
                      setEditingId(pk.public_id);
                      setEditName(pk.name || "");
                    }}
                    className="rounded-ui p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Remove passkey"
                    disabled={busyId === pk.public_id}
                    onClick={() => void handleDelete(pk.public_id, pk.name || "Passkey")}
                    className="rounded-ui p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
