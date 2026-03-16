"use client";

import { useAuth } from "@/context/AuthContext";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <h2 className="text-lg font-semibold text-foreground">Admin Panel</h2>
      <div className="flex items-center gap-2">
        <NotificationDropdown />
        <button
          onClick={logout}
          className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
