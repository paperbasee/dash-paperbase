"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldDefinition, ExtraFieldType } from "@/types/extra-fields";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const REMOVE_DANGER = "#ef4444";

const FIELD_TYPES: { value: ExtraFieldType; labelKey: string }[] = [
  { value: "text", labelKey: "fieldTypeText" },
  { value: "number", labelKey: "fieldTypeNumber" },
  { value: "boolean", labelKey: "fieldTypeBoolean" },
  { value: "dropdown", labelKey: "fieldTypeDropdown" },
];

const FIXED_PRODUCT_FIELDS: { key: string; labelKey: string }[] = [
  { key: "name", labelKey: "fixedName" },
  { key: "slug", labelKey: "fixedSlug" },
  { key: "description", labelKey: "fixedDescription" },
  { key: "price", labelKey: "fixedPrice" },
  { key: "original_price", labelKey: "fixedComparePrice" },
  { key: "stock", labelKey: "fixedStock" },
  { key: "brand", labelKey: "fixedBrand" },
  { key: "category", labelKey: "fixedCategory" },
  { key: "is_active", labelKey: "fixedActive" },
];

const transitionStyle = "transition-[border-color,opacity,transform,background-color] duration-150 ease";

const inputSurfaceClass = cn(
  "w-full border-[0.5px] bg-[var(--color-background-secondary)] text-[var(--color-text-primary)] outline-none",
  "px-2.5 py-[7px] text-[13px] font-normal leading-snug",
  "rounded-[var(--border-radius-md)] border-[var(--color-border-secondary)]",
  "focus:border-[var(--color-border-primary)] focus:bg-[var(--color-background-primary)]",
  transitionStyle
);

const labelClass =
  "mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]";

function DropdownOptionsEditor({
  field,
  onUpdate,
  tp,
}: {
  field: ExtraFieldDefinition;
  onUpdate: (id: string, updates: Partial<ExtraFieldDefinition>) => void;
  tp: (key: string) => string;
}) {
  const [optionsInput, setOptionsInput] = useState(
    () => field.options?.join(", ") ?? ""
  );
  const handleBlur = () => {
    const options = optionsInput
      .split(/[,\n]/)
      .map((o) => o.trim())
      .filter(Boolean);
    onUpdate(field.id, { options: options.length ? options : undefined });
  };
  return (
    <div>
      <label className={labelClass} htmlFor={`df-options-${field.id}`}>
        {tp("dropdownOptions")}
      </label>
      <textarea
        id={`df-options-${field.id}`}
        value={optionsInput}
        onChange={(e) => setOptionsInput(e.target.value)}
        onBlur={handleBlur}
        placeholder={tp("dropdownOptionsPlaceholder")}
        rows={3}
        className={cn(inputSurfaceClass, "min-h-[4.5rem] resize-y")}
      />
    </div>
  );
}

