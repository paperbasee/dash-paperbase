"use client";

import { useState, useCallback, useEffect } from "react";
import api from "@/lib/api";
import type { ExtraFieldDefinition, ExtraFieldEntityType } from "@/types/extra-fields";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeSchema(raw: unknown): ExtraFieldDefinition[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: Record<string, unknown>) => ({
    id: String(f.id ?? generateId()),
    entityType: (f.entityType ?? "product") as ExtraFieldEntityType,
    name: String(f.name ?? ""),
    fieldType: (f.fieldType ?? "text") as ExtraFieldDefinition["fieldType"],
    defaultValue: f.defaultValue != null ? String(f.defaultValue) : undefined,
    required: Boolean(f.required),
    options: Array.isArray(f.options) ? f.options.map(String) : undefined,
    order: Number(f.order) ?? 0,
  }));
}

export function useExtraFieldsSchema(entityType?: ExtraFieldEntityType) {
  const [schema, setSchemaState] = useState<ExtraFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchema = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ extra_field_schema?: unknown }>(
        "stores/settings/current/"
      );
      const raw = data.extra_field_schema ?? [];
      setSchemaState(normalizeSchema(raw));
    } catch {
      setSchemaState([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchema();
  }, [fetchSchema]);

  const filteredSchema = entityType
    ? schema.filter((f) => f.entityType === entityType)
    : schema;

  const setSchema = useCallback(
    (next: ExtraFieldDefinition[] | ((prev: ExtraFieldDefinition[]) => ExtraFieldDefinition[])) => {
      setSchemaState((prev) =>
        typeof next === "function" ? next(prev) : next
      );
    },
    []
  );

  const addField = useCallback((targetEntityType: ExtraFieldEntityType = "product") => {
    setSchemaState((prev) => {
      const entityFields = prev.filter((f) => f.entityType === targetEntityType);
      const maxOrder = entityFields.reduce((m, f) => Math.max(m, f.order), -1);
      const newField: ExtraFieldDefinition = {
        id: generateId(),
        entityType: targetEntityType,
        name: "",
        fieldType: "text",
        required: false,
        order: maxOrder + 1,
      };
      return [...prev, newField];
    });
  }, []);

  const updateField = useCallback((id: string, updates: Partial<ExtraFieldDefinition>) => {
    setSchemaState((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const removeField = useCallback((id: string) => {
    setSchemaState((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const reorderFields = useCallback(
    (activeId: string, overId: string, targetEntityType?: ExtraFieldEntityType) => {
      setSchemaState((prev) => {
        const activeIdx = prev.findIndex((f) => f.id === activeId);
        const overIdx = prev.findIndex((f) => f.id === overId);
        if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return prev;
        const activeField = prev[activeIdx];
        const entity = targetEntityType ?? activeField.entityType;
        const entityFields = prev.filter((f) => f.entityType === entity);
        const entityIndices = entityFields.map((f) => prev.indexOf(f));
        const activeEntityIdx = entityIndices.indexOf(activeIdx);
        const overEntityIdx = entityIndices.indexOf(overIdx);
        if (activeEntityIdx === -1 || overEntityIdx === -1 || activeEntityIdx === overEntityIdx)
          return prev;
        const reorderedEntity = [...entityFields];
        const [removed] = reorderedEntity.splice(activeEntityIdx, 1);
        reorderedEntity.splice(overEntityIdx, 0, removed);
        const reorderedWithOrder = reorderedEntity.map((f, i) => ({ ...f, order: i }));
        const otherFields = prev.filter((f) => f.entityType !== entity);
        return [...otherFields, ...reorderedWithOrder];
      });
    },
    []
  );

  const save = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    const complete = schema.filter((f) => f.name.trim() !== "");
    const hasIncomplete = schema.some((f) => f.name.trim() === "");
    if (hasIncomplete) {
      return { success: false, error: "Complete all fields (add a name) before saving." };
    }
    const entityTypes = [...new Set(complete.map((f) => f.entityType))];
    const hasDuplicates = entityTypes.some((et) => {
      const fields = complete.filter((f) => f.entityType === et);
      return fields.some((f, i) => {
        const name = f.name.trim().toLowerCase().replace(/\s+/g, "_");
        return fields.some(
          (g, j) =>
            i !== j && g.name.trim().toLowerCase().replace(/\s+/g, "_") === name
        );
      });
    });
    if (hasDuplicates) {
      return {
        success: false,
        error: "Field names must be unique within each entity type.",
      };
    }
    try {
      const payload = complete.map((f) => ({
        id: f.id,
        entityType: f.entityType,
        name: f.name.trim(),
        fieldType: f.fieldType,
        required: f.required,
        order: f.order,
        options: f.options,
        defaultValue: f.defaultValue,
      }));
      await api.patch("stores/settings/current/", {
        extra_field_schema: payload,
      });
      setSchemaState(complete);
      return { success: true };
    } catch {
      return { success: false, error: "Failed to save. Please try again." };
    }
  }, [schema]);

  return {
    schema: filteredSchema,
    fullSchema: schema,
    loading,
    setSchema,
    addField,
    updateField,
    removeField,
    reorderFields,
    save,
    refetch: fetchSchema,
  };
}
