import dayjs from 'dayjs';

export function formatKoreanDate(date: dayjs.Dayjs | string): string {
  const dateObj = typeof date === 'string' ? dayjs(date) : date;
  const month = dateObj.month() + 1; 
  const day = dateObj.date();
  const weekdays = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const weekday = weekdays[dateObj.day()];
  
  return `${month}월 ${day}일 ${weekday}`;
}

export function getTodayKoreanDate(): string {
  return formatKoreanDate(dayjs());
}

export function getWeekCalendar(baseDate?: dayjs.Dayjs | string) {
  const today = dayjs();
  const base = baseDate ? (typeof baseDate === 'string' ? dayjs(baseDate) : baseDate) : today;
  
  const dayOfWeek = base.day(); 
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = base.add(mondayOffset, 'day');
  
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const week: Array<{ day: string; date: number; month: number; year: number; fullDate: dayjs.Dayjs; isToday: boolean }> = [];
  
  for (let i = 0; i < 7; i++) {
    const date = monday.add(i, 'day');
    const isToday = date.isSame(today, 'day');
    
    week.push({
      day: weekDays[date.day()],
      date: date.date(),
      month: date.month() + 1,
      year: date.year(),
      fullDate: date,
      isToday,
    });
  }
  
  return week;
}


export function formatDateRange(
  startDate: dayjs.Dayjs | string,
  endDate: dayjs.Dayjs | string,
  includeYear = false
): string {
  const start = typeof startDate === 'string' ? dayjs(startDate) : startDate;
  const end = typeof endDate === 'string' ? dayjs(endDate) : endDate;
  
  const startMonth = start.month() + 1;
  const startDay = start.date();
  const endMonth = end.month() + 1;
  const endDay = end.date();
  
  if (includeYear) {
    const startYear = start.year();
    const endYear = end.year();
    
    if (startYear === endYear && startMonth === endMonth) {
      return `${startYear}년 ${startMonth}월 ${startDay}일 - ${endDay}일`;
    } else if (startYear === endYear) {
      return `${startYear}년 ${startMonth}월 ${startDay}일 - ${endMonth}월 ${endDay}일`;
    } else {
      return `${startYear}년 ${startMonth}월 ${startDay}일 - ${endYear}년 ${endMonth}월 ${endDay}일`;
    }
  } else {
    if (startMonth === endMonth) {
      return `${startMonth}월 ${startDay}일 - ${endDay}일`;
    } else {
      return `${startMonth}월 ${startDay}일 - ${endMonth}월 ${endDay}일`;
    }
  }
}

export function formatTime(time: string): string {
  if (!time) return '00:00';
  return time.split(':').slice(0, 2).join(':');
}

export function convertUTCToLocalTime(utcDateTime: string): string {
  if (!utcDateTime) return '00:00';
  const localTime = dayjs(utcDateTime); // UTC → 로컬 시간 자동 변환
  return formatTime(localTime.format('HH:mm:ss'));
}

export function isNextDayLocal(startDateTime: string, endDateTime: string): boolean {
  if (!startDateTime || !endDateTime) return false;
  const start = dayjs(startDateTime);
  const end = dayjs(endDateTime);
  const startDate = start.format('YYYY-MM-DD');
  const endDate = end.format('YYYY-MM-DD');
  return startDate !== endDate;
}
