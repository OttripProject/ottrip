import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { DatePicker, TimePicker, CountryPicker, CategoryPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import dayjs from 'dayjs';
import { itinerariesApi } from '@/services/itineraries';
import { expensesApi } from '@/services/expenses';
import { ExpenseCategory, ExpenseCurrency, categoryLabels } from '@/types/expense';

interface ItineraryItemProps {
  itinerary?: any;
  planId: number;
  planData?: any;
  onSave: (itinerary: any) => void;
  onCancel: () => void;
  onDelete?: (itineraryId: string) => void;
  onExpenseUpdate?: () => void; 
}

export default function ItineraryItem({ 
  itinerary, 
  planId, 
  planData,
  onSave, 
  onCancel, 
  onDelete,
  onExpenseUpdate
}: ItineraryItemProps) {
  const [formData, setFormData] = useState({
    title: itinerary?.title || '',
    description: itinerary?.description || '',
    country: itinerary?.country || '',
    city: itinerary?.city || '',
    location: itinerary?.location || '',
    itineraryDate: itinerary?.itinerary_date || dayjs().format('YYYY-MM-DD'),
    startTime: itinerary?.start_time || '09:00',
    endTime: itinerary?.end_time || '10:00',
  });

  // 국가 드롭다운 상태 및 옵션 (ISO 3166 → 한국어 라벨)
  const [countryOpen, setCountryOpen] = useState(false);

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
    }
  }, [itinerary]);

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
      }
    };

    loadExpenses();
  }, [planData?.expenses]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{itinerary ? '일정 편집' : '일정 추가'}</Text>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>제목 *</Text>
        <Input
          placeholder={PLACEHOLDERS.itinerary.title}
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>내용</Text>
        <Input
          placeholder={PLACEHOLDERS.itinerary.description}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={[styles.row, styles.pickerRowWrapper, { zIndex: countryOpen ? 10000 : 1 }]}>
        <View style={[styles.inputGroup, styles.halfWidth, styles.countryPickerWrapper]}>
          <Text style={styles.label}>국가 *</Text>
          <CountryPicker
            value={formData.country}
            onChange={(name: string) => setFormData({ ...formData, country: name })}
            placeholder="국가 선택"
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}> 
          <Text style={styles.label}>도시 *</Text>
          <Input
            placeholder={PLACEHOLDERS.itinerary.city}
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <Input
          placeholder={PLACEHOLDERS.itinerary.location}
          value={formData.location}
          onChangeText={(text) => setFormData({ ...formData, location: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>날짜</Text>
        <DatePicker
          value={formData.itineraryDate}
          onChange={(date) => setFormData({ ...formData, itineraryDate: date })}
        />
      </View>

      <View style={styles.timeRow}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>시작 시간</Text>
          <TimePicker
            value={formData.startTime}
            onChange={(time) => setFormData({ ...formData, startTime: time })}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>종료 시간</Text>
          <TimePicker
            value={formData.endTime}
            onChange={(time) => setFormData({ ...formData, endTime: time })}
          />
        </View>
      </View>

      {/* 지출 추가 섹션 */}
      <View style={styles.expenseSection}>
        <View style={styles.expenseHeader}>
          <Text style={styles.expenseTitle}>지출 내역</Text>
          <Pressable
            style={styles.addExpenseButton}
            onPress={() => setShowExpenseForm(!showExpenseForm)}
          >
            <Text style={styles.addExpenseButtonText}>+ 지출 추가</Text>
          </Pressable>
        </View>

        {/* 지출 추가 폼 */}
        {showExpenseForm && (
          <View style={styles.expenseForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>카테고리</Text>
              {/* TODO: 카테고리 셀렉트도 공통 Select로 대체 예정 */}
              <CategoryPicker
                value={expenseForm.category}
                onChange={(cat: ExpenseCategory) => setExpenseForm({ ...expenseForm, category: cat })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>금액</Text>
              <Input
                placeholder={PLACEHOLDERS.expense.amount}
                value={expenseForm.amount.toString()}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: parseInt(text) || 0 })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>내용</Text>
              <Input
                placeholder={PLACEHOLDERS.expense.description}
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
              />
            </View>

            <View style={styles.expenseButtonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => setShowExpenseForm(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.submitButton]}
                onPress={handleExpenseSubmit}
              >
                <Text style={styles.submitButtonText}>추가</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 저장된 지출 내역 */}
        <View style={styles.expenseList}>
          {/* Draft expenses (새 일정 생성 중 또는 기존 일정 편집 중) */}
          {draftExpenses.length > 0 && (
            <>
              {draftExpenses.map((expense, index) => (
                <View key={index} style={styles.expenseItem}>
                  <View style={styles.expenseItemInfo}>
                    <Text style={styles.expenseItemDescription}>{expense.description}</Text>
                    <Text style={styles.expenseItemCategory}>
                      {categoryLabels[expense.category as ExpenseCategory]}
                    </Text>
                  </View>
                  <View style={styles.expenseItemActions}>
                    <Text style={styles.expenseItemAmount}>
                      ₩{expense.amount.toLocaleString()}
                    </Text>
                    <Pressable
                      style={styles.deleteExpenseButton}
                      onPress={() => setDraftExpenses(prev => prev.filter((_, i) => i !== index))}
                    >
                      <Text style={styles.deleteExpenseIcon}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          )}
          
          {/* Saved expenses (기존 일정 편집 시) */}
          {itinerary?.id && (
            <>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <View key={expense.id} style={styles.expenseItem}>
                    <View style={styles.expenseItemInfo}>
                      <Text style={styles.expenseItemDescription}>{expense.description}</Text>
                      <Text style={styles.expenseItemCategory}>
                        {categoryLabels[expense.category as ExpenseCategory]}
                      </Text>
                    </View>
                    <View style={styles.expenseItemActions}>
                      <Text style={styles.expenseItemAmount}>
                        ₩{expense.amount.toLocaleString()}
                      </Text>
                      <Pressable
                        style={styles.deleteExpenseButton}
                        onPress={() => handleExpenseDelete(expense.id)}
                      >
                        <Text style={styles.deleteExpenseIcon}>🗑️</Text>
                      </Pressable>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.noExpensesText}>등록된 지출이 없습니다.</Text>
              )}
            </>
          )}
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        
        {itinerary && onDelete && (
          <Pressable
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </Pressable>
        )}
        
        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={isLoading || !formData.title.trim()}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? '저장 중...' : '저장'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timeInput: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
  },
  deleteButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
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
    overflow: 'visible',
    position: 'relative',
  },
  pickerRowWrapper: {
    // 국가 드롭다운 + 도시 입력을 하나의 쌓임 맥락으로 묶음
    overflow: 'visible',
    position: 'relative',
  },
  inputGroup: {
    marginBottom: 12,
  },
  halfWidth: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButton: {
    backgroundColor: '#000',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // 지출 관련 스타일
  expenseSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  addExpenseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addExpenseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  expenseForm: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  expenseDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  countryDropdown: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    minHeight: 45,
    position: 'relative',
    zIndex: 9999,
  },
  countryDropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    zIndex: 9999,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  countryPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
    zIndex: 8000,
  },
  countryDropdownOuter: {
    position: 'relative',
    zIndex: 9999,
  },
  expenseDropdownContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    position: 'relative',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  expenseButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  expenseList: {
    marginTop: 8,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  expenseItemInfo: {
    flex: 1,
  },
  expenseItemDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  expenseItemCategory: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expenseItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseItemAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  deleteExpenseButton: {
    padding: 4,
  },
  deleteExpenseIcon: {
    fontSize: 16,
  },
  noExpensesText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    paddingVertical: 20,
  },
});
