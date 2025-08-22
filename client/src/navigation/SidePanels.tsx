import React, { useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { List } from 'react-native-paper';
import DateRangePicker from '@/components/DateRangePicker';
import DateTimePicker from '@/components/DateTimePicker';
import dayjs from 'dayjs';
import { itinerariesApi } from '@/services/itineraries';
import { expensesApi } from '@/services/expenses';
import { accommodationsApi } from '@/services/accommodations';
import { flightsApi } from '@/services/flights';

interface SidePanelsProps {
  planData?: {
    plan: any;
    itineraries: any[];
    flights: any[];
    accommodations: any[];
    expenses: any[];
    isLoading: boolean;
    error: string | null;
    refreshItineraries: () => Promise<void>;
    refreshFlights: () => Promise<void>;
    refreshAccommodations: () => Promise<void>;
    refreshExpenses: () => Promise<void>;
  };
  selectedItinerary?: any;
  onItineraryAdd?: (itinerary: any) => void;
  onFlightAdd?: (flight: any) => void;
  onAccommodationAdd?: (accommodation: any) => void;
  onExpenseAdd?: (expense: any) => void;
}

interface Flight {
  id: string;
  airline: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  seat_class: string;
  seat_number: string;
  duration: string;
  memo: string;
}

interface Accommodation {
  id: string;
  name: string;
  address: string;
  start_date: string;
  end_date: string;
  memo: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  ex_date: string;
  currency: string;
}

enum ExpenseCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  FLIGHT = "flight",
  ACTIVITY = "activity",
  ACCOMMODATION = "accommodation",
  SHOPPING = "shopping",
  ETC = "etc",
}

enum ExpenseCurrency {
  KRW = "KRW",
  USD = "USD",
  EUR = "EUR",
  JPY = "JPY",
  CNY = "CNY",
  GBP = "GBP",
  AUD = "AUD",
}

function Placeholder({ label }: { label: string }) {
  return (
    <View style={{ padding: 16 }}>
      <Text>{label} – Coming soon…</Text>
    </View>
  );
}

