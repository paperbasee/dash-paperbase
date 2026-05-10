"use client";

import { useTranslations } from "next-intl";
import { DynamicFieldsPanel, type DynamicFieldsMessage } from "@/components/DynamicFieldsPanel";
import { SettingsSectionBody, settingsSectionSurfaceClassName } from "../SettingsSectionBody";

export default function DynamicFieldsSection({
  hidden,
  message,
  onMessage,
}: {
  hidden: boolean;
  message: DynamicFieldsMessage;
  onMessage: (msg: DynamicFieldsMessage) => void;
}) {
  const t = useTranslations("settings");
  return (
    <section
      id="panel-eav"
      role="tabpanel"
      aria-labelledby="tab-eav"
      hidden={hidden}
      className={settingsSectionSurfaceClassName}
    >
      <SettingsSectionBody gap="compact">
        <div className="space-y-1">
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
            {t("dynamicFields.heading")}
          </h2>
          <p className="text-[13px] leading-snug text-[var(--color-text-secondary)]">
            {t("dynamicFields.subtitle")}
          </p>
        </div>
        <DynamicFieldsPanel message={message} onMessage={onMessage} />
      </SettingsSectionBody>
    </section>
  );
}

