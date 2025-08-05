import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { List } from 'react-native-paper';
import DateRangePicker from '@/components/DateRangePicker';
import DateTimePicker from '@/components/DateTimePicker';
import dayjs from 'dayjs';

interface SidePanelsProps {
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

function Placeholder({ label }: { label: string }) {
  return (
    <View style={{ padding: 16 }}>
      <Text>{label} – Coming soon…</Text>
    </View>
  );
}

export default function SidePanels({ onItineraryAdd: externalOnItineraryAdd, onFlightAdd: externalOnFlightAdd, onAccommodationAdd: externalOnAccommodationAdd, onExpenseAdd: externalOnExpenseAdd }: SidePanelsProps) {
    const [open, setOpen] = useState<string | undefined>();
    const [showItineraryForm, setShowItineraryForm] = useState(false);
    const [showFlightForm, setShowFlightForm] = useState(false);
    const [showAccommodationForm, setShowAccommodationForm] = useState(false);
    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [itineraries, setItineraries] = useState<any[]>([]);
    const [flights, setFlights] = useState<Flight[]>([]);
    const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    
    // 일정 폼 데이터
    const [formData, setFormData] = useState({
      title: '',
      content: '',
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
    });

  const handleToggle = (key: string) => {
    setOpen(prev => (prev === key ? undefined : key));
  };

  // 일정 저장 함수
  const handleSaveItinerary = () => {
    if (!formData.title.trim()) {
      Alert.alert('오류', '제목을 입력해주세요.');
      return;
    }
    if (!formData.date) {
      Alert.alert('오류', '날짜를 선택해주세요.');
      return;
    }

    const itinerary = {
      id: Date.now().toString(),
      title: formData.title,
      content: formData.content,
      country: formData.country,
      city: formData.city,
      location: formData.location,
      itinerary_date: formData.date,
      start_time: formData.startTime,
      end_time: formData.endTime,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
    };

    setItineraries(prev => [...prev, itinerary]);
    
    // 외부 콜백도 호출
    externalOnItineraryAdd?.(itinerary);
    
    // 폼 초기화
    setFormData({
      title: '',
      content: '',
      country: '',
      city: '',
      location: '',
      date: dayjs().format('YYYY-MM-DD'),
      startTime: '09:00',
      endTime: '10:00',
    });
    
    // 폼 닫기
    setShowItineraryForm(false);
  };

  // 항공 저장 함수
  const handleSaveFlight = () => {
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

    const flight = {
      id: Date.now().toString(),
      airline: flightFormData.airline,
      flight_number: flightFormData.flight_number,
      departure_airport: flightFormData.departure_airport,
      arrival_airport: flightFormData.arrival_airport,
      departure_time: flightFormData.departure_time,
      arrival_time: flightFormData.arrival_time,
      seat_class: flightFormData.seat_class,
      seat_number: flightFormData.seat_number,
      duration: flightFormData.duration,
      memo: flightFormData.memo,
    };

    setFlights(prev => [...prev, flight]);
    
    // 외부 콜백도 호출
    externalOnFlightAdd?.(flight);
    
    // 폼 초기화
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
    
    // 폼 닫기
    setShowFlightForm(false);
  };

  // 숙박 저장 함수
  const handleSaveAccommodation = () => {
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

    const accommodation = {
      id: Date.now().toString(),
      name: accommodationFormData.name,
      address: accommodationFormData.address,
      start_date: accommodationFormData.start_date,
      end_date: accommodationFormData.end_date,
      memo: accommodationFormData.memo,
    };

    setAccommodations(prev => [...prev, accommodation]);
    
    // 외부 콜백도 호출
    externalOnAccommodationAdd?.(accommodation);
    
    // 폼 초기화
    setAccommodationFormData({
      name: '',
      address: '',
      start_date: dayjs().format('YYYY-MM-DD'),
      end_date: dayjs().add(1, 'day').format('YYYY-MM-DD'),
      memo: '',
    });
    
    // 폼 닫기
    setShowAccommodationForm(false);
  };

  // 지출 저장 함수
  const handleSaveExpense = () => {
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

    const expense = {
      id: Date.now().toString(),
      category: expenseFormData.category,
      amount: Number(expenseFormData.amount),
      description: expenseFormData.description,
      ex_date: expenseFormData.ex_date,
    };

    setExpenses(prev => [...prev, expense]);
    
    // 외부 콜백도 호출
    externalOnExpenseAdd?.(expense);
    
    // 폼 초기화
    setExpenseFormData({
      category: ExpenseCategory.FOOD,
      amount: '',
      description: '',
      ex_date: dayjs().format('YYYY-MM-DD'),
    });
    
    // 폼 닫기
    setShowExpenseForm(false);
  };

  const handleCancelForm = () => {
    setShowItineraryForm(false);
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

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
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

  const renderItineraryItem = (itinerary: any) => (
    <View key={itinerary.id} style={styles.itineraryItem}>
      <View style={styles.itineraryHeader}>
        <Text style={styles.itineraryTitle}>{itinerary.title}</Text>
        <Text style={styles.itineraryTime}>
          {itinerary.start_time} - {itinerary.end_time}
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
    </View>
  );

  const renderFlightItem = (flight: Flight) => (
    <View key={flight.id} style={styles.flightItem}>
      <View style={styles.flightHeader}>
        <Text style={styles.flightTitle}>{flight.airline} {flight.flight_number}</Text>
        <Text style={styles.flightRoute}>
          {flight.departure_airport} → {flight.arrival_airport}
        </Text>
      </View>
      <View style={styles.flightDetails}>
        <Text style={styles.flightTime}>
          출발: {dayjs(flight.departure_time).format('M월 D일 HH:mm')} | 도착: {dayjs(flight.arrival_time).format('M월 D일 HH:mm')}
        </Text>
        {flight.seat_class && flight.seat_number && (
          <Text style={styles.flightSeat}>
            좌석: {flight.seat_class} {flight.seat_number}
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
    </View>
  );

  const renderAccommodationItem = (accommodation: Accommodation) => (
    <View key={accommodation.id} style={styles.accommodationItem}>
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
    </View>
  );

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

      {/* 금액 */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>금액</Text>
        <TextInput
          style={styles.input}
          placeholder="금액을 입력하세요"
          value={expenseFormData.amount}
          onChangeText={(text) => setExpenseFormData(prev => ({ ...prev, amount: text }))}
          keyboardType="numeric"
        />
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
          value={formData.content}
          onChangeText={(text) => setFormData(prev => ({ ...prev, content: text }))}
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
          <Text style={styles.saveButtonText}>저장</Text>
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

      {/* 버튼 */}
      <View style={styles.buttonContainer}>
        <Pressable 
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancelFlightForm}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable 
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveFlight}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
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
              {!showItineraryForm ? (
                <>
                  <View style={styles.itineraryHeader}>
                    <Text style={styles.sectionTitle}>일정 목록</Text>
                    <Pressable 
                      style={styles.addButton}
                      onPress={() => setShowItineraryForm(true)}
                    >
                      <Text style={styles.addButtonText}>+ 일정 추가</Text>
                    </Pressable>
                  </View>
                  
                  {itineraries.length === 0 ? (
                    <Text style={styles.emptyText}>일정이 없습니다. 일정을 추가해보세요!</Text>
                  ) : (
                    itineraries.map(renderItineraryItem)
                  )}
                </>
              ) : (
                renderItineraryForm()
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
                      onPress={() => setShowFlightForm(true)}
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
                      onPress={() => setShowAccommodationForm(true)}
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

                  {/* 버튼 */}
                  <View style={styles.buttonContainer}>
                    <Pressable 
                      style={[styles.button, styles.cancelButton]}
                      onPress={handleCancelAccommodationForm}
                    >
                      <Text style={styles.cancelButtonText}>취소</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.button, styles.saveButton]}
                      onPress={handleSaveAccommodation}
                    >
                      <Text style={styles.saveButtonText}>저장</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </List.Accordion>

          <List.Accordion
            title="비용"
            expanded={open === 'expense'}
            onPress={() => handleToggle('expense')}
          >
            <View style={styles.expenseSection}>
              {!showExpenseForm ? (
                <>
                  <View style={styles.expenseHeader}>
                    <Text style={styles.sectionTitle}>지출 내역</Text>
                    <Pressable 
                      style={styles.addButton}
                      onPress={() => setShowExpenseForm(true)}
                    >
                      <Text style={styles.addButtonText}>+ 추가</Text>
                    </Pressable>
                  </View>
                  
                  {/* 총 지출 */}
                  <View style={styles.totalExpenseContainer}>
                    <Text style={styles.totalExpenseText}>
                      총 지출: {formatCurrency(getTotalExpense())}
                    </Text>
                  </View>

                  {/* 카테고리별 지출 */}
                  {getCategoryExpenses().length > 0 && (
                    <View style={styles.categoryExpenseContainer}>
                      <Text style={styles.categoryExpenseTitle}>지출 내역 상세</Text>
                      {getCategoryExpenses().map(({ category, amount }) => (
                        <View key={category} style={styles.categoryExpenseItem}>
                          <Text style={styles.categoryExpenseName}>{getCategoryName(category)}</Text>
                          <Text style={styles.categoryExpenseAmount}>{formatCurrency(amount)}</Text>
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
                              <View key={expense.id} style={styles.expenseItem}>
                                <View style={styles.expenseItemLeft}>
                                  <Text style={styles.expenseItemDate}>
                                    {dayjs(expense.ex_date).format('MMM DD')}
                                  </Text>
                                  {expense.description && (
                                    <Text style={styles.expenseItemDescription}>{expense.description}</Text>
                                  )}
                                </View>
                                <View style={styles.expenseItemRight}>
                                  <Text style={styles.expenseItemAmount}>{formatCurrency(expense.amount)}</Text>
                                  <Pressable 
                                    style={styles.deleteIcon}
                                    onPress={() => deleteExpense(expense.id)}
                                  >
                                    <Text style={styles.deleteIconText}>🗑️</Text>
                                  </Pressable>
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : (
                renderExpenseForm()
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 5,
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
  expenseItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
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