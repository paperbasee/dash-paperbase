/**
 * The empty-list picture (owner, 2026-10-03): the folder is decoration, the words say what is
 * missing, and the button -- a page to open or something on this one -- shows only where given.
 */
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { EmptyFolder } from "@/components/EmptyFolder";

vi.mock("@/components/navigation/DeferredNavLink", () => ({
  DeferredNavLink: ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("EmptyFolder", () => {
  it("says what is missing under a folder screen readers skip", () => {
    const html = renderToStaticMarkup(<EmptyFolder title="Nothing hidden" line="A review you hide waits here." />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("Nothing hidden");
    expect(html).toContain("A review you hide waits here.");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("<button");
  });

  it("opens a page, or does something on this one", () => {
    const link = renderToStaticMarkup(
      <EmptyFolder title="No blog posts yet" action={{ href: "/blog/new", label: "Write a post" }} />
    );
    expect(link).toMatch(/<a href="\/blog\/new"[^>]*>.*Write a post/);
    const button = renderToStaticMarkup(
      <EmptyFolder title="Nothing waiting" action={{ label: "Add a review", onClick: () => {} }} />
    );
    expect(button).toMatch(/<button type="button"[^>]*>.*Add a review/);
  });
});
