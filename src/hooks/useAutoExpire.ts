import { useEffect, type Dispatch, type SetStateAction } from "react";

type ExpirableMessage = { type: "success" | "error"; text: string } | null;

/**
 * Automatically clears a success message after the given delay.
 * Only triggers on success — errors stay until explicitly dismissed.
 */
export function useAutoExpire(
  message: ExpirableMessage,
  setMessage: Dispatch<SetStateAction<ExpirableMessage>>,
  delayMs = 2000
) {
  useEffect(() => {
    if (message?.type !== "success") return;
    const timer = setTimeout(() => setMessage(null), delayMs);
    return () => clearTimeout(timer);
  }, [message, setMessage, delayMs]);
}
