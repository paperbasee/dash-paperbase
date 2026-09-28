/**
 * A slip in an email's provider -- "gmial.com", "gmail.con", "yahooo.com" -- caught before a
 * sign-in email goes to an address nobody reads (owner, 2026-09-29). Only the part after the @ is
 * looked at, and only against the providers people here use: a shop's own domain is never
 * "corrected".
 */

/** Addresses are suggested at these, most used first: a tie goes to the earlier one. */
const PROVIDERS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "live.com",
  "ymail.com",
  "googlemail.com",
  "protonmail.com",
  "proton.me",
  "yandex.com",
  "rocketmail.com",
] as const;

/** Real providers too short or too close to another to suggest, but never "corrected" themselves. */
const ALSO_REAL = ["mail.com", "email.com", "me.com", "msn.com", "aol.com", "gmx.com", "zoho.com", "yahoo.co.uk"];

const KNOWN = new Set<string>([...PROVIDERS, ...ALSO_REAL]);

/** Edits between two words: an added, dropped or changed letter, or two swapped side by side. */
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

export type EmailSuggestion = {
  /** The whole address, as it most likely was meant. */
  email: string;
  /** The part after the @ that changed, to show what the fix is. */
  domain: string;
};

/** The address the owner most likely meant, or null when it looks as meant (or is not one yet). */
export function suggestEmail(typed: string): EmailSuggestion | null {
  const value = typed.trim();
  const at = value.lastIndexOf("@");
  if (at < 1 || at === value.length - 1) return null;
  const local = value.slice(0, at);
  const typedDomain = value.slice(at + 1).toLowerCase();
  if (KNOWN.has(typedDomain)) return null;

  const suggest = (domain: string) => ({ email: `${local}@${domain}`, domain });
  // "gmail.com." -- a dot too many is still the provider.
  const domain = typedDomain.replace(/\.+$/, "");
  if (KNOWN.has(domain)) return suggest(domain);

  // "gmail" -- the provider without its ending -- or "gmailcom", without its dot.
  if (!domain.includes(".")) {
    const named = PROVIDERS.find(
      (one) =>
        distance(domain, one.split(".")[0]) <= (domain.length >= 5 ? 1 : 0) ||
        distance(domain, one.replace(/\./g, "")) <= 1
    );
    return named ? suggest(named) : null;
  }

  let best: string | null = null;
  let bestDistance = Infinity;
  for (const provider of PROVIDERS) {
    const edits = distance(domain, provider);
    // Longer names take two slips ("gmial.con"); short ones only one, so a real domain is left be.
    if (edits <= (provider.length >= 9 ? 2 : 1) && edits < bestDistance) {
      best = provider;
      bestDistance = edits;
    }
  }
  return best ? suggest(best) : null;
}
