"use client";

import { SlotEditor } from "@/components/theme-editor/slots/SlotEditor";

/**
 * Settings > Customization > Customize > Slots.
 *
 * **The new editor's design, on its own address.** The owner decided on
 * 2026-09-20 that a merchant arranges nothing -- fixed places, and the only
 * choice is what fills each one -- and asked for that built as a design first,
 * wired to nothing.
 *
 * It sits beside `../` rather than replacing it on purpose: the editor at that
 * address is wired, works, and is what a merchant would reach today. Swapping
 * it for a screen that saves nothing would take a working thing away to show a
 * drawing. When the design is settled and wired, this route goes and the
 * component moves up one level.
 *
 * No entitlement check and no data load, because there is nothing here to
 * protect or to fetch -- every slot and every choice is in
 * `lib/theme-editor/slot-catalogue.ts`.
 */
export default function SlotEditorDesignPage() {
  return <SlotEditor />;
}
