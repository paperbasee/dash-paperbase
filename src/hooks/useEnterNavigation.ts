import { useCallback } from "react";

type EnterNavigationSubmit = (() => void) | undefined;

export function useEnterNavigation(onSubmit?: EnterNavigationSubmit) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key !== "Enter") return;

      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (
        target.type === "hidden" ||
        target.type === "checkbox" ||
        target.type === "radio" ||
        target.type === "file" ||
        target.type === "button" ||
        target.type === "submit"
      ) {
        return;
      }

      e.preventDefault();

      // Prefer scoping to the nearest form. For modal-only layouts without
      // a form element, scope to the current dialog container.
      const scopeRoot: ParentNode =
        target.closest("form") ??
        target.closest('[data-slot="dialog-content"]') ??
        target.closest('[role="dialog"]') ??
        document;
      const inputs = Array.from(
        scopeRoot.querySelectorAll<HTMLInputElement>(
          'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([disabled]):not([readonly])'
        )
      );
      const index = inputs.indexOf(target);

      if (index >= 0 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      } else if (index === inputs.length - 1) {
        onSubmit?.();
      }
    },
    [onSubmit]
  );

  return { handleKeyDown };
}
