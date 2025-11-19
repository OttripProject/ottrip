export const PLACEHOLDERS = {
  plan: {
    name: '여행 이름',
    memo: '메모',
    email: 'ottrip@ottrip.kr',
    share_expires_days: '7',
  },
  flight: {
    reservationNumber: 'F8SKRQ',
    passengerName: '김오티',
    ticketNumber: '항공권 번호를 입력하세요.',
    bookingReference: '예약번호를 입력하세요.',
    airline: 'KE',
    flightNumber: 'KE123',
    departureAirport: 'ICN',
    arrivalAirport: 'NRT',
  },
  accommodation: {
    name: '숙소 이름',
    city: '도시',
    place: '장소',
    description: '내용',
  },
  itinerary: {
    title: '일정 제목',
    description: '일정 내용',
    city: '도시',
    location: '장소',
    titleForm: '제목을 입력하세요.',
    descriptionForm: '일정 내용을 입력하세요.',
    countryForm: '국가 선택',
    cityForm: '서울',
    locationForm: '장소를 입력하세요.',
  },
  expense: {
    category: '카테고리',
    amount: '0',
    currency: 'KRW',
    description: '설명',
    descriptionForm: '지출 설명을 입력하세요.',
  },
  profile: {
    nickname: '닉네임을 입력해주세요.',
    email: '이메일',
  },
  picker: {
    country: '국가 선택',
    search: '검색',
    category: '카테고리 선택',
    time: '00:00'
  },
} as const;

export type PlaceholderDomain = keyof typeof PLACEHOLDERS;


