/**
 * The editor kit (2026-09-26): the pieces every settings view in the theme
 * editor is built from. The owner asked for one central design system rather
 * than boxes styled one by one -- these pin what each piece promises.
 */
import fs from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, test } from "vitest";

import {
  KitAdd,
  KitChoice,
  KitFold,
  KitPanel,
  KitPart,
  KitPicked,
  KitPicture,
  KitSwitchRow,
  KitValueRow,
} from "@/components/theme-editor/kit";
import en from "../../messages/en.json";

const draw = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={en}>
      {node}
    </NextIntlClientProvider>,
  );
const nothing = () => {};

describe("the frame", () => {
  test("a title, what it is, and the way out", () => {
    const html = draw(
      <KitPanel title="Featured this week" hint="Products you pick." onClose={nothing}>
        <p>body</p>
      </KitPanel>,
    );
    expect(html).toContain("Featured this week");
    expect(html).toContain("Products you pick.");
    expect(html).toContain(`aria-label="${en.themeEditor.kit.close}"`);
    expect(html).not.toContain(`aria-label="${en.themeEditor.kit.back}"`);
  });

  test("a view reached from another goes back instead", () => {
    const html = draw(
      <KitPanel title="Picture" onBack={nothing}>
        <p>body</p>
      </KitPanel>,
    );
    expect(html).toContain(`aria-label="${en.themeEditor.kit.back}"`);
  });
});

describe("a choice", () => {
  const two = [
    { value: "on", label: "Showing" },
    { value: "off", label: "Hidden", note: "Shoppers do not see it." },
  ];

  test("three or fewer answers are a pill bar, and the chosen one's note is said once", () => {
    const html = draw(<KitChoice label="Row" options={two} value="off" onChange={nothing} />);
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('rounded-ui bg-muted/70');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-checked="true"[^>]*>Hidden</);
    expect(html).toContain("Shoppers do not see it.");
  });

  test("more than three, or answers that are shapes, are cards", () => {
    const five = ["classic", "centred", "split", "minimal", "compact"].map((value) => ({ value, label: value }));
    expect(draw(<KitChoice label="Design" options={five} value="split" onChange={nothing} />)).toContain("grid-cols-2");
    const shaped = two.map((option) => ({ ...option, mark: <span>shape</span> }));
    expect(draw(<KitChoice label="Row" options={shaped} value="on" onChange={nothing} />)).toContain("grid-cols-2");
  });
});

describe("a picture", () => {
  test("none yet: the empty frame is the button that chooses one", () => {
    const html = draw(<KitPicture url="" onChoose={nothing} onRemove={nothing} />);
    expect(html).toMatch(/<button[^>]*>.*Choose a picture/);
    expect(html).not.toContain("<img");
  });

  test("one chosen: drawn big, with Replace and Remove on it", () => {
    const html = draw(<KitPicture url="https://cdn.example.com/a.jpg" onChoose={nothing} onRemove={nothing} />);
    expect(html).toContain('src="https://cdn.example.com/a.jpg"');
    expect(html).toContain(">Replace<");
    expect(html).toContain(`aria-label="${en.themeEditor.kit.removePicture}"`);
  });

  test("with its words on it, the way the shop lays them", () => {
    const html = draw(
      <KitPicture
        url="https://cdn.example.com/a.jpg"
        words={{ heading: "New in", line: "Just landed", button: "Shop" }}
        onChoose={nothing}
        onRemove={nothing}
      />,
    );
    for (const word of ["New in", "Just landed", "Shop"]) expect(html).toContain(word);
  });
});

