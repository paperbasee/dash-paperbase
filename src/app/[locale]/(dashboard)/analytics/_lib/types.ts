/**
 * What each section of the analytics page is sent (api-paperbase
 * analytics/sections.py). Money arrives as text, to the paisa; rates as
 * percentages.
 */
export type SectionKey =
  | "overview"
  | "sales"
  | "traffic"
  | "products"
  | "districts"
  | "delivery"
  | "customers"
  | "live";

/** How a card's change reads: of the previous value, a rate's move, or the difference itself. */
export type CardUnit = "percent" | "points" | "plain";

export type Card<T = number | string> = {
  value: T | null;
  previous: T | null;
  change: number | null;
  unit: CardUnit;
};

export type PeriodInfo = {
  preset: string;
  start_date: string;
  end_date: string;
  compare: "previous" | "year";
  compare_start_date: string;
  compare_end_date: string;
};

export type Report = { period: PeriodInfo; cached_at: number; cache_ttl_seconds: number };

/** A day (or an hour) of confirmed sales -- with its visitors on a plan that sees them. */
export type SalesPoint = { date: string; sales: string; orders: number; visitors?: number };
export type Series<P> = { data: P[]; comparison: P[] };

/** A day (or an hour) on a chart: these days' number, and the compared days' at the same place. */
export type ChartPoint = { date: string; current: number; previous: number | null; previousDate: string | null };

export type Stage = { orders: number; sales: string };

export type SourceRow = {
  source: string;
  visitors: number;
  paid_visitors: number;
  orders: number;
  sales: string;
  conversion: number;
};

export type CampaignRow = {
  campaign: string;
  source: string;
  channel: string;
  visitors: number;
  orders: number;
  sales: string;
  conversion: number;
};

export type LandingRow = { path: string; kind: string; name: string; visitors: number; engaged_rate: number; conversion: number };

export type DivisionRow = { key: string; name: string; name_bn: string; orders: number; sales: string; delivered_rate: number };

export type CategoryRow = { category: string; sales: string; share: number };

export type DistrictRow = {
  key: string;
  name: string;
  name_bn: string;
  division: string;
  orders: number;
  sales: string;
  parcels_finished: number;
  delivered_rate: number;
  returned_rate: number;
};

export type Parcels = {
  not_dispatched: number;
  in_transit: number;
  delivered: number;
  partial: number;
  returned: number;
  unknown: number;
};

export type ProductRow = {
  product_id: string;
  product_name: string;
  category: string;
  views: number;
  add_to_cart: number;
  purchases: number;
  units: number;
  returned: number;
  revenue: string;
  conversion_rate: number;
};

export type OverviewReport = Report & {
  cards: { sales: Card<string>; orders: Card<number>; visitors?: Card<number>; conversion?: Card<number> };
  steps: {
    placed: Stage;
    confirmed: Stage;
    delivered: Stage;
    not_confirmed: number;
    not_delivered: number;
  };
  series: Series<SalesPoint>;
  // Premium only.
  journey?: {
    visitors: number;
    viewed_product: number;
    added_to_cart: number;
    started_checkout: number;
    placed: number;
    confirmed: number;
  };
  /** Every source and district; the page lists the first few. */
  sources?: SourceRow[];
  campaigns?: CampaignRow[];
  landing?: LandingRow[];
  districts?: DistrictRow[];
  divisions?: DivisionRow[];
  parcels?: Parcels;
  best_sellers?: ProductRow[];
  categories?: CategoryRow[];
  /** What moved the numbers (api-paperbase analytics/story.py); a note with nothing to say is null. */
  notes: OverviewNotes;
};

type Place = { key: string; name: string; name_bn: string };

export type OverviewNotes = {
  top_source: { source: string; orders: number; sales: string } | null;
  best_day: { date: string; sales: string; was_date: string | null; was_sales: string | null } | null;
  places: { most: Place & { orders: number }; lowest: (Place & { delivered_rate: number }) | null } | null;
};

export type SalesReport = Report & {
  cards: {
    sales: Card<string>;
    average_order: Card<string>;
    items_per_order: Card<number>;
    discounts: Card<string>;
  };
  made_of: {
    full_price: string;
    discounts: string;
    discount_share: number;
    sales: string;
    delivery_charges: string;
  };
  series: Series<SalesPoint>;
  hours: number[];
  payments: { method: string; orders: number; share: number; sales: string }[];
  coupons: { code: string; kind: string; value: string | null; orders: number; sales: string; given: string }[];
};

export type TrafficReport = Report & {
  cards: {
    visitors: Card<number>;
    visits: Card<number>;
    engaged: Card<number>;
    time_on_shop: Card<number>;
  };
  series: Series<{ date: string; visitors: number }>;
  sources: SourceRow[];
  campaigns: CampaignRow[];
  landing: LandingRow[];
  devices: { device: string; visitors: number; share: number; conversion: number }[];
  visitor_mix: { new: number; returning: number };
  searches: { query: string; searches: number; results: number | null; bought: number }[];
};

export type ProductsReport = Report & {
  data: ProductRow[];
  categories: CategoryRow[];
  needs_a_look: {
    kind: "looked_not_bought" | "came_back" | "sold_out";
    product_id: string;
    product_name: string;
    views: number;
    units: number;
    returned: number;
    conversion_rate: number;
    returned_rate: number;
  }[];
};

export type DistrictsReport = Report & {
  divisions: DivisionRow[];
  districts: DistrictRow[];
  not_recognised: { orders: number; sales: string };
};

export type DeliveryReport = Report & {
  cards: {
    delivered: Card<number>;
    returned: Card<number>;
    days_to_deliver: Card<number>;
    not_sent: Card<number>;
  };
  parcels: Parcels;
  couriers: {
    courier: string;
    parcels: number;
    days_to_deliver: number | null;
    delivered_rate: number;
    returned_rate: number;
  }[];
  speed: { days: "0-1" | "2" | "3" | "4+"; share: number }[];
  most_returns: { key: string; name: string; name_bn: string; division: string; parcels: number; returned_rate: number }[];
};

export type CustomersReport = Report & {
  cards: { customers: Card<number>; came_back: Card<number> };
  new: { customers: number; per_order: string | null };
  returning: { customers: number; per_order: string | null };
  top: { name: string; phone: string; district: string; district_bn: string; spent: string; orders: number }[];
  cohorts: { month: string; customers: number; came_back: number[] }[];
};

export type LiveReport = {
  right_now: number;
  minutes: number[];
  pages: { path: string; kind: string; name: string; visitors: number }[];
  sources: { source: string; visitors: number }[];
  orders_last_hour: number;
  latest_orders: {
    order_number: string;
    placed_at: string;
    total: string;
    status: string;
    district: string;
    district_bn: string;
    source: string;
  }[];
  at: number;
};