function SortableFieldItem({
  field,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onRequestRemove,
  namesExceptThis,
  onMessage,
}: {
  field: ExtraFieldDefinition;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (id: string, updates: Partial<ExtraFieldDefinition>) => void;
  onRequestRemove: (id: string) => void;
  namesExceptThis: string[];
  onMessage: (msg: DynamicFieldsMessage) => void;
}) {
  const t = useTranslations("settings");
  const tp = (key: string) => t(`dynamicFields.panel.${key}`);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayName = field.name.trim() || tp("untitledField");

  const handleNameChange = (name: string) => {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, "_");
    const isDuplicate = namesExceptThis.some(
      (n) => n.toLowerCase().replace(/\s+/g, "_") === normalized
    );
    if (normalized && isDuplicate) {
      onMessage({ type: "error", text: tp("errUniqueName") });
    }
    onUpdate(field.id, { name });
  };

  const typeLabel = tp(
    FIELD_TYPES.find((x) => x.value === field.fieldType)?.labelKey ?? "fieldTypeText"
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--border-radius-lg)] border-[0.5px] bg-[var(--color-background-primary)]",
        isExpanded
          ? "border-[var(--color-border-secondary)]"
          : "border-[var(--color-border-tertiary)]",
        transitionStyle,
        "hover:border-[var(--color-border-secondary)]",
        isDragging && "opacity-80"
      )}
    >
      <div className="flex min-h-[44px] items-stretch">
        <button
          type="button"
          className={cn(
            "flex touch-none cursor-grab items-center justify-center pl-3 text-[var(--color-text-secondary)] active:cursor-grabbing",
            transitionStyle,
            "hover:text-[var(--color-text-primary)]"
          )}
          {...attributes}
          {...listeners}
          aria-label={tp("dragReorderAria")}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
        </button>
        <button
          type="button"
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 py-2.5 pr-3 text-left",
            transitionStyle
          )}
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
        >
          <span className="truncate text-[13px] font-medium text-[var(--color-text-primary)]">
            {displayName}
          </span>
          <span
            className={cn(
              "shrink-0 rounded-[var(--border-radius-md)] bg-[var(--color-background-secondary)] px-1.5 py-0.5 text-[11px] font-normal text-[var(--color-text-primary)]",
              "border-[0.5px] border-[var(--color-border-tertiary)]"
            )}
          >
            {typeLabel}
          </span>
          <span className="flex w-2 shrink-0 justify-center" title={field.required ? tp("required") : undefined}>
            {field.required ? (
              <span
                className="size-1.5 rounded-full bg-[hsl(var(--accent-green))]"
                aria-hidden
              />
            ) : null}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 shrink-0 text-[var(--color-text-secondary)]",
              transitionStyle,
              isExpanded && "rotate-180"
            )}
            strokeWidth={1.75}
            aria-hidden
          />
        </button>
      </div>

      {isExpanded ? (
        <div
          className="border-t-[0.5px] border-[var(--color-border-tertiary)] px-3 pb-3 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`df-name-${field.id}`}>
                {tp("fieldName")}
              </label>
              <input
                id={`df-name-${field.id}`}
                value={field.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={tp("fieldNamePlaceholder")}
                className={inputSurfaceClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`df-type-${field.id}`}>
                {tp("fieldType")}
              </label>
              <select
                id={`df-type-${field.id}`}
                value={field.fieldType}
                onChange={(e) =>
                  onUpdate(field.id, {
                    fieldType: e.target.value as ExtraFieldType,
                  })
                }
                className={cn(inputSurfaceClass, "appearance-none cursor-pointer")}
              >
                {FIELD_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {tp(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className={field.fieldType === "dropdown" ? undefined : "sm:col-span-2"}>
              <label className={labelClass} htmlFor={`df-default-${field.id}`}>
                {tp("defaultValue")}
              </label>
              <input
                id={`df-default-${field.id}`}
                value={field.defaultValue ?? ""}
                onChange={(e) =>
                  onUpdate(field.id, {
                    defaultValue: e.target.value || undefined,
                  })
                }
                placeholder={tp("defaultPlaceholder")}
                className={inputSurfaceClass}
              />
            </div>
            {field.fieldType === "dropdown" ? (
              <DropdownOptionsEditor
                key={`${field.id}-dropdown-options`}
                field={field}
                onUpdate={onUpdate}
                tp={tp}
              />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={field.required}
                onClick={() => onUpdate(field.id, { required: !field.required })}
                className={cn(
                  "relative h-4 w-7 shrink-0 rounded-full border-[0.5px]",
                  "border-[var(--color-border-secondary)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-primary)]",
                  transitionStyle
                )}
                style={{
                  backgroundColor: field.required
                    ? "hsl(var(--accent-green))"
                    : "var(--color-background-secondary)",
                }}
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute size-3 rounded-full",
                    "border-[0.5px] border-[var(--color-border-secondary)]",
                    "bg-[hsl(var(--primary))] shadow-none",
                    "transition-[left,background-color,border-color] duration-150 ease"
                  )}
                  style={{
                    top: "calc(50% - 6px)",
                    left: field.required ? 14 : 2,
                  }}
                />
              </button>
              <span className="text-[12px] text-[var(--color-text-primary)]">{tp("required")}</span>
            </div>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-[var(--border-radius-md)] px-1.5 py-1 text-[12px] font-medium",
                transitionStyle,
                "border-0 bg-transparent hover:bg-[color-mix(in_srgb,#ef4444_10%,transparent)]"
              )}
              style={{ color: REMOVE_DANGER }}
              onClick={() => onRequestRemove(field.id)}
              aria-label={tp("removeFieldAria")}
            >
              <Trash2 className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              {tp("remove")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export type DynamicFieldsMessage = {
  type: "success" | "error";
  text: string;
} | null;

export function DynamicFieldsPanel({
  message,
  onMessage,
}: {
  message: DynamicFieldsMessage;
  onMessage: (msg: DynamicFieldsMessage) => void;
}) {
  const t = useTranslations("settings");
  const tp = useMemo(
    () =>
      (key: string, values?: Record<string, string | number | Date>) =>
        values === undefined
          ? t(`dynamicFields.panel.${key}`)
          : t(`dynamicFields.panel.${key}`, values),
    [t]
  );
  const {
    schema,
    addField,
    updateField,
    removeField,
    reorderFields,
    save,
  } = useExtraFieldsSchema("product");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [saveLoading, setSaveLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [saveFlashKey, setSaveFlashKey] = useState(0);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);

  const removeTargetField = useMemo(
    () => (removeTargetId ? schema.find((f) => f.id === removeTargetId) ?? null : null),
    [removeTargetId, schema]
  );

  useEffect(() => {
    if (removeTargetId && !schema.some((f) => f.id === removeTargetId)) {
      setRemoveTargetId(null);
    }
  }, [removeTargetId, schema]);

  const closeRemoveDialog = useCallback(() => setRemoveTargetId(null), []);

  const confirmRemoveField = useCallback(() => {
    if (!removeTargetId) return;
    removeField(removeTargetId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(removeTargetId);
      return next;
    });
    onMessage({ type: "success", text: tp("msgFieldRemoved") });
    setRemoveTargetId(null);
  }, [removeTargetId, removeField, onMessage, tp]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeIdx = schema.findIndex((f) => f.id === active.id);
      const overIdx = schema.findIndex((f) => f.id === over.id);
      if (activeIdx === -1 || overIdx === -1) return;
      reorderFields(active.id as string, over.id as string, "product");
      onMessage({ type: "success", text: tp("msgOrderUpdated") });
    },
    [schema, reorderFields, onMessage, tp]
  );

  const handleAddField = () => {
    const names = schema.map((f) => f.name.trim().toLowerCase());
    if (names.some((n) => !n)) {
      onMessage({ type: "error", text: tp("msgCompleteFields") });
      return;
    }
    addField();
    onMessage({ type: "success", text: tp("msgFieldAdded") });
  };

  const getNamesExcept = useCallback(
    (id: string) => schema.filter((f) => f.id !== id).map((f) => f.name),
    [schema]
  );

  const hasDuplicateNames = schema.some((f, i) => {
    const name = f.name.trim().toLowerCase().replace(/\s+/g, "_");
    if (!name) return false;
    return schema.some(
      (g, j) =>
        i !== j &&
        g.name.trim().toLowerCase().replace(/\s+/g, "_") === name
    );
  });

  return (
    <div className="w-full space-y-8">
      <ConfirmDialog
        isOpen={removeTargetId != null}
        onOpenChange={(open) => {
          if (!open) closeRemoveDialog();
        }}
        title={tp("removeConfirmTitle")}
        description={
          removeTargetField
            ? tp("removeConfirmDescription", {
                name: removeTargetField.name.trim() || tp("untitledField"),
              })
            : ""
        }
        confirmText={tp("removeConfirmAction")}
        cancelText={t("cancel")}
        variant="danger"
        onCancel={closeRemoveDialog}
        onConfirm={confirmRemoveField}
      />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
          {tp("fixedHeading")}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {FIXED_PRODUCT_FIELDS.map(({ key, labelKey }) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center rounded-[6px] border-[0.5px] border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] px-2 py-1 text-[12px] font-normal text-[var(--color-text-primary)]",
                transitionStyle
              )}
            >
              {tp(labelKey)}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
          {tp("extraHeading")}
        </p>

        {message ? (
          <p
            className={cn(
              "mt-3 text-[13px]",
              transitionStyle,
              message.type === "success"
                ? "text-[var(--color-text-secondary)]"
                : "text-[hsl(var(--destructive))]"
            )}
          >
            {message.text}
          </p>
        ) : null}

        {hasDuplicateNames ? (
          <p className="mt-2 text-[13px] text-[hsl(var(--destructive))]">{tp("duplicateNames")}</p>
        ) : null}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={schema.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-4 space-y-2">
              {schema.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  isExpanded={expandedIds.has(field.id)}
                  onToggleExpand={() => toggleExpand(field.id)}
                  onUpdate={updateField}
                  onRequestRemove={setRemoveTargetId}
                  namesExceptThis={getNamesExcept(field.id)}
                  onMessage={onMessage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[var(--border-radius-md)] border-[0.5px] border-[var(--color-border-secondary)] bg-[var(--color-background-secondary)] px-2.5 text-[13px] font-normal text-[var(--color-text-primary)]",
              transitionStyle,
              "hover:border-[var(--color-border-primary)]"
            )}
            onClick={handleAddField}
          >
            <Plus className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {tp("addField")}
          </button>
          <button
            type="button"
            disabled={saveLoading}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-[var(--border-radius-md)] border-[0.5px] border-[var(--color-border-primary)] bg-[var(--color-text-primary)] px-2.5 text-[13px] font-medium text-[var(--color-background-primary)]",
              transitionStyle,
              "disabled:cursor-not-allowed disabled:opacity-50",
              "hover:opacity-90"
            )}
            onClick={() => {
              if (saveLoading) return;
              void (async () => {
                setSaveLoading(true);
                try {
                  const result = await save();
                  if (result.success) {
                    setSaveFlashKey((k) => k + 1);
                  } else {
                    onMessage({ type: "error", text: result.error ?? tp("saveFailed") });
                  }
                } finally {
                  setSaveLoading(false);
                }
              })();
            }}
          >
            {t("save")}
          </button>
          {saveFlashKey > 0 ? (
            <span
              key={saveFlashKey}
              className="text-[12px] text-[var(--color-text-tertiary)]"
              style={{
                animation: "pb-dynamic-fields-saved 2s ease forwards",
              }}
              onAnimationEnd={() => setSaveFlashKey(0)}
            >
              {tp("savedFlash")}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
