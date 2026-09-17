"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { SearchModal } from "@/components/SearchModal";

interface SearchModalContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SearchModalContext = createContext<SearchModalContextValue | undefined>(
  undefined
);

export function useSearchModal() {
  const ctx = useContext(SearchModalContext);
  if (ctx === undefined) {
    throw new Error("useSearchModal must be used within SearchModalProvider");
  }
  return ctx;
}

export function SearchModalProvider({
  children,
  shortcut = true,
}: {
  children: ReactNode;
  /** Ctrl/Cmd+K opens search. Off where leaving the page would lose unsaved work. */
  shortcut?: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!shortcut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        if (window.innerWidth >= 768) {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcut]);

  return (
    <SearchModalContext.Provider value={{ open, setOpen }}>
      {children}
      <SearchModal open={open} onOpenChange={setOpen} />
    </SearchModalContext.Provider>
  );
}
