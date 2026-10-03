"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Star, Undo2 } from "lucide-react";

import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ClickableText } from "@/components/ui/clickable-text";
import { useConfirm } from "@/context/ConfirmDialogContext";
import { notify } from "@/notifications";
import { reviewCountsQueryKey, reviewsQueryKeyRoot } from "@/lib/query-keys";
import { useReviewCountsQuery, useReviewsQuery } from "@/hooks/useReviewsQuery";
import { useBrandsQuery } from "@/hooks/useBrandsQuery";
import type { AdminReview } from "@/types";
import { Stars } from "@/components/reviews/Stars";
import { AddReviewForm } from "@/components/reviews/AddReviewForm";
import { EmptyFolder } from "@/components/EmptyFolder";
import { useOpenFromAddress } from "@/hooks/useOpenFromAddress";

type Status = AdminReview["status"];

const TABS: Status[] = ["pending", "published", "rejected"];

/** The tab the address names (`?tab=`, a search result's), else Pending. */
function tabFrom(value: string | null): Status {
  return TABS.find((tab) => tab === value) ?? "pending";
}

/**
 * What shoppers said, waiting for the merchant's word.
 *
 * **Nothing here publishes itself.** A review arrives waiting, and this page is
 * the only place it stops waiting. One nasty review on a small shop does real
 * damage and nobody in this market has a team for that, so the queue opens on
 * what needs a decision rather than on everything.
 *
 * A merchant decides, answers, deletes, or adds one of their own. What they
 * cannot do is rewrite what a shopper wrote — there is no control for it here
 * and no endpoint behind it, because a review the shop can edit is not a
 * review.
 */
