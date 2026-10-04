"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Monitor, SlidersHorizontal, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeferredNavLink } from "@/components/navigation/DeferredNavLink";
import { Select } from "@/components/ui/select";
import { notify } from "@/notifications";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { CUSTOMIZATION_HREF } from "@/lib/theme-editor/access";
import {
  discardThemeDraft,
  fetchThemeEditor,
  publishThemeDraft,
  themeErrorMessageKey,
  type ThemeEditorState,
} from "@/lib/theme-editor/api";
import {
  actionProblem,
  saveToShop,
  loadLatest,
  keepMyVersion,
  type EditorActionResult,
  type EditorPorts,
} from "@/lib/theme-editor/editor-actions";
import { editorReducer, initEditorState } from "@/lib/theme-editor/editor-reducer";
import { searchWithPage } from "@/lib/theme-editor/editor-url";
import { useBrandingQuery } from "@/hooks/useBrandingQuery";
import {
  accountFor,
  accountsFromApi,
  availableTargets,
  IDENTITY_HREF,
  SIGNUP_TARGETS,
} from "@/lib/storeSocialLinks";
import { pathLocale, previewTarget, templateForPath } from "@/lib/theme-editor/preview-paths";
import {
  markForPlace,
  placeForMark,
  placesOn,
  PREVIEW_MODE_MESSAGE,
  PREVIEW_OUTLINE_MESSAGE,
  TEMPLATE_PAGES,
  templateOf,
  type PickMessage,
  type PlaceRef,
} from "@/lib/theme-editor/preview-picks";
import type { PreviewMessage, PreviewState } from "@/lib/theme-editor/preview-session";
import { usePreviewExamplesQuery, useThemeImagesQuery } from "@/hooks/useThemesQuery";
import { useCategoriesQuery } from "@/hooks/useCategoriesQuery";
import { useProductsQuery } from "@/hooks/useProductsQuery";
import { initialChoices, PAGE_NOTES, SLOT_PAGES, SLOTS, type Slot, type SlotPageKey } from "@/lib/theme-editor/slot-catalogue";
import {
  addBlockEdits,
  blockSettingEdits,
  choiceEdits,
  moveBlockEdits,
  removeBlockEdits,
  setBlocksEdits,
  settingEdits,
  slotValueFor,
  wiringFor,
} from "@/lib/theme-editor/slot-sections";
import { choicesFromShop, storeSettingFor, storeSettingValue } from "@/lib/theme-editor/store-setting-slots";
import { useCheckoutSettingsQuery } from "@/hooks/useCheckoutSettingsQuery";
import {
  brandingQueryKey,
  checkoutSettingsQueryKey,
  themePresetsQueryKey,
  themesQueryKey,
} from "@/lib/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chosenPalette, fetchPalettes } from "@/lib/theme-editor/palettes";
import { CARD_PHOTOS, followingNames, ticksIn, toggled } from "@/lib/theme-editor/card-photos";
import { useToastAreaLeft, useToastAvoid } from "@/components/notifications/useToastArea";
import { ConflictDialog } from "../ConflictDialog";
import { PreviewPane } from "../PreviewPane";
import { SaveStatus } from "../SaveStatus";
import { useAutosave } from "../useAutosave";
import { usePreviewSession } from "../usePreviewSession";
import { KitBadge, KitChoice, KitNote, KitPanel, KitShape, KitTabs } from "../kit";
import { SHEET_TOP } from "../kit/styles";
import { useMediaQuery } from "../useMediaQuery";
import { CardPhotosPanel } from "./CardPhotosPanel";
import { PagePlaces, type PlaceRow } from "./PagePlaces";
import { SlotPanel } from "./SlotPanel";
import { StylePanel } from "./StylePanel";

/** The preview's two widths: a phone's, and the whole column. */
const WIDTHS = { mobile: "390px", desktop: "100%" } as const;

/** What the preview says when the shop has nothing to show for a page. */
const MISSING_NOTE = {
  category: "previewNoCategory",
  product: "previewNoProduct",
  post: "previewNoPost",
} as const;

/**
 * Pages the preview fills from a sample of the shop's own products, because a merchant looking
 * at their draft has nothing in a cart (shop-paperbase `storefront/preview_samples.py`).
 */
const SAMPLE_PAGES: readonly SlotPageKey[] = ["cart", "checkout", "success", "wishlist", "account"];

const placeId = (ref: PlaceRef) => `${ref.page}:${ref.key}`;

