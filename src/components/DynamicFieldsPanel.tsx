"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Plus, Trash2, GripVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useExtraFieldsSchema } from "@/hooks/useExtraFieldsSchema";
import type {
  ExtraFieldDefinition,
  ExtraFieldEntityType,
  ExtraFieldType,
} from "@/types/extra-fields";
import { cn } from "@/lib/utils";

const FIELD_TYPES: { value: ExtraFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "dropdown", label: "Dropdown" },
];

const FIXED_FIELDS_BY_ENTITY: Record<
  ExtraFieldEntityType,
  { key: string; label: string }[]
> = {
  product: [
    { key: "name", label: "Product Name" },
    { key: "slug", label: "Slug" },
    { key: "description", label: "Description" },
    { key: "price", label: "Base Price" },
    { key: "original_price", label: "Compare at Price" },
    { key: "stock", label: "Stock" },
    { key: "brand", label: "Brand" },
    { key: "category", label: "Category" },
    { key: "is_active", label: "Active" },
  ],
  customer: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
  ],
  order: [
    { key: "order_id", label: "Order ID" },
    { key: "customer_id", label: "Customer" },
    { key: "store_id", label: "Store" },
    { key: "total_amount", label: "Total Amount" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created" },
    { key: "updated_at", label: "Updated" },
  ],
};

const ENTITY_TABS: { id: ExtraFieldEntityType; label: string }[] = [
  { id: "product", label: "Product" },
  { id: "customer", label: "Customer" },
  { id: "order", label: "Order" },
];

const FIELD_NAME_PLACEHOLDERS: Record<ExtraFieldEntityType, string> = {
  product: "e.g. color, size, warranty, material",
  customer: "e.g. preferences, loyalty_tier, referral_code, custom_notes",
  order: "e.g. gift_message, custom_instructions, discount_metadata",
};

const inputClass =
  "w-full rounded-lg bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0";

function SortableFieldItem({
  field,
  entityType,
  onUpdate,
  onRemove,
  namesExceptThis,
  onMessage,
}: {
  field: ExtraFieldDefinition;
  entityType: ExtraFieldEntityType;
  onUpdate: (id: string, updates: Partial<ExtraFieldDefinition>) => void;
  onRemove: (id: string) => void;
  namesExceptThis: string[];
  onMessage: (msg: DynamicFieldsMessage) => void;
}) {
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
      onMessage({ type: "error", text: "Field name must be unique." });
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
        "flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4",
        isDragging && "opacity-80 shadow-md"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Field Name
              </label>
              <Input
                value={field.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={FIELD_NAME_PLACEHOLDERS[entityType]}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Field Type
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
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Default Value (optional)
              </label>
              <Input
                value={field.defaultValue ?? ""}
                onChange={(e) =>
                  onUpdate(field.id, {
                    defaultValue: e.target.value || undefined,
                  })
                }
                placeholder="Optional default"
                className={inputClass}
              />
            </div>
            {field.fieldType === "dropdown" && (
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Options (comma or newline separated)
                </label>
                <Textarea
                  value={optionsInput}
                  onChange={(e) => handleOptionsChange(e.target.value)}
                  onBlur={handleOptionsBlur}
                  placeholder="e.g. Red, Blue, Green"
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
              <span className="text-muted-foreground">Required</span>
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onRemove(field.id);
                onMessage({ type: "success", text: "Field removed." });
              }}
              aria-label="Remove field"
            >
              <Trash2 className="size-4" />
              Remove
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
  const [activeEntity, setActiveEntity] = useState<ExtraFieldEntityType>("product");

  const {
    schema,
    addField,
    updateField,
    removeField,
    reorderFields,
    save,
  } = useExtraFieldsSchema(activeEntity);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const activeIdx = schema.findIndex((f) => f.id === active.id);
      const overIdx = schema.findIndex((f) => f.id === over.id);
      if (activeIdx === -1 || overIdx === -1) return;
      reorderFields(active.id as string, over.id as string, activeEntity);
      onMessage({ type: "success", text: "Order updated." });
    },
    [schema, reorderFields, activeEntity, onMessage]
  );

  const handleAddField = () => {
    const names = schema.map((f) => f.name.trim().toLowerCase());
    if (names.some((n) => !n)) {
      onMessage({ type: "error", text: "Complete existing fields before adding new ones." });
      return;
    }
    addField(activeEntity);
    onMessage({ type: "success", text: "Field added. Configure it below." });
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

  const fixedFields = FIXED_FIELDS_BY_ENTITY[activeEntity];

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveEntity(tab.id)}
            className={cn(
              "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
              activeEntity === tab.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
        <h3 className="text-sm font-semibold text-foreground">
          Fixed mandatory fields
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          These fields are always present on {activeEntity}s and cannot be removed.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5 lg:flex-nowrap lg:overflow-x-auto lg:pb-1 [scrollbar-width:thin]">
          {fixedFields.map(({ key, label }) => (
            <div
              key={key}
              className="flex shrink-0 items-center rounded-md border border-border/70 bg-background/80 px-2 py-1.5 text-xs shadow-sm transition-colors hover:border-border"
            >
              <span className="font-medium text-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground">
          Extra Fields (JSONB)
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Define custom extra fields for {activeEntity}s. These appear in{" "}
          {activeEntity} create/edit forms. Values are persisted via the backend API.
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
            Field names must be unique. Please fix duplicate names.
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
                  entityType={activeEntity}
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
            Add field
          </Button>
          {schema.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="default"
              className="gap-2"
              onClick={async () => {
                const result = await save();
                if (result.success) {
                  onMessage({ type: "success", text: "Extra fields saved." });
                } else {
                  onMessage({ type: "error", text: result.error ?? "Failed to save." });
                }
              }}
            >
              <Save className="size-4" />
              Save
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
