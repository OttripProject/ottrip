// @ts-ignore - aircodes 패키지에 타입 정의가 없음
import aircodes from 'aircodes';

export type AirportOption = { 
  label: string;
  value: string;
  searchKeyword?: string; // 검색용 키워드 (IATA + 도시명)
};

/**
 * 한글 도시명 매핑
 */
const KOREAN_CITIES: Record<string, string> = {
  // 한국
  'ICN': '인천', 'GMP': '서울', 'CJU': '제주', 'PUS': '부산', 'TAE': '대구', 'KUV': '군산', 'USN': '울산', 'WJU': '원주',
  // 일본
  'NRT': '도쿄', 'HND': '도쿄', 'KIX': '오사카', 'ITM': '오사카', 'NGO': '나고야', 'FUK': '후쿠오카', 'CTS': '삿포로', 'OKA': '오키나와',
  'KOJ': '가고시마', 'KMJ': '구마모토', 'HIJ': '히로시마', 'KMQ': '고마쓰', 'TOY': '도야마', 'NGS': '나가사키', 'AOJ': '아오모리', 'SDJ': '센다이',
  // 중국
  'PEK': '베이징', 'PVG': '상하이', 'SHA': '상하이', 'CAN': '광저우', 'SZX': '선전', 'CTU': '청두', 'XIY': '시안', 'HKG': '홍콩',
  'MFM': '마카오', 'TPE': '타이완', 'DLC': '다롄', 'HRB': '하얼빈', 'CSX': '장사', 'XMN': '샤먼', 'TAO': '청도', 'WUH': '우한', 'NKG': '난징', 'KMG': '쿤밍', 'URC': '우루무치', 'TSN': '톈진',
  // 동남아시아
  'SIN': '싱가포르', 'BKK': '방콕', 'DMK': '방콕', 'KUL': '쿠알라룸푸르', 'CGK': '자카르타', 'DPS': '발리', 'MNL': '마닐라', 'HKT': '푸켓',
  'HAN': '하노이', 'SGN': '호치민', 'PEN': '페낭', 'MDL': '만달레이', 'BKI': '코타키나발루', 'CMB': '콜롬보', 'JKT': '자카르타', 'CEB': '세부', 'DVO': '다바오', 'BWN': '반다르스리브가완',
  // 미국
  'JFK': '뉴욕', 'LAX': '로스앤젤레스', 'SFO': '샌프란시스코', 'ORD': '시카고', 'SEA': '시애틀', 'MIA': '마이애미', 'BOS': '보스턴', 'IAH': '휴스턴',
  'DFW': '댈러스', 'ATL': '애틀랜타', 'LAS': '라스베이거스', 'DTW': '디트로이트', 'PHX': '피닉스', 'CLT': '샬럿', 'MSP': '미니애폴리스', 'BWI': '볼티모어', 'SLC': '솔트레이크시티', 'DCA': '워싱턴', 'SAN': '샌디에이고', 'IAD': '워싱턴', 'TPA': '탬파',
  // 유럽
  'LHR': '런던', 'CDG': '파리', 'AMS': '암스테르담', 'FRA': '프랑크푸르트', 'MUC': '뮌헨', 'BCN': '바르셀로나', 'ROM': '로마', 'VIE': '비엔나',
  'ZRH': '취리히', 'DUB': '더블린', 'CPH': '코펜하겐', 'ATH': '아테네', 'PRG': '프라하', 'MAD': '마드리드', 'OSL': '오슬로', 'STO': '스톡홀름', 'HEL': '헬싱키', 'BRU': '브뤼셀', 'WAW': '바르샤바', 'IST': '이스탄불', 'GVA': '제네바', 'LIS': '리스본', 'MAN': '맨체스터', 'EDI': '에든버러',
  // 오세아니아
  'SYD': '시드니', 'MEL': '멜버른', 'BNE': '브리즈번', 'AKL': '오클랜드', 'ADL': '아델레이드', 'PER': '퍼스', 'OOL': '골드코스트', 'CNS': '케언스', 'HBA': '호바트',
  // 중동
  'DXB': '두바이', 'AUH': '아부다비', 'DOH': '도하', 'JED': '제다', 'RUH': '리야드', 'BAH': '바레인', 'KWI': '쿠웨이트', 'AMM': '암만', 'DAM': '다마스쿠스', 'BEY': '베이루트',
  // 인도
  'DEL': '델리', 'BOM': '뭄바이', 'BLR': '방갈로르', 'MAA': '체나이', 'CCU': '콜카타', 'HYD': '하이데라바드', 'AMD': '아마다바드', 'GOI': '고아',
  // 러시아
  'SVO': '모스크바', 'LED': '상트페테르부르크', 'KRR': '크라스노다르', 'AER': '소치', 'OVB': '노보시비르스크',
  // 중앙아시아
  'ALA': '알마티', 'FRU': '비슈케크', 'TAS': '타슈켄트',
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


/**
 * 전체 공항 목록 반환 (약 9,000개)
 * DropDownPicker의 내장 검색 기능이 자동으로 필터링
 */
export function getAllAirportOptions(): AirportOption[] {
  const options: AirportOption[] = [];
  const seen = new Set<string>();
  
  const airports = require('aircodes/data/airports.json');
  
  for (const code in airports) {
    const airport = airports[code];
    if (airport && airport.iata && !seen.has(airport.iata)) {
      const iata = airport.iata.toUpperCase();
      seen.add(iata);
      
      const koreanCity = KOREAN_CITIES[iata] || '';
      const city = airport.city || '';
      
      // IATA + 한글 도시명을 label로 설정 (검색을 위해 영어 도시명도 포함)
      // DropDownPicker는 label만 검색하므로, 검색 가능한 모든 정보를 label에 포함
      const koreanCityLabel = koreanCity ? `${iata} (${koreanCity})` : iata;
      const fullLabel = `${koreanCityLabel}`;
      
      options.push({
        label: fullLabel,
        value: iata,
      });
    }
  }
  
  return options.sort((a, b) => a.value.localeCompare(b.value));
}

/**
 * 주요 공항 목록만 반환 (초기 로딩 최적화)
 */
export function getAirportOptions(): AirportOption[] {
  const options: AirportOption[] = [];
  const seen = new Set<string>();
  
  for (const code of MAJOR_AIRPORTS) {
    try {
      const airport = aircodes.getAirportByIata(code);
      if (airport && airport.iata && !seen.has(airport.iata)) {
        seen.add(airport.iata);
        
        const koreanCity = KOREAN_CITIES[code] || '';
        const city = airport.city || '';
        
        const koreanCityLabel = koreanCity ? `${airport.iata} (${koreanCity})` : airport.iata;
        const fullLabel = city ? `${koreanCityLabel} ${city}` : koreanCityLabel;
        
        options.push({
          label: fullLabel,
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
