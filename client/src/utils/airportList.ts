// @ts-ignore - aircodes 패키지에 타입 정의가 없음
import aircodes from 'aircodes';

export type AirportOption = { 
  label: string;
  value: string; 
};


const MAJOR_AIRPORTS = [
  // 한국
  'ICN', 'GMP', 'CJU', 'PUS', 'TAE', 'KUV', 'USN', 'WJU',
  // 일본
  'NRT', 'HND', 'KIX', 'ITM', 'NGO', 'FUK', 'CTS', 'OKA', 'KOJ', 'KMJ', 'HIJ', 'KMQ', 'TOY', 'NGS', 'AOJ', 'SDJ',
  // 중국
  'PEK', 'PVG', 'SHA', 'CAN', 'SZX', 'CTU', 'XIY', 'HKG', 'MFM', 'TPE', 'DLC', 'HRB', 'CSX', 'XMN', 'TAO', 'WUH', 'NKG', 'KMG', 'URC', 'TSN',
  // 동남아시아
  'SIN', 'BKK', 'DMK', 'KUL', 'CGK', 'DPS', 'MNL', 'HKT', 'HAN', 'SGN', 'PEN', 'MDL', 'BKI', 'CMB', 'JKT', 'CEB', 'DVO', 'BWN',
  // 미국
  'JFK', 'LAX', 'SFO', 'ORD', 'SEA', 'MIA', 'BOS', 'IAH', 'DFW', 'ATL', 'LAS', 'DTW', 'PHX', 'CLT', 'MSP', 'BWI', 'SLC', 'DCA', 'SAN', 'IAD', 'TPA',
  // 유럽
  'LHR', 'CDG', 'AMS', 'FRA', 'MUC', 'BCN', 'ROM', 'VIE', 'ZRH', 'DUB', 'CPH', 'ATH', 'PRG', 'MAD', 'OSL', 'STO', 'HEL', 'BRU', 'WAW', 'IST', 'GVA', 'LIS', 'MAN', 'EDI',
  // 오세아니아
  'SYD', 'MEL', 'BNE', 'AKL', 'ADL', 'PER', 'OOL', 'CNS', 'HBA',
  // 중동
  'DXB', 'AUH', 'DOH', 'JED', 'RUH', 'BAH', 'KWI', 'AMM', 'DAM', 'BEY',
  // 인도
  'DEL', 'BOM', 'BLR', 'MAA', 'CCU', 'HYD', 'AMD', 'GOI',
  // 러시아
  'SVO', 'LED', 'KRR', 'AER', 'OVB',
  // 중앙아시아
  'ALA', 'FRU', 'TAS',
];


export function getAirportOptions(): AirportOption[] {
  const options: AirportOption[] = [];
  const seen = new Set<string>();
  
  for (const code of MAJOR_AIRPORTS) {
    try {
      const airport = aircodes.getAirportByIata(code);
      if (airport && airport.iata && !seen.has(airport.iata)) {
        seen.add(airport.iata);
        options.push({
          label: airport.iata,
          value: airport.iata,
        });
      }
    } catch (e) {
      console.warn(`Airport not found: ${code}`);
    }
  }
  
  return options.sort((a, b) => a.value.localeCompare(b.value));
}

export function getAirportName(code: string): string | undefined {
  try {
    const airport = aircodes.getAirportByIata(code);
    return airport?.name;
  } catch (e) {
    return undefined;
  }
}


export function getAirportLabel(code: string): string | undefined {
  try {
    const airport = aircodes.getAirportByIata(code);
    if (airport && airport.iata && airport.name) {
      return `${airport.iata} - ${airport.name}`;
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}