export default function ReviewsPage() {
  const router = useRouter();
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const confirm = useConfirm();
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Status>(() => tabFrom(searchParams.get("tab")));
  // The review a search result named: shown in its tab, scrolled to and marked.
  const [marked, setMarked] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addForm = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: reviews = [], isLoading, isError, error } = useReviewsQuery(tab);

  useOpenFromAddress(!isLoading, (publicId) => {
    const found = reviews.some((review) => review.public_id === publicId);
    if (found) {
      setMarked(publicId);
      requestAnimationFrame(() =>
        document.getElementById(`review-${publicId}`)?.scrollIntoView({ block: "center" })
      );
    }
    return found;
  });
  const { data: counts } = useReviewCountsQuery();
  // Warms the product picker the Add form uses, so opening it is not a wait.
  useBrandsQuery();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: reviewsQueryKeyRoot });
    void queryClient.invalidateQueries({ queryKey: reviewCountsQueryKey });
  }, [queryClient]);

  useEffect(() => {
    if (!isError || !error) return;
    notify.error(error, {
      title: tPages("toastTitleReviewsUnavailable"),
      fallbackMessage: tPages("toastDescReviewsUnavailable"),
    });
  }, [isError, error, tPages]);

  async function moderate(review: AdminReview, status: Status) {
    setBusy(review.public_id);
    try {
      await api.post(`admin/reviews/${review.public_id}/moderate/`, {
        status,
        // The row as it was read. A shopper can edit while this page is open,
        // and approving the text from a minute ago would publish something
        // nobody approved.
        expected_updated_at: review.updated_at,
      });
      refresh();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleReviewChangeFailed"),
        fallbackMessage: tPages("toastDescReviewChangeFailed"),
      });
    } finally {
      setBusy(null);
    }
  }

  async function remove(review: AdminReview) {
    const ok = await confirm({
      title: tPages("confirmDialogTitleDeleteReview"),
      message: tPages("reviewsConfirmDelete"),
      variant: "danger",
    });
    if (!ok) return;
    setBusy(review.public_id);
    try {
      await api.delete(`admin/reviews/${review.public_id}/`);
      refresh();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleReviewChangeFailed"),
        fallbackMessage: tPages("toastDescReviewChangeFailed"),
      });
    } finally {
      setBusy(null);
    }
  }

  // An empty Waiting or Live tab: its folder holds the one "Add a review" button (owner, 2026-10-03).
  // A review the shop adds goes live at once, so it is not offered among the hidden.
  const folderAdds = !isLoading && reviews.length === 0 && tab !== "rejected";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-card bg-muted/80 px-1 py-1 hidden md:block">
            <button
              type="button"
              onClick={() => router.back()}
              aria-label={tPages("reviewsGoBackAria")}
              className="flex items-center justify-center rounded-ui p-1 text-muted-foreground hover:bg-muted"
            >
              <Undo2 className="h-4 w-4" />
            </button>
          </div>
          <h1 className="text-2xl font-medium text-foreground">{tPages("reviewsTitle")}</h1>
        </div>

        {adding || !folderAdds ? (
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setAdding((open) => !open)}
              className="rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {adding ? tPages("reviewsCancelAdd") : tPages("reviewsAdd")}
            </button>
          </div>
        ) : null}
      </div>

      <p className="max-w-2xl text-sm text-muted-foreground">{tPages("reviewsIntro")}</p>

      {adding ? (
        <div ref={addForm} className="scroll-mt-24">
          <AddReviewForm
            onDone={() => {
              setAdding(false);
              setTab("published");
              refresh();
            }}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={`rounded-card border px-3 py-1.5 text-sm ${
              tab === value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {tPages(`reviewsTab_${value}` as never)}
            {counts ? (
              <span className="ml-2 text-xs text-muted-foreground">{counts[value]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      ) : reviews.length === 0 ? (
        <EmptyFolder
          title={tPages(`reviewsEmptyTitle_${tab}` as never)}
          line={tPages(`reviewsEmptyLine_${tab}` as never)}
          action={
            folderAdds && !adding
              ? {
                  label: tPages("reviewsAdd"),
                  onClick: () => {
                    setAdding(true);
                    requestAnimationFrame(() => addForm.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
                  },
                }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.public_id}
              review={review}
              marked={marked === review.public_id}
              busy={busy === review.public_id}
              onModerate={moderate}
              onDelete={remove}
              onReplied={refresh}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewCard({
  review,
  marked = false,
  busy,
  onModerate,
  onDelete,
  onReplied,
}: {
  review: AdminReview;
  /** The one a search result opened. */
  marked?: boolean;
  busy: boolean;
  onModerate: (review: AdminReview, status: Status) => void;
  onDelete: (review: AdminReview) => void;
  onReplied: () => void;
}) {
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.reply);
  const [saving, setSaving] = useState(false);

  async function saveReply(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post(`admin/reviews/${review.public_id}/reply/`, { reply });
      setReplying(false);
      onReplied();
    } catch (err) {
      notify.error(err, {
        title: tPages("toastTitleReviewChangeFailed"),
        fallbackMessage: tPages("toastDescReviewChangeFailed"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <li
      id={`review-${review.public_id}`}
      className={cn(
        "rounded-card border border-card-border bg-card p-4 transition-shadow",
        marked && "ring-2 ring-primary/60"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Stars value={review.rating} />
            <span className="text-sm font-medium text-foreground">{review.display_name}</span>
            {review.is_verified_buyer ? (
              <Badge tone="good">{tPages("reviewsVerifiedBuyer")}</Badge>
            ) : null}
            {review.source === "merchant" ? (
              // Said out loud, because a review the shop wrote is worth nothing
              // unless a reader — and the merchant looking at this list — can
              // tell it apart from a shopper's.
              <Badge tone="muted">{tPages("reviewsAddedByShop")}</Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{review.product_name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {review.status !== "published" ? (
            <Button
              type="button"
              loading={busy}
              disabled={busy}
              onClick={() => onModerate(review, "published")}
              className="rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {tPages("reviewsApprove")}
            </Button>
          ) : null}
          {review.status !== "rejected" ? (
            <ClickableText onClick={() => onModerate(review, "rejected")} className="text-sm">
              {tPages("reviewsReject")}
            </ClickableText>
          ) : null}
          <ClickableText variant="destructive" onClick={() => onDelete(review)} className="text-sm">
            {tCommon("delete")}
          </ClickableText>
        </div>
      </div>

      {review.body ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {review.body}
        </p>
      ) : null}

      {review.images.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.images.map((image) =>
            image.image ? (
              /* The thumbnail in the queue -- twenty reviews is forty pictures,
                 and the full size would be megabytes to glance at a page. It
                 opens the full one, because a merchant deciding whether to
                 publish somebody's photo has to be able to look at it. */
              <a
                key={image.public_id}
                href={image.image}
                target="_blank"
                rel="noreferrer noopener"
                className="block"
              >
                <img
                  src={image.thumbnail ?? image.image}
                  alt=""
                  loading="lazy"
                  className="size-20 rounded-ui object-cover"
                />
              </a>
            ) : null
          )}
        </div>
      ) : null}

      {review.reply && !replying ? (
        <div className="mt-3 rounded-ui border-l-2 border-primary/40 bg-muted/30 px-3 py-2">
          <p className="text-xs text-muted-foreground">{tPages("reviewsYourReply")}</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{review.reply}</p>
        </div>
      ) : null}

      {replying ? (
        <form onSubmit={saveReply} className="mt-3 space-y-2">
          <Textarea
            rows={3}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={tPages("reviewsReplyPlaceholder")}
            className="[field-sizing:fixed] resize-none"
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              loading={saving}
              disabled={saving}
              className="rounded-card bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {tCommon("save")}
            </Button>
            <ClickableText onClick={() => setReplying(false)} className="text-sm">
              {tCommon("cancel")}
            </ClickableText>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          <ClickableText onClick={() => setReplying(true)} className="text-sm">
            {review.reply ? tPages("reviewsEditReply") : tPages("reviewsReply")}
          </ClickableText>
        </div>
      )}
    </li>
  );
}

function Badge({ tone, children }: { tone: "good" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-tooltip px-2 py-0.5 text-xs font-semibold ${
        tone === "good"
          ? "bg-emerald-500/20 text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}
