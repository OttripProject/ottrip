export type CityKoMap = Record<string, Record<string, string>>;

export const CITY_KO_MAP: CityKoMap = {
  KR: { Seoul:'서울', Busan:'부산', Incheon:'인천', Daegu:'대구', Daejeon:'대전', Gwangju:'광주', Ulsan:'울산', Suwon:'수원', Seogwipo:'서귀포', Jeju:'제주', Chuncheon:'춘천', Goyang:'고양', Yongin:'용인', Changwon:'창원', Cheongju:'청주', Pohang:'포항', Jeonju:'전주', Cheonan:'천안', Gimhae:'김해', Pyeongtaek:'평택', Ansan:'안산', Anyang:'안양', Gumi:'구미', Iksan:'익산', Hwaseong:'화성', Namyangju:'남양주', Bucheon:'부천', Gimpo:'김포', Uijeongbu:'의정부', Wonju:'원주', Seongnam:'성남', Gwangmyeong:'광명', GwangjuSi:'광주시', Siheung:'시흥', Gangneung:'강릉', Mokpo:'목포', Gunsan:'군산', Yeosu:'여수', Suncheon:'순천', Andong:'안동', Sokcho:'속초', Yangsan:'양산', Asan:'아산', Paju:'파주', Guri:'구리', Osan:'오산', Geoje:'거제', Jinju:'진주', Tongyeong:'통영', Sacheon:'사천', Milyang:'밀양', Gimcheon:'김천', Yeongju:'영주', Samcheok:'삼척', Donghae:'동해', Uiwang:'의왕', Gwacheon:'과천', Naju:'나주', Gwangyang:'광양', Boryeong:'보령', Seosan:'서산', Dangjin:'당진', Taean:'태안', Hongseong:'홍성', Jecheon:'제천', Chungju:'충주', Goesan:'괴산', Boeun:'보은', Cheorwon:'철원', Yanggu:'양구', SokchoSi:'속초시', Dongducheon:'동두천', Yangpyeong:'양평', Gapyeong:'가평', Icheon:'이천', Yeoju:'여주', Pocheon:'포천', Yeoncheon:'연천', Hwacheon:'화천', Inje:'인제', Namhae:'남해', GeojeSi:'거제시', Goseong:'고성', TongyeongSi:'통영시', GimhaeSi:'김해시', UlsanSi:'울산시', ChangwonSi:'창원시', SacheonSi:'사천시', MiryangSi:'밀양시', BusanJunggu:'부산중구', BusanHaeundae:'해운대', BusanSaha:'사하', DaeguDong:'대구동구', DaeguDalseo:'달서', DaeguJung:'대구중구', DaejeonYuseong:'유성', DaejeonJung:'대전중구', GwangjuBukgu:'광주북구', GwangjuNamgu:'광주남구', SuwonYeongtong:'영통', SuwonPaldal:'팔달', SuwonJangan:'장안', SeongnamBundang:'분당', SeongnamSujeong:'수정', IncheonBupyeong:'부평', IncheonNamdong:'남동', IncheonSeo:'서구', IncheonJung:'중구', UijeongbuSi:'의정부시', GuriSi:'구리시', Hanam:'하남', NamyangjuSi:'남양주시', HwaseongSi:'화성시', OsanSi:'오산시', PyeongtaekSi:'평택시', SiheungSi:'시흥시', GwangmyeongSi:'광명시', BucheonSi:'부천시', GimpoSi:'김포시', AnsanDanwon:'안산단원', AnsanSangnok:'안산상록', AnyangDongan:'동안', AnyangManan:'만안', YonginSuji:'용인수지', YonginGiheung:'용인기흥', YonginCheoin:'용인처인', GoyangIlsandong:'일산동구', GoyangIlsanseo:'일산서구', GoyangDeogyang:'덕양', PajuSi:'파주시', DongducheonSi:'동두천시', Yangju:'양주', GoyangSi:'고양시', GimcheonSi:'김천시', GumiSi:'구미시', PohangNamgu:'남구', PohangBukgu:'북구', JeonjuWansan:'완산', JeonjuDeokjin:'덕진', JecheonSi:'제천시', ChungjuSi:'충주시', CheongjuHeungdeok:'흥덕', CheongjuSangdang:'상당', AsanSi:'아산시', CheonanSeobuk:'서북', CheonanDongnam:'동남', SeosanSi:'서산시', DangjinSi:'당진시', BoryeongSi:'보령시', TaeanGun:'태안군', HongseongGun:'홍성군', GoesanGun:'괴산군', BoeunGun:'보은군', NajuSi:'나주시', YeosuSi:'여수시', SuncheonSi:'순천시', MokpoSi:'목포시', GunsanSi:'군산시', GwangyangSi:'광양시', SamcheokSi:'삼척시', DonghaeSi:'동해시', SokchoSi:'속초시', GangneungSi:'강릉시', WonjuSi:'원주시', ChuncheonSi:'춘천시', AndongSi:'안동시', YeongjuSi:'영주시', TongyeongSi2:'통영시2', JinjuSi:'진주시', SacheonSi2:'사천시2', GeojeSi2:'거제시2', YangsanSi:'양산시', GimhaeSi2:'김해시2', UlsanNamgu:'남구', UlsanBukgu:'북구', UlsanJunggu:'중구', BusanSuyeong:'수영', BusanNamgu:'남구', BusanDongrae:'동래', SeoulGangnam:'강남', SeoulSongpa:'송파', SeoulGangdong:'강동', SeoulSeocho:'서초', SeoulYongsan:'용산', SeoulMapo:'마포', SeoulSeodaemun:'서대문', SeoulJongno:'종로', SeoulGangseo:'강서', SeoulYeongdeungpo:'영등포', SeoulGuro:'구로', SeoulNowon:'노원', SeoulJungnang:'중랑', SeoulDobong:'도봉', SeoulEunpyeong:'은평', SeoulDongdaemun:'동대문', SeoulSeongdong:'성동', SeoulGwangjin:'광진', SeoulYangcheon:'양천' },
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


