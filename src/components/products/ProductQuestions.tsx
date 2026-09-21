"use client";

import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/** One row a merchant filled in. Both halves are required once either is typed. */
export type ProductQuestion = { question: string; answer: string };

/** The API's limits, mirrored so the form refuses what the save would. */
export const MAX_QUESTIONS = 20;
export const MAX_QUESTION_LENGTH = 200;
export const MAX_ANSWER_LENGTH = 2000;

/**
 * The questions this product keeps being asked, and the merchant's answers.
 *
 * Written by the merchant, never by shoppers. Shopper-submitted questions need
 * a moderation queue, a notification and somebody to answer them; this is the
 * thing that actually saves a shop time today, which is answering "does it come
 * in XL" on WhatsApp for the fortieth time.
 *
 * Rows a merchant leaves completely blank are dropped on save rather than
 * refused — clicking Add and changing your mind is not a mistake to be told off
 * for. A row with one half filled IS refused, by the API, because a question
 * with no answer helps nobody.
 */
export function ProductQuestions({
  value,
  onChange,
  disabled = false,
}: {
  value: ProductQuestion[];
  onChange: (rows: ProductQuestion[]) => void;
  disabled?: boolean;
}) {
  const tPages = useTranslations("pages");

  function update(index: number, patch: Partial<ProductQuestion>) {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function add() {
    if (value.length >= MAX_QUESTIONS) return;
    onChange([...value, { question: "", answer: "" }]);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tPages("productQuestionsEmpty")}</p>
      ) : null}

      {value.map((row, index) => (
        <div
          key={index}
          className="space-y-2 rounded-card border border-border bg-muted/30 p-3"
        >
          <div className="flex items-start gap-2">
            <Input
              value={row.question}
              maxLength={MAX_QUESTION_LENGTH}
              disabled={disabled}
              placeholder={tPages("productQuestionsQuestionPlaceholder")}
              aria-label={tPages("productQuestionsQuestionLabel", { number: index + 1 })}
              onChange={(e) => update(index, { question: e.target.value })}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(index)}
              aria-label={tPages("productQuestionsRemove", { number: index + 1 })}
              title={tPages("productQuestionsRemove", { number: index + 1 })}
              className="flex size-9 shrink-0 items-center justify-center rounded-ui text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
          <Textarea
            rows={3}
            value={row.answer}
            maxLength={MAX_ANSWER_LENGTH}
            disabled={disabled}
            placeholder={tPages("productQuestionsAnswerPlaceholder")}
            aria-label={tPages("productQuestionsAnswerLabel", { number: index + 1 })}
            onChange={(e) => update(index, { answer: e.target.value })}
            className="[field-sizing:fixed] resize-none"
          />
        </div>
      ))}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={add}
          disabled={disabled || value.length >= MAX_QUESTIONS}
          className="inline-flex items-center gap-1.5 rounded-card border border-border px-3 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          {tPages("productQuestionsAdd")}
        </button>
        {value.length >= MAX_QUESTIONS ? (
          <p className="text-xs text-muted-foreground">
            {tPages("productQuestionsLimit", { count: MAX_QUESTIONS })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
