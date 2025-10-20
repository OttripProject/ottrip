import { City } from 'country-state-city';

export type CityOption = { label: string; value: string };

const countryCodeToCitiesCache = new Map<string, CityOption[]>();

export function getCityOptionsByCountry(countryIso2: string | null | undefined): CityOption[] {
  if (!countryIso2) return [];
  const code = countryIso2.toUpperCase();

  const cached = countryCodeToCitiesCache.get(code);
  if (cached) return cached;

  const cities = City.getCitiesOfCountry(code) || [];
  const seen = new Set<string>();
  const options: CityOption[] = [];

  for (const c of cities) {
    const name = (c.name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    options.push({ label: name, value: name });
  }

  options.sort((a, b) => a.label.localeCompare(b.label));
  countryCodeToCitiesCache.set(code, options);
  return options;
}

export function clearCityOptionsCache(): void {
  countryCodeToCitiesCache.clear();
}


