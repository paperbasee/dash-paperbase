import {
  Banknote,
  ChevronDown,
  Heart,
  Menu,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Truck,
  User,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { SocialMark } from "@/components/SocialMark";
import { toLocaleDigits } from "@/lib/locale-digits";
import { cn } from "@/lib/utils";

import {
  SAMPLE_BRANDS,
  formatTaka,
  heroPhoto,
  productPhoto,
  samplePrice,
  scenePhoto,
  type SampleProduct,
  type ShopKind,
} from "./samples";

/**
 * The sample shop's home page, drawn as the shop draws it (shop-paperbase's storefront theme)
 * with every section on, in the theme's own order: announcement, header, pictures, categories,
 * promises, featured, best sellers, new arrivals, the three departments, words, video,
 * promotion, questions, brands, reviews, blog posts, the WhatsApp band, and the footer.
 *
 * It is drawn at a real screen's size -- a computer's 1280px page or a phone's 390px one -- in
 * the theme's real type and spacing, and shrunk to where it sits, so it reads as a real site
 * (owner, 2026-09-28: "much smaller, like a real shop of mine with every section turned on").
 * Colours are the palette's (`--sw-*`, set by ShopWindow); words are the shop's own defaults.
 */

type Props = {
  kind: ShopKind;
  name: string;
  phone: boolean;
  /** The owner's number, once the contact step is reached. */
  contact: string | null;
  facebook: boolean;
};

/** The theme's `.band`: the page's content column. */
function Band({ phone, className, children }: { phone: boolean; className?: string; children: ReactNode }) {
  return <section className={cn(phone ? "px-4 pt-10" : "px-14 pt-16", className)}>{children}</section>;
}

/** A band's heading, as the theme sets it: light, in capitals, centred, with its link under it. */
function Heading({ phone, title, link }: { phone: boolean; title: string; link?: string }) {
  return (
    <div className={cn("text-center", phone ? "mb-5" : "mb-8")}>
      <h2 className={cn("font-light uppercase leading-tight", phone ? "text-[22px]" : "text-[30px]")}>{title}</h2>
      {link ? <p className={cn("mt-1.5 opacity-75", phone ? "text-[12px]" : "text-[13px]")}>{link}</p> : null}
    </div>
  );
}

function Photo({ src, className }: { src: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized sample photo
    <img src={src} alt="" loading="lazy" decoding="async" className={cn("size-full object-cover", className)} />
  );
}

function ProductCard({ kind, n, phone }: { kind: ShopKind; n: SampleProduct; phone: boolean }) {
  const t = useTranslations("shopPreview");
  const locale = useLocale();
  const { price, was } = samplePrice(kind, n);
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-[10px] bg-[var(--sw-card)] transition-colors duration-500">
      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--sw-muted)]">
        <Photo src={productPhoto(kind, n)} />
        <span className="absolute left-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-white/85 text-[#111]">
          <Heart className="size-4" strokeWidth={1.75} />
        </span>
      </div>
      <div className={cn("flex flex-1 flex-col gap-1.5", phone ? "p-2.5" : "p-3")}>
        <p className={cn("truncate uppercase tracking-[0.02em]", phone ? "text-[12px]" : "text-[14px]")}>
          {t(`kinds.${kind}.item${n}`)}
        </p>
        <p className="flex items-baseline gap-2">
          <b className={cn("font-semibold", phone ? "text-[15px]" : "text-[18px]")}>{formatTaka(price, locale)}</b>
          {was ? <s className="text-[12px] opacity-50">{formatTaka(was, locale)}</s> : null}
        </p>
        <span className="self-start rounded-[4px] bg-[#dcfce7] px-1.5 py-0.5 text-[11px] text-[#15803d]">
          {t("freeDelivery")}
        </span>
        <span
          className={cn(
            "mt-auto flex items-center justify-center rounded-[8px] bg-[var(--sw-brand)] font-medium text-[var(--sw-brand-fg)] transition-colors duration-500",
            phone ? "mt-2 h-9 text-[12px]" : "mt-2.5 h-10 text-[13px]"
          )}
        >
          {t("orderNow")}
        </span>
      </div>
    </div>
  );
}

