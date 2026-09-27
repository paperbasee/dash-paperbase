import { toLocaleDigits } from "@/lib/locale-digits";

/**
 * Numbers, money and days as the analytics page writes them: grouped, whole
 * taka, and in Bangla digits and month names on a Bangla dashboard.
 */
export type Format = ReturnType<typeof makeFormat>;

function utcDate(ymd: string): Date {
  return new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)));
}

export function makeFormat(locale: string, currencySymbol: string) {
  const bn = locale === "bn";
  const tag = bn ? "bn-BD" : "en-GB";
  const digits = (text: string) => toLocaleDigits(text, locale);
  const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const tenths = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
  const short = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
  const dayMonth = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", timeZone: "UTC" });
  const weekdayDayMonth = new Intl.DateTimeFormat(tag, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const dayMonthYear = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const monthOnly = new Intl.DateTimeFormat(tag, { month: "short", timeZone: "UTC" });
  const hourOnly = new Intl.DateTimeFormat(tag, { hour: "numeric", hour12: true, timeZone: "Asia/Dhaka" });

  return {
    count: (n: number) => digits(whole.format(n)),
    decimal: (n: number) => digits(tenths.format(n)),
    money: (value: string | number | null) => `${currencySymbol}${digits(whole.format(Math.round(Number(value) || 0)))}`,
    percent: (value: number) => `${digits(tenths.format(value))}%`,
    /** "12K", for a chart's axis. */
    compact: (n: number) => digits(short.format(n)),
    /** "৳60K", for a chart's axis. */
    moneyCompact: (n: number) => `${currencySymbol}${digits(short.format(n))}`,
    /** "21 Sep" */
    day: (ymd: string) => dayMonth.format(utcDate(ymd)),
    /** "Fri 26 Sep" */
    dayName: (ymd: string) => weekdayDayMonth.format(utcDate(ymd)),
    /** "21 – 27 Sep 2026", or one day on its own. */
    days: (start: string, end: string) =>
      start === end
        ? dayMonthYear.format(utcDate(start))
        : `${dayMonth.format(utcDate(start))} – ${dayMonthYear.format(utcDate(end))}`,
    /** "Sep" */
    month: (ymd: string) => monthOnly.format(utcDate(ymd)),
    /** "9 pm", in Dhaka time. */
    hour: (iso: string) => hourOnly.format(new Date(iso)),
    /** An hour of the day, 0-23, as a clock reads it: "9 pm". */
    hourOfDay: (hour: number) => hourOnly.format(new Date(Date.UTC(2026, 0, 1, hour - 6))),
    /** Minutes and seconds, with the units the caller's language uses. */
    duration: (seconds: number, units: { m: string; s: string }) => {
      const total = Math.round(seconds);
      const m = Math.floor(total / 60);
      const s = total % 60;
      return digits(m ? `${m}${units.m} ${s}${units.s}` : `${s}${units.s}`);
    },
    digits,
  };
}
