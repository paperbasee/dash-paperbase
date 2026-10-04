/**
 * No English typed straight into a screen (owner, 2026-10-04: "Translate English words left in
 * the Bangla dashboard"). Every word a merchant reads comes from messages/{en,bn}.json, so the
 * Bangla dashboard is Bangla throughout. Found that day: ~120 lines on 14 screens, mostly words
 * written into the component, and two pages carrying their own English copy of labels the
 * message files already had.
 *
 * The check reads each component with the TypeScript parser (not a pattern), so code is never
 * mistaken for words, and looks only where words reach the screen: text between tags, the
 * attributes people read (placeholder, title, aria-label, alt, label), a word chosen inside
 * `{ ... }`, and the message given to setError / notify / confirm.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..", "..", "src");

/** Shown when the root layout itself failed -- the translation system with it -- so its words live in the file. */
const FILES_ALLOWED = new Set(["app/global-error.tsx"]);

/** Names that stay as they are in every language, and the Esc key's printed name. */
const NAMES = new Set([
  "Paperbase", "bKash", "Nagad", "Facebook", "Instagram", "TikTok", "WhatsApp", "Google", "YouTube",
  "Meta", "Steadfast", "Pathao", "SKU", "esc",
]);

/** Example values in a box (a phone, an email, an address, a code) rather than words. */
function isExample(text: string): boolean {
  return (
    /@/.test(text) ||
    /^(https?:|\/|#|facebook\.com\/)/.test(text) ||
    /X{3,}/.test(text) ||
    /^[A-Z0-9][A-Z0-9_-]*$/.test(text)
  );
}

function hasEnglishWords(text: string): boolean {
  const left = text
    .split(/[^A-Za-z]+/)
    .filter((w) => w.length >= 2 && !NAMES.has(w));
  return left.length > 0;
}

const READ_ATTRIBUTES = new Set(["placeholder", "title", "aria-label", "alt", "label"]);
const MESSAGE_CALLS = new Set(["setError"]);
const NOTIFY_METHODS = new Set(["success", "warning", "info", "error"]);

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return name.endsWith(".tsx") ? [path] : [];
  });
}

function stringValue(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(" ");
  return null;
}

/** The strings a `{ ... }` can put on screen: itself, or a branch of `?:`, `??`, `||`. */
function shownStrings(expr: ts.Expression): ts.Node[] {
  if (ts.isParenthesizedExpression(expr)) return shownStrings(expr.expression);
  if (ts.isConditionalExpression(expr)) return [...shownStrings(expr.whenTrue), ...shownStrings(expr.whenFalse)];
  if (
    ts.isBinaryExpression(expr) &&
    (expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      expr.operatorToken.kind === ts.SyntaxKind.BarBarToken)
  ) {
    return shownStrings(expr.right);
  }
  return stringValue(expr) !== null ? [expr] : [];
}

/** Every English line `text` (a component named `file`) puts on screen, as "file:line  text". */
function englishIn(file: string, text: string): string[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const report = (node: ts.Node, text: string) => {
    const t = text.replace(/\s+/g, " ").trim();
    if (!t || isExample(t) || !hasEnglishWords(t)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    found.push(`${file}:${line + 1}  ${JSON.stringify(t.slice(0, 80))}`);
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) report(node, node.text);

    if (ts.isJsxAttribute(node) && READ_ATTRIBUTES.has(node.name.getText(source)) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) report(init, init.text);
      if (ts.isJsxExpression(init) && init.expression) {
        for (const s of shownStrings(init.expression)) report(s, stringValue(s) ?? "");
      }
    }

    if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent)) {
      for (const s of shownStrings(node.expression)) report(s, stringValue(s) ?? "");
    }

    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee)
        ? callee.text
        : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && callee.expression.text === "notify" && NOTIFY_METHODS.has(callee.name.text)
          ? "notify"
          : null;
      const first = node.arguments[0];
      if (first && (name === "notify" || (name && MESSAGE_CALLS.has(name)))) {
        for (const s of shownStrings(first)) report(s, stringValue(s) ?? "");
      }
      if (name === "confirm" && first && ts.isObjectLiteralExpression(first)) {
        for (const prop of first.properties) {
          if (ts.isPropertyAssignment(prop) && ["title", "message"].includes(prop.name.getText(source))) {
            for (const s of shownStrings(prop.initializer)) report(s, stringValue(s) ?? "");
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("the dashboard's screens", () => {
  it("carry no English typed into a component (words come from messages/{en,bn}.json)", () => {
    const found = tsxFiles(SRC)
      .map((f) => relative(SRC, f))
      .filter((f) => !FILES_ALLOWED.has(f))
      .flatMap((f) => englishIn(f, readFileSync(join(SRC, f), "utf8")));
    expect(found, `English on screen, outside the message files:\n${found.join("\n")}`).toEqual([]);
  });

  it("catches each place English reaches the screen, and lets names, examples and code through", () => {
    const english = `
      export function Sample({ busy, error }: { busy: boolean; error?: string }) {
        const setError = (_: string) => {};
        const confirm = (_: { title: string; message: string }) => {};
        setError("Couldn't load your passkeys.");
        notify.warning("Please complete image uploads before saving.");
        confirm({ title: "Delete popup?", message: \`Delete "\${busy}"? This cannot be undone.\` });
        return (
          <div title="Save name">
            <th>Delivery Status</th>
            <input placeholder="e.g. Shop now" aria-label="Close search" />
            {busy ? "Saving…" : "Save"}
            {error ?? "Upload failed."}
          </div>
        );
      }`;
    expect(englishIn("sample.tsx", english).map((line) => line.split("  ")[1])).toEqual([
      '"Couldn\'t load your passkeys."',
      '"Please complete image uploads before saving."',
      '"Delete popup?"',
      '"Delete \\" \\"? This cannot be undone."',
      '"Save name"',
      '"Delivery Status"',
      '"e.g. Shop now"',
      '"Close search"',
      '"Saving…"',
      '"Save"',
      '"Upload failed."',
    ]);

    const fine = `
      export function Sample({ t, items }: { t: (k: string) => string; items: Set<string> }) {
        const tags = new Set<string>(items);
        return (
          <div title={t("title")}>
            <span>Paperbase · bKash · Nagad</span>
            <kbd>esc</kbd>
            <input placeholder="01XXXXXXXXX" />
            <input placeholder="you@example.com" />
            <input placeholder="EID100" />
            {t("refresh")} {tags.size}
          </div>
        );
      }`;
    expect(englishIn("sample.tsx", fine)).toEqual([]);
  });
});