export default function SidePanels({ planData, selectedItinerary, onItineraryAdd: externalOnItineraryAdd, onFlightAdd: externalOnFlightAdd, onAccommodationAdd: externalOnAccommodationAdd, onExpenseAdd: externalOnExpenseAdd }: SidePanelsProps) {
    const [open, setOpen] = useState<string | undefined>();
    const [showItineraryForm, setShowItineraryForm] = useState(false);
    const [showItineraryEditForm, setShowItineraryEditForm] = useState(false);
    const [showFlightForm, setShowFlightForm] = useState(false);
    const [editingFlight, setEditingFlight] = useState<any | null>(null);
    const [showAccommodationForm, setShowAccommodationForm] = useState(false);
    const [editingAccommodation, setEditingAccommodation] = useState<any | null>(null);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    
    // 선택된 일정이 있으면 수정 폼 열기
    useEffect(() => {
      if (selectedItinerary) {
        setShowItineraryEditForm(true);
        setEditingItinerary(selectedItinerary);
        // 폼 데이터를 선택된 일정으로 초기화
        setFormData({
          title: selectedItinerary.title,
          description: selectedItinerary.description || '',
          country: selectedItinerary.country || '',
          city: selectedItinerary.city || '',
          location: selectedItinerary.location || '',
          date: selectedItinerary.itineraryDate,
          startTime: (selectedItinerary.startTime || '').split(':').slice(0, 2).join(':'),
          endTime: (selectedItinerary.endTime || '').split(':').slice(0, 2).join(':'),
        });
      } else {
        // 선택 해제 시 편집 상태 초기화
        setEditingItinerary(null);
        setShowItineraryEditForm(false);
      }
    }, [selectedItinerary]);
    
    // planData가 있으면 사용, 없으면 로컬 상태 사용
    const itineraries = planData?.itineraries || [];
    const flights = planData?.flights || [];
    const accommodations = planData?.accommodations || [];
    const expenses = planData?.expenses || [];
    
    // 일정 폼 데이터
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      country: '',
      city: '',
      location: '',
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '10:00',
    });

    // 항공 폼 데이터
    const [flightFormData, setFlightFormData] = useState({
      airline: '',
      flight_number: '',
      departure_airport: '',
      arrival_airport: '',
      departure_time: `${dayjs().format('YYYY-MM-DD')} 00:00`,
      arrival_time: `${dayjs().format('YYYY-MM-DD')} 00:00`,
      seat_class: '',
      seat_number: '',
      duration: '',
      memo: '',
    });

    // 항공 비용 폼 데이터
    const [flightExpenseForm, setFlightExpenseForm] = useState({
      amount: '',
      currency: ExpenseCurrency.KRW as string,
      description: '',
    });
    const [showFlightCurrencyOptions, setShowFlightCurrencyOptions] = useState(false);

    // 숙박 폼 데이터
    const [accommodationFormData, setAccommodationFormData] = useState({
      name: '',
      address: '',
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      memo: '',
    });

    // 지출 폼 데이터
    const [expenseFormData, setExpenseFormData] = useState({
      category: ExpenseCategory.FOOD,
      amount: '',
      description: '',
      ex_date: dayjs().format('YYYY-MM-DD'),
      currency: ExpenseCurrency.KRW,
    });
    const [showExpenseEditForm, setShowExpenseEditForm] = useState(false);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    // 일정 로컬 편집 상태
    const [editingItinerary, setEditingItinerary] = useState<any | null>(null);
  // 일정 편집 화면 내 해당 일정의 지출 목록 상태
  const [itineraryExpenses, setItineraryExpenses] = useState<any[]>([]);
  // 일정 수정 폼 내 인라인 지출 추가 폼 표시 여부
  const [showItineraryInlineExpenseForm, setShowItineraryInlineExpenseForm] = useState(false);
  // 일정 수정 영역에서 지출 수정 중인지 여부 (날짜 UI 숨김에 사용)
  const [isEditingExpenseInItinerary, setIsEditingExpenseInItinerary] = useState(false);
    // 일정 전용 지출 폼 상태
    const [itineraryExpenseForm, setItineraryExpenseForm] = useState({
      category: ExpenseCategory.FOOD,
      amount: '',
      description: '',
      ex_date: dayjs().format('YYYY-MM-DD'),
      currency: ExpenseCurrency.KRW,
    });
  const [showInlineCurrencyOptions, setShowInlineCurrencyOptions] = useState(false);
  // 초안 타입 아래의 제네릭 선언을 사용할 것이므로 임시 any[] 선언 제거
  // 일정 폼 내 다건 지출 초안 목록
  type DraftExpense = {
    category: string;
    amount: string;
    description?: string;
    ex_date: string;
    currency: string;
  };
  const [itineraryDraftExpenses, setItineraryDraftExpenses] = useState<DraftExpense[]>([]);
  const [inlineCurrencyPickerIndex, setInlineCurrencyPickerIndex] = useState<number | null>(null);

  const handleToggle = (key: string) => {
    setOpen(prev => (prev === key ? undefined : key));
  };

  // 일정 저장 함수
    const handleSaveItinerary = async () => {
    if (!formData.title.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    if (!formData.date) {
      Alert.alert('오류', '날짜를 선택해주세요.');
      return;
    }

    // Plan이 선택되지 않은 경우
    if (!planData?.plan?.id) {
      Alert.alert('오류', '먼저 여행 계획을 선택해주세요.');
      return;
    }

    try {
      const itineraryData = {
        title: formData.title,
        description: formData.description,
        country: formData.country,
        city: formData.city,
        location: formData.location,
        itineraryDate: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        planId: planData.plan.id,
      };

      let newItinerary;
      const targetId = (editingItinerary as any)?.id; // 편집 모드일 때만 업데이트
      if (targetId) {
        newItinerary = await itinerariesApi.updateItinerary(Number(targetId), itineraryData);
        setShowItineraryEditForm(false);
        setEditingItinerary(null);
      } else {
        newItinerary = await itinerariesApi.createItinerary(itineraryData);
      }

      // 일정과 함께 지출(다건) 동시 생성
      const createdItineraryId = targetId ? Number(targetId) : (newItinerary as any)?.id;
      if (createdItineraryId && itineraryDraftExpenses.length > 0) {
        for (const d of itineraryDraftExpenses) {
          try {
            await expensesApi.createExpense({
              category: d.category as any,
              amount: Number(d.amount),
              description: d.description || undefined,
              exDate: d.ex_date,
              planId: planData.plan.id,
              currency: d.currency as any,
              itineraryId: createdItineraryId,
            } as any);
          } catch (e) {
            console.warn('Failed to create itinerary expense draft:', e);
          }
        }
      }

      externalOnItineraryAdd?.(newItinerary);
      
      if (planData?.refreshItineraries) {
        await planData.refreshItineraries();
      }
      
      setFormData({
        title: '',
        description: '',
        country: '',
        city: '',
        location: '',
        date: dayjs().format('YYYY-MM-DD'),
        startTime: '09:00',
        endTime: '10:00',
      });
      
      setItineraryDraftExpenses([]);
      setShowItineraryForm(false);
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.detail || '일정 저장 중 오류가 발생했습니다.');
    }
  };

  // 항공 저장 함수
  const handleSaveFlight = async () => {
    if (!flightFormData.airline.trim()) {
      Alert.alert('오류', '항공사를 입력해주세요.');
      return;
    }
    if (!flightFormData.flight_number.trim()) {
      Alert.alert('오류', '항공편 번호를 입력해주세요.');
      return;
    }
    if (!flightFormData.departure_airport.trim()) {
      Alert.alert('오류', '출발 공항을 입력해주세요.');
      return;
    }
    if (!flightFormData.arrival_airport.trim()) {
      Alert.alert('오류', '도착 공항을 입력해주세요.');
      return;
    }

    // Plan이 선택되지 않은 경우
    if (!planData?.plan?.id) {
      Alert.alert('오류', '먼저 여행 계획을 선택해주세요.');
      return;
    }

    try {
      const toIso = (dt: string) => {
        if (!dt) return dt;
        const [date, time] = dt.split(' ');
        const timeWithSeconds = (time && time.length === 5) ? `${time}:00` : time;
        return `${date}T${timeWithSeconds}Z`;
      };

      const payload = {
        airline: flightFormData.airline,
        flightNumber: flightFormData.flight_number,
        departureAirport: flightFormData.departure_airport,
        arrivalAirport: flightFormData.arrival_airport,
        departureTime: toIso(flightFormData.departure_time),
        arrivalTime: toIso(flightFormData.arrival_time),
        seatClass: flightFormData.seat_class || undefined,
        seatNumber: flightFormData.seat_number || undefined,
        duration: flightFormData.duration || undefined,
        memo: flightFormData.memo || undefined,
        planId: planData.plan.id,
        expense: {
          exDate: (flightFormData.departure_time || '').split(' ')[0],
          amount: Number(flightExpenseForm.amount || 0),
          category: ExpenseCategory.FLIGHT,
          currency: flightExpenseForm.currency as any,
          description: flightExpenseForm.description || undefined,
        },
      };

      const newFlight = await flightsApi.createFlight(payload as any);

      externalOnFlightAdd?.(newFlight);

      if (planData?.refreshFlights) await planData.refreshFlights();
      if (planData?.refreshExpenses) await planData.refreshExpenses();
    } catch (error: any) {
      Alert.alert('오류', error.response?.data?.detail || '항공편 저장 중 오류가 발생했습니다.');
      return;
    }
    
    setFlightFormData({
      airline: '',
      flight_number: '',
      departure_airport: '',
      arrival_airport: '',
      departure_time: `${dayjs().format('YYYY-MM-DD')} 00:00`,
      arrival_time: `${dayjs().format('YYYY-MM-DD')} 00:00`,
      seat_class: '',
      seat_number: '',
      duration: '',
      memo: '',
    });
    
    setShowFlightForm(false);
  };

  // 숙박 저장 함수
  const handleSaveAccommodation = async () => {
    if (!accommodationFormData.name.trim()) {
      Alert.alert('오류', '숙소 이름을 입력해주세요.');
      return;
    }
    if (!accommodationFormData.start_date) {
      Alert.alert('오류', '체크인 날짜를 선택해주세요.');
      return;
    }
    if (!accommodationFormData.end_date) {
      Alert.alert('오류', '체크아웃 날짜를 선택해주세요.');
      return;
    }

    // Plan이 선택되지 않은 경우
    if (!planData?.plan?.id) {
      Alert.alert('오류', '먼저 여행 계획을 선택해주세요.');
      return;
    }

    try {
      const payload = {
        name: accommodationFormData.name,
        address: accommodationFormData.address || undefined,
        startDate: accommodationFormData.start_date,
        endDate: accommodationFormData.end_date,
        memo: accommodationFormData.memo || undefined,
        planId: planData.plan.id,
        expense: {
          exDate: accommodationFormData.start_date,
          amount: Number(flightExpenseForm.amount || 0),
          category: ExpenseCategory.ACCOMMODATION as any,
          currency: flightExpenseForm.currency as any,
          description: flightExpenseForm.description || undefined,
        },
      };
      const newAcc = await accommodationsApi.createAccommodation(payload as any);
      externalOnAccommodationAdd?.(newAcc);
      if (planData?.refreshAccommodations) await planData.refreshAccommodations();
      if (planData?.refreshExpenses) await planData.refreshExpenses();
    } catch (err: any) {
      Alert.alert('오류', err.response?.data?.detail || '숙박 저장 중 오류가 발생했습니다.');
      return;
    }
    
    setAccommodationFormData({
      name: '',
      address: '',
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      memo: '',
    });
    
    setShowAccommodationForm(false);
  };

  // 지출 저장 함수
  const handleSaveExpense = async () => {
    if (!expenseFormData.amount.trim()) {
      Alert.alert('오류', '금액을 입력해주세요.');
      return;
    }
    if (isNaN(Number(expenseFormData.amount))) {
      Alert.alert('오류', '올바른 금액을 입력해주세요.');
      return;
    }
    if (!expenseFormData.ex_date) {
      Alert.alert('오류', '지출 날짜를 선택해주세요.');
      return;
    }

    // Plan이 선택되지 않은 경우
    if (!planData?.plan?.id) {
      Alert.alert('오류', '먼저 여행 계획을 선택해주세요.');
      return;
    }

    try {
      // 서버 API 요청 (camelCase 필드 전송)
      const basePayload = {
        category: expenseFormData.category as any,
        amount: Number(expenseFormData.amount),
        description: expenseFormData.description || undefined,
        exDate: expenseFormData.ex_date,
        planId: planData.plan.id,
        currency: expenseFormData.currency as any,
      } as any;

      // 일정 전용 지출 추가인 경우 itineraryId 포함 (selectedItinerary 우선, 없으면 editingItinerary)
      if (selectedItinerary?.id) {
        basePayload.itineraryId = selectedItinerary.id;
      } else if (showItineraryEditForm && (editingItinerary as any)?.id) {
        basePayload.itineraryId = (editingItinerary as any).id;
      }

      await expensesApi.createExpense(basePayload);

      // 성공 후 목록 리프레시
      if (planData?.refreshExpenses) {
        await planData.refreshExpenses();
      }
      // 일정 편집 중이면 해당 일정의 지출 목록도 갱신
      if (showItineraryEditForm && (editingItinerary as any)?.id) {
        await refreshItineraryExpenseList();
      }

      Alert.alert('성공', '지출이 추가되었습니다.');

      // 폼 초기화
      setExpenseFormData({
        category: ExpenseCategory.FOOD,
        amount: '',
        description: '',
        ex_date: dayjs().format('YYYY-MM-DD'),
        currency: ExpenseCurrency.KRW,
      });

      // 폼 닫기
      setShowExpenseForm(false);
    } catch (error: any) {
      console.error('❌ Failed to create expense:', error);
      Alert.alert('오류', error.response?.data?.detail || '지출 저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelForm = () => {
    setShowItineraryForm(false);
    setEditingItinerary(null);
    setFormData({
      title: '',
      description: '',
      country: '',
      city: '',
      location: '',
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '10:00',
    });
  };

  const handleCancelEditForm = () => {
    setShowItineraryEditForm(false);
    setEditingItinerary(null);
    setFormData({
      title: '',
      description: '',
      country: '',
      city: '',
      location: '',
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '10:00',
    });
  };

  // 일정 편집 화면에서 해당 일정의 지출 목록 로딩/갱신
  const refreshItineraryExpenseList = async () => {
    try {
      const id = (editingItinerary as any)?.id;
      if (!id) return;
      const list = await expensesApi.getExpensesByItinerary(Number(id));
      setItineraryExpenses(list as any);
    } catch (e) {
      // noop
    }
  };

  useEffect(() => {
    if (showItineraryEditForm && (editingItinerary as any)?.id) {
      void refreshItineraryExpenseList();
    } else {
      setItineraryExpenses([]);
    }
  }, [showItineraryEditForm, (editingItinerary as any)?.id]);

  // 지출 수정 폼이 닫힐 때, 일정 편집 중이라면 목록 새로고침
  useEffect(() => {
    if (!showExpenseEditForm && showItineraryEditForm && (editingItinerary as any)?.id) {
      void refreshItineraryExpenseList();
    }
  }, [showExpenseEditForm]);

  const handleDeleteItinerary = async () => {
    const targetId = (editingItinerary as any)?.id ?? (selectedItinerary as any)?.id;
    if (!targetId) {
      console.warn('No itinerary selected to delete');
      return;
    }

    try {
      await itinerariesApi.deleteItinerary(Number(targetId));
      if (planData?.refreshItineraries) await planData.refreshItineraries();
      if (planData?.refreshExpenses) await planData.refreshExpenses();
      setShowItineraryForm(false);
      setShowItineraryEditForm(false);
      setEditingItinerary(null);
    } catch (error: any) {
      console.error('❌ Failed to delete itinerary:', error);
    }
  };

  const handleCancelFlightForm = () => {
    setShowFlightForm(false);
  };

  const handleCancelAccommodationForm = () => {
    setShowAccommodationForm(false);
  };

  const handleCancelExpenseForm = () => {
    setShowExpenseForm(false);
  };

  // 지출 관련 유틸리티 함수들
  const getTotalExpense = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  const getCategoryExpenses = () => {
    const categoryMap = new Map<string, number>();
    
    expenses.forEach(expense => {
      const current = categoryMap.get(expense.category) || 0;
      categoryMap.set(expense.category, current + expense.amount);
    });
    
    return Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
    }));
  };

  const getCategoryName = (category: string) => {
    const categoryNames: { [key: string]: string } = {
      [ExpenseCategory.FOOD]: '식비',
      [ExpenseCategory.TRANSPORT]: '교통비',
      [ExpenseCategory.FLIGHT]: '항공료',
      [ExpenseCategory.ACTIVITY]: '액티비티',
      [ExpenseCategory.ACCOMMODATION]: '숙박비',
      [ExpenseCategory.SHOPPING]: '쇼핑',
      [ExpenseCategory.ETC]: '기타',
    };
    return categoryNames[category] || category;
  };

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'KRW') {
      return `₩${amount.toLocaleString()}`;
    } else if (currency === 'USD') {
      return `$${amount.toLocaleString()}`;
    } else if (currency === 'EUR') {
      return `€${amount.toLocaleString()}`;
    } else if (currency === 'JPY') {
      return `¥${amount.toLocaleString()}`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString()}`;
    } else if (currency === 'GBP') {
      return `£${amount.toLocaleString()}`;
    } else if (currency === 'AUD') {
      return `A${amount.toLocaleString()}`;
    }
    return `₩${amount.toLocaleString()}`;
  };

  const deleteExpense = async (expenseId: string | number) => {
    // 서버 삭제 후 목록 리프레시
    try {
      const idNum = Number(expenseId);
      if (!Number.isFinite(idNum)) {
        Alert.alert('오류', '잘못된 지출 ID 입니다.');
        return;
      }

      await expensesApi.deleteExpense(idNum);
      if (planData?.refreshExpenses) {
        await planData.refreshExpenses();
      }
      // 일정 편집 중이면 일정 지출 목록도 함께 업데이트
      if (showItineraryEditForm && (editingItinerary as any)?.id) {
        await refreshItineraryExpenseList();
      }
      Alert.alert('성공', '지출이 삭제되었습니다.');
    } catch (error: any) {
      console.error('❌ Failed to delete expense:', error);
      Alert.alert('오류', error.response?.data?.detail || '지출 삭제 중 오류가 발생했습니다.');
    }
  };

  const timeOptions = [
    '00:00',  '01:00',  '02:00',  '03:00',
    '04:00',  '05:00',  '06:00',  '07:00',
    '08:00',  '09:00',  '10:00',  '11:00',
    '12:00',  '13:00',  '14:00',  '15:00',
    '16:00',  '17:00',  '18:00',  '19:00',
    '20:00',  '21:00',  '22:00',  '23:00',
  ];

  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showDepartureTimePicker, setShowDepartureTimePicker] = useState(false);
  const [showArrivalTimePicker, setShowArrivalTimePicker] = useState(false);

  const handleStartEditItinerary = (itinerary: any) => {
    setShowItineraryEditForm(true);
    setEditingItinerary(itinerary);
    setFormData({
      title: itinerary.title || '',
      description: itinerary.description || '',
      country: itinerary.country || '',
      city: itinerary.city || '',
      location: itinerary.location || '',
      date: itinerary.itineraryDate || itinerary.date || dayjs().format('YYYY-MM-DD'),
      startTime: (itinerary.startTime || itinerary.start_time || '09:00').toString().split(':').slice(0,2).join(':'),
      endTime: (itinerary.endTime || itinerary.end_time || '10:00').toString().split(':').slice(0,2).join(':'),
    });
  };

  const renderItineraryItem = (itinerary: any) => (
    <Pressable key={itinerary.id} style={styles.itineraryItem} onPress={() => handleStartEditItinerary(itinerary)}>
      <View style={styles.itineraryHeader}>
        <Text style={styles.itineraryTitle}>{itinerary.title}</Text>
        <Text style={styles.itineraryTime}>
          {(itinerary.start_time || itinerary.startTime) ?? ''} - {(itinerary.end_time || itinerary.endTime) ?? ''}
        </Text>
      </View>
      {itinerary.location && (
        <Text style={styles.itineraryLocation}>📍 {itinerary.location}</Text>
      )}
      {itinerary.content && (
        <Text style={styles.itineraryContent} numberOfLines={2}>
          {itinerary.content}
        </Text>
      )}
    </Pressable>
  );

  const renderFlightItem = (flight: any) => {
    const flightNumber = flight.flight_number ?? flight.flightNumber;
    const departureAirport = flight.departure_airport ?? flight.departureAirport;
    const arrivalAirport = flight.arrival_airport ?? flight.arrivalAirport;
    const departureTime = flight.departure_time ?? flight.departureTime;
    const arrivalTime = flight.arrival_time ?? flight.arrivalTime;
    const seatClass = flight.seat_class ?? flight.seatClass;
    const seatNumber = flight.seat_number ?? flight.seatNumber;

    return (
      <Pressable key={flight.id} style={styles.flightItem} onPress={() => {
        setEditingFlight(flight);
        setShowFlightForm(true);
        setFlightFormData({
          airline: flight.airline || '',
          flight_number: flightNumber || '',
          departure_airport: departureAirport || '',
          arrival_airport: arrivalAirport || '',
          departure_time: dayjs(departureTime).format('YYYY-MM-DD HH:mm'),
          arrival_time: dayjs(arrivalTime).format('YYYY-MM-DD HH:mm'),
          seat_class: seatClass || '',
          seat_number: seatNumber || '',
          duration: flight.duration || '',
          memo: flight.memo || '',
        });
        setFlightExpenseForm({
          amount: String(flight?.expense?.amount ?? ''),
          currency: (flight?.expense?.currency ?? ExpenseCurrency.KRW) as string,
          description: flight?.expense?.description ?? '',
        });
      }}>
        <View style={styles.flightHeader}>
          <Text style={styles.flightTitle}>{flight.airline} {flightNumber}</Text>
          <Text style={styles.flightRoute}>
            {departureAirport} → {arrivalAirport}
          </Text>
        </View>
        <View style={styles.flightDetails}>
          <Text style={styles.flightTime}>
            출발: {dayjs(departureTime).format('M월 D일 HH:mm')} | 도착: {dayjs(arrivalTime).format('M월 D일 HH:mm')}
          </Text>
          {seatClass && seatNumber && (
            <Text style={styles.flightSeat}>
              좌석: {seatClass} {seatNumber}
            </Text>
          )}
          {flight.duration && (
            <Text style={styles.flightDuration}>비행시간: {flight.duration}</Text>
          )}
        </View>
        {flight.memo && (
          <Text style={styles.flightMemo} numberOfLines={2}>
            📝 {flight.memo}
          </Text>
        )}
      </Pressable>
    );
  };

  const renderAccommodationItem = (accommodation: any) => (
    <Pressable
      key={accommodation.id}
      style={styles.accommodationItem}
      onPress={() => {
        setShowAccommodationForm(true);
        setEditingAccommodation(accommodation);
        setAccommodationFormData({
          name: accommodation.name || '',
          address: accommodation.address || '',
          start_date: accommodation.start_date || dayjs().format('YYYY-MM-DD'),
          end_date: accommodation.end_date || dayjs().add(1, 'day').format('YYYY-MM-DD'),
          memo: accommodation.memo || '',
        });
        setFlightExpenseForm({
          amount: String(accommodation?.expense?.amount ?? ''),
          currency: (accommodation?.expense?.currency ?? ExpenseCurrency.KRW) as string,
          description: accommodation?.expense?.description ?? '',
        });
      }}
    >
      <View style={styles.accommodationHeader}>
        <Text style={styles.accommodationTitle}>{accommodation.name}</Text>
        <Text style={styles.accommodationDate}>
          {dayjs(accommodation.start_date).format('M월 D일')} - {dayjs(accommodation.end_date).format('M월 D일')}
        </Text>
      </View>
      {accommodation.address && (
        <Text style={styles.accommodationAddress}>📍 {accommodation.address}</Text>
      )}
      {accommodation.memo && (
        <Text style={styles.accommodationMemo} numberOfLines={2}>
          📝 {accommodation.memo}
        </Text>
      )}
    </Pressable>
  );

  const [showCurrencyOptions, setShowCurrencyOptions] = useState(false);

  const renderExpenseForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>새 지출 추가</Text>
      
      {/* 카테고리 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.categoryContainer}>
          {Object.values(ExpenseCategory).map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                expenseFormData.category === category && styles.selectedCategoryButton
              ]}
              onPress={() => setExpenseFormData(prev => ({ ...prev, category }))}
            >
              <Text style={[
                styles.categoryButtonText,
                expenseFormData.category === category && styles.selectedCategoryButtonText
              ]}>
                {getCategoryName(category)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 금액 및 통화 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>금액</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="금액을 입력하세요"
            value={expenseFormData.amount}
            onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, amount: text }))}
            keyboardType="numeric"
          />
          <View style={{ width: 120 }}>
            <Pressable
              style={[styles.input, { justifyContent: 'center', height: 48 }]}
              onPress={() => setShowCurrencyOptions(prev => !prev)}
            >
              <Text style={{ textAlign: 'center' }}>{expenseFormData.currency}</Text>
            </Pressable>
            {showCurrencyOptions && (
              <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 4, backgroundColor: '#fff' }}> 
                {Object.values(ExpenseCurrency).map((code) => (
                  <Pressable
                    key={code}
                    style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                    onPress={() => {
                      setExpenseFormData(prev => ({ ...prev, currency: code }));
                      setShowCurrencyOptions(false);
                    }}
                  >
                    <Text>{code}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 설명 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="지출 설명을 입력하세요"
          value={expenseFormData.description}
          onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 지출 날짜: 일정 수정 영역에서 열렸다면 UI 숨기고 일정의 날짜 사용 */}
      {!isEditingExpenseInItinerary && (
        <View style={styles.inputGroup}>
          <Text style={styles.label}>지출 날짜</Text>
          <DateRangePicker
            startDate={expenseFormData.ex_date}
            endDate={expenseFormData.ex_date}
            onStartDateChange={(date) => setExpenseFormData(prev => ({ ...prev, ex_date: date }))}
            onEndDateChange={(date) => setExpenseFormData(prev => ({ ...prev, ex_date: date }))}
            style={styles.datePicker}
          />
        </View>
      )}

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancelExpenseForm}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveExpense}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
      </View>
    </View>
  );

  const handleStartEditExpense = (exp: Expense, inItinerary: boolean = false) => {
    // 인라인 추가 폼이 열려 있다면 닫기
    setShowItineraryInlineExpenseForm(false);
    setIsEditingExpenseInItinerary(inItinerary);
    setEditingExpense(exp);
    setShowExpenseEditForm(true);
    setExpenseFormData({
      category: exp.category as any,
      amount: String(exp.amount),
      description: exp.description || '',
      ex_date: inItinerary ? formData.date : ((exp as any).ex_date || (exp as any).exDate || dayjs().format('YYYY-MM-DD')),
      currency: (exp as any).currency || ExpenseCurrency.KRW,
    });
  };

  // 일정 수정 폼 내 인라인 지출 추가 UI (날짜 입력 제거: 일정의 날짜 사용)
  const renderInlineItineraryExpenseForm = () => (
    <View style={[styles.formContainer, { paddingHorizontal: 0, paddingTop: 0 }] }>
      <Text style={styles.formTitle}>지출 추가(이 일정)</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.categoryContainer}>
          {Object.values(ExpenseCategory).map((category) => (
            <Pressable
              key={category}
              style={[styles.categoryButton, expenseFormData.category === category && styles.selectedCategoryButton]}
              onPress={() => setExpenseFormData(prev => ({ ...prev, category }))}
            >
              <Text style={[styles.categoryButtonText, expenseFormData.category === category && styles.selectedCategoryButtonText]}>
                {getCategoryName(category)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>금액</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="금액을 입력하세요"
            value={expenseFormData.amount}
            onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, amount: text }))}
            keyboardType="numeric"
          />
          <View style={{ width: 120 }}>
            <Pressable
              style={[styles.input, { justifyContent: 'center', height: 48 }]}
              onPress={() => setShowCurrencyOptions(prev => !prev)}
            >
              <Text style={{ textAlign: 'center' }}>{expenseFormData.currency}</Text>
            </Pressable>
            {showCurrencyOptions && (
              <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 4, backgroundColor: '#fff' }}>
                {Object.values(ExpenseCurrency).map((code) => (
                  <Pressable
                    key={code}
                    style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                    onPress={() => {
                      setExpenseFormData(prev => ({ ...prev, currency: code }));
                      setShowCurrencyOptions(false);
                    }}
                  >
                    <Text>{code}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="지출 설명을 입력하세요"
          value={expenseFormData.description}
          onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 날짜 입력 UI 제거: 일정의 날짜(formData.date)를 사용 */}

      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={() => setShowItineraryInlineExpenseForm(false)}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.saveButton]}
          onPress={async () => {
            await handleSaveExpense();
            setShowItineraryInlineExpenseForm(false);
          }}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
      </View>
    </View>
  );

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    if (!planData?.plan?.id) {
      Alert.alert('오류', '먼저 여행 계획을 선택해주세요.');
      return;
    }
    if (!expenseFormData.amount.trim() || isNaN(Number(expenseFormData.amount))) {
      Alert.alert('오류', '올바른 금액을 입력해주세요.');
      return;
    }
    // 일정 수정 영역에서 열렸다면 날짜는 일정 날짜 사용
    const effectiveDate = isEditingExpenseInItinerary ? formData.date : expenseFormData.ex_date;
    if (!effectiveDate) {
      Alert.alert('오류', '지출 날짜를 선택해주세요.');
      return;
    }

    try {
      await expensesApi.updateExpense(Number((editingExpense as any).id), {
        category: expenseFormData.category as any,
        amount: Number(expenseFormData.amount),
        description: expenseFormData.description || undefined,
        exDate: effectiveDate,
        currency: expenseFormData.currency as any,
      });
      if (planData?.refreshExpenses) await planData.refreshExpenses();
      Alert.alert('성공', '지출이 수정되었습니다.');
      setShowExpenseEditForm(false);
      setEditingExpense(null);
      // 일정 편집 중이면 일정 지출 목록 새로고침
      if (showItineraryEditForm && (editingItinerary as any)?.id) {
        await refreshItineraryExpenseList();
      }
    } catch (error: any) {
      console.error('❌ Failed to update expense:', error);
      Alert.alert('오류', error.response?.data?.detail || '지출 수정 중 오류가 발생했습니다.');
    }
  };

  const renderExpenseEditForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>지출 수정</Text>

      {/* 카테고리 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.categoryContainer}>
          {Object.values(ExpenseCategory).map((category) => (
            <Pressable
              key={category}
              style={[
                styles.categoryButton,
                expenseFormData.category === category && styles.selectedCategoryButton
              ]}
              onPress={() => setExpenseFormData(prev => ({ ...prev, category }))}
            >
              <Text style={[
                styles.categoryButtonText,
                expenseFormData.category === category && styles.selectedCategoryButtonText
              ]}>
                {getCategoryName(category)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 금액 및 통화 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>금액</Text>
        <View style={{ flexDirection: 'row' }}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="금액을 입력하세요"
            value={expenseFormData.amount}
            onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, amount: text }))}
            keyboardType="numeric"
          />
          <View style={{ width: 120 }}>
            <Pressable
              style={[styles.input, { justifyContent: 'center', height: 48 }]}
              onPress={() => setShowCurrencyOptions(prev => !prev)}
            >
              <Text style={{ textAlign: 'center' }}>{expenseFormData.currency}</Text>
            </Pressable>
            {showCurrencyOptions && (
              <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 4, backgroundColor: '#fff' }}>
                {Object.values(ExpenseCurrency).map((code) => (
                  <Pressable
                    key={code}
                    style={{ paddingVertical: 8, paddingHorizontal: 12 }}
                    onPress={() => {
                      setExpenseFormData(prev => ({ ...prev, currency: code }));
                      setShowCurrencyOptions(false);
                    }}
                  >
                    <Text>{code}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 설명 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="지출 설명을 입력하세요"
          value={expenseFormData.description}
          onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 지출 날짜 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>지출 날짜</Text>
        <DateRangePicker
          startDate={expenseFormData.ex_date}
          endDate={expenseFormData.ex_date}
          onStartDateChange={(date) => setExpenseFormData(prev => ({ ...prev, ex_date: date }))}
          onEndDateChange={(date) => setExpenseFormData(prev => ({ ...prev, ex_date: date }))}
          style={styles.datePicker}
        />
      </View>

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={() => { setShowExpenseEditForm(false); setEditingExpense(null); }}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.saveButton]}
          onPress={handleUpdateExpense}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.deleteButton]}
          onPress={() => editingExpense && deleteExpense((editingExpense as any).id)}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderItineraryForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>새 일정 추가</Text>
      
      {/* 제목 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          placeholder="일정 제목을 입력하세요"
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
        />
      </View>

      {/* 내용 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="일정 내용을 입력하세요"
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 국가와 도시 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>국가</Text>
          <TextInput
            style={styles.input}
            placeholder="국가"
            value={formData.country}
            onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도시</Text>
          <TextInput
            style={styles.input}
            placeholder="도시"
            value={formData.city}
            onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
          />
        </View>
      </View>

      {/* 장소 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <TextInput
          style={styles.input}
          placeholder="상세 장소를 입력하세요"
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
        />
      </View>

      {/* 날짜 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>날짜</Text>
        <DateRangePicker
          startDate={formData.date}
          endDate={formData.date}
          onStartDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
          onEndDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
          style={styles.datePicker}
        />
      </View>

      {/* 시작 시간과 종료 시간 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>시작 시간</Text>
          <Pressable 
            style={styles.timeInput}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Text style={styles.timeText}>{formData.startTime}</Text>
            <Text style={styles.arrow}>▼</Text>
          </Pressable>
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>종료 시간</Text>
          <Pressable 
            style={styles.timeInput}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Text style={styles.timeText}>{formData.endTime}</Text>
            <Text style={styles.arrow}>▼</Text>
          </Pressable>
        </View>
      </View>

      {/* 일정 지출 추가(다건) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>지출 추가</Text>
        {/* 카테고리 */}
        <View style={styles.categoryContainer}>
          {Object.values(ExpenseCategory).map((category) => (
            <Pressable
              key={category}
              style={[styles.categoryButton, itineraryExpenseForm.category === category && styles.selectedCategoryButton]}
              onPress={() => setItineraryExpenseForm(prev => ({ ...prev, category }))}
            >
              <Text style={[styles.categoryButtonText, itineraryExpenseForm.category === category && styles.selectedCategoryButtonText]}>
                {getCategoryName(category)}
              </Text>
            </Pressable>
          ))}
        </View>
        {/* 금액/통화 */}
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="금액"
            keyboardType="numeric"
            value={itineraryExpenseForm.amount}
            onChangeText={(text) => setItineraryExpenseForm(prev => ({ ...prev, amount: text.replace(/[^0-9]/g, '') }))}
          />
          <View style={{ width: 120 }}>
            <Pressable style={[styles.input, { justifyContent: 'center', height: 48 }]} onPress={() => setShowInlineCurrencyOptions((prev: boolean) => !prev)}>
              <Text style={{ textAlign: 'center' }}>{itineraryExpenseForm.currency}</Text>
            </Pressable>
            {showInlineCurrencyOptions && (
              <View style={{ maxHeight: 180, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginTop: 4, backgroundColor: '#fff' }}>
                {Object.values(ExpenseCurrency).map((code) => (
                  <Pressable key={code} style={{ paddingVertical: 8, paddingHorizontal: 12 }} onPress={() => { setItineraryExpenseForm((prev: any) => ({ ...prev, currency: code })); setShowInlineCurrencyOptions(false); }}>
                    <Text>{code}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
        {/* 설명 */}
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="지출 설명 (선택)"
          value={itineraryExpenseForm.description}
          onChangeText={(text) => setItineraryExpenseForm(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
        {/* 추가/초기화 */}
        <View style={styles.buttonContainer}>
          <Pressable style={[styles.button, styles.saveButton]} onPress={() => {
            if (!itineraryExpenseForm.amount || isNaN(Number(itineraryExpenseForm.amount))) return;
            setItineraryDraftExpenses(prev => ([...prev, { ...itineraryExpenseForm, ex_date: formData.date }]));
            setItineraryExpenseForm({ category: ExpenseCategory.FOOD, amount: '', description: '', ex_date: formData.date, currency: ExpenseCurrency.KRW });
          }}>
            <Text style={styles.saveButtonText}>지출 항목 추가</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.cancelButton]} onPress={() => setItineraryExpenseForm({ category: ExpenseCategory.FOOD, amount: '', description: '', ex_date: formData.date, currency: ExpenseCurrency.KRW })}>
            <Text style={styles.cancelButtonText}>입력 초기화</Text>
          </Pressable>
        </View>
        {/* 초안 리스트 */}
        {itineraryDraftExpenses.length > 0 && (
          <View style={{ marginTop: 8 }}>
            {itineraryDraftExpenses.map((d, idx) => (
              <View key={idx} style={styles.expenseItem}>
                <View style={styles.expenseItemLeft}>
                  <Text style={styles.expenseItemDate}>{dayjs(d.ex_date).format('MMM DD')}</Text>
                  {d.description ? <Text style={styles.expenseItemDescription}>{d.description}</Text> : null}
                </View>
                <View style={styles.expenseItemRight}>
                  <Text style={styles.expenseItemAmount}>{formatCurrency(Number(d.amount), d.currency)}</Text>
                  <Pressable style={styles.deleteIcon} onPress={() => setItineraryDraftExpenses(prev => prev.filter((_, i) => i !== idx))}>
                    <Text style={styles.deleteIconText}>🗑️</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancelForm}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.saveButton]}
              onPress={handleSaveItinerary}
        >
              <Text style={styles.saveButtonText}>{editingItinerary ? '수정' : '저장'}</Text>
        </Pressable>
          {editingItinerary && (
            <Pressable 
              style={[styles.button, styles.deleteButton]}
              onPress={handleDeleteItinerary}
            >
              <Text style={styles.deleteButtonText}>삭제</Text>
            </Pressable>
          )}
        </View>
    </View>
  );

  const renderItineraryEditForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>일정 수정</Text>
      
      {/* 제목 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          placeholder="일정 제목을 입력하세요"
          value={formData.title}
          onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
        />
      </View>

      {/* 내용 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="일정 내용을 입력하세요"
          value={formData.description}
          onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 국가와 도시 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>국가</Text>
          <TextInput
            style={styles.input}
            placeholder="국가"
            value={formData.country}
            onChangeText={(text) => setFormData(prev => ({ ...prev, country: text }))}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도시</Text>
          <TextInput
            style={styles.input}
            placeholder="도시"
            value={formData.city}
            onChangeText={(text) => setFormData(prev => ({ ...prev, city: text }))}
          />
        </View>
      </View>

      {/* 장소 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <TextInput
          style={styles.input}
          placeholder="상세 장소를 입력하세요"
          value={formData.location}
          onChangeText={(text) => setFormData(prev => ({ ...prev, location: text }))}
        />
      </View>

      {/* 날짜 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>날짜</Text>
        <DateRangePicker
          startDate={formData.date}
          endDate={formData.date}
          onStartDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
          onEndDateChange={(date) => setFormData(prev => ({ ...prev, date }))}
          style={styles.datePicker}
        />
      </View>

      {/* 시작 시간과 종료 시간 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>시작 시간</Text>
          <Pressable 
            style={styles.timeInput}
            onPress={() => setShowStartTimePicker(true)}
          >
            <Text style={styles.timeText}>{formData.startTime}</Text>
            <Text style={styles.arrow}>▼</Text>
          </Pressable>
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>종료 시간</Text>
          <Pressable 
            style={styles.timeInput}
            onPress={() => setShowEndTimePicker(true)}
          >
            <Text style={styles.timeText}>{formData.endTime}</Text>
            <Text style={styles.arrow}>▼</Text>
          </Pressable>
        </View>
      </View>

      {/* 일정에 연결된 지출 관리 */}
      <View style={[styles.inputGroup, { marginTop: 8 }] }>
        <Text style={styles.label}>이 일정의 지출</Text>
        {showExpenseEditForm ? (
          // 지출 수정 폼을 일정 수정 영역에서 바로 표시
          renderExpenseEditForm()
        ) : (
          <>
            {/* 목록 */}
            {itineraryExpenses.length === 0 ? (
              <Text style={styles.emptyText}>연결된 지출이 없습니다.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {itineraryExpenses.map((exp: any) => (
                  <Pressable key={exp.id} style={styles.expenseItem} onPress={() => handleStartEditExpense(exp, true)}>
                    <View style={styles.expenseItemLeft}>
                      <Text style={styles.expenseItemDate}>{dayjs(exp.ex_date || exp.exDate).format('MMM DD')}</Text>
                      {exp.description ? (
                        <Text style={styles.expenseItemDescription}>{exp.description}</Text>
                      ) : null}
                    </View>
                    <View style={styles.expenseItemRight}>
                      <Text style={styles.expenseItemAmount}>{formatCurrency(exp.amount, exp.currency)}</Text>
                      <Pressable style={styles.deleteIcon} onPress={() => deleteExpense(exp.id)}>
                        <Text style={styles.deleteIconText}>🗑️</Text>
                      </Pressable>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
            {/* 인라인 추가 토글 */}
            <View style={{ marginTop: 8 }}>
              {!showItineraryInlineExpenseForm ? (
                <Pressable
                  style={[styles.button, styles.saveButton]}
                  onPress={() => {
                    setShowItineraryInlineExpenseForm(true);
                    setShowExpenseForm(false);
                    setExpenseFormData({
                      category: ExpenseCategory.FOOD,
                      amount: '',
                      description: '',
                      ex_date: formData.date,
                      currency: ExpenseCurrency.KRW,
                    });
                  }}
                >
                  <Text style={styles.saveButtonText}>+ 지출 추가</Text>
                </Pressable>
              ) : null}
            </View>

            {/* 인라인 지출 추가 폼 */}
            {showItineraryInlineExpenseForm ? (
              <View style={{ marginTop: 8 }}>
                {renderInlineItineraryExpenseForm?.()}
              </View>
            ) : null}
          </>
        )}
      </View>

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancelEditForm}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveItinerary}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.deleteButton]}
          onPress={handleDeleteItinerary}
        >
          <Text style={styles.deleteButtonText}>삭제</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderFlightForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>항공편 정보</Text>
      
      {/* 항공사와 항공편 번호 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>항공사</Text>
          <TextInput
            style={styles.input}
            placeholder="항공사"
            value={flightFormData.airline}
            onChangeText={(text) => setFlightFormData(prev => ({ ...prev, airline: text }))}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>항공편 번호</Text>
          <TextInput
            style={styles.input}
            placeholder="항공편 번호"
            value={flightFormData.flight_number}
            onChangeText={(text) => setFlightFormData(prev => ({ ...prev, flight_number: text }))}
          />
        </View>
      </View>

      {/* 출발 공항과 도착 공항 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>출발 공항</Text>
          <TextInput
            style={styles.input}
            placeholder="출발 공항"
            value={flightFormData.departure_airport}
            onChangeText={(text) => setFlightFormData(prev => ({ ...prev, departure_airport: text }))}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도착 공항</Text>
          <TextInput
            style={styles.input}
            placeholder="도착 공항"
            value={flightFormData.arrival_airport}
            onChangeText={(text) => setFlightFormData(prev => ({ ...prev, arrival_airport: text }))}
          />
        </View>
      </View>

      {/* 출발 날짜와 도착 날짜 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>출발 시간</Text>
          <DateTimePicker
            value={flightFormData.departure_time}
            onChange={(datetime) => setFlightFormData(prev => ({ ...prev, departure_time: datetime }))}
            style={styles.dateTimePicker}
            placeholder="출발 날짜와 시간을 선택하세요"
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도착 시간</Text>
          <DateTimePicker
            value={flightFormData.arrival_time}
            onChange={(datetime) => setFlightFormData(prev => ({ ...prev, arrival_time: datetime }))}
            style={styles.dateTimePicker}
            placeholder="도착 날짜와 시간을 선택하세요"
          />
        </View>
      </View>

      {/* 좌석 등급과 좌석 번호 */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>좌석 등급</Text>
          <TextInput
            style={styles.input}
            placeholder="좌석 등급"
            value={flightFormData.seat_class}
            onChangeText={(text) => setFlightFormData(prev => ({ ...prev, seat_class: text }))}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>좌석 번호</Text>
          <TextInput
            style={styles.input}
            placeholder="좌석 번호"
            value={flightFormData.seat_number}
            onChangeText={(text) => setFlightFormData(prev => ({ ...prev, seat_number: text }))}
          />
        </View>
      </View>

      {/* 비행 시간 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>비행 시간</Text>
        <TextInput
          style={styles.input}
          placeholder="비행 시간 (예: 2시간 30분)"
          value={flightFormData.duration}
          onChangeText={(text) => setFlightFormData(prev => ({ ...prev, duration: text }))}
        />
      </View>

      {/* 메모 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>메모</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="메모를 입력하세요"
          value={flightFormData.memo}
          onChangeText={(text) => setFlightFormData(prev => ({ ...prev, memo: text }))}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* 항공 비용 */}
      <View style={[styles.inputGroup, { marginTop: 8 }] }>
        <Text style={styles.label}>항공 비용</Text>
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.smallLabel}>금액</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              value={flightExpenseForm.amount}
              onChangeText={(text) => setFlightExpenseForm(prev => ({ ...prev, amount: text.replace(/[^0-9]/g, '') }))}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.smallLabel}>통화</Text>
            <Pressable 
              style={styles.selectInput}
              onPress={() => setShowFlightCurrencyOptions(prev => !prev)}
            >
              <Text style={{ textAlign: 'center' }}>{flightExpenseForm.currency}</Text>
              <Text style={styles.arrow}>▼</Text>
            </Pressable>
          </View>
        </View>
        {showFlightCurrencyOptions && (
          <View style={styles.currencyOptions}>
            {Object.values(ExpenseCurrency).map((code) => (
              <Pressable
                key={code}
                style={styles.currencyOption}
                onPress={() => {
                  setFlightExpenseForm(prev => ({ ...prev, currency: code }));
                  setShowFlightCurrencyOptions(false);
                }}
              >
                <Text style={styles.currencyOptionText}>{code}</Text>
              </Pressable>
            ))}
          </View>
        )}

      </View>

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancelFlightForm}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        {editingFlight ? (
          <>
            <Pressable 
              style={[styles.button, styles.saveButton]}
              onPress={async () => {
                try {
                  const payload = {
                    airline: flightFormData.airline,
                    flightNumber: flightFormData.flight_number,
                    departureAirport: flightFormData.departure_airport,
                    arrivalAirport: flightFormData.arrival_airport,
                    departureTime: flightFormData.departure_time,
                    arrivalTime: flightFormData.arrival_time,
                    seatClass: flightFormData.seat_class || undefined,
                    seatNumber: flightFormData.seat_number || undefined,
                    duration: flightFormData.duration || undefined,
                    memo: flightFormData.memo || undefined,
                    expense: {
                      exDate: (flightFormData.departure_time || '').split(' ')[0],
                      amount: Number(flightExpenseForm.amount || 0),
                      category: ExpenseCategory.FLIGHT,
                      currency: flightExpenseForm.currency as any,
                      description: flightExpenseForm.description || undefined,
                    },
                  };
                  await flightsApi.updateFlight(editingFlight.id, payload as any);
                  if (planData?.refreshFlights) await planData.refreshFlights();
                  if (planData?.refreshExpenses) await planData.refreshExpenses();
                  setShowFlightForm(false);
                  setEditingFlight(null);
                } catch (err: any) {
                  Alert.alert('오류', err.response?.data?.detail || '항공편 수정 중 오류가 발생했습니다.');
                }
              }}
            >
              <Text style={styles.saveButtonText}>수정</Text>
            </Pressable>
            <Pressable 
              style={[styles.button, styles.deleteButton]}
              onPress={async () => {
                try {
                  await flightsApi.deleteFlight(editingFlight.id);
                  if (planData?.refreshFlights) await planData.refreshFlights();
                  if (planData?.refreshExpenses) await planData.refreshExpenses();
                  setShowFlightForm(false);
                  setEditingFlight(null);
                } catch (err: any) {
                  Alert.alert('오류', err.response?.data?.detail || '항공편 삭제 중 오류가 발생했습니다.');
                }
              }}
            >
              <Text style={styles.saveButtonText}>삭제</Text>
            </Pressable>
          </>
        ) : (
          <Pressable 
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveFlight}
          >
            <Text style={styles.saveButtonText}>저장</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
    <ScrollView style={{ flex: 1 }}>
      <List.Section>
        <List.Accordion
            title="일정"
          expanded={open === 'itinerary'}
          onPress={() => handleToggle('itinerary')}
        >
            <View style={styles.itinerarySection}>
              {!showItineraryForm && !showItineraryEditForm ? (
                <>
                  <View style={styles.itineraryHeader}>
                    <Text style={styles.sectionTitle}>일정 목록</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable 
                        style={styles.addButton}
                        onPress={() => setShowItineraryForm(true)}
                      >
                        <Text style={styles.addButtonText}>+ 일정 추가</Text>
                      </Pressable>
                      {selectedItinerary && (
                        <Pressable 
                          style={styles.addButton}
                          onPress={() => {
                            setShowExpenseForm(true);
                            // 일정 전용 지출 폼으로 초기화
                            setItineraryExpenseForm({
                              category: ExpenseCategory.FOOD,
                              amount: '',
                              description: '',
                              ex_date: selectedItinerary.itineraryDate || dayjs().format('YYYY-MM-DD'),
                              currency: ExpenseCurrency.KRW,
                            });
                          }}
                        >
                          <Text style={styles.addButtonText}>+ 일정 지출</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  
                  {itineraries.length === 0 ? (
                    <Text style={styles.emptyText}>일정이 없습니다. 일정을 추가해보세요!</Text>
                  ) : (
                    itineraries.map(renderItineraryItem)
                  )}
                </>
              ) : showItineraryForm ? (
                renderItineraryForm()
              ) : (
                renderItineraryEditForm()
              )}
            </View>
        </List.Accordion>

        <List.Accordion
            title="항공"
          expanded={open === 'flights'}
          onPress={() => handleToggle('flights')}
        >
            <View style={styles.flightSection}>
              {!showFlightForm ? (
                <>
                  <View style={styles.flightHeader}>
                    <Text style={styles.sectionTitle}>항공편 목록</Text>
                      <Pressable 
                        style={styles.addButton}
                        onPress={() => {
                          setEditingFlight(null);
                          setShowFlightForm(true);
                          setFlightFormData({
                            airline: '',
                            flight_number: '',
                            departure_airport: '',
                            arrival_airport: '',
                            departure_time: `${dayjs().format('YYYY-MM-DD')} 00:00`,
                            arrival_time: `${dayjs().format('YYYY-MM-DD')} 00:00`,
                            seat_class: '',
                            seat_number: '',
                            duration: '',
                            memo: '',
                          });
                          setFlightExpenseForm({ amount: '', currency: ExpenseCurrency.KRW as string, description: '' });
                          setShowFlightCurrencyOptions(false);
                        }}
                      >
                      <Text style={styles.addButtonText}>+ 항공편 추가</Text>
                    </Pressable>
                  </View>
                  
                  {flights.length === 0 ? (
                    <Text style={styles.emptyText}>항공편이 없습니다. 항공편을 추가해보세요!</Text>
                  ) : (
                    flights.map(renderFlightItem)
                  )}
                </>
              ) : (
                renderFlightForm()
              )}
            </View>
        </List.Accordion>

        <List.Accordion
            title="숙박"
          expanded={open === 'stay'}
          onPress={() => handleToggle('stay')}
        >
            <View style={styles.accommodationSection}>
              {!showAccommodationForm ? (
                <>
                  <View style={styles.accommodationHeader}>
                    <Text style={styles.sectionTitle}>숙박 목록</Text>
                      <Pressable 
                        style={styles.addButton}
                        onPress={() => {
                          setEditingAccommodation(null);
                          setShowAccommodationForm(true);
                          setAccommodationFormData({
                            name: '',
                            address: '',
                            start_date: dayjs().format('YYYY-MM-DD'),
                            end_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
                            memo: '',
                          });
                          setFlightExpenseForm({ amount: '', currency: ExpenseCurrency.KRW as string, description: '' });
                          setShowFlightCurrencyOptions(false);
                        }}
                      >
                      <Text style={styles.addButtonText}>+ 숙박 추가</Text>
                    </Pressable>
                  </View>
                  
                  {accommodations.length === 0 ? (
                    <Text style={styles.emptyText}>숙박 정보가 없습니다. 숙박 정보를 추가해보세요!</Text>
                  ) : (
                    accommodations.map(renderAccommodationItem)
                  )}
                </>
              ) : (
                <View style={styles.accommodationFormContainer}>
                  <Text style={styles.formTitle}>새 숙박 정보 추가</Text>
                  
                  {/* 숙소 이름 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>숙소 이름</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="숙소 이름"
                      value={accommodationFormData.name}
                      onChangeText={(text) => setAccommodationFormData(prev => ({ ...prev, name: text }))}
                    />
                  </View>

                  {/* 주소 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>주소</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="상세 주소"
                      value={accommodationFormData.address}
                      onChangeText={(text) => setAccommodationFormData(prev => ({ ...prev, address: text }))}
                    />
                  </View>

                  {/* 체크인 날짜 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>체크인 날짜</Text>
                    <DateRangePicker
                      startDate={accommodationFormData.start_date}
                      endDate={accommodationFormData.start_date}
                      onStartDateChange={(date) => setAccommodationFormData(prev => ({ ...prev, start_date: date }))}
                      onEndDateChange={(date) => setAccommodationFormData(prev => ({ ...prev, start_date: date }))}
                      style={styles.datePicker}
                    />
                  </View>

                  {/* 체크아웃 날짜 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>체크아웃 날짜</Text>
                    <DateRangePicker
                      startDate={accommodationFormData.end_date}
                      endDate={accommodationFormData.end_date}
                      onStartDateChange={(date) => setAccommodationFormData(prev => ({ ...prev, end_date: date }))}
                      onEndDateChange={(date) => setAccommodationFormData(prev => ({ ...prev, end_date: date }))}
                      style={styles.datePicker}
                    />
                  </View>

                  {/* 메모 */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>메모</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="숙박 메모"
                      value={accommodationFormData.memo}
                      onChangeText={(text) => setAccommodationFormData(prev => ({ ...prev, memo: text }))}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* 숙박 비용 */}
                  <View style={[styles.inputGroup, { marginTop: 8 }]}>
                    <Text style={styles.label}>숙박 비용</Text>
                    <View style={styles.row}>
                      <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.smallLabel}>금액</Text>
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          placeholder="0"
                          value={flightExpenseForm.amount}
                          onChangeText={(text) => setFlightExpenseForm(prev => ({ ...prev, amount: text.replace(/[^0-9]/g, '') }))}
                        />
                      </View>
                      <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.smallLabel}>통화</Text>
                        <Pressable 
                          style={styles.selectInput}
                          onPress={() => setShowFlightCurrencyOptions(prev => !prev)}
                        >
                          <Text style={{ textAlign: 'center' }}>{flightExpenseForm.currency}</Text>
                          <Text style={styles.arrow}>▼</Text>
                        </Pressable>
                      </View>
                    </View>
                    {showFlightCurrencyOptions && (
                      <View style={styles.currencyOptions}>
                        {Object.values(ExpenseCurrency).map((code) => (
                          <Pressable
                            key={code}
                            style={styles.currencyOption}
                            onPress={() => {
                              setFlightExpenseForm(prev => ({ ...prev, currency: code }));
                              setShowFlightCurrencyOptions(false);
                            }}
                          >
                            <Text style={styles.currencyOptionText}>{code}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* 버튼 */}
                  <View style={styles.buttonContainer}>
                    <Pressable 
                      style={[styles.button, styles.cancelButton]}
                      onPress={handleCancelAccommodationForm}
                    >
                      <Text style={styles.cancelButtonText}>취소</Text>
                    </Pressable>
                    {editingAccommodation ? (
                      <>
                        <Pressable 
                          style={[styles.button, styles.saveButton]}
                          onPress={async () => {
                            try {
                              const payload = {
                                name: accommodationFormData.name,
                                address: accommodationFormData.address || undefined,
                                startDate: accommodationFormData.start_date,
                                endDate: accommodationFormData.end_date,
                                memo: accommodationFormData.memo || undefined,
                                expense: {
                                  exDate: accommodationFormData.start_date,
                                  amount: Number(flightExpenseForm.amount || 0),
                                  category: ExpenseCategory.ACCOMMODATION as any,
                                  currency: flightExpenseForm.currency as any,
                                  description: flightExpenseForm.description || undefined,
                                },
                              };
                              await accommodationsApi.updateAccommodation(editingAccommodation.id, payload as any);
                              if (planData?.refreshAccommodations) await planData.refreshAccommodations();
                              if (planData?.refreshExpenses) await planData.refreshExpenses();
                              setShowAccommodationForm(false);
                              setEditingAccommodation(null);
                            } catch (err: any) {
                              Alert.alert('오류', err.response?.data?.detail || '숙박 수정 중 오류가 발생했습니다.');
                            }
                          }}
                        >
                          <Text style={styles.saveButtonText}>수정</Text>
                        </Pressable>
                        <Pressable 
                          style={[styles.button, styles.deleteButton]}
                          onPress={async () => {
                            try {
                              await accommodationsApi.deleteAccommodation(editingAccommodation.id);
                              if (planData?.refreshAccommodations) await planData.refreshAccommodations();
                              if (planData?.refreshExpenses) await planData.refreshExpenses();
                              setShowAccommodationForm(false);
                              setEditingAccommodation(null);
                            } catch (err: any) {
                              Alert.alert('오류', err.response?.data?.detail || '숙박 삭제 중 오류가 발생했습니다.');
                            }
                          }}
                        >
                          <Text style={styles.saveButtonText}>삭제</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable 
                        style={[styles.button, styles.saveButton]}
                        onPress={handleSaveAccommodation}
                      >
                        <Text style={styles.saveButtonText}>저장</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            </View>
        </List.Accordion>

        <List.Accordion
            title="지출"
          expanded={open === 'expense'}
          onPress={() => handleToggle('expense')}
        >
            <View style={styles.expenseSection}>
              {!showExpenseForm && !showExpenseEditForm ? (
                <>
                  <View style={styles.expenseHeader}>
                    <Text style={styles.sectionTitle}>지출 내역</Text>
                    <Pressable 
                      style={styles.addButton}
                      onPress={() => {
                        setShowExpenseForm(true);
                        setShowExpenseEditForm(false);
                        setEditingExpense(null);
                        setExpenseFormData({
                          category: ExpenseCategory.FOOD,
                          amount: '',
                          description: '',
                          ex_date: dayjs().format('YYYY-MM-DD'),
                          currency: ExpenseCurrency.KRW,
                        });
                      }}
                    >
                      <Text style={styles.addButtonText}>+ 추가</Text>
                    </Pressable>
                  </View>
                  
                  {/* 총 지출 */}
                  <View style={styles.totalExpenseContainer}>
                    <Text style={styles.totalExpenseText}>
                      총 지출: {formatCurrency(getTotalExpense(), expenseFormData.currency)}
                    </Text>
                  </View>

                  {/* 카테고리별 지출 */}
                  {getCategoryExpenses().length > 0 && (
                    <View style={styles.categoryExpenseContainer}>
                      <Text style={styles.categoryExpenseTitle}>지출 내역 상세</Text>
                  {getCategoryExpenses().map(({ category, amount }) => (
                        <View key={category} style={styles.categoryExpenseItem}>
                          <Text style={styles.categoryExpenseName}>{getCategoryName(category)}</Text>
                      <Text style={styles.categoryExpenseAmount}>{formatCurrency(amount, expenseFormData.currency)}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 개별 지출 내역 */}
                  {expenses.length === 0 ? (
                    <Text style={styles.emptyText}>지출 내역이 없습니다. 지출을 추가해보세요!</Text>
                  ) : (
                    <View style={styles.expenseListContainer}>
                      {getCategoryExpenses().map(({ category }) => {
                        const categoryExpenses = expenses.filter(expense => expense.category === category);
                        return (
                          <View key={category} style={styles.expenseCategoryGroup}>
                            <Text style={styles.expenseCategoryTitle}>{getCategoryName(category)}</Text>
                              {categoryExpenses.map(expense => (
                              <Pressable key={expense.id} style={styles.expenseItem} onPress={() => handleStartEditExpense(expense as any)}>
                                <View style={styles.expenseItemLeft}>
                                  <Text style={styles.expenseItemDate}>
                                    {dayjs(expense.ex_date).format('MMM DD')}
                                  </Text>
                                  {expense.description && (
                                    <Text style={styles.expenseItemDescription}>{expense.description}</Text>
                                  )}
                                </View>
                                <View style={styles.expenseItemRight}>
                                  <Text style={styles.expenseItemAmount}>{formatCurrency(expense.amount, expense.currency)}</Text>
                                  <Pressable 
                                    style={styles.deleteIcon}
                                    onPress={() => deleteExpense(expense.id)}
                                  >
                                    <Text style={styles.deleteIconText}>🗑️</Text>
                                  </Pressable>
                                </View>
                              </Pressable>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : showExpenseForm ? (
                renderExpenseForm()
              ) : (
                renderExpenseEditForm()
              )}
            </View>
        </List.Accordion>
      </List.Section>
    </ScrollView>

      {/* 시작 시간 선택 모달 */}
      {showStartTimePicker && (
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>시작 시간 선택</Text>
            <ScrollView style={styles.timeList}>
              {timeOptions.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeOption,
                    formData.startTime === time && styles.selectedTimeOption
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, startTime: time }));
                    setShowStartTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timeOptionText,
                    formData.startTime === time && styles.selectedTimeOptionText
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={styles.timeModalButton}
              onPress={() => setShowStartTimePicker(false)}
            >
              <Text style={styles.timeModalButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 종료 시간 선택 모달 */}
      {showEndTimePicker && (
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalContent}>
            <Text style={styles.timeModalTitle}>종료 시간 선택</Text>
            <ScrollView style={styles.timeList}>
              {timeOptions.map((time) => (
                <Pressable
                  key={time}
                  style={[
                    styles.timeOption,
                    formData.endTime === time && styles.selectedTimeOption
                  ]}
                  onPress={() => {
                    setFormData(prev => ({ ...prev, endTime: time }));
                    setShowEndTimePicker(false);
                  }}
                >
                  <Text style={[
                    styles.timeOptionText,
                    formData.endTime === time && styles.selectedTimeOptionText
                  ]}>
                    {time}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable 
              style={styles.timeModalButton}
              onPress={() => setShowEndTimePicker(false)}
            >
              <Text style={styles.timeModalButtonText}>취소</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  itinerarySection: {
    padding: 16,
  },
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6c757d',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
  },
  itineraryItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itineraryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  itineraryTime: {
    fontSize: 12,
    color: '#6c757d',
  },
  itineraryLocation: {
    fontSize: 12,
    color: '#495057',
    marginTop: 4,
  },
  itineraryContent: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  flightSection: {
    padding: 16,
  },
  flightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flightItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  flightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  flightRoute: {
    fontSize: 12,
    color: '#6c757d',
  },
  flightDetails: {
    marginTop: 4,
    marginBottom: 8,
  },
  flightTime: {
    fontSize: 12,
    color: '#495057',
  },
  flightSeat: {
    fontSize: 12,
    color: '#495057',
    marginTop: 4,
  },
  flightDuration: {
    fontSize: 12,
    color: '#495057',
    marginTop: 4,
  },
  flightMemo: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  accommodationSection: {
    padding: 16,
  },
  accommodationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  accommodationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  accommodationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  accommodationDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  accommodationAddress: {
    fontSize: 12,
    color: '#495057',
    marginTop: 4,
  },
  accommodationMemo: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  accommodationFormContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#343a40',
  },
  textArea: {
    minHeight: 60,
    paddingTop: 8,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 4,
  },
  datePicker: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#343a40',
  },
  dateTimePicker: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#343a40',
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#343a40',
  },
  timeText: {
    fontSize: 14,
    color: '#343a40',
  },
  arrow: {
    fontSize: 16,
    color: '#6c757d',
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6c757d',
    marginBottom: 4,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
  },
  currencyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  currencyOption: {
    backgroundColor: '#e9ecef',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  currencyOptionText: {
    fontSize: 12,
    color: '#343a40',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#dc3545',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#28a745',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  timeModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  timeModalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  timeModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 20,
  },
  timeList: {
    maxHeight: 200,
    width: '100%',
  },
  timeOption: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedTimeOption: {
    backgroundColor: '#e9ecef',
    borderRadius: 5,
  },
  timeOptionText: {
    fontSize: 16,
    color: '#343a40',
  },
  selectedTimeOptionText: {
    color: '#007bff',
    fontWeight: '600',
  },
  timeModalButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#6c757d',
    borderRadius: 6,
    alignItems: 'center',
  },
  timeModalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  categoryButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginVertical: 5,
    marginHorizontal: 5,
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#343a40',
  },
  selectedCategoryButton: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
    borderWidth: 1,
  },
  selectedCategoryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  expenseDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  expenseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc3545',
  },
  expenseDescription: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  expenseSection: {
    padding: 16,
  },
  totalExpenseContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  totalExpenseText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc3545',
  },
  categoryExpenseContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  categoryExpenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  categoryExpenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryExpenseName: {
    fontSize: 14,
    color: '#495057',
  },
  categoryExpenseAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
  },
  expenseListContainer: {
    // No specific styles needed for the container, items will have their own styles
  },
  expenseCategoryGroup: {
    marginBottom: 12,
  },
  expenseCategoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  expenseItemLeft: {
    flex: 1,
  },
  expenseItemDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2,
  },
  expenseItemDescription: {
    fontSize: 12,
    color: '#495057',
  },
  expenseItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc3545',
    marginRight: 10,
  },
  deleteIcon: {
    padding: 5,
  },
  deleteIconText: {
    fontSize: 18,
    color: '#dc3545',
  },
});