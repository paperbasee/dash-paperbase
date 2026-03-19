 "use client";

import { DynamicFieldsPanel, type DynamicFieldsMessage } from "@/components/DynamicFieldsPanel";

export default function DynamicFieldsSection({
  hidden,
  message,
  onMessage,
}: {
  hidden: boolean;
  message: DynamicFieldsMessage;
  onMessage: (msg: DynamicFieldsMessage) => void;
}) {
  return (
    <section
      id="panel-eav"
      role="tabpanel"
      aria-labelledby="tab-eav"
      hidden={hidden}
      className="rounded-xl border border-dashed border-border bg-background p-4 md:p-6"
    >
      <h2 className="text-lg font-medium text-foreground">Dynamic Fields</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Define custom extra fields for products, customers, and orders. These fields appear in create/edit forms.
        Values are stored locally for now; backend integration coming later.
      </p>
      <DynamicFieldsPanel message={message} onMessage={onMessage} />
    </section>
  );
}

