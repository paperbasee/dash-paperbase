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

export function SearchModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
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
  }, []);

  return (
    <SearchModalContext.Provider value={{ open, setOpen }}>
      {children}
      <SearchModal open={open} onOpenChange={setOpen} />
    </SearchModalContext.Provider>
  );
}
