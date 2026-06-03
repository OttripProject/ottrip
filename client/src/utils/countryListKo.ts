import countries from "i18n-iso-countries";
import ko from "i18n-iso-countries/langs/ko.json";

countries.registerLocale(ko as any);

export type CountryOption = { label: string; value: string };

export function getKoreanCountryOptions(): CountryOption[] {
  const names = countries.getNames("ko", { select: "official" }) as Record<
    string,
    string
  >;
  return Object.entries(names)
    .map(([code, label]) => ({ label, value: code }))
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
