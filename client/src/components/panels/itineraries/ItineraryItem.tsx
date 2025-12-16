import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import { TimePicker, CountryPicker, CategoryPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import dayjs from 'dayjs';
import { itinerariesApi } from '@/services/itineraries';
import { expensesApi } from '@/services/expenses';
import { ExpenseCategory, ExpenseCurrency, categoryLabels, currencyLabels } from '@/types/expense';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import DeleteIcon from '../../../../assets/delete.svg';
import CloseIcon from '../../../../assets/delete_ai.svg';
import AddIcon from '../../../../assets/add.svg';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CalendarIcon from '../../../../assets/calender.svg';
import WarningBanner from '@/ui/components/toast/warning';

interface ItineraryItemProps {
  itinerary?: any;
  planId: number;
  planData?: any;
  onSave: (itinerary: any) => void;
  onCancel: () => void;
  onDelete?: (itineraryId: string) => void;
  onExpenseUpdate?: () => void;
  selectedDate?: Date; // 선택된 날짜
  onShowWarning?: () => void;
  readOnly?: boolean; // 읽기 전용 모드
  onEdit?: () => void; // 편집 버튼 클릭 핸들러
}

export default function ItineraryItem({ 
  itinerary, 
  planId, 
  planData,
  onSave, 
  onCancel, 
  onDelete,
  onExpenseUpdate,
  selectedDate,
  onShowWarning,
  readOnly = false,
  onEdit
}: ItineraryItemProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [formData, setFormData] = useState({
    title: itinerary?.title || '',
    description: itinerary?.description || '',
    country: itinerary?.country || '',
    city: itinerary?.city || '',
    location: itinerary?.location || '',
    itineraryDate: itinerary?.itinerary_date || (selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD')),
    startTime: itinerary?.start_time || (selectedDate ? dayjs(selectedDate).format('HH:mm') : '09:00'),
    endTime: itinerary?.end_time || (selectedDate ? dayjs(selectedDate).add(1, 'hour').format('HH:mm') : '10:00'),
  });

  // selectedDate가 변경될 때 폼 데이터 업데이트
  React.useEffect(() => {
    if (selectedDate && !itinerary) { // 새 일정 추가일 때만
      setFormData(prev => ({
        ...prev,
        itineraryDate: dayjs(selectedDate).format('YYYY-MM-DD'),
        startTime: dayjs(selectedDate).format('HH:mm'),
        endTime: dayjs(selectedDate).add(1, 'hour').format('HH:mm'),
      }));
    }
  }, [selectedDate, itinerary]);

  // formData 변경 시 미리보기 업데이트 (새 일정 추가 모드일 때만, readOnly가 아닐 때만)
  React.useEffect(() => {
    if (!itinerary && !readOnly && typeof window !== 'undefined') {
      // 미리보기 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('itinerary-preview-update', {
        detail: {
          title: formData.title || '제목없음',
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
        }
      }));
    }
  }, [formData, itinerary, readOnly]);

  // 국가 드롭다운 상태 및 옵션 (ISO 3166 → 한국어 라벨)
  const [countryOpen, setCountryOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 비용 관련 상태
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: '',
  });
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // 새 일정 생성 중 비용 초안 (로컬 상태)
  const [draftExpenses, setDraftExpenses] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false); // 버튼 비활성화용 (리렌더링 필요)
  const isSubmittingRef = useRef(false); // 중복 요청 방지 플래그

  // itinerary prop이 변경될 때 formData 업데이트
  useEffect(() => {
    if (itinerary) {
      // 백엔드에서 받은 23:59:59를 24:00으로 표시
      let endTimeRaw = itinerary.end_time || itinerary.endTime || '10:00';
      let endTime = endTimeRaw.substring(0, 5);
      // 23:59:59 또는 23:59를 24:00으로 변환
      if (endTime === '23:59' || endTimeRaw.startsWith('23:59:')) {
        endTime = '24:00';
      }
      
      setFormData({
        title: itinerary.title || '',
        description: itinerary.description || '',
        country: itinerary.country || '',
        city: itinerary.city || '',
        location: itinerary.location || '',
        itineraryDate: itinerary.itinerary_date || itinerary.itineraryDate || dayjs().format('YYYY-MM-DD'),
        startTime: (itinerary.start_time || itinerary.startTime || '09:00').substring(0, 5),
        endTime: endTime,
      });
    } else {
      const defaultDate = selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const defaultStartTime = selectedDate ? dayjs(selectedDate).format('HH:mm') : '09:00';
      const defaultEndTime = selectedDate ? dayjs(selectedDate).add(1, 'hour').format('HH:mm') : '10:00';
      
      setFormData({
        title: '',
        description: '',
        country: '',
        city: '',
        location: '',
        itineraryDate: defaultDate,
        startTime: defaultStartTime,
        endTime: defaultEndTime,
      });
      
      setExpenses([]);
      setDraftExpenses([]);
      setShowExpenseForm(false);
      setExpenseForm({
        category: ExpenseCategory.ETC,
        amount: 0,
        description: '',
      });
    }
  }, [itinerary, selectedDate]);

  // 기존 비용 불러오기
  useEffect(() => {
    const loadExpenses = async () => {
      if (itinerary?.id) {
        // planData.expenses에서 먼저 확인 (캐시에서 가져오기 - GET 요청 없음)
        const cachedExpenses = planData?.expenses?.filter(
          (e: any) => e.itineraryId === itinerary.id
        ) || [];
        
        // 캐시에 데이터가 있으면 사용, 없으면 API 호출
        if (cachedExpenses.length > 0) {
          setExpenses(cachedExpenses);
        } else {
          // 캐시에 없을 때만 API 호출
          try {
            const itineraryExpenses = await expensesApi.getExpensesByItinerary(itinerary.id);
            setExpenses(itineraryExpenses);
          } catch (error) {
            console.error('Failed to load expenses:', error);
          }
        }
      } else {
        // itinerary가 없으면 비용 목록 초기화
        setExpenses([]);
      }
    };

    loadExpenses();
  }, [itinerary?.id, planData?.expenses]);

  const handleSave = async () => {
    // 중복 요청 방지: 이미 실행 중이면 무시
    if (isSubmittingRef.current) {
      return;
    }

    // 필수 값 검증
    if (!formData.title.trim() || 
        !formData.itineraryDate || 
        !formData.startTime || 
        !formData.endTime) {
      setWarningMessage('입력되지 않은 값이 있어요.');
      setShowWarning(true);
      onShowWarning?.();
      return;
    }


    // 실행 중 플래그 설정
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 24:00을 23:59:59로 변환 (백엔드 time 타입은 24:00을 허용하지 않음)
      const finalEndTime = formData.endTime === '24:00' ? '23:59:59' : formData.endTime;
      
      let savedItinerary;
      if (itinerary) {
        savedItinerary = await itinerariesApi.updateItinerary(itinerary.id, {
          title: formData.title,
          description: formData.description,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
          startTime: formData.startTime,
          endTime: finalEndTime,
        });
        
        // 일정 날짜가 실제로 변경된 경우에만 expense 날짜 업데이트
        const originalDate = itinerary.itinerary_date || itinerary.itineraryDate;
        const newDate = formData.itineraryDate;
        // dayjs로 날짜 비교 (형식 차이 고려)
        if (originalDate && newDate && dayjs(originalDate).format('YYYY-MM-DD') !== dayjs(newDate).format('YYYY-MM-DD')) {
          // 캐시에서 먼저 가져오기 (GET 요청 없음)
          const cachedExpenses = planData?.expenses?.filter((expense: any) => 
            expense.itineraryId === itinerary.id
          ) || [];
          
          // 캐시에 없을 때만 API 호출
          let connectedExpenses = cachedExpenses;
          if (cachedExpenses.length === 0) {
            const allExpenses = await expensesApi.getExpenses(planId);
            connectedExpenses = allExpenses.filter((expense: any) => 
              expense.itineraryId === itinerary.id
            );
          }
          
          for (const expense of connectedExpenses) {
            try {
              // API 응답 객체를 받아서 캐시에 업데이트 (expense 패널에 즉시 반영)
              const updatedExpense = await expensesApi.updateExpense(expense.id, {
                ...expense,
                exDate: formData.itineraryDate,
              });
              
              // 서버 응답 객체를 캐시에 반영
              if (planData?.addExpense) {
                planData.addExpense(updatedExpense);
              }
            } catch (e) {
              console.warn('Failed to update expense date:', e);
            }
          }
        }
        
        if (draftExpenses.length > 0) {
          try {
            // 배치 API로 모든 비용을 한 번에 생성
            const createdExpenses = await expensesApi.createExpensesBatch({
              planId: planId,
              itineraryId: itinerary.id,
              expenses: draftExpenses.map(draftExpense => ({
                category: draftExpense.category as any,
                amount: draftExpense.amount,
                description: draftExpense.description,
                exDate: draftExpense.exDate,
                currency: draftExpense.currency as any,
              })),
            });
            // 응답 객체들을 캐시에 추가
            if (planData?.addExpense) {
              createdExpenses.forEach(expense => {
                planData.addExpense(expense);
              });
            }
          } catch (e) {
            console.warn('Failed to create draft expenses:', e);
          }
          setDraftExpenses([]); // 초안 비우기
        }
      } else {
        // 추가
        savedItinerary = await itinerariesApi.createItinerary({
          planId: planId,
          title: formData.title,
          description: formData.description,
          country: formData.country?.trim() || undefined,
          city: formData.city?.trim() || undefined,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
          startTime: formData.startTime,
          endTime: finalEndTime,
        });
        
        // 새 일정 생성 후 draft expenses 배치로 저장
        if (draftExpenses.length > 0) {
          try {
            // 배치 API로 모든 비용을 한 번에 생성
            const createdExpenses = await expensesApi.createExpensesBatch({
              planId: planId,
              itineraryId: savedItinerary.id,
              expenses: draftExpenses.map(draftExpense => ({
                category: draftExpense.category as any,
                amount: draftExpense.amount,
                description: draftExpense.description,
                exDate: draftExpense.exDate,
                currency: draftExpense.currency as any,
              })),
            });
            // 응답 객체들을 캐시에 추가
            if (planData?.addExpense) {
              createdExpenses.forEach(expense => {
                planData.addExpense(expense);
              });
            }
          } catch (e) {
            console.warn('Failed to create draft expenses:', e);
          }
          setDraftExpenses([]); // 초안 비우기
        }
      }
      
      // 미리보기 제거 이벤트 발생
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('itinerary-preview-clear'));
      }
      
      onSave(savedItinerary);
    } catch (error) {
      console.error('Failed to save itinerary:', error);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    // 일정 추가 모드: 입력창 닫기
    if (!itinerary) {
      // 미리보기 제거 이벤트 발생
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('itinerary-preview-clear'));
      }
      onCancel();
      return;
    }
    
    if (itinerary && onDelete) {
      try {
        await itinerariesApi.deleteItinerary(itinerary.id);
        onDelete(itinerary.id);
        onCancel();
      } catch (error) {
        console.error('Failed to delete itinerary:', error);
      }
    }
  };

  // 비용 관련 핸들러
  const handleExpenseSubmit = async () => {
    if (expenseForm.amount <= 0) {
      Alert.alert('오류', '금액을 입력해주세요.');
      return;
    }

    // 편집 모드인 경우
    if (editingExpense && !editingExpense.isDraft) {
      try {
        // API 응답 객체를 받아서 캐시에 업데이트 (expense 패널에 즉시 반영)
        const updatedExpense = await expensesApi.updateExpense(Number(editingExpense.id), {
          category: expenseForm.category,
          amount: expenseForm.amount,
          description: expenseForm.description,
        });
        
        // 캐시 업데이트 (expense 패널에 즉시 반영)
        if (planData?.addExpense) {
          planData.addExpense(updatedExpense);
        }
        
        // 로컬 상태도 업데이트 (일정 상세에 즉시 반영)
        setExpenses(prev => prev.map(exp => 
          exp.id === updatedExpense.id ? updatedExpense : exp
        ));
        
        setExpenseForm({
          category: ExpenseCategory.ETC,
          amount: 0,
          description: '',
        });
        setEditingExpense(null);
        setShowExpenseForm(false);
        
        Alert.alert('성공', '비용이 수정되었습니다.');
        return;
      } catch (error) {
        console.error('Failed to update expense:', error);
        Alert.alert('오류', '비용 수정에 실패했습니다.');
        return;
      }
    }

    // draft expense 편집 모드인 경우
    if (editingExpense && editingExpense.isDraft) {
      const draftIndex = Number(editingExpense.id.split('-')[1]);
      setDraftExpenses(prev => {
        const updated = [...prev];
        updated[draftIndex] = {
          ...updated[draftIndex],
          category: expenseForm.category,
          amount: expenseForm.amount,
          description: expenseForm.description,
        };
        return updated;
      });
      
      setExpenseForm({
        category: ExpenseCategory.ETC,
        amount: 0,
        description: '',
      });
      setEditingExpense(null);
      setShowExpenseForm(false);
      
      Alert.alert('성공', '비용이 수정되었습니다. (일정 저장 시 함께 저장됩니다)');
      return;
    }

    // 새 일정 생성 중에는 로컬 상태에만 저장
    if (!itinerary?.id) {
      const newDraftExpense = {
        category: expenseForm.category,
        amount: expenseForm.amount,
        description: expenseForm.description,
        exDate: formData.itineraryDate,
        currency: ExpenseCurrency.KRW,
      };
      
      setDraftExpenses(prev => [...prev, newDraftExpense]);
      
      setExpenseForm({
        category: ExpenseCategory.ETC,
        amount: 0,
        description: '',
      });
      setShowExpenseForm(false);
      
      Alert.alert('성공', '비용이 추가되었습니다. (일정 저장 시 함께 저장됩니다)');
      return;
    }

    const newDraftExpense = {
      category: expenseForm.category,
      amount: expenseForm.amount,
      description: expenseForm.description,
      exDate: formData.itineraryDate,
      currency: ExpenseCurrency.KRW,
    };
    
    setDraftExpenses(prev => [...prev, newDraftExpense]);
    
    setExpenseForm({
      category: ExpenseCategory.ETC,
      amount: 0,
      description: '',
    });
    setShowExpenseForm(false);
    
    Alert.alert('성공', '비용이 추가되었습니다. (일정 저장 시 함께 저장됩니다)');
  };

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(Number(expenseId));
      
      // 캐시에서 제거 (expense 패널에 즉시 반영)
      if (planData?.removeExpense) {
        planData.removeExpense(Number(expenseId));
      }
      
      // 로컬 상태에서도 제거 (일정 상세에 즉시 반영)
      setExpenses(prev => prev.filter(exp => exp.id !== Number(expenseId)));
      
      Alert.alert('성공', '비용이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      Alert.alert('오류', '비용 삭제에 실패했습니다.');
    }
  };

  // 모든 비용 (draft + saved)
  const allExpenses = useMemo(() => {
    const draft = draftExpenses.map((exp, idx) => ({ ...exp, id: `draft-${idx}`, isDraft: true }));
    const saved = expenses.map(exp => ({ ...exp, isDraft: false }));
    return [...draft, ...saved];
  }, [draftExpenses, expenses]);

  // 편집 폼 레이아웃 (readOnly일 때도 동일한 구조, 테두리 스타일만 다름)
  return (
    <>
    <ScrollView 
      style={[styles.container, { position: 'relative', overflow: 'visible' }]}
      contentContainerStyle={[styles.contentContainer, { overflow: 'visible' }]}
    >
      <View style={styles.contentWrapper}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {readOnly ? '일정 정보' : (itinerary ? '일정 수정' : '일정 추가')}
          </Text>

          <Pressable
            onPress={() => {onCancel();}}
            style={styles.closeButton}
          >
            <CloseIcon width={24} height={24} />
          </Pressable>

        </View>
      <View style={styles.inputGroup}>
          <Text style={styles.label}>제목*</Text>
        <Input
            variant={readOnly ? "outlined" : "filled"}
            placeholder={PLACEHOLDERS.itinerary.titleForm}
          value={formData.title}
            onChangeText={(text) => !readOnly && setFormData({ ...formData, title: text })}
            style={readOnly ? styles.readOnlyInput : styles.input}
            placeholderTextColor={colors.gray600}
            editable={!readOnly}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <Input
            variant={readOnly ? "outlined" : "filled"}
            placeholder={PLACEHOLDERS.itinerary.descriptionForm}
          value={formData.description}
          onChangeText={(text) => !readOnly && setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
            style={readOnly ? styles.readOnlyTextArea : styles.textArea}
            placeholderTextColor={colors.gray600}
            editable={!readOnly}
        />
      </View>

      <View style={[styles.row, styles.pickerRowWrapper, { zIndex: countryOpen ? 10001 : 1 }]}>
        <View style={[styles.inputGroup, styles.halfWidth, styles.countryPickerWrapper]}>
            <Text style={styles.label}>국가</Text>
          <CountryPicker
            value={formData.country}
            onChange={(name: string) => !readOnly && setFormData({ ...formData, country: name })}
            onOpen={() => !readOnly && setCountryOpen(true)}
            onClose={() => setCountryOpen(false)}
              placeholder={PLACEHOLDERS.itinerary.countryForm}
              disabled={readOnly}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}> 
            <Text style={styles.label}>도시</Text>
          <Input
              variant={readOnly ? "outlined" : "filled"}
              placeholder={PLACEHOLDERS.itinerary.cityForm}
            value={formData.city}
            onChangeText={(text) => !readOnly && setFormData({ ...formData, city: text })}
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <Input
            variant={readOnly ? "outlined" : "filled"}
            placeholder="장소를 입력하세요."
          value={formData.location}
            onChangeText={(text) => !readOnly && setFormData({ ...formData, location: text })}
            style={readOnly ? styles.readOnlyInput : styles.input}
            placeholderTextColor={colors.gray600}
            editable={!readOnly}
        />
      </View>

      <View style={[styles.inputGroup, styles.datePickerWrapper, { zIndex: showDatePicker ? 20000 : 1 }]}>
        <Text style={styles.label}>날짜*</Text>
        <Pressable 
          style={readOnly ? styles.readOnlyDateInput : styles.dateInput} 
          onPress={() => !readOnly && setShowDatePicker(!showDatePicker)}
          disabled={readOnly}
        >
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateText}>
              {dayjs(formData.itineraryDate).format('YYYY년 M월 D일')}
            </Text>
              <View style={styles.iconWrapper}>
                <CalendarIcon width={16} height={16} />
              </View>
          </View>
        </Pressable>
        {!readOnly && (
          <BaseCalendar
            visible={showDatePicker}
            selectedDate={formData.itineraryDate}
            onDayPress={(day) => {
              setFormData({ ...formData, itineraryDate: day.dateString });
              setShowDatePicker(false);
            }}
            onClose={() => setShowDatePicker(false)}
            style={styles.calendarPopup}
            hideButtons={true}
            autoCloseOnSelect={true}
          />
        )}
      </View>

        <View style={[styles.row, styles.pickerRowWrapper, { zIndex: timeOpen ? 10001 : 1 }]}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>시작 시간*</Text>
          <TimePicker
            value={formData.startTime}
            onChange={(time) => !readOnly && setFormData({ ...formData, startTime: time })}
            onOpen={() => {
              if (!readOnly) {
                setTimeOpen(true);
              }
            }}
            onClose={() => setTimeOpen(false)}
            disabled={readOnly}
            style={readOnly ? {
              backgroundColor: colors.gray200,
              borderColor: colors.gray400,
              borderWidth: 1,
            } : undefined}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>종료 시간*</Text>
          <TimePicker
            value={formData.endTime}
            onChange={(time) => !readOnly && setFormData({ ...formData, endTime: time })}
            onOpen={() => {
              if (!readOnly) {
                setTimeOpen(true);
              }
            }}
            onClose={() => setTimeOpen(false)}
            minTime={formData.startTime}
            disabled={readOnly}
            style={readOnly ? {
              backgroundColor: colors.gray200,
              borderColor: colors.gray400,
              borderWidth: 1,
            } : undefined}
          />
          </View>
        </View>

      {/* 비용 추가 섹션 */}
      {(!readOnly || allExpenses.length > 0) && (
        <View style={styles.expenseSection}>
          <Text style={styles.label}>비용 내역</Text>
        
        {/* 비용 카드 목록 */}
        {allExpenses.length > 0 && (
          <View style={styles.expenseList}>
            {allExpenses.map((expense) => (
              <Pressable
                key={expense.id}
                style={[styles.expenseCard, readOnly && {
                  borderWidth: 1,
                  borderColor: colors.gray400,
                }]}
                onPress={() => {
                  if (!readOnly) {
                    setEditingExpense(expense);
                    setExpenseForm({
                      category: expense.category as ExpenseCategory,
                      amount: expense.amount,
                      description: expense.description || '',
                    });
                    setShowExpenseForm(true);
                  }
                }}
                disabled={readOnly}
              >
                <View style={styles.expenseCardContent}>
                  <View style={styles.expenseCardHeader}>
                    <Text style={styles.expenseCardTitle}>
                      {categoryLabels[expense.category as ExpenseCategory]}
                    </Text>
                    {!readOnly && (
                      <Pressable
                        style={styles.deleteExpenseButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (expense.isDraft) {
                            setDraftExpenses(prev => prev.filter((_, i) => i !== Number(expense.id.split('-')[1])));
                          } else {
                            handleExpenseDelete(expense.id);
                          }
                        }}
                      >
                        <DeleteIcon width={16} height={16} />
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.expenseCardDescription}>{expense.description || ''}</Text>
                  <Text style={styles.expenseCardAmount}>
                    ₩{expense.amount.toLocaleString()}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* 비용 추가 버튼 */}
        {!readOnly && (
          <Pressable
            style={styles.addExpenseButton}
            onPress={() => {
              setEditingExpense(null);
              setExpenseForm({
                category: ExpenseCategory.ETC,
                amount: 0,
                description: '',
              });
              setShowExpenseForm(!showExpenseForm);
            }}
          >
            <View style={styles.addIconWrapper}>
              <AddIcon width={16} height={16} />
            </View>
            <Text style={styles.addExpenseButtonText}>비용 내역 추가</Text>
          </Pressable>
        )}

        {/* 비용 추가 폼 */}
        {showExpenseForm && (
          <View style={styles.expenseForm}>
            <View style={[styles.expenseFormRow, { zIndex: expenseOpen ? 10001 : 1 }]}>
              <View style={styles.expenseFormHalf}>
            <Text style={styles.label}>카테고리</Text>
            <CategoryPicker
              value={expenseForm.category}
              onChange={(cat: ExpenseCategory) => setExpenseForm({ ...expenseForm, category: cat })}
              onOpen={() => setExpenseOpen(true)}
              onClose={() => setExpenseOpen(false)}
                />
              </View>
              <View style={styles.expenseFormHalf}>
                <Text style={styles.label}>통화</Text>
                <View style={styles.currencyPicker}>
                  <Text style={styles.currencyText}>
                  {currencyLabels[ExpenseCurrency.KRW]}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>금액*</Text>
              <Input
                variant="outlined"
                placeholder={PLACEHOLDERS.expense.amount}
                value={expenseForm.amount.toString()}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: parseInt(text) || 0 })}
                keyboardType="numeric"
                style={styles.expenseInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>내용</Text>
              <Input
                variant="outlined"
                placeholder={PLACEHOLDERS.expense.descriptionForm}
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
                style={styles.expenseInput}
              />
            </View>

            <View style={styles.expenseButtonRow}>
              <Pressable
                style={styles.expenseCancelButton}
                onPress={() => {
                  setEditingExpense(null);
                  setExpenseForm({
                    category: ExpenseCategory.ETC,
                    amount: 0,
                    description: '',
                  });
                  setShowExpenseForm(false);
                }}
              >
                <Text style={styles.expenseCancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={styles.expenseSubmitButton}
                onPress={handleExpenseSubmit}
              >
                <Text style={styles.expenseSubmitButtonText}>
                  {editingExpense ? '수정' : '추가'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        </View>
      )}

      {!readOnly ? (
        <View style={[styles.buttonRow, { position: 'relative' }]}>
          <Pressable
            style={styles.deleteButton}
            onPress={itinerary ? handleDelete : onCancel}
          >
            <Text style={styles.deleteButtonText}>
              {itinerary ? '삭제' : '취소'}
            </Text>
          </Pressable>
          <Pressable
            style={styles.saveButton}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              저장
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.buttonRow, { position: 'relative' }]}>
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, { backgroundColor: colors.gray900 }]}
            onPress={onEdit}
          >
            <Text style={styles.saveButtonText}>수정</Text>
          </Pressable>
        </View>
      )}
      <WarningBanner
        message={warningMessage}
        visible={showWarning}
        duration={3000}
        bottomOffset={74}
        onHide={() => {
          setShowWarning(false);
          setWarningMessage('');
        }}
      />
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    padding: spacing.xl,
    gap: spacing.xl,
  },
  contentWrapper: {
    position: 'relative',
    overflow: 'visible',
    gap: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...textStyles.h5,
  },
  closeButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.gray900,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  // 읽기 전용 스타일 (테두리 있는 형태)
  readOnlyInput: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  readOnlyTextArea: {
    backgroundColor: colors.gray200,
    borderWidth: 1,
    borderColor: colors.gray400,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  readOnlyDateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    minHeight: 40,
  },
  formSection: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  textArea: {
    backgroundColor: colors.gray200,
    height: 80,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  deleteButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  saveButton: {
    backgroundColor: colors.primary,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  saveButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    overflow: 'visible',
    position: 'relative',
  },
  pickerRowWrapper: {
    overflow: 'visible',
    position: 'relative',
  },
  inputGroup: {
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  label: {
    ...textStyles.h8,
    color: colors.black,
  },
  // 비용 관련 스타일
  expenseSection: {
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
    gap: spacing.sm,
  },
  expenseList: {
    gap: spacing.xs,
  },
  expenseCard: {
    backgroundColor: colors.gray200,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    height: 96,
    justifyContent: 'center',
  },
  expenseCardContent: {
    gap: spacing.sm,
  },
  expenseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseCardTitle: {
    ...textStyles.h7,
    color: colors.black,
  },
  expenseCardDescription: {
    ...textStyles.body5,
    color: colors.gray700,
  },
  expenseCardAmount: {
    ...textStyles.h7,
    color: colors.black,
  },
  addExpenseButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 8,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addIconWrapper: {
    marginTop: -2,
  },
  addExpenseButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  expenseForm: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.lg,
  },
  expenseFormRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  expenseFormHalf: {
    flex: 1,
    gap: spacing.sm,
  },
  currencyPicker: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  expenseInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
  },
  countryPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
    zIndex: 8000,
  },
  expenseButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  expenseCancelButton: {
    backgroundColor: colors.gray300,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  expenseCancelButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  expenseSubmitButton: {
    backgroundColor: colors.gray900,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  expenseSubmitButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  deleteExpenseButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.gray200,
    minHeight: 40,
  },
  dateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dateText: {
    ...textStyles.body4,
  },
  iconWrapper: {
    marginTop: -2,
  },
  datePickerWrapper: {
    position: 'relative',
    overflow: 'visible',
  },
  calendarPopup: {
    position: 'absolute',
    top: 70,
    left: 0,
  },
});
