import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import ko from "i18n-iso-countries/langs/ko.json";

countries.registerLocale(ko as any);
countries.registerLocale(en as any);

export type CountryOption = {
  label: string;
  labelEn: string;
  value: string;
  flag: string;
};

export const codeToFlag = (alpha2: string): string =>
  alpha2
    .toUpperCase()
    .split("")
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");

export function getKoreanCountryOptions(): CountryOption[] {
  const koNames = countries.getNames("ko", { select: "official" }) as Record<
    string,
    string
  >;
  const enNames = countries.getNames("en", { select: "official" }) as Record<
    string,
    string
  >;
  return Object.entries(koNames)
    .map(([code, label]) => ({
      label,
      labelEn: enNames[code] ?? "",
      value: code,
      flag: codeToFlag(code),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));
}

export function codeToKoreanName(
  iso2Code: string | null | undefined,
): string | undefined {
  if (!iso2Code) return undefined;
  return (
    countries.getNames("ko", { select: "official" }) as Record<string, string>
  )[iso2Code.toUpperCase()];
}
