// @ts-ignore
import aircodes from "aircodes";
import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import ko from "i18n-iso-countries/langs/ko.json";
import { koreanNameToIso2 } from "./countryListKo";

countries.registerLocale(ko as any);
countries.registerLocale(en as any);

export type AirportData = {
  iata: string;
  name: string;
  nameKorean: string;
  countryKorean: string;
  searchKeyword: string;
};

export type AirportOption = {
  label: string;
  value: string;
  searchKeyword?: string;
};

let cachedAirportsData: Record<string, AirportData> | null = null;

function loadKoreanAirportsData(): Record<string, AirportData> {
  if (cachedAirportsData) {
    return cachedAirportsData;
  }

  try {
    cachedAirportsData = require("../data/airports.json");
    return cachedAirportsData || {};
  } catch (_error) {
    return {};
  }
}

export function getAirportOptionsBySearch(searchQuery = ""): AirportOption[] {
  const query = searchQuery.trim().toLowerCase();

  if (!query || query.length < 1) {
    return [];
  }

  const airportsData = loadKoreanAirportsData();
  if (!airportsData) {
    return [];
  }

  const matched: AirportOption[] = [];

  for (const iata in airportsData) {
    const airport = airportsData[iata];
    if (!airport || !airport.searchKeyword) {
      continue;
    }

    if (airport.searchKeyword.toLowerCase().includes(query)) {
      const label = `${airport.nameKorean} (${airport.iata})`;

      matched.push({
        label,
        value: airport.iata,
        searchKeyword: airport.searchKeyword,
      });
    }
  }
  return matched.sort((a, b) => a.value.localeCompare(b.value));
}

export function getAirportByIata(iata: string): AirportData | null {
  const airportsData = loadKoreanAirportsData();
  if (!airportsData) {
    return null;
  }
  return airportsData[iata.toUpperCase()] || null;
}

export function getAirportLabelByIata(iata: string): string | null {
  const airport = getAirportByIata(iata);
  if (!airport) {
    return null;
  }
  return `${airport.nameKorean} (${airport.iata})`;
}

export function getCountryIso2ByIata(iata: string): string | null {
  const airport = getAirportByIata(iata);
  if (airport?.countryKorean) {
    const iso2 = koreanNameToIso2(airport.countryKorean);
    if (iso2) return iso2;
  }
  try {
    const acData = aircodes.getAirportByIata(iata);
    if (acData?.country) {
      return countries.getAlpha2Code(acData.country, "en") ?? null;
    }
  } catch (_e) {}
  return null;
}

export function getAirportName(code: string): string | undefined {
  try {
    const airport = aircodes.getAirportByIata(code);
    return airport?.name;
  } catch (_e) {
    return undefined;
  }
}

export function getAirportLabel(code: string): string | undefined {
  const koreanLabel = getAirportLabelByIata(code);
  if (koreanLabel) {
    return koreanLabel;
  }

  try {
    const airport = aircodes.getAirportByIata(code);
    if (airport && airport.iata && airport.name) {
      return `${airport.iata} - ${airport.name}`;
    }
    return undefined;
  } catch (_e) {
    return undefined;
  }
}
