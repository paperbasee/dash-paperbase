"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";

import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { normalizeError } from "@/notifications";
import { VariantProductPicker } from "@/app/[locale]/(dashboard)/variants/variant-product-picker";

/**
 * A review the shop is adding itself.
 *
 * Merchants asked for this because these shops come from Facebook with real
 * praise in comments and screenshots, and refusing would only push them to
 * paste it into the product description instead. What makes it honest is that
 * the result is **marked**: it is stored as the shop's, it never carries a
 * verified-buyer badge, and the card says so wherever it appears.
 *
 * It publishes at once. The approval queue exists to protect a merchant from
 * what a stranger wrote, and there is no stranger here — asking them to approve
 * their own typing would be ceremony.
 */
export function AddReviewForm({ onDone }: { onDone: () => void }) {
  const tPages = useTranslations("pages");
  const tCommon = useTranslations("common");

  const [product, setProduct] = useState("");
  const [rating, setRating] = useState(5);
  const [displayName, setDisplayName] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setProblem(null);
    if (!product) {
      setProblem(tPages("reviewsPickAProduct"));
      return;
    }
    setSaving(true);
    try {
      await api.post("admin/reviews/", {
        product,
        rating,
        body,
        display_name: displayName,
      });
      onDone();
    } catch (err) {
      // Inline: the merchant is looking at this form, and the usual answer is
      // about a field in it.
      setProblem(normalizeError(err, tPages("toastDescReviewChangeFailed")).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-card border border-primary/30 bg-primary/5 p-4"
    >
      <p className="text-sm font-medium text-primary">{tPages("reviewsAddTitle")}</p>
      <p className="text-xs text-muted-foreground">{tPages("reviewsAddNote")}</p>

      {/* The Variants page's picker, reused rather than copied: it already
          searches the server as you type, and a second product picker would be
          a second set of behaviours to keep in step with this one. */}
      <VariantProductPicker
        productId={product}
        productName={null}
        onChange={setProduct}
        ariaLabel={tPages("reviewsPickAProduct")}
        placeholder={tPages("reviewsPickAProduct")}
        emptyText={tPages("reviewsNoProductFound")}
        loadingText={tCommon("loading")}
        className="w-full max-w-xl"
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{tPages("reviewsRating")}</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={tPages("reviewsRatingOf", { n })}
            aria-pressed={rating === n}
            className="rounded-ui p-0.5 hover:bg-muted"
          >
            <Star
              aria-hidden
              className={
                n <= rating ? "size-5 fill-amber-400 text-amber-400" : "size-5 text-muted-foreground/40"
              }
            />
          </button>
        ))}
      </div>

      <Input
        required
        value={displayName}
        maxLength={80}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder={tPages("reviewsNamePlaceholder")}
        className="max-w-xl"
      />
      <Textarea
        rows={3}
        value={body}
        maxLength={5000}
        onChange={(event) => setBody(event.target.value)}
        placeholder={tPages("reviewsBodyPlaceholder")}
        className="[field-sizing:fixed] resize-none"
      />

      {problem ? <p className="text-sm text-destructive">{problem}</p> : null}

      <Button
        type="submit"
        loading={saving}
        disabled={saving}
        className="rounded-card bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {tCommon("save")}
      </Button>
    </form>
  );
}