/** A picture with words on it and a button: the theme's row pictures and promotion. */
function PictureTile({
  src,
  title,
  body,
  button,
  phone,
  className,
}: {
  src: string;
  title: string;
  body: string;
  button: string;
  phone: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-[10px] bg-[var(--sw-muted)]", className)}>
      <Photo src={src} className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      <div className={cn("absolute text-white", phone ? "bottom-4 left-4" : "bottom-7 left-7")}>
        <p className={cn("font-semibold leading-tight", phone ? "text-[18px]" : "text-[24px]")}>{title}</p>
        <p className={cn("mt-1 opacity-85", phone ? "text-[12px]" : "text-[14px]")}>{body}</p>
        <span
          className={cn(
            "inline-flex items-center rounded-[8px] bg-[var(--sw-brand)] font-medium text-[var(--sw-brand-fg)] transition-colors duration-500",
            phone ? "mt-3 h-8 px-3.5 text-[12px]" : "mt-4 h-10 px-5 text-[13px]"
          )}
        >
          {button}
        </span>
      </div>
    </div>
  );
}

/** A band of products, with its picture beside them when it has one. */
function ProductBand({
  kind,
  phone,
  title,
  products,
  picture,
}: {
  kind: ShopKind;
  phone: boolean;
  title: string;
  products: SampleProduct[];
  picture?: { src: string; title: string; body: string };
}) {
  const t = useTranslations("shopPreview");
  const shown = phone ? products.slice(0, picture ? 2 : 4) : products;
  return (
    <Band phone={phone}>
      <Heading phone={phone} title={title} link={t("seeAll")} />
      <div className={cn("grid", phone ? "grid-cols-2 gap-3" : picture ? "grid-cols-5 gap-5" : "grid-cols-4 gap-5")}>
        {picture ? (
          <PictureTile
            phone={phone}
            src={picture.src}
            title={picture.title}
            body={picture.body}
            button={t("shopNow")}
            className={phone ? "col-span-2 h-[240px]" : "col-span-2"}
          />
        ) : null}
        {shown.map((n) => (
          <ProductCard key={n} kind={kind} n={n} phone={phone} />
        ))}
      </div>
    </Band>
  );
}

