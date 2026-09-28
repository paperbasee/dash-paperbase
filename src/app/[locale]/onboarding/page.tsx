"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";

import { AuthError } from "@/components/auth/AuthParts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FinishScreen } from "./FinishScreens";
import { SetupShell } from "./SetupShell";
import { AddressStep, ContactStep, LookStep, NameStep, SellStep } from "./steps";
import { useSetup, type SetupState } from "./useSetup";

function SetupLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
    </div>
  );
}

function StepBody({ setup, className }: { setup: SetupState; className: string }) {
  switch (setup.phase) {
    case "sell":
      return <SellStep setup={setup} className={className} />;
    case "name":
      return <NameStep setup={setup} className={className} />;
    case "address":
      return <AddressStep setup={setup} className={className} />;
    case "look":
      return <LookStep setup={setup} className={className} />;
    default:
      return <ContactStep setup={setup} className={className} />;
  }
}

function SetupFlow() {
  const t = useTranslations("auth.onboarding");
  const tAuth = useTranslations("auth");
  const setup = useSetup();

  if (!setup.ready) return <SetupLoading />;
  if (setup.phase === "finishing" || setup.phase === "ready") return <FinishScreen setup={setup} />;

  const next: Record<string, () => void> = {
    sell: () => void setup.continueFromSell(),
    name: () => void setup.continueFromName(),
    address: () => setup.go("look"),
    look: () => void setup.continueFromLook(),
    contact: () => void setup.finish(),
  };
  // The shop is made on the name step: from the address on, going back cannot un-make it,
  // but it can still rename it, so Back stays.
  const canGoBack = setup.phase !== "sell";

  const actions = (
    <>
      {canGoBack ? (
        <Button type="button" variant="ghost" onClick={setup.back} disabled={setup.busy} className="h-11 px-4">
          <ArrowLeft className="size-4" aria-hidden />
          {t("back")}
        </Button>
      ) : null}
      <Button
        type="submit"
        form="setup-step"
        loading={setup.busy && setup.phase !== "address"}
        className="h-11 min-w-[9.5rem] flex-1 sm:flex-none"
      >
        {setup.phase === "name" && setup.busy && !setup.storeMade ? (
          t("creating")
        ) : setup.phase === "contact" ? (
          t("finish")
        ) : (
          <>
            {t("continue")}
            <ArrowRight className="size-4" aria-hidden />
          </>
        )}
      </Button>
    </>
  );

  return (
    <SetupShell setup={setup} actions={actions}>
      <form
        id="setup-step"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!setup.busy) next[setup.phase]();
        }}
      >
        {setup.error ? (
          <div className="mb-6">
            <AuthError>{setup.error === "network" ? tAuth("unreachable") : t("createFailed")}</AuthError>
          </div>
        ) : null}
        <StepBody
          key={setup.phase}
          setup={setup}
          className={cn("pb-stagger", setup.direction === "back" ? "pb-back" : "pb-forward")}
        />
      </form>
    </SetupShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<SetupLoading />}>
      <SetupFlow />
    </Suspense>
  );
}
