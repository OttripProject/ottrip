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
    ticketNumber: '1234567890',
    bookingReference: '1234-5678',
    airline: 'KE',
    flightNumber: 'KE123',
    departureAirport: 'ICN',
    arrivalAirport: 'NRT',
  },
  accommodation: {
    name: '숙소 이름',
    city: '도시',
    place: '장소',
    description: '설명',
  },
  itinerary: {
    title: '일정 제목',
    description: '일정 내용',
    city: '도시',
    location: '장소',
  },
  expense: {
    category: '카테고리',
    amount: '100,000',
    currency: 'KRW',
    description: '설명',
  },
  profile: {
    nickname: '닉네임을 입력해주세요.',
    email: '이메일',
  },
  picker: {
    country: '국가 선택',
    search: '검색',
    category: '카테고리 선택',
  },
} as const;

export type PlaceholderDomain = keyof typeof PLACEHOLDERS;


