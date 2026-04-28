"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
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
import { Plus, Trash, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type { ExtraFieldDefinition, ExtraFieldType } from "@/types/extra-fields";
import { cn } from "@/lib/utils";

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

const inputClass =
  "w-full rounded-card bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0";

function SortableFieldItem({
  field,
  onUpdate,
  onRemove,
  namesExceptThis,
  onMessage,
}: {
  field: ExtraFieldDefinition;
  onUpdate: (id: string, updates: Partial<ExtraFieldDefinition>) => void;
  onRemove: (id: string) => void;
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

  const [optionsInput, setOptionsInput] = useState(
    field.options?.join(", ") ?? ""
  );
  useEffect(() => {
    setOptionsInput(field.options?.join(", ") ?? "");
  }, [field.id, field.fieldType]);

  const handleOptionsChange = (value: string) => {
    setOptionsInput(value);
  };
  const handleOptionsBlur = () => {
    const options = optionsInput
      .split(/[,\n]/)
      .map((o) => o.trim())
      .filter(Boolean);
    onUpdate(field.id, { options: options.length ? options : undefined });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col gap-3 rounded-card border border-dashed border-border bg-muted/30 p-4",
        isDragging && "opacity-80 shadow-md"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab touch-none rounded-ui p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label={tp("dragReorderAria")}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {tp("fieldName")}
              </label>
              <Input
                value={field.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={tp("fieldNamePlaceholder")}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {tp("fieldType")}
              </label>
              <Select
                value={field.fieldType}
                onChange={(e) =>
                  onUpdate(field.id, {
                    fieldType: e.target.value as ExtraFieldType,
                  })
                }
                className={inputClass}
              >
                {FIELD_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {tp(opt.labelKey)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {tp("defaultValue")}
              </label>
              <Input
                value={field.defaultValue ?? ""}
                onChange={(e) =>
                  onUpdate(field.id, {
                    defaultValue: e.target.value || undefined,
                  })
                }
                placeholder={tp("defaultPlaceholder")}
                className={inputClass}
              />
            </div>
            {field.fieldType === "dropdown" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {tp("dropdownOptions")}
                </label>
                <Textarea
                  value={optionsInput}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  onBlur={handleOptionsBlur}
                  placeholder={tp("dropdownOptionsPlaceholder")}
                  rows={2}
                  className={inputClass}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  onUpdate(field.id, { required: e.target.checked })
                }
                className="form-checkbox"
              />
              <span className="text-muted-foreground">{tp("required")}</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onRemove(field.id);
                onMessage({ type: "success", text: tp("msgFieldRemoved") });
              }}
              aria-label={tp("removeFieldAria")}
            >
              <Trash className="size-4" />
              {tp("remove")}
            </Button>
          </div>
        </div>
      </div>
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
  const tp = useMemo(() => (key: string) => t(`dynamicFields.panel.${key}`), [t]);
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
    <div className="w-full space-y-6">
      <div className="rounded-card border border-dashed border-border bg-muted/30 p-5">
        <h3 className="text-sm font-semibold text-foreground">
          {tp("fixedHeading")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {tp("fixedHint")}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5 lg:flex-nowrap lg:overflow-x-auto lg:pb-1 [scrollbar-width:thin]">
          {FIXED_PRODUCT_FIELDS.map(({ key, labelKey }) => (
            <div
              key={key}
              className="flex shrink-0 items-center rounded-ui border border-border/70 bg-background/80 px-2 py-1.5 text-xs shadow-sm transition-colors hover:border-border"
            >
              <span className="font-medium text-foreground">{tp(labelKey)}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground">
          {tp("extraHeading")}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {tp("extraHint")}
        </p>

        {message && (
          <p
            className={cn(
              "mt-3 text-sm",
              message.type === "success"
                ? "text-green-600 dark:text-green-500"
                : "text-destructive"
            )}
          >
            {message.text}
          </p>
        )}

        {hasDuplicateNames && (
          <p className="mt-2 text-sm text-destructive">
            {tp("duplicateNames")}
          </p>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={schema.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="mt-4 space-y-3">
              {schema.map((field) => (
                <SortableFieldItem
                  key={field.id}
                  field={field}
                  onUpdate={updateField}
                  onRemove={removeField}
                  namesExceptThis={getNamesExcept(field.id)}
                  onMessage={onMessage}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            className="gap-2"
            onClick={handleAddField}
          >
            <Plus className="size-4" />
            {tp("addField")}
          </Button>
          {schema.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="gap-2"
              loading={saveLoading}
              onClick={() => {
                if (saveLoading) return;
                void (async () => {
                  setSaveLoading(true);
                  try {
                    const result = await save();
                    if (result.success) {
                      onMessage({ type: "success", text: tp("saved") });
                    } else {
                      onMessage({ type: "error", text: result.error ?? tp("saveFailed") });
                    }
                  } finally {
                    setSaveLoading(false);
                  }
                })();
              }}
            >
              <Save className="size-4" />
              {t("save")}
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
