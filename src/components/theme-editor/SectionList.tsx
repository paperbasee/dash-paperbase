"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Lock, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ThemeManifest, ThemeSection } from "@/lib/theme-editor/api";
import { localLabel } from "@/lib/theme-editor/document-ops";
import {
  MAX_SECTIONS_PER_LIST,
  cannotAdd,
  cannotHide,
  cannotRemove,
  cannotShow,
} from "@/lib/theme-editor/rules";
import { cn } from "@/lib/utils";

type SectionListProps = {
  manifest: ThemeManifest;
  pageName: string;
  isGroup: boolean;
  /** The section types this page allows. */
  allowed: string[];
  sections: ThemeSection[];
  /** Move focus after an edit: to a row (a section just added), or to the heading (id null). */
  focusRequest: { id: string | null } | null;
  onHide: (id: string) => void;
  onShow: (id: string) => void;
  onMove: (id: string, to: number) => void;
  onRemove: (section: ThemeSection) => void;
  onAdd: () => void;
};

const iconButton = "size-10 shrink-0 md:size-9 aria-disabled:cursor-not-allowed aria-disabled:opacity-40";

/** One page's sections, top to bottom, with what may be done to each. */
export function SectionList({
  manifest,
  pageName,
  isGroup,
  allowed,
  sections,
  focusRequest,
  onHide,
  onShow,
  onMove,
  onRemove,
  onAdd,
}: SectionListProps) {
  const t = useTranslations("themeEditor");
  const locale = useLocale();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const nameOf = (type: string) => {
    const spec = manifest.sections[type];
    return spec ? localLabel(spec, locale) : type;
  };
  const nameById = (id: UniqueIdentifier) => nameOf(sections.find((s) => s.id === id)?.type ?? String(id));
  const position = (id: UniqueIdentifier | undefined) => sections.findIndex((s) => s.id === id) + 1;

  useEffect(() => {
    if (!focusRequest) return;
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-section-id]") ?? [];
    const target =
      [...rows].find((row) => row.dataset.sectionId === focusRequest.id) ?? headingRef.current;
    target?.focus();
    target?.scrollIntoView({ block: "nearest" });
  }, [focusRequest]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements: Announcements = {
    onDragStart: ({ active }) => t("dragPickedUp", { name: nameById(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t("dragOver", { name: nameById(active.id), position: position(over.id), total: sections.length })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t("dragDropped", { name: nameById(active.id), position: position(over.id), total: sections.length })
        : t("dragCancelled", { name: nameById(active.id) }),
    onDragCancel: ({ active }) => t("dragCancelled", { name: nameById(active.id) }),
  };

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onMove(String(active.id), position(over.id) - 1);
  }

  const addable = allowed.filter((type) => !cannotAdd(manifest, allowed, sections, type));
  const full = sections.length >= MAX_SECTIONS_PER_LIST;

  return (
    <div className="space-y-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="space-y-1">
        <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-foreground outline-none">
          {pageName}
        </h2>
        <p className="text-sm text-muted-foreground">{isGroup ? t("groupHint") : t("pageHint")}</p>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-card border border-dashed border-border p-4 text-sm text-muted-foreground">
          {t("emptyPage")}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ announcements, screenReaderInstructions: { draggable: t("dragInstructions") } }}
        >
          <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul ref={listRef} className="space-y-2">
              {sections.map((section, index) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  name={nameOf(section.type)}
                  onlyOne={manifest.sections[section.type]?.at_most_one === true}
                  locked={cannotHide(manifest, sections, section) === "required"}
                  canRemove={!cannotRemove(manifest, sections, section)}
                  showBlocked={cannotShow(manifest, sections, section) !== null}
                  first={index === 0}
                  last={index === sections.length - 1}
                  onHide={() => onHide(section.id)}
                  onShow={() => onShow(section.id)}
                  onMoveUp={() => onMove(section.id, index - 1)}
                  onMoveDown={() => onMove(section.id, index + 1)}
                  onRemove={() => onRemove(section)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {full ? (
        <p className="text-sm text-muted-foreground">{t("pageFull", { max: MAX_SECTIONS_PER_LIST })}</p>
      ) : addable.length > 0 ? (
        <Button type="button" variant="outline" className="h-11 w-full md:h-10" onClick={onAdd}>
          <Plus aria-hidden />
          {t("addToPage")}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">{t("nothingToAdd")}</p>
      )}
    </div>
  );
}

function SectionRow({
  section,
  name,
  onlyOne,
  locked,
  canRemove,
  showBlocked,
  first,
  last,
  onHide,
  onShow,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  section: ThemeSection;
  name: string;
  onlyOne: boolean;
  /** The shown copy of a required section: never hidden or removed. */
  locked: boolean;
  canRemove: boolean;
  /** Hidden, and another shown copy of this single-use section is in the way. */
  showBlocked: boolean;
  first: boolean;
  last: boolean;
  onHide: () => void;
  onShow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("themeEditor");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const style: CSSProperties = { transform: CSS.Transform.toString(transform), transition };
  const reason = locked ? t("requiredReason") : showBlocked ? t("showBlockedReason") : null;

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-section-id={section.id}
      tabIndex={-1}
      className={cn(
        "rounded-card border border-border bg-background outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "relative z-10 opacity-90 shadow-md",
      )}
    >
      <div className="flex min-h-14 items-center gap-1 py-1.5 pl-3 pr-1.5 md:pl-1.5">
        <button
          type="button"
          className="hidden size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing md:inline-flex"
          aria-label={t("dragToMove", { name })}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>

        <div className="min-w-0 flex-1 py-1">
          <p
            className={cn(
              "text-sm font-medium break-words",
              section.hidden ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {name}
          </p>
          {locked || section.hidden || onlyOne ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {locked ? (
                <Badge variant="outline">
                  <Lock aria-hidden />
                  {t("alwaysShown")}
                </Badge>
              ) : onlyOne ? (
                <Badge variant="outline">{t("onlyOne")}</Badge>
              ) : null}
              {section.hidden ? <Badge variant="secondary">{t("hidden")}</Badge> : null}
            </div>
          ) : null}
          {reason ? <p className="mt-1.5 text-xs text-muted-foreground">{reason}</p> : null}
        </div>

        {locked || showBlocked ? null : section.hidden ? (
          <Button type="button" variant="ghost" size="icon" className={iconButton} aria-label={t("show", { name })} title={t("show", { name })} onClick={onShow}>
            <EyeOff aria-hidden />
          </Button>
        ) : (
          <Button type="button" variant="ghost" size="icon" className={iconButton} aria-label={t("hide", { name })} title={t("hide", { name })} onClick={onHide}>
            <Eye aria-hidden />
          </Button>
        )}
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" className={iconButton} aria-label={t("remove", { name })} title={t("remove", { name })} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label={t("moveUp", { name })}
          title={t("moveUp", { name })}
          aria-disabled={first}
          onClick={first ? undefined : onMoveUp}
        >
          <ArrowUp aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={iconButton}
          aria-label={t("moveDown", { name })}
          title={t("moveDown", { name })}
          aria-disabled={last}
          onClick={last ? undefined : onMoveDown}
        >
          <ArrowDown aria-hidden />
        </Button>
      </div>
    </li>
  );
}
