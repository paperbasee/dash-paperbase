/**
 * Bangladesh's 64 districts, as the API lists them (`GET admin/districts/`,
 * engine/apps/orders/districts.py) -- the one list behind the shop's checkout
 * and these order forms. An order saves the district's English name, the one
 * couriers read, whatever language the list is shown in.
 */
export type District = { key: string; name: string; name_bn: string; aliases: string[] };

export type DistrictDivision = {
  key: string;
  name: string;
  name_bn: string;
  districts: District[];
};

function fold(text: string): string {
  return text.normalize("NFC").trim().toLowerCase();
}

function spellings(district: District): string[] {
  return [district.name, district.name_bn, ...district.aliases];
}

/** Whether a search finds this district: by its English or Bangla name, or an old spelling. */
export function districtMatches(district: District, query: string): boolean {
  const wanted = fold(query);
  return !wanted || spellings(district).some((spelling) => fold(spelling).includes(wanted));
}

/** The listed district a saved value names under any of its spellings; null for words not on the list. */
export function findDistrict(divisions: DistrictDivision[], text: string): District | null {
  const wanted = fold(text);
  if (!wanted) return null;
  for (const division of divisions) {
    const found = division.districts.find((d) => spellings(d).some((s) => fold(s) === wanted));
    if (found) return found;
  }
  return null;
}

/** A district's or a division's name in the dashboard's language. */
export function districtLabel(place: { name: string; name_bn: string }, locale: string): string {
  return locale === "bn" ? place.name_bn : place.name;
}
