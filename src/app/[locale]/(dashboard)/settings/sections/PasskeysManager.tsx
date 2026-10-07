"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Trash2, Plus, Check, X, Pencil } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import {
  listPasskeys,
  enrollPasskey,
  renamePasskey,
  deletePasskey,
  type PasskeyInfo,
} from "@/lib/auth";
import { SupportReadOnly } from "@/components/support/SupportReadOnly";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { browserSupportsWebAuthn, isPasskeyCancellation } from "@/lib/passkeys";
import { PASSKEY_PROVIDER_ICONS, passkeyTitle, passkeyWhere, shownProvider } from "@/lib/passkey-display";

/**
 * Manage the current user's passkeys: list, add another, rename, or remove.
 * Available to every signed-in user (owners and staff) since everyone signs in
 * with passkeys now.
 */
export default function PasskeysManager() {
  const t = useTranslations("settings.passkeys");
  const format = useFormatter();
  const confirm = useConfirm();
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
      setError(t("loadFailed"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    setError("");
    if (!supported) {
      setError(t("unsupported"));
      return;
    }
    setAdding(true);
    try {
      await enrollPasskey({});
      await load();
    } catch (err) {
      if (!isPasskeyCancellation(err)) setError(t("addFailed"));
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
      setError(t("renameFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string, name: string) {
    const isLast = (passkeys?.length ?? 0) <= 1;
    const ok = await confirm({
      title: t("removeTitle", { name }),
      message: isLast ? t("removeLastMessage") : t("removeMessage"),
      confirmText: t("removeConfirm"),
      variant: "danger",
    });
    if (!ok) return;
    setError("");
    setBusyId(id);
    try {
      await deletePasskey(id);
      await load();
    } catch {
      setError(t("removeFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SupportReadOnly>
    <div className="rounded-card border border-border bg-background p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <KeyRound size={18} /> {t("title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("intro")}
          </p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" loading={adding} onClick={() => void handleAdd()}>
          <Plus size={15} /> {t("add")}
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
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-ui border border-border">
          {passkeys.map((pk) => {
            const title = passkeyTitle(pk, t);
            const ProviderIcon = PASSKEY_PROVIDER_ICONS[shownProvider(pk)];
            return (
            <li key={pk.public_id} className="flex items-center gap-3 px-4 py-3">
              <ProviderIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
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
                      aria-label={t("saveName")}
                      onClick={() => void handleRename(pk.public_id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label={t("cancelRename")}
                      onClick={() => setEditingId(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="truncate text-sm font-medium text-foreground">{title}</p>
                    {/* Where it is saved, then when it was last used. */}
                    <p className="text-xs text-muted-foreground">
                      <span>{passkeyWhere(pk, t)}</span>
                      <span aria-hidden> · </span>
                      <span>
                        {pk.last_used_at
                          ? t("lastUsed", { date: format.dateTime(new Date(pk.last_used_at), { dateStyle: "medium" }) })
                          : t("added", { date: format.dateTime(new Date(pk.created_at), { dateStyle: "medium" }) })}
                      </span>
                    </p>
                  </>
                )}
              </div>
              {editingId !== pk.public_id && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("rename")}
                    disabled={busyId === pk.public_id}
                    onClick={() => {
                      setEditingId(pk.public_id);
                      setEditName(title);
                    }}
                    className="rounded-ui p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label={t("remove")}
                    disabled={busyId === pk.public_id}
                    onClick={() => void handleDelete(pk.public_id, title)}
                    className="rounded-ui p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
    </SupportReadOnly>
  );
}