describe("rows", () => {
  test("a link shows where it goes, and Change; nothing yet says so, and Choose", () => {
    const set = draw(<KitValueRow label="Goes to" icon="→" value="All products" empty="No link" onPick={nothing} onClear={nothing} clearLabel="Remove" />);
    expect(set).toContain("All products");
    expect(set).toContain(">Change<");
    expect(set).toContain('aria-label="Remove"');
    const empty = draw(<KitValueRow label="Goes to" icon="→" value="" empty="No link" onPick={nothing} />);
    expect(empty).toContain("No link");
    expect(empty).toContain(">Choose<");
  });

  test("a ticked list is how many and which, and opens its picker", () => {
    const html = draw(<KitPicked label="Products" count="8 chosen" names={["Saree", "Set"]} onEdit={nothing} />);
    expect(html).toContain("8 chosen");
    expect(html).toContain("Saree · Set");
    expect(html).toMatch(/^<button/);
  });

  test("a switch row: the words are its label", () => {
    const html = draw(<KitSwitchRow label="Show the picture" help="Keeps it when off." checked onChange={nothing} />);
    const id = html.match(/<label for="([^"]+)"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="true"');
  });
});

describe("folds and parts", () => {
  test("folded by default, open when asked", () => {
    const closed = draw(<KitFold label="Edit the words">inside</KitFold>);
    expect(closed).toContain('aria-expanded="false"');
    expect(closed).not.toContain("inside");
    expect(draw(<KitFold label="Edit the words" defaultOpen>inside</KitFold>)).toContain("inside");
  });

  test("a part folds to its summary, and cannot move past either end", () => {
    const html = draw(
      <KitPart title="Picture 1" summary="Goes to Sale" onDown={nothing} onRemove={nothing} upLabel="Up" downLabel="Down" removeLabel="Remove">
        inside
      </KitPart>,
    );
    expect(html).toContain("Goes to Sale");
    expect(html).not.toContain("inside");
    expect(html).toMatch(/aria-label="Up"[^>]*disabled/);
    expect(html).not.toMatch(/aria-label="Down"[^>]*disabled/);
  });

  test("the add button, or the line that says the list is full", () => {
    expect(draw(<KitAdd label="Add a picture" onAdd={nothing} />)).toContain("Add a picture");
    const full = draw(<KitAdd label="Add a picture" full="Five is the most." onAdd={nothing} />);
    expect(full).toContain("Five is the most.");
    expect(full).not.toContain("<button");
  });
});

describe("the kit's corners are the dashboard's (owner, 2026-09-26)", () => {
  test("no corner in the kit's look is a number of its own", () => {
    const styles = fs.readFileSync(path.join(__dirname, "../../src/components/theme-editor/kit/styles.ts"), "utf8");
    expect(styles).not.toMatch(/rounded-(?:t-)?\[/);
    expect(styles).not.toContain("rounded-full");
    for (const token of ["rounded-card", "rounded-button", "rounded-input", "rounded-dialog"]) expect(styles).toContain(token);
  });

  test("nor in the pieces themselves", () => {
    const dir = path.join(__dirname, "../../src/components/theme-editor/kit");
    for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".tsx"))) {
      expect(fs.readFileSync(path.join(dir, file), "utf8"), file).not.toMatch(/rounded-(?:t-)?\[/);
    }
  });
});

describe("every settings view is built from the kit (owner, 2026-09-26)", () => {
  /*
   * The panel, the fields it draws, Style and the pickers it opens: none of them
   * reaches for the dashboard's plain controls, or the look would drift one box
   * at a time -- which is what the owner asked to stop. A frame that is a true
   * sheet or dialog (EditorSheet, ConflictDialog) keeps the dashboard's.
   */
  const VIEWS = [
    "slots/SlotPanel.tsx",
    "slots/StylePanel.tsx",
    "SettingField.tsx",
    "PicturePicker.tsx",
    "LinkPicker.tsx",
    "ProductPicker.tsx",
    "ChoicePicker.tsx",
    "EditorSheet.tsx",
    "ConflictDialog.tsx",
  ];
  const PLAIN = ["ui/button", "ui/input", "ui/textarea", "ui/select", "ui/form-field", "ui/switch"];

  test("none imports a plain control", () => {
    const root = path.join(__dirname, "../../src/components/theme-editor");
    for (const view of VIEWS) {
      const text = fs.readFileSync(path.join(root, view), "utf8");
      for (const plain of PLAIN) expect(text, `${view} imports ${plain}`).not.toContain(`@/components/${plain}"`);
    }
  });
});