export function ShopHome({ kind, name, phone, contact, facebook }: Props) {
  const t = useTranslations("shopPreview");
  const locale = useLocale();
  const nav = [1, 2, 3, 4, 5].map((i) => t(`kinds.${kind}.nav${i}`));
  const year = new Date().getFullYear();
  const digits = (value: string) => toLocaleDigits(value, locale);
  const postDate = (day: number) =>
    new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(year, 8, day)
    );

  return (
    <div>
      {/* ---- Header -------------------------------------------------------------------- */}
      <header className="border-b border-[var(--sw-border)] bg-[var(--sw-header)] text-[var(--sw-header-fg)] transition-colors duration-500">
        {phone ? (
          <div className="flex h-14 items-center gap-3 px-4">
            <Menu className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate text-center text-[17px] font-semibold uppercase tracking-[0.12em]">
              {name}
            </span>
            <Search className="size-5 shrink-0" strokeWidth={1.75} />
            <ShoppingBag className="size-5 shrink-0" strokeWidth={1.75} />
          </div>
        ) : (
          <>
            <div className="grid h-[76px] grid-cols-[1fr_auto_1fr] items-center px-14">
              <span className="flex items-center gap-2 text-[13px] opacity-80">
                <Search className="size-5" strokeWidth={1.75} />
                {t("search")}
              </span>
              <span className="max-w-[520px] truncate text-[24px] font-semibold uppercase tracking-[0.14em]">{name}</span>
              <span className="flex items-center justify-end gap-5">
                <User className="size-5" strokeWidth={1.75} />
                <Heart className="size-5" strokeWidth={1.75} />
                <ShoppingBag className="size-5" strokeWidth={1.75} />
              </span>
            </div>
            <nav className="flex h-12 items-center justify-center gap-10 border-t border-[var(--sw-border)] text-[13px] uppercase tracking-[0.06em]">
              {nav.map((item) => (
                <span key={item} className="flex items-center gap-1">
                  {item}
                  <ChevronDown className="size-3.5 opacity-60" />
                </span>
              ))}
            </nav>
          </>
        )}
      </header>

      {/* ---- Pictures (banner_slider) -------------------------------------------------- */}
      <div className={cn("relative overflow-hidden bg-[var(--sw-muted)]", phone ? "h-[460px]" : "h-[540px]")}>
        <Photo key={kind} src={heroPhoto(kind)} className="pb-drift absolute inset-0" />
        <div
          className={cn(
            "absolute inset-0",
            phone ? "bg-gradient-to-t from-black/65 via-black/15 to-transparent" : "bg-gradient-to-r from-black/60 via-black/20 to-transparent"
          )}
        />
        <div
          key={`${kind}-words`}
          className={cn("pb-rise absolute text-white", phone ? "inset-x-5 bottom-10" : "left-14 top-1/2 max-w-[560px] -translate-y-1/2")}
        >
          <p className={cn("uppercase tracking-[0.18em] opacity-85", phone ? "text-[11px]" : "text-[14px]")}>
            {t(`kinds.${kind}.kicker`)}
          </p>
          <p className={cn("mt-2 font-semibold leading-[1.05] tracking-[-0.02em]", phone ? "text-[34px]" : "text-[56px]")}>
            {t(`kinds.${kind}.title`)}
          </p>
          <span
            className={cn(
              "inline-flex items-center rounded-[8px] bg-white font-medium text-[#111]",
              phone ? "mt-5 h-10 px-5 text-[13px]" : "mt-7 h-12 px-7 text-[15px]"
            )}
          >
            {t("shopNow")}
          </span>
        </div>
        <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
          <i className="size-2 rounded-full bg-white" />
          <i className="size-2 rounded-full bg-white/50" />
        </span>
      </div>

      {/* ---- Categories (category_tiles) ----------------------------------------------- */}
      <Band phone={phone}>
        <Heading phone={phone} title={t("categories")} />
        <div className={cn("flex justify-center gap-2.5", phone ? "flex-wrap" : "")}>
          {nav.map((item) => (
            <span
              key={item}
              className={cn(
                "whitespace-nowrap rounded-full border border-[var(--sw-border)] bg-[var(--sw-card)]",
                phone ? "px-3 py-1.5 text-[12px]" : "px-5 py-2 text-[13px]"
              )}
            >
              {item}
            </span>
          ))}
        </div>
      </Band>

      {/* ---- Promises ------------------------------------------------------------------ */}
      <Band phone={phone}>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { Icon: Truck, words: t("promiseDelivery") },
            { Icon: Banknote, words: t("promiseCod") },
            { Icon: RotateCcw, words: t("promiseReturns") },
          ].map(({ Icon, words }) => (
            <span key={words} className="flex flex-col items-center gap-2">
              <Icon className={phone ? "size-5" : "size-6"} strokeWidth={1.5} />
              <span className={phone ? "text-[11px]" : "text-[13px]"}>{words}</span>
            </span>
          ))}
        </div>
      </Band>

      <ProductBand
        kind={kind}
        phone={phone}
        title={t("featured")}
        products={[1, 2, 3]}
        picture={{ src: scenePhoto(kind, 1), title: t("pickedTitle"), body: t("pickedBody") }}
      />
      <ProductBand
        kind={kind}
        phone={phone}
        title={t("bestSellers")}
        products={[4, 5, 6]}
        picture={{ src: scenePhoto(kind, 2), title: t("lovedTitle"), body: t("lovedBody") }}
      />
      <ProductBand kind={kind} phone={phone} title={t("newArrivals")} products={[7, 8, 3, 5]} />

      {/* ---- The three departments (category_products) --------------------------------- */}
      <ProductBand kind={kind} phone={phone} title={nav[0]} products={[2, 5, 8, 3]} />
      <ProductBand kind={kind} phone={phone} title={nav[1]} products={[6, 1, 7, 4]} />
      <ProductBand kind={kind} phone={phone} title={nav[2]} products={[3, 8, 2, 6]} />
      <div className={cn("flex justify-center", phone ? "pt-6" : "pt-8")}>
        <span
          className={cn(
            "rounded-[8px] border border-[var(--sw-border)] bg-[var(--sw-card)]",
            phone ? "px-4 py-2 text-[12px]" : "px-6 py-2.5 text-[13px]"
          )}
        >
          {t("browseAll")}
        </span>
      </div>

      {/* ---- Words (rich_text) --------------------------------------------------------- */}
      <Band phone={phone} className="text-center">
        <h2 className={cn("font-light uppercase", phone ? "text-[20px]" : "text-[26px]")}>{t("richTitle")}</h2>
        <p className={cn("mx-auto mt-3 max-w-[640px] leading-relaxed opacity-80", phone ? "text-[13px]" : "text-[16px]")}>
          {t("richBody")}
        </p>
      </Band>

      {/* ---- Video --------------------------------------------------------------------- */}
      <Band phone={phone}>
        <div className="relative aspect-video overflow-hidden rounded-[10px] bg-[var(--sw-muted)]">
          <Photo src={scenePhoto(kind, 1)} className="absolute inset-0" />
          <div className="absolute inset-0 bg-black/25" />
          <span
            className={cn(
              "absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#111]",
              phone ? "size-12" : "size-[72px]"
            )}
          >
            <Play className={cn("ml-1 fill-current", phone ? "size-5" : "size-7")} />
          </span>
        </div>
      </Band>

      {/* ---- Promotion (promo, on the accent ground) ------------------------------------ */}
      <section
        className={cn(
          "bg-[var(--sw-accent)] text-center text-[var(--sw-accent-fg)] transition-colors duration-500",
          phone ? "mt-10 px-4 py-10" : "mt-16 px-14 py-16"
        )}
      >
        <p className={phone ? "text-[12px]" : "text-[13px]"}>{t("promoKicker")}</p>
        <p className={cn("mt-2 font-semibold leading-tight", phone ? "text-[24px]" : "text-[34px]")}>{t("promoTitle")}</p>
        <p className={cn("mt-2 opacity-85", phone ? "text-[13px]" : "text-[15px]")}>{t("promoBody")}</p>
        <p className={cn("mt-3 font-medium", phone ? "text-[12px]" : "text-[13px]")}>
          {t("endsIn")} {digits("3d 14:05:09")}
        </p>
        <span
          className={cn(
            "inline-flex items-center rounded-[8px] bg-white font-medium text-[#111]",
            phone ? "mt-4 h-9 px-4 text-[12px]" : "mt-5 h-11 px-6 text-[14px]"
          )}
        >
          {t("promoButton")}
        </span>
      </section>

      {/* ---- Questions (faq) ----------------------------------------------------------- */}
      <Band phone={phone}>
        <div className="mx-auto max-w-[880px]">
          {[t("faq1"), t("faq2"), t("faq3")].map((question) => (
            <div
              key={question}
              className={cn(
                "flex items-center justify-between gap-4 border-t border-[var(--sw-border)] last:border-b",
                phone ? "py-3.5 text-[13px]" : "py-5 text-[15px]"
              )}
            >
              {question}
              <Plus className="size-4 shrink-0" strokeWidth={1.75} />
            </div>
          ))}
        </div>
      </Band>

      {/* ---- Brands (brand_row) -------------------------------------------------------- */}
      <Band phone={phone}>
        <Heading phone={phone} title={t("brandsHeading")} link={t("seeAll")} />
        <div className={cn("grid", phone ? "grid-cols-3 gap-2.5" : "grid-cols-5 gap-4")}>
          {SAMPLE_BRANDS.map((brand) => (
            <span
              key={brand}
              className={cn(
                "flex items-center justify-center rounded-[10px] bg-[var(--sw-card)] font-medium transition-colors duration-500",
                phone ? "h-16 text-[12px]" : "h-24 text-[15px]"
              )}
            >
              {brand}
            </span>
          ))}
        </div>
      </Band>

      {/* ---- Reviews (review_highlights) ----------------------------------------------- */}
      <Band phone={phone}>
        <Heading phone={phone} title={t("reviewsHeading")} link={t("seeAll")} />
        <div className={cn("grid", phone ? "grid-cols-2 gap-3" : "grid-cols-4 gap-5")}>
          {([2, 5, 7, 4] as const).slice(0, phone ? 2 : 4).map((n, i) => (
            <div key={n} className="overflow-hidden rounded-[10px] bg-[var(--sw-card)] transition-colors duration-500">
              <div className="aspect-[4/5] overflow-hidden bg-[var(--sw-muted)]">
                <Photo src={productPhoto(kind, n)} />
              </div>
              <div className={phone ? "p-2.5" : "p-4"}>
                <span className="flex gap-0.5 text-[#f59e0b]">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <Star key={s} className={cn("fill-current", phone ? "size-3" : "size-3.5")} />
                  ))}
                </span>
                <p className={cn("mt-2 line-clamp-2 leading-snug", phone ? "text-[12px]" : "text-[14px]")}>
                  {t(`review${i + 1}`)}
                </p>
                <p className={cn("mt-2 opacity-65", phone ? "text-[11px]" : "text-[12px]")}>{t(`reviewer${i + 1}`)}</p>
              </div>
            </div>
          ))}
        </div>
      </Band>

      {/* ---- Blog posts (latest_posts) ------------------------------------------------- */}
      <Band phone={phone}>
        <Heading phone={phone} title={t("postsHeading")} link={t("seeAll")} />
        <div className={cn("grid", phone ? "grid-cols-1 gap-5" : "grid-cols-3 gap-6")}>
          {[
            { src: scenePhoto(kind, 2), tag: t("tagGuide"), day: 15 },
            { src: productPhoto(kind, 3), tag: t("tagCare"), day: 12 },
            { src: productPhoto(kind, 8), tag: t("tagStories"), day: 9 },
          ]
            .slice(0, phone ? 2 : 3)
            .map((post, i) => (
              <div key={post.day}>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[10px] bg-[var(--sw-muted)]">
                  <Photo src={post.src} className="absolute inset-0" />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] text-[#111]">
                    {post.tag}
                  </span>
                </div>
                <p className={cn("mt-3 font-semibold leading-snug", phone ? "text-[14px]" : "text-[16px]")}>
                  {t(`kinds.${kind}.post${i + 1}`)}
                </p>
                <p className="mt-1.5 text-[12px] opacity-60">{postDate(post.day)}</p>
              </div>
            ))}
        </div>
      </Band>

      {/* ---- Sign-up band (whatsapp, on the accent ground) ----------------------------- */}
      <section
        className={cn(
          "flex flex-col items-center bg-[var(--sw-accent)] text-center text-[var(--sw-accent-fg)] transition-colors duration-500",
          phone ? "mt-10 gap-2 px-4 py-10" : "mt-16 gap-3 px-14 py-14"
        )}
      >
        <p className={cn("font-semibold leading-tight", phone ? "text-[20px]" : "text-[28px]")}>{t("waHeading")}</p>
        <p className={cn("max-w-[640px] opacity-85", phone ? "text-[13px]" : "text-[15px]")}>{t("waBody")}</p>
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-[8px] bg-white font-medium text-[#111]",
            phone ? "mt-2 h-9 px-4 text-[12px]" : "mt-3 h-11 px-6 text-[14px]"
          )}
        >
          <SocialMark platform="whatsapp" className="size-4 text-[#25d366]" />
          {t("waButton")}
        </span>
      </section>

      {/* ---- Footer -------------------------------------------------------------------- */}
      <footer
        className={cn(
          "bg-[var(--sw-fg)] text-[var(--sw-bg)] transition-colors duration-500",
          phone ? "px-4 pb-10 pt-10" : "px-14 pb-12 pt-14"
        )}
      >
        <div className={cn("grid", phone ? "grid-cols-2 gap-x-4 gap-y-8" : "grid-cols-4 gap-8")}>
          <div className={phone ? "col-span-2" : undefined}>
            <p className={cn("font-semibold uppercase tracking-[0.08em]", phone ? "text-[14px]" : "text-[15px]")}>{name}</p>
            {contact ? <p className="mt-4 text-[13px] opacity-75">{contact}</p> : null}
            <span className="mt-4 flex gap-2.5">
              {(facebook ? (["facebook", "whatsapp"] as const) : (["whatsapp"] as const)).map((platform) => (
                <span key={platform} className="flex size-8 items-center justify-center rounded-full border border-current/25">
                  <SocialMark platform={platform} className="size-3.5" />
                </span>
              ))}
            </span>
          </div>
          {[
            { title: t("footerInformation"), links: [t("footerBrands"), t("footerBlog"), t("footerContact")] },
            { title: t("footerCustomer"), links: [t("footerAccount"), t("footerTrack"), t("footerWishlist")] },
            { title: t("footerPolicies"), links: [t("footerPrivacy"), t("footerReturns"), t("footerShipping")] },
          ].map((column) => (
            <div key={column.title}>
              <p className={cn("font-semibold", phone ? "text-[13px]" : "text-[15px]")}>{column.title}</p>
              {column.links.map((link) => (
                <p key={link} className="mt-3 text-[13px] opacity-75">
                  {link}
                </p>
              ))}
            </div>
          ))}
        </div>
        <p className={cn("border-t border-current/15 text-[12px] opacity-60", phone ? "mt-8 pt-5" : "mt-12 pt-6")}>
          © {digits(String(year))} {name}. {t("rights")}
        </p>
      </footer>
    </div>
  );
}
