"use client";

import { cn } from "@/lib/utils";

type MailSentIllustrationProps = {
  className?: string;
};

export function MailSentIllustration({ className }: MailSentIllustrationProps) {
  return (
    <div className={cn("flex justify-center", className)}>
      <img
        src="/assets/email-assets/mail-sent-light.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="h-auto w-60 select-none dark:hidden sm:w-64"
      />
      <img
        src="/assets/email-assets/mail-sent-dark.svg"
        alt=""
        aria-hidden="true"
        draggable={false}
        className="hidden h-auto w-60 select-none dark:block sm:w-64"
      />
    </div>
  );
}

