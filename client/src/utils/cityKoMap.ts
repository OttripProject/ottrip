export type CityKoMap = Record<string, Record<string, string>>;

export const CITY_KO_MAP: CityKoMap = {
  KR: { Seoul:'서울', Busan:'부산', Incheon:'인천', Daegu:'대구', Daejeon:'대전', Gwangju:'광주', Ulsan:'울산', Suwon:'수원', Seogwipo:'서귀포', Jeju:'제주', Chuncheon:'춘천', Goyang:'고양', Yongin:'용인', Changwon:'창원', Cheongju:'청주', Pohang:'포항', Jeonju:'전주', Cheonan:'천안', Gimhae:'김해', Pyeongtaek:'평택', 'Ansan-si':'안산', Anyang:'안양', Gumi:'구미', Iksan:'익산', Hwaseong:'화성', Namyangju:'남양주', Gwangmyeong:'광명', Siheung:'시흥', Gimpo:'김포', Uijeongbu:'의정부', GwangjuGyeonggi:'광주(경기)', Wonju:'원주', Mokpo:'목포', Gunsan:'군산', Suncheon:'순천', Yeosu:'여수', Gangneung:'강릉', 'Andong-si':'안동', Sokcho:'속초', Samcheok:'삼척', Tongyeong:'통영', Geoje:'거제', Jinju:'진주', Gyeongsan:'경산', Gyeongju:'경주', Yangsan:'양산', Gimcheon:'김천', Jecheon:'제천', Chungju:'충주', Seosan:'서산', Dangjin:'당진', Asan:'아산', Nonsan:'논산', Boryeong:'보령', Hongseong:'홍성', Jeongeup:'정읍', Namwon:'남원', Gochang:'고창', Haenam:'해남', Ganghwa:'강화', Paju:'파주', Dongducheon:'동두천', Yangju:'양주', Guri:'구리', Hanam:'하남', Osan:'오산', Gwacheon:'과천', Bucheon:'부천', Gwangyang:'광양', Icheon:'이천', Yeoju:'여주', Pocheon:'포천', Gapyeong:'가평', Hongcheon:'홍천', Taebaek:'태백', Jeongseon:'정선', Cheorwon:'철원', Mungyeong:'문경', Sangju:'상주', Yeongju:'영주', Yeongcheon:'영천', Gimje:'김제', Jangheung:'장흥', Boseong:'보성', Goheung:'고흥', Wando:'완도', Naju:'나주', Hampyeong:'함평', Yeonggwang:'영광', Gochanggun:'고창군', Uiryeong:'의령', Haman:'함안', Changnyeong:'창녕', Miryang:'밀양', Hwasun:'화순', Gurye:'구례', Yangyang:'양양', Inje:'인제', Hoengseong:'횡성', Uljin:'울진', Yeongdeok:'영덕', Ulleung:'울릉', Buan:'부안' },
  JP: { Tokyo:'도쿄', Osaka:'오사카', Nagoya:'나고야', Sapporo:'삿포로', Fukuoka:'후쿠오카', Kawasaki:'가와사키', Saitama:'사이타마', Hiroshima:'히로시마', Sendai:'센다이', Kitakyushu:'기타큐슈', Chiba:'치바', Sakai:'사카이', Niigata:'니가타', Hamamatsu:'하마마쓰', Kumamoto:'구마모토', Shizuoka:'시즈오카', Okayama:'오카야마', Kagoshima:'가고시마', Funabashi:'후나바시', Hachioji:'하치오지', Matsuyama:'마쓰야마', Oita:'오이타', Kanazawa:'가나자와', Takamatsu:'다카마츠', Naha:'나하', Toyama:'도야마', Utsunomiya:'우쓰노미야', Matsumoto:'마쓰모토', Yokosuka:'요코스카'},
  US: {
    Newyork: '뉴욕',
    Losangeles: '로스앤젤레스',
    Chicago: '시카고',
    Seattle: '시애틀',
    Miami: '마이애미',
    Boston: '보스턴',
    Houston: '휴스턴',
    Dallas: '댈러스',
    Sanfrancisco: '샌프란시스코',
    Lasvegas: '라스베이거스',
  },
  GB: {
    London: '런던',
    Manchester: '맨체스터',
    Liverpool: '리버풀',
    Edinburgh: '에든버러',
    Glasgow: '글래스고',
  },
  FR: {
    Paris: '파리',
    Lyon: '리옹',
    Marseille: '마르세유',
    Nice: '니스',
    Bordeaux: '보르도',
  },
  DE: {
    Berlin: '베를린',
    Munich: '뮌헨',
    Frankfurt: '프랑크푸르트',
    Hamburg: '함부르크',
    Cologne: '쾰른',
  },
  IT: {
    Rome: '로마',
    Milan: '밀라노',
    Venice: '베네치아',
    Florence: '피렌체',
    Naples: '나폴리',
  },
  ES: {
    Madrid: '마드리드',
    Barcelona: '바르셀로나',
    Valencia: '발렌시아',
    Seville: '세비야',
    Malaga: '말라가',
  },
  CN: {
    Beijing: '베이징',
    Shanghai: '상하이',
    Guangzhou: '광저우',
    Shenzhen: '선전',
    Chengdu: '청두',
    Xian: '시안',
  },
  HK: {
    Hongkong: '홍콩',
  },
  AU: {
    Sydney: '시드니',
    Melbourne: '멜버른',
    Brisbane: '브리즈번',
    Perth: '퍼스',
    Adelaide: '애들레이드',
  },
  SG: {
    Singapore: '싱가포르',
  },
  TH: {
    Bangkok: '방콕',
    Phuket: '푸켓',
    ChiangMai: '치앙마이',
  },
  VN: {
    Hanoi: '하노이',
    Hociminhcity: '호치민',
    Danang: '다낭',
    NhaTrang: '나트랑',
  },
};

function normalizeKey(name: string): string {
  return name.trim().toLowerCase();
}

export function toKoreanCityLabel(countryIso2: string | null | undefined, englishName: string | null | undefined): string {
  if (!countryIso2 || !englishName) return englishName || '';
  const countryMap = CITY_KO_MAP[countryIso2.toUpperCase()];
  if (!countryMap) return englishName;

  if (countryMap[englishName]) return countryMap[englishName];

  const target = normalizeKey(englishName);
  for (const [en, ko] of Object.entries(countryMap)) {
    if (normalizeKey(en) === target) return ko;
  }
  return englishName;
}

export function mapCityOptionsToKorean(countryIso2: string | null | undefined, options: { label: string; value: string }[]): { label: string; value: string }[] {
  return options.map(opt => ({ label: toKoreanCityLabel(countryIso2, opt.label), value: opt.value }));
}


