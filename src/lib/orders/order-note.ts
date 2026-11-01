import api from "@/lib/api";
import type { Order } from "@/types";

/** The API's limit too (`Order.MERCHANT_NOTE_MAX_LENGTH`). */
export const ORDER_NOTE_MAX_LENGTH = 1000;

/** How close to the limit the counter appears. */
const ORDER_NOTE_COUNTER_FROM = 100;

export type OrderNote = Pick<
  Order,
  "merchant_note" | "merchant_note_updated_at" | "merchant_note_updated_by"
>;

/** The API trims what it keeps, so spaces around the words are not a change. */
export function isOrderNoteChanged(draft: string, saved: string | undefined): boolean {
  return draft.trim() !== (saved ?? "");
}

/** Characters left, or null while there is no need to say. */
export function orderNoteCharactersLeft(draft: string): number | null {
  const left = ORDER_NOTE_MAX_LENGTH - draft.length;
  return left <= ORDER_NOTE_COUNTER_FROM ? left : null;
}

export async function saveOrderNote(orderPublicId: string, text: string): Promise<OrderNote> {
  const { data } = await api.patch<OrderNote>(`admin/orders/${orderPublicId}/note/`, {
    merchant_note: text.trim(),
  });
  return data;
}
