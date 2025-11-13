import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { DatePicker, TimePicker, CountryPicker, CategoryPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import dayjs from 'dayjs';
import { itinerariesApi } from '@/services/itineraries';
import { expensesApi } from '@/services/expenses';
import { ExpenseCategory, ExpenseCurrency, categoryLabels } from '@/types/expense';
import { colors } from '@/ui/tokens/colors';
import { textStyles, typography } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import DeleteIcon from '../../../assets/delete_gray.svg';
import AddIcon from '../../../assets/add.svg';
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
  onShowWarning
}: ItineraryItemProps) {
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

  // 국가 드롭다운 상태 및 옵션 (ISO 3166 → 한국어 라벨)
  const [countryOpen, setCountryOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  
  // 지출 관련 상태
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: ExpenseCategory.ETC,
    amount: 0,
    description: '',
  });
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // 새 일정 생성 중 비용 초안 (로컬 상태)
  const [draftExpenses, setDraftExpenses] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  // itinerary prop이 변경될 때 formData 업데이트
  useEffect(() => {
    if (itinerary) {
      setFormData({
        title: itinerary.title || '',
        description: itinerary.description || '',
        country: itinerary.country || '',
        city: itinerary.city || '',
        location: itinerary.location || '',
        itineraryDate: itinerary.itinerary_date || itinerary.itineraryDate || dayjs().format('YYYY-MM-DD'),
        startTime: (itinerary.start_time || itinerary.startTime || '09:00').substring(0, 5),
        endTime: (itinerary.end_time || itinerary.endTime || '10:00').substring(0, 5),
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
    }
  }, [itinerary, selectedDate]);

  // 기존 지출 불러오기
  useEffect(() => {
    const loadExpenses = async () => {
      if (itinerary?.id) {
        try {
          const itineraryExpenses = await expensesApi.getExpensesByItinerary(itinerary.id);
          setExpenses(itineraryExpenses);
        } catch (error) {
          console.error('Failed to load expenses:', error);
        }
      } else {
        // itinerary가 없으면 지출 목록 초기화
        setExpenses([]);
      }
    };

    loadExpenses();
  }, [itinerary?.id]);

  // planData가 변경될 때도 지출 목록 새로고침 (ExpensesModal에서 삭제 시 반영)
  useEffect(() => {
    const loadExpenses = async () => {
      if (itinerary?.id) {
        try {
          const itineraryExpenses = await expensesApi.getExpensesByItinerary(itinerary.id);
          setExpenses(itineraryExpenses);
        } catch (error) {
          console.error('Failed to load expenses:', error);
        }
      } else {
        // itinerary가 없으면 지출 목록 초기화
        setExpenses([]);
      }
    };

    loadExpenses();
  }, [planData?.expenses, itinerary?.id]);

  const handleSave = async () => {
    // 필수 값 검증
    if (!formData.title.trim() || 
        !formData.country.trim() || 
        !formData.city.trim() || 
        !formData.itineraryDate || 
        !formData.startTime || 
        !formData.endTime) {
      onShowWarning?.();
      return;
    }

    // 길이 제한 검증
    if (formData.title.trim().length > 10) {
      Alert.alert('오류', '제목은 최대 10자까지 입력 가능합니다.');
      return;
    }
    if (formData.location && formData.location.trim().length > 100) {
      Alert.alert('오류', '장소는 최대 100자까지 입력 가능합니다.');
      return;
    }

    setIsLoading(true);
    try {
      let savedItinerary;
      if (itinerary) {
        savedItinerary = await itinerariesApi.updateItinerary(itinerary.id, {
          title: formData.title,
          description: formData.description,
          country: formData.country,
          city: formData.city,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
        });
        
        if (itinerary.itinerary_date !== formData.itineraryDate) {
          const allExpenses = await expensesApi.getExpenses(planId);
          const connectedExpenses = allExpenses.filter(expense => 
            expense.itineraryId === itinerary.id
          );
          
          for (const expense of connectedExpenses) {
            await expensesApi.updateExpense(expense.id, {
              ...expense,
              exDate: formData.itineraryDate,
            });
          }
        }
        
        if (draftExpenses.length > 0) {
          for (const draftExpense of draftExpenses) {
            try {
              await expensesApi.createExpense({
                planId: planId,
                category: draftExpense.category as any,
                amount: draftExpense.amount,
                description: draftExpense.description,
                exDate: draftExpense.exDate,
                currency: draftExpense.currency as any,
                itineraryId: itinerary.id,
              });
            } catch (e) {
              console.warn('Failed to create draft expense:', e);
            }
          }
          setDraftExpenses([]); // 초안 비우기
        }
      } else {
        // 추가
        savedItinerary = await itinerariesApi.createItinerary({
          planId: planId,
          title: formData.title,
          description: formData.description,
          city: formData.city,
          country: formData.country,
          location: formData.location,
          itineraryDate: formData.itineraryDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
        });
        
        // 새 일정 생성 후 draft expenses 저장
        if (draftExpenses.length > 0) {
          for (const draftExpense of draftExpenses) {
            try {
              await expensesApi.createExpense({
                planId: planId,
                category: draftExpense.category as any,
                amount: draftExpense.amount,
                description: draftExpense.description,
                exDate: draftExpense.exDate,
                currency: draftExpense.currency as any,
                itineraryId: savedItinerary.id,
              });
            } catch (e) {
              console.warn('Failed to create draft expense:', e);
            }
          }
          setDraftExpenses([]); // 초안 비우기
        }
      }
      onSave(savedItinerary);
    } catch (error) {
      console.error('Failed to save itinerary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (itinerary && onDelete) {
      try {
        await itinerariesApi.deleteItinerary(itinerary.id);
        onDelete(itinerary.id);
      } catch (error) {
        console.error('Failed to delete itinerary:', error);
      }
    }
  };

  // 지출 관련 핸들러
  const handleExpenseSubmit = async () => {
    if (expenseForm.amount <= 0) {
      Alert.alert('오류', '금액을 입력해주세요.');
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
      
      Alert.alert('성공', '지출이 추가되었습니다. (일정 저장 시 함께 저장됩니다)');
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
    
    Alert.alert('성공', '지출이 추가되었습니다. (일정 저장 시 함께 저장됩니다)');
  };

  const handleExpenseDelete = async (expenseId: string) => {
    try {
      await expensesApi.deleteExpense(Number(expenseId));
      
      // 지출 목록 새로고침
      const updatedExpenses = await expensesApi.getExpensesByItinerary(itinerary?.id);
      setExpenses(updatedExpenses);
      
      // 부모 컴포넌트에 지출 업데이트 알림
      if (onExpenseUpdate) {
        onExpenseUpdate();
      }
      
      Alert.alert('성공', '지출이 삭제되었습니다.');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      Alert.alert('오류', '지출 삭제에 실패했습니다.');
    }
  };

  // 모든 지출 (draft + saved)
  const allExpenses = useMemo(() => {
    const draft = draftExpenses.map((exp, idx) => ({ ...exp, id: `draft-${idx}`, isDraft: true }));
    const saved = expenses.map(exp => ({ ...exp, isDraft: false }));
    return [...draft, ...saved];
  }, [draftExpenses, expenses]);

  return (
    <ScrollView style={[styles.container, { position: 'relative', overflow: 'visible' }]}
    contentContainerStyle={[styles.contentContainer, { overflow: 'visible' }]}>
      <Text style={styles.title}>{itinerary ? '일정 편집' : '일정 추가'}</Text>
      
      <View style={styles.formSection}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>제목</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.itinerary.titleForm}
            value={formData.title}
            onChangeText={(text) => {
              if (text.length <= 10) {
                setFormData({ ...formData, title: text });
              }
            }}
            maxLength={10}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>내용</Text>
          <Input
            variant="filled"
            placeholder={PLACEHOLDERS.itinerary.descriptionForm}
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.textArea}
            placeholderTextColor={colors.gray600}
          />
        </View>

        <View style={[styles.row, styles.pickerRowWrapper, { zIndex: countryOpen ? 10000 : 1 }]}>
          <View style={[styles.inputGroup, styles.halfWidth, styles.countryPickerWrapper]}>
            <Text style={styles.label}>국가</Text>
            <CountryPicker
              value={formData.country}
              onChange={(name: string) => setFormData({ ...formData, country: name })}
              placeholder={PLACEHOLDERS.itinerary.countryForm}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}> 
            <Text style={styles.label}>도시</Text>
            <Input
              variant="filled"
              placeholder={PLACEHOLDERS.itinerary.cityForm}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              style={styles.input}
              placeholderTextColor={colors.gray600}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>장소</Text>
          <Input
            variant="filled"
            placeholder="장소를 입력하세요."
            value={formData.location}
            onChangeText={(text) => {
              if (text.length <= 100) {
                setFormData({ ...formData, location: text });
              }
            }}
            maxLength={100}
            style={styles.input}
            placeholderTextColor={colors.gray600}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>날짜</Text>
          <DatePicker
            value={formData.itineraryDate}
            onChange={(date) => setFormData({ ...formData, itineraryDate: date })}
          />
        </View>

        <View style={[styles.row, styles.pickerRowWrapper, { zIndex: timeOpen ? 10001 : 1 }]}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>시작 시간</Text>
            <TimePicker
              value={formData.startTime}
              onChange={(time) => setFormData({ ...formData, startTime: time })}
              maxTime={formData.endTime}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>종료 시간</Text>
            <TimePicker
              value={formData.endTime}
              onChange={(time) => setFormData({ ...formData, endTime: time })}
              minTime={formData.startTime}
            />
          </View>
        </View>
      </View>

      {/* 지출 추가 섹션 */}
      <View style={styles.expenseSection}>
        <Text style={styles.label}>지출 내역</Text>
        
        {/* 지출 카드 목록 */}
        <View style={styles.expenseList}>
          {allExpenses.length > 0 ? (
            allExpenses.map((expense) => (
              <View key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseCardContent}>
                  <View style={styles.expenseCardHeader}>
                    <Text style={styles.expenseCardTitle}>
                      {categoryLabels[expense.category as ExpenseCategory]}
                    </Text>
                    <Pressable
                      style={styles.deleteExpenseButton}
                      onPress={() => {
                        if (expense.isDraft) {
                          setDraftExpenses(prev => prev.filter((_, i) => i !== Number(expense.id.split('-')[1])));
                        } else {
                          handleExpenseDelete(expense.id);
                        }
                      }}
                    >
                      <DeleteIcon width={16} height={16} />
                    </Pressable>
                  </View>
                  <Text style={styles.expenseCardDescription}>{expense.description || ''}</Text>
                  <Text style={styles.expenseCardAmount}>
                    ₩{expense.amount.toLocaleString()}
                  </Text>
                </View>
              </View>
            ))
          ) : null}
        </View>

        {/* 지출 추가 버튼 */}
        <Pressable
          style={styles.addExpenseButton}
          onPress={() => setShowExpenseForm(!showExpenseForm)}
        >
          <View style={styles.addIconWrapper}>
            <AddIcon width={16} height={16} />
          </View>
          <Text style={styles.addExpenseButtonText}>지출 내역 추가</Text>
        </Pressable>

        {/* 지출 추가 폼 */}
        {showExpenseForm && (
          <View style={styles.expenseForm}>
            <View style={styles.expenseFormRow}>
              <View style={styles.expenseFormHalf}>
                <Text style={styles.label}>카테고리</Text>
                <CategoryPicker
                  value={expenseForm.category}
                  onChange={(cat: ExpenseCategory) => setExpenseForm({ ...expenseForm, category: cat })}
                />
              </View>
              <View style={styles.expenseFormHalf}>
                <Text style={styles.label}>화폐</Text>
                <View style={styles.currencyPicker}>
                  <Text style={styles.currencyText}>KRW</Text>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>금액</Text>
              <Input
                variant="outlined"
                placeholder="0"
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
                placeholder="지출 설명을 입력하세요."
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
                style={styles.expenseInput}
              />
            </View>

            <View style={styles.expenseButtonRow}>
              <Pressable
                style={styles.expenseCancelButton}
                onPress={() => setShowExpenseForm(false)}
              >
                <Text style={styles.expenseCancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={styles.expenseSubmitButton}
                onPress={handleExpenseSubmit}
              >
                <Text style={styles.expenseSubmitButtonText}>추가</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={styles.buttonRow}>
        {itinerary && onDelete && (
          <Pressable
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? '저장 중...' : '저장'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
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
  title: {
    ...textStyles.h5,
    marginBottom: 0,
  },
  formSection: {
    gap: spacing.lg,
  },
  input: {
    backgroundColor: colors.gray300,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...textStyles.body4,
  },
  textArea: {
    backgroundColor: colors.gray300,
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
    marginTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  deleteButton: {
    backgroundColor: colors.gray400,
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
    backgroundColor: colors.gray900,
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
  // 지출 관련 스타일
  expenseSection: {
    gap: spacing.sm,
  },
  expenseList: {
    gap: spacing.sm,
  },
  expenseCard: {
    backgroundColor: colors.gray300,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    height: 96,
    justifyContent: 'center',
  },
  expenseCardContent: {
    gap: 12,
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
    marginTop: spacing.sm,
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
    color: colors.gray800,
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: 52,
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
    paddingHorizontal: 52,
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
});
