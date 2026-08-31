import { getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";

/** The countries offered in the phone picker.
 *
 *  Not all 245. This is an Australian marketplace whose members verify against
 *  Australian ID, so the list is Australia first and then the places its
 *  members actually hold a second number — a picker nobody can scroll is worse
 *  than one that is honest about its scope. Adding a country is one line.
 */
export type Country = { code: CountryCode; name: string };

export const COUNTRIES: Country[] = [
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "IE", name: "Ireland" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "MY", name: "Malaysia" },
  { code: "PH", name: "Philippines" },
  { code: "ID", name: "Indonesia" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "IN", name: "India" },
  { code: "PK", name: "Pakistan" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "ZA", name: "South Africa" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "IT", name: "Italy" },
  { code: "BR", name: "Brazil" },
];

export const DEFAULT_COUNTRY: CountryCode = "AU";

export const dialCode = (c: CountryCode) => `+${getCountryCallingCode(c)}`;

/** The flag, built from the ISO code rather than stored.
 *
 *  Two regional indicator letters, which every platform renders as the flag.
 *  Cheaper than shipping 26 images and it cannot drift out of sync with the
 *  list above. */
export const flag = (c: string) =>
  c.toUpperCase().replace(/./g, (ch) => String.fromCodePoint(127397 + ch.charCodeAt(0)));

export const findCountry = (c: CountryCode) =>
  COUNTRIES.find((x) => x.code === c) ?? COUNTRIES[0];