/**
 * The theme editor.
 *
 * **The page in the middle is the shop itself** (owner, 2026-09-26): the merchant's draft, drawn
 * by the storefront on the private preview host, at a phone's width or the computer's -- so what
 * they see is what their shoppers will see after Save to store, fonts and all. It replaced a
 * drawing of the shop that could never quite be it.
 *
 * What the owner asked for, on 2026-09-20, 2026-09-22 and 2026-09-26:
 *
 *   point and change  a merchant clicks the part of their shop they want to change, and its
 *                     settings open in a calm panel at the right (a sheet from the bottom on a
 *                     phone); with nothing picked, the panel lists every place on the page, so
 *                     the ones the page cannot show -- set to nothing, the empty cart's message
 *                     -- are a click away too, and Style is the other tab
 *   fixed places      nothing drags and nothing reorders; a merchant adds a section, removes
 *                     one, and edits the ones that are there
 *   a draft           every change saves itself as a private draft, which is what the preview
 *                     draws; Save to store puts it on the shop. There is no version to go back to
 *   premium in view   a paid option shows its badge, so a merchant sees what the tier adds
 */
export function SlotEditor({
  loaded,
  origin,
  initialPage = "home",
}: {
  loaded: ThemeEditorState;
  origin: string;
  /** The page the address names (`?page=`), so a refresh opens the editor where it was. */
  initialPage?: SlotPageKey;
}) {
  const t = useTranslations("themeEditor.slots");
  const tEditor = useTranslations("themeEditor");
  const tc = useTranslations("settings.customization");
  const tKit = useTranslations("themeEditor.kit");
  // The theme labels its own choices in both languages; this is which one.
  const locale = useLocale();
  const qc = useQueryClient();

  const [state, dispatch] = useReducer(editorReducer, loaded, (value) => initEditorState(value));
  const [page, setPage] = useState<SlotPageKey>(initialPage);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  /*
    The place whose settings are open, by the page that owns it. Nothing when
    the editor opens: a merchant opens it to see their shop, and picks what to
    change themselves.
  */
  const [open, setOpen] = useState<PlaceRef | null>(null);
  /** With nothing open, which the panel shows: this page's places, or Style. */
  const [tab, setTab] = useState<"page" | "style">("page");
  /*
    On a computer the panel is always there. On a narrower screen it is a
    sheet over the page, asked for with the top bar's Edit -- or opened by
    picking a place in the shop.
  */
  const [sheet, setSheet] = useState(false);
  const wide = useMediaQuery("(min-width: 1024px)");
  /** Whether a click in the preview picks a place (Select) or does what it does for a shopper (Browse). */
  const [selecting, setSelecting] = useState(true);
  /** The place under the pointer in the preview, said above it. */
  const [hovered, setHovered] = useState<PlaceRef | null>(null);
  // The face the shop is set in. Not a choice yet (the typeface is on hold,
  // 2026-09-26): Style shows every face, faded, and says which one this is.
  const face = "poppins";
  /*
    The palette is the shop's DOCUMENT since 2026-09-25, like the corners and
    the card style: a draft until Save to store. The six come from the API.
  */
  const palette = chosenPalette(state.document);
  const palettes = useQuery({
    queryKey: themePresetsQueryKey,
    queryFn: () => fetchPalettes(api),
    staleTime: 60 * 60 * 1000,
  });
  // The corners are the shop's document too, for the same reason the card
  // style is: what a merchant chooses here is a draft until Save to store.
  const corner =
    typeof state.document.settings?.corner_style === "string"
      ? state.document.settings.corner_style
      : "soft";
  /*
    The card style is the shop's DOCUMENT since 2026-09-23, not a held-in-the-
    screen choice and not the column a picker outside the editor used to write.
    So it reads from the document and writes back to it -- a draft, like every
    other look decision, until Save to store. Shelf where the document says
    nothing, as the theme and the shop do (owner, 2026-09-27).
  */
  const cardStyle =
    typeof state.document.settings?.card_style === "string"
      ? state.document.settings.card_style
      : "shelf";
  // Where a card's words sit (2026-09-29): the document too, centred where it says nothing.
  const cardAlign =
    typeof state.document.settings?.card_align === "string" ? state.document.settings.card_align : "center";
  // The categories whose cards follow their photo (2026-10-04): the document too, none where it says nothing.
  const cardPhotos = ticksIn(state.document.settings);
  // One whole-theme action at a time (Save, answering a clash).
  const [busy, setBusy] = useState(false);
  // The clash waiting for an answer, and where the draft stands so it can be saved over.
  const [conflict, setConflict] = useState<{ draftRevision: number | null } | null>(null);
  const [choices, setChoices] = useState<Record<SlotPageKey, Record<string, string>>>(() => ({
    home: initialChoices("home"),
    category: initialChoices("category"),
    product: initialChoices("product"),
    reviews: initialChoices("reviews"),
    search: initialChoices("search"),
    wishlist: initialChoices("wishlist"),
    account: initialChoices("account"),
    blog: initialChoices("blog"),
    article: initialChoices("article"),
    cart: initialChoices("cart"),
    checkout: initialChoices("checkout"),
    success: initialChoices("success"),
    header: initialChoices("header"),
    footer: initialChoices("footer"),
  }));

  /*
    The settings in this editor that are NOT the theme's: which form the
    checkout asks a shopper to fill in, and how it asks for the district.
    They are shop settings, so the tiles start from what the shop has --
    see `lib/theme-editor/store-setting-slots.ts`.
  */
  const checkoutSettings = useCheckoutSettingsQuery();
  const shopChoices = useMemo(() => choicesFromShop(checkoutSettings.data), [checkoutSettings.data]);
  const takeShopChoices = useCallback(() => {
    setChoices((all) =>
      shopChoices.reduce(
        (next, { page, key, value }) =>
          next[page][key] === value ? next : { ...next, [page]: { ...next[page], [key]: value } },
        all,
      ),
    );
  }, [shopChoices]);
  useEffect(() => {
    takeShopChoices();
  }, [takeShopChoices]);
  /*
    Shop settings chosen here and not yet written.

    **They wait for Save to store, like everything else here** (owner,
    2026-09-24, reversing the same day's first answer). They are not in the
    draft -- they are not part of the theme at all -- so the preview shows
    them once they are saved; the place's hint says so.
  */
  const [pendingStore, setPendingStore] = useState<Record<string, string>>({});
  /*
    The shop's social accounts, READ here and typed only in Settings -> Store Info -> Identity
    (owner, 2026-09-29: "the identity in the store info tab will be the source of truth"). The
    footer's and the Sign-up band's places choose how to show them, never what they are.
  */
  const branding = useBrandingQuery();
  const accounts = accountsFromApi(branding.data?.social_links);

  /*
    The shop, in the middle. The frame follows the page picker, and the picker
    follows the frame when the merchant browses to another page inside it -- but
    not for the ready that answers entering, which lands on home whatever page
    is picked (the frame is taken to the picked page instead), nor while it is
    being taken there.
  */
  const documentRef = useRef(state.document);
  documentRef.current = state.document;
  const openRef = useRef(open);
  openRef.current = open;
  const selectingRef = useRef(selecting);
  selectingRef.current = selecting;
  const preview = usePreviewSession({
    origin,
    storePublicId: "",
    savedVersion: loaded.preview_version,
    onMessage: followFrame,
    onPick,
  });
  const save = useAutosave({ loaded, document: state.document, onSaved: preview.saved });
  const examples = usePreviewExamplesQuery();

  /** Tell the page whether a click picks, and what to outline -- after every page it shows. */
  function tellFrame(scroll: boolean) {
    preview.post({ type: PREVIEW_MODE_MESSAGE, select: selectingRef.current });
    const picked = openRef.current;
    preview.post({
      type: PREVIEW_OUTLINE_MESSAGE,
      picked: picked ? markForPlace(picked, documentRef.current) : null,
      scroll,
    });
  }

  function followFrame(message: PreviewMessage, before: PreviewState) {
    if (message.type !== "ready" && message.type !== "navigated") return;
    tellFrame(false);
    if (message.type === "ready" && before.phase === "entering") return;
    const { phase } = preview.current();
    if (phase === "otherStore" || phase === "loading") return;
    const template = templateForPath(message.path);
    const next = template ? TEMPLATE_PAGES[template] : undefined;
    if (next && next !== page) {
      setPage(next);
      // A place on the page left behind is not on this one; the header's and footer's are.
      setOpen((current) => (current && current.page !== "header" && current.page !== "footer" ? null : current));
    }
  }

  function onPick(pick: PickMessage) {
    const place = pick.mark ? placeForMark(pick.mark, documentRef.current) : null;
    if (pick.type === "hover") {
      setHovered(place);
      return;
    }
    if (place) openPlace(place, { scroll: false });
  }

  // Where the preview should go to show the picked page, from where it is now.
  const { current: currentPreview, show } = preview;
  const frameShown = preview.state.hasShown;
  const template = templateOf(page);
  const targetFor = (path: string) =>
    examples.data && template ? previewTarget(template, examples.data, pathLocale(path) ?? locale) : null;

  // The frame follows the page picker, and catches up once it has first shown and once the
  // examples arrive (a page picked while the preview was still opening).
  useEffect(() => {
    const path = currentPreview().path;
    if (!frameShown || !path || !template || templateForPath(path) === template || !examples.data) return;
    const target = previewTarget(template, examples.data, pathLocale(path) ?? locale);
    if (target && "path" in target) show(target.path);
  }, [template, examples.data, frameShown, currentPreview, show, locale]);

  // Pictures this shop has already placed, and the URLs of ones placed since the
  // list was read: an upload answers with a key alone, and a field needs a URL
  // to draw the thumbnail before the next save refreshes the list.
  const images = useThemeImagesQuery({ enabled: true });
  // This shop's own departments, for the three-department place: the answers
  // a merchant will recognise rather than six invented ones.
  const categories = useCategoriesQuery();
  const departmentOptions = (categories.data ?? []).map((node) => ({
    value: node.public_id,
    label: node.name,
    note: node.product_count === 0 ? tEditor("noProducts") : undefined,
  }));
  // Only the page of products the picker last searched, which is enough: a
  // field shows the name of something the merchant just chose, and falls back
  // to the id for a pick made in another session until they open the picker.
  const products = useProductsQuery({ page_size: "20", ordering: "-created_at" });
  const [pictureUrls, setPictureUrls] = useState<Record<string, string>>({});

  function pickPage(next: SlotPageKey) {
    setPage(next);
    setOpen(null);
  }

  /*
    The page in the address (owner, 2026-09-26: a refresh on the checkout went back to the home
    page). Written however the page changed -- the picker, or the shop's own link followed in
    Browse -- and replaced rather than pushed: Back leaves the editor, as it always has.
  */
  useEffect(() => {
    const next = searchWithPage(window.location.search, page);
    if (next !== window.location.search) window.history.replaceState(null, "", next);
  }, [page]);

  /**
   * Open a place: its settings replace whatever the panel held, and the shop
   * outlines it -- scrolling to it when it was picked from the list, since a
   * place clicked in the shop is already in view.
   */
  function openPlace(ref: PlaceRef | null, { scroll }: { scroll: boolean }) {
    setOpen(ref);
    openRef.current = ref;
    if (ref) setSheet(true);
    tellFrame(scroll);
  }

  /**
   * A choice: written to the shop's document when the place is wired, kept in
   * this component when it is a shop setting (the checkout's form).
   *
   * `owner` is the entry that OWNS the place, which is not always the page it
   * was clicked on -- the notice strip is on every page and owned by Header.
   * The preview's marks and the list both name places by their owner.
   */
  function choose(owner: { page: SlotPageKey; key: string }, value: string) {
    // A shop setting, not the theme's: written the moment it is clicked, and
    // Save to store has nothing to do with it. The tile shows the new value at
    // once and goes back to what the shop says if the write fails -- a tile
    // that kept a value the shop refused would be the worst of both.
    const store = storeSettingFor(owner.page, owner.key);
    if (store) {
      setChoices((all) => ({
        ...all,
        [owner.page]: { ...all[owner.page], [owner.key]: value },
      }));
      setPendingStore((all) => ({ ...all, [store.setting]: storeSettingValue(store, value) }));
      return;
    }

    const wiring = wiringFor(owner.page, owner.key);
    if (!wiring) {
      setChoices((all) => ({
        ...all,
        [owner.page]: { ...all[owner.page], [owner.key]: value },
      }));
      return;
    }
    for (const edit of choiceEdits(state.document, wiring, value, owner)) dispatch(edit);
  }

  function setSetting(owner: { page: SlotPageKey; key: string }, setting: string, value: unknown) {
    const wiring = wiringFor(owner.page, owner.key);
    if (!wiring) return;
    for (const edit of settingEdits(state.document, wiring, setting, value)) dispatch(edit);
  }

  /** The parts inside a wired place: the hero's pictures, in order. */
  function edits(
    owner: { page: SlotPageKey; key: string },
    make: (wiring: NonNullable<ReturnType<typeof wiringFor>>) => ReturnType<typeof choiceEdits>,
  ) {
    const wiring = wiringFor(owner.page, owner.key);
    if (!wiring) return;
    for (const edit of make(wiring)) dispatch(edit);
  }

  const ports = (): EditorPorts => ({
    autosave: save.control,
    publish: (expected) => publishThemeDraft(api, expected),
    discard: (expected) => discardThemeDraft(api, expected),
    reload: () => fetchThemeEditor(api),
    load: (next) => dispatch({ type: "load", document: next.document, manifest: next.manifest }),
    // Saving to the shop, discarding and loading the latest all change the draft
    // the preview draws: it redraws at that version.
    refreshPreview: (version) => preview.saved(version),
    // No copy of unsent edits is kept on the device yet, so there is none to forget.
    forgetDeviceCopy: () => {},
    // Customization reads the library again for its Live and Draft badges.
    themesChanged: () => void qc.resetQueries({ queryKey: themesQueryKey }),
  });

  /**
   * Runs one whole-theme action. A clash is a question, so it opens the dialog
   * rather than a toast; anything else says what happened.
   */
  async function run(action: () => Promise<EditorActionResult>, onDone: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) {
        onDone();
        return;
      }
      const { clash, tell } = actionProblem(result, save.latest().status);
      setConflict(clash);
      if (!tell) return;
      if (tell.kind === "error") notify.warning(tc(themeErrorMessageKey(tell.error)), { title: tc("heading") });
      else if (tell.kind === "blockedInvalid")
        notify.warning(tEditor("saveBlockedInvalid"), { title: tEditor("saveBlockedTitle") });
      else notify.warning(tEditor("saveBlocked"), { title: tEditor("saveBlockedTitle") });
    } finally {
      setBusy(false);
    }
  }

  /**
   * The shop settings chosen in this editor, written with the rest of the save.
   *
   * Never throws: a shop setting that would not save must not take the theme's
   * own save down with it. It stays pending instead, so the next Save tries it
   * again, and the merchant is told which half did not land.
   */
  async function saveShopSettings(): Promise<boolean> {
    const patch = pendingStore;
    if (!Object.keys(patch).length) return true;
    try {
      await api.patch("store/checkout-settings/", patch);
      setPendingStore({});
      return true;
    } catch {
      notify.warning(tEditor("shopSettingFailed"), { title: tc("heading") });
      return false;
    } finally {
      void qc.invalidateQueries({ queryKey: checkoutSettingsQueryKey });
    }
  }

  /*
    One button, both halves. The shop settings go FIRST: publishing can fail for
    reasons that have nothing to do with them -- a clash, or a draft that is not
    there to publish -- and a merchant who pressed Save should not lose a choice
    to an argument about something else.
  */
  const handleSave = () =>
    void run(
      async () => {
        await saveShopSettings();
        return saveToShop(ports());
      },
      () => notify.success(tEditor("savedToShop"), { title: tc("heading") }),
    );
  const answered = () => setConflict(null);
  /**
   * Answering a clash with "load latest" gives up the edits this editor had not
   * sent -- and a shop setting chosen here and not yet saved is one of
   * them. It goes back to what the shop says rather than waiting to be written
   * by a later Save the merchant did not connect it to.
   */
  const startedOver = () => {
    setPendingStore({});
    takeShopChoices();
    answered();
  };

  /*
    What the panel shows.

    A wired place is its settings (`SlotPanel`). A place still decided here --
    the checkout's form, a shop setting -- is its answers, drawn the same way; a
    place that is set says why. Nothing open is this page's places, or Style.
  */
  const openSlot = open ? (SLOTS[open.page].find((slot) => slot.key === open.key) ?? null) : null;
  const openWiring = open ? wiringFor(open.page, open.key) : null;
  const closePlace = () => openPlace(null, { scroll: false });

  /**
   * What a place has of its own, under its settings. The footer's Social links place and the
   * Sign-up place show the shop's accounts, which are typed in Settings -> Store Info -> Identity
   * and nowhere here: each says so, with the way there -- in a new tab, so this draft stays open.
   * The Sign-up place also says when the account it goes to is missing: the band is hidden then.
   */
  function placeExtras(ref: PlaceRef): ReactNode {
    const toIdentity = (
      <a
        href={`/${locale}${IDENTITY_HREF}`}
        target="_blank"
        rel="noopener"
        className="font-medium text-foreground underline underline-offset-2"
      >
        {t("identityLink")}
      </a>
    );
    if (ref.page === "footer" && ref.key === "social") {
      return (
        <KitNote>
          {accounts.length ? t("socialFromIdentity") : t("socialNoneYet")} {toIdentity}
        </KitNote>
      );
    }
    if (ref.page === "home" && ref.key === "signup") {
      const wiring = wiringFor(ref.page, ref.key);
      const chosen = wiring ? slotValueFor(state.document, wiring) : "off";
      const target = SIGNUP_TARGETS.find((one) => one === chosen);
      if (!availableTargets(accounts).length) {
        return (
          <KitNote role="status">
            {t("signupNoAccounts")} {toIdentity}
          </KitNote>
        );
      }
      if (!target || accountFor(target, accounts)) return null;
      // The target by the name its tile has.
      const tile = SLOTS.home.find((slot) => slot.key === "signup")?.options?.find((one) => one.value === target);
      return (
        <KitNote role="status">
          {target === "messenger" ? t("signupNoFacebook") : t("signupNoAccount", { platform: tile ? t(tile.label) : target })}{" "}
          {toIdentity}
        </KitNote>
      );
    }
    return null;
  }

  /**
   * The Sign-up place offers only where this shop has an account, and whatever the band is set to
   * now -- so a choice made before an account was removed stays visible, with its note, until it
   * is changed.
   */
  function shownSlot(slot: Slot, ref: PlaceRef): Slot {
    if (ref.page !== "home" || ref.key !== "signup") return slot;
    const wiring = wiringFor(ref.page, ref.key);
    const chosen = wiring ? slotValueFor(state.document, wiring) : "off";
    const offered = new Set<string>(availableTargets(accounts));
    return {
      ...slot,
      options: (slot.options ?? []).filter((one) => one.value === "off" || one.value === chosen || offered.has(one.value)),
    };
  }

  const stylePanel = (
    <StylePanel
      palettes={palettes.data}
      palettesFailed={palettes.isError}
      palette={palette}
      onPalette={(key) => dispatch({ type: "setThemeSetting", setting: "palette", value: key })}
      face={face}
      corner={corner}
      onCorner={(key) => dispatch({ type: "setThemeSetting", setting: "corner_style", value: key })}
      cardStyle={cardStyle}
      onCardStyle={(key) => dispatch({ type: "setThemeSetting", setting: "card_style", value: key })}
      cardAlign={cardAlign}
      onCardAlign={(key) => dispatch({ type: "setThemeSetting", setting: "card_align", value: key })}
      onClose={wide ? undefined : () => setSheet(false)}
    />
  );

  /** What a place is set to, in the merchant's words, for the list. */
  function valueOf(ref: PlaceRef): string {
    const slot = SLOTS[ref.page].find((one) => one.key === ref.key);
    if (slot?.themeSetting === CARD_PHOTOS) {
      // The categories that follow, by name: two, then how many more.
      const names = followingNames(cardPhotos, categories.data ?? []);
      if (!names.length) return t("catPhotosSquare");
      if (names.length <= 2) return names.join(", ");
      return t("catPhotosMore", { names: names.slice(0, 2).join(", "), count: names.length - 2 });
    }
    if (!slot?.options?.length) return "";
    const wiring = wiringFor(ref.page, ref.key);
    const value = wiring ? slotValueFor(state.document, wiring) : choices[ref.page]?.[ref.key];
    const option = slot.options.find((one) => one.value === value);
    return option ? t(option.label) : "";
  }

  const groups = placesOn(page).map((group) => ({
    title: group.group === "header" ? t("header") : group.group === "footer" ? t("footer") : t(page),
    rows: group.places.map((ref): PlaceRow => {
      const slot = SLOTS[ref.page].find((one) => one.key === ref.key);
      return {
        id: placeId(ref),
        name: slot ? t(slot.label) : ref.key,
        value: valueOf(ref),
        locked: Boolean(slot?.locked),
      };
    }),
  }));
  const placesPanel = (
    <KitPanel
      title={t(page)}
      hint={tKit("placesHint")}
      onClose={wide ? undefined : () => setSheet(false)}
      className="h-full"
    >
      <PagePlaces
        groups={groups}
        openId={open ? placeId(open) : null}
        onOpen={(id) => {
          const [owner, key] = id.split(":") as [SlotPageKey, string];
          openPlace({ page: owner, key }, { scroll: true });
        }}
      />
    </KitPanel>
  );

  const placePanel =
    open && openSlot?.themeSetting === CARD_PHOTOS ? (
      /* One of the theme's own settings, with a view of its own: written as the card style is. */
      <CardPhotosPanel
        key={placeId(open)}
        tree={categories.data}
        failed={categories.isError}
        ticks={cardPhotos}
        onToggle={(publicId) =>
          dispatch({
            type: "setThemeSetting",
            setting: CARD_PHOTOS,
            value: toggled(cardPhotos, categories.data ?? [], publicId),
          })
        }
        onClose={closePlace}
      />
    ) : open && openSlot && openWiring ? (
      /* `page` is the one that OWNS the place, so the settings its neighbours
         decide are looked up where those neighbours live. */
      <SlotPanel
        key={placeId(open)}
        slot={shownSlot(openSlot, open)}
        page={open.page}
        wiring={openWiring}
        manifest={state.manifest}
        document={state.document}
        premiumSections={loaded.premium_sections !== false}
        pictures={images.data ?? []}
        pictureUrl={(key) => pictureUrls[key] ?? images.data?.find((row) => row.key === key)?.url ?? ""}
        productName={(publicId) =>
          (products.data?.results ?? []).find((row) => row.public_id === publicId)?.name ?? ""
        }
        departments={departmentOptions}
        onChoose={(value) => choose(open, value)}
        onSet={(setting, value) => setSetting(open, setting, value)}
        onSetBlock={(blockId, setting, value) =>
          edits(open, (wiring) => blockSettingEdits(state.document, wiring, blockId, setting, value))
        }
        onSetBlocks={(blockType, setting, values) =>
          edits(open, (wiring) => setBlocksEdits(state.document, wiring, blockType, setting, values))
        }
        onAddBlock={(blockType) => edits(open, (wiring) => addBlockEdits(state.document, wiring, blockType))}
        onRemoveBlock={(blockId) => edits(open, (wiring) => removeBlockEdits(state.document, wiring, blockId))}
        onMoveBlock={(blockId, to) => edits(open, (wiring) => moveBlockEdits(state.document, wiring, blockId, to))}
        onPictureUrl={(key, url) => setPictureUrls((known) => ({ ...known, [key]: url }))}
        onClose={closePlace}
      >
        {placeExtras(open)}
      </SlotPanel>
    ) : open && openSlot ? (
      <KitPanel
        key={placeId(open)}
        title={t(openSlot.label)}
        hint={openSlot.hint ? t(openSlot.hint) : undefined}
        onClose={closePlace}
        className="h-full"
      >
        {openSlot.locked ? (
          <KitNote>{t(openSlot.lockedBecause ?? "lockedWhy")}</KitNote>
        ) : (
          <KitChoice
            label={t(openSlot.label)}
            value={choices[open.page]?.[open.key]}
            onChange={(value) => choose(open, value)}
            options={(openSlot.options ?? []).map((option) => ({
              value: option.value,
              label: t(option.label),
              note: option.note ? t(option.note) : undefined,
              mark: (openSlot.options ?? []).length > 3 ? <KitShape shape={option.shape} /> : undefined,
              badge: option.premium ? <KitBadge>{t("premium")}</KitBadge> : undefined,
            }))}
          />
        )}
      </KitPanel>
    ) : null;

  /** The panel's contents: the open place, or this page's places, or Style. */
  const panel = placePanel ?? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-5 pt-4">
        <KitTabs
          label={tKit("panelLabel")}
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "page", label: tKit("thisPage") },
            { key: "style", label: tKit("styleTitle") },
          ]}
        />
      </div>
      <div className="min-h-0 flex-1">{tab === "page" ? placesPanel : stylePanel}</div>
    </div>
  );
  /** On a narrower screen the sheet shows only when something asked for it. */
  const sheetOpen = !wide && (placePanel !== null || sheet);

  /*
    The pop-up notes centre over the shop preview, not the whole screen (owner, 2026-09-29):
    this screen has no sidebar, and its settings panel along the right is not where the work
    is. On a narrower screen the panel is a sheet from the bottom, and the notes rise above it.
  */
  const panelRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useToastAreaLeft("0px");
  useToastAvoid(panelRef, "right", wide);
  useToastAvoid(sheetRef, "bottom", sheetOpen);

  // What the line over the preview says: the place under the pointer, else what this page is.
  const hoveredSlot = hovered ? SLOTS[hovered.page].find((one) => one.key === hovered.key) : null;
  const status = hoveredSlot && selecting ? (
    <span className="truncate">{tEditor("previewHover", { place: t(hoveredSlot.label) })}</span>
  ) : null;
  let note: ReactNode = SAMPLE_PAGES.includes(page) ? (
    <span className="truncate">{tEditor("previewSample")}</span>
  ) : null;
  const framePath = preview.state.path;
  if (framePath && template && templateForPath(framePath) !== template) {
    const target = targetFor(framePath);
    if (target && "missing" in target) {
      note = <span className="truncate">{tEditor(MISSING_NOTE[target.missing])}</span>;
    } else if (templateForPath(framePath) === null) {
      note = (
        <>
          <span className="truncate">{tEditor("previewCantCustomize")}</span>
          {target && "path" in target ? (
            <button
              type="button"
              onClick={() => show(target.path)}
              className="shrink-0 rounded-button px-1 py-0.5 font-medium text-foreground underline underline-offset-2"
            >
              {tEditor("previewShowPage", { page: t(page) })}
            </button>
          ) : null}
        </>
      );
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-3 py-3 md:px-4">
        {/*
          The way out. This screen fills the window with no dashboard around it,
          so without this a merchant's only exit is the browser's back button --
          and the X at the far left is where the editor has always kept it.

          A link and not a button: it is a navigation, so it opens in a new tab
          on a middle click and reads as an address to a screen reader.
        */}
        <Button asChild type="button" variant="ghost" size="icon" className="size-9 shrink-0">
          <DeferredNavLink href={CUSTOMIZATION_HREF} aria-label={tEditor("close")} title={tEditor("close")}>
            <X aria-hidden />
          </DeferredNavLink>
        </Button>

        <Select
          aria-label={tEditor("pageLabel")}
          value={page}
          onChange={(event) => pickPage(event.target.value as SlotPageKey)}
          className="w-auto min-w-[10rem]"
        >
          {SLOT_PAGES.map((key) => (
            <option key={key} value={key}>
              {t(key)}
            </option>
          ))}
        </Select>

        {/* On a narrower screen the panel is a sheet, asked for here. */}
        {wide ? null : (
          <Button type="button" variant="ghost" size="sm" aria-pressed={sheetOpen} onClick={() => setSheet(true)}>
            <SlidersHorizontal aria-hidden />
            {tEditor("tabEdit")}
          </Button>
        )}

        <div className="flex-1" />

        <SaveStatus status={save.status} onRetry={() => void save.control.flush()} />

        <div
          role="group"
          aria-label={tEditor("previewSize")}
          className="inline-flex overflow-hidden rounded-sm border border-border-subtle"
        >
          {(
            [
              ["desktop", Monitor, tEditor("desktop")],
              ["mobile", Smartphone, tEditor("phone")],
            ] as const
          ).map(([key, Icon, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={device === key}
              onClick={() => setDevice(key)}
              title={label}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                device === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <Button type="button" size="sm" disabled={busy} onClick={handleSave}>
          {tEditor("saveToShop")}
        </Button>
      </div>

      {/*
        A note for a page whose shop page does not exist yet, and only there.
        None today: every place on every page is real. A page added to the
        editor before its shop page is built says so here.
      */}
      {PAGE_NOTES[page] ? (
        <p className="border-b border-border bg-muted px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {t(PAGE_NOTES[page])}
        </p>
      ) : null}

      {/*
        The shop in the middle and the panel at its right (2026-09-26) -- the
        shop is what a merchant is changing, so it keeps the room and stays in
        view while they type. `overflow-hidden` on the row is what lets the
        panel scroll on its own.

        On a narrower screen there is no room for a column, so the panel rises
        from the bottom as a sheet over the lower part of the shop.
      */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className={cn("flex min-w-0 flex-1 flex-col", sheetOpen && "pb-[45dvh]")}>
          <PreviewPane
            origin={origin}
            width={WIDTHS[device]}
            session={preview}
            note={note}
            status={status}
            selecting={selecting}
            onSelecting={(next) => {
              setSelecting(next);
              selectingRef.current = next;
              if (!next) setHovered(null);
              preview.post({ type: PREVIEW_MODE_MESSAGE, select: next });
            }}
          />
        </div>

        {wide ? (
          <aside
            ref={panelRef}
            aria-label={tKit("panelLabel")}
            className="flex w-[380px] shrink-0 flex-col border-l border-border bg-background xl:w-[400px]"
          >
            {panel}
          </aside>
        ) : null}
      </div>

      {sheetOpen ? (
        <div
          ref={sheetRef}
          role="dialog"
          aria-label={tKit("panelLabel")}
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            if (open) closePlace();
            else setSheet(false);
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 flex max-h-[72dvh] flex-col border-t border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_40px_rgb(0_0_0/0.16)]",
            SHEET_TOP,
          )}
        >
          <span aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border" />
          {panel}
        </div>
      ) : null}

      <ConflictDialog
        open={conflict !== null}
        busy={busy}
        canKeepMine={conflict?.draftRevision != null}
        hasUnsent={save.unsent}
        onLoadLatest={() => void run(() => loadLatest(ports()), startedOver)}
        onKeepMine={() =>
          conflict?.draftRevision != null
            ? void run(() => keepMyVersion(ports(), conflict.draftRevision as number), answered)
            : undefined
        }
      />
    </div>
  );
}
