import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { DatePicker } from '@/ui/components/pickers';
import dayjs from 'dayjs';
import { accommodationsApi } from '@/services/accommodations';
import { CountryPicker } from '@/ui/components/pickers';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { TimePicker } from '@/ui/components/pickers';

interface AccommodationItemProps {
  accommodation?: any;
  draft?: any;
  planId: number;
  onSave: (accommodation: any) => void;
  onCancel: () => void;
  onDelete?: (accommodationId: string) => void;
}

export default function AccommodationItem({ 
  accommodation, 
  draft,
  planId, 
  onSave, 
  onCancel, 
  onDelete 
}: AccommodationItemProps) {
  const [formData, setFormData] = useState({
    name: accommodation?.name || '',
    place: accommodation?.place || '',
    country: accommodation?.country || '',
    city: accommodation?.city || '',
    checkin_date: (accommodation?.checkinDate) || draft?.checkinDate || dayjs().format('YYYY-MM-DD'),
    checkout_date: (accommodation?.checkoutDate) || draft?.checkoutDate || dayjs().add(1, 'day').format('YYYY-MM-DD'),
    checkin_time: (accommodation?.checkinTime) || draft?.checkinTime || '15:00',
    checkout_time: (accommodation?.checkoutTime) || draft?.checkoutTime || '11:00',
    description: accommodation?.description || '',
  });

  const [expenseData, setExpenseData] = useState({
    amount: accommodation?.expense?.amount || '',
    currency: accommodation?.expense?.currency || 'KRW',
  });

  const [isLoading, setIsLoading] = useState(false);

  // accommodation prop이 변경될 때 폼 데이터 동기화 (snake_case / camelCase 모두 지원)
  useEffect(() => {
    if (accommodation) {
      setFormData({
        name: accommodation.name || '',
        place: accommodation.place || '',
        country: accommodation.country || '',
        city: accommodation.city || '',
        checkin_date: (accommodation.checkinDate) || dayjs().format('YYYY-MM-DD'),
        checkout_date: (accommodation.checkoutDate) || dayjs().add(1, 'day').format('YYYY-MM-DD'),
        checkin_time: (accommodation.checkinTime || '15:00').substring(0,5),
        checkout_time: (accommodation.checkoutTime || '11:00').substring(0,5),
        description: accommodation.description || '',
      });
    }
  }, [accommodation]);

  // 국가 드롭다운 상태 및 옵션
  const [countryOpen, setCountryOpen] = useState(false); // zIndex 제어용 (CountrySelect 내부 오픈 상태와는 별개로 래퍼 zIndex 제어 가능)

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.country.trim() || !formData.city.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      let savedAccommodation;
      if (accommodation && accommodation.id) {
        // 편집
        savedAccommodation = await accommodationsApi.updateAccommodation(accommodation.id, {
          name: formData.name,
          place: formData.place || undefined,
          country: formData.country,
          city: formData.city,
          checkinDate: formData.checkin_date,
          checkoutDate: formData.checkout_date,
          checkinTime: formData.checkin_time + ':00',
          checkoutTime: formData.checkout_time + ':00',
          description: formData.description || undefined,
          expense: {
            exDate: formData.checkin_date,
            amount: Number(expenseData.amount) || 0,
            category: 'accommodation' as any,
            currency: expenseData.currency as any,
            description: formData.name,
          },
        });
      } else {
        // 추가
        savedAccommodation = await accommodationsApi.createAccommodation({
          planId: planId,
          name: formData.name,
          place: formData.place || undefined,
          country: formData.country,
          city: formData.city,
          checkinDate: formData.checkin_date,
          checkoutDate: formData.checkout_date,
          checkinTime: formData.checkin_time + ':00',
          checkoutTime: formData.checkout_time + ':00',
          description: formData.description || undefined,
          expense: {
            exDate: formData.checkin_date,
            amount: Number(expenseData.amount) || 0,
            category: 'accommodation' as any,
            currency: expenseData.currency as any,
            description: formData.name,
          },
        });
      }
      onSave(savedAccommodation);
    } catch (error) {
      console.error('Failed to save accommodation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (accommodation && accommodation.id && onDelete) {
      try {
        await accommodationsApi.deleteAccommodation(accommodation.id);
        onDelete(accommodation.id);
      } catch (error) {
        console.error('Failed to delete accommodation:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{accommodation ? '숙박 편집' : '숙박 추가'}</Text>
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>숙소 이름 *</Text>
        <Input
          placeholder={PLACEHOLDERS.accommodation.name}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={[styles.row, styles.pickerRowWrapper, { zIndex: countryOpen ? 10000 : 1 }]}>
        <View style={[styles.inputGroup, styles.halfWidth, styles.countryPickerWrapper, { zIndex: countryOpen ? 10000 : 1 }]}>
          <Text style={styles.label}>국가 *</Text>
          <CountryPicker
            value={formData.country}
            onChange={(name: string) => setFormData({ ...formData, country: name })}
            placeholder={PLACEHOLDERS.picker.country}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도시 *</Text>
          <Input
            placeholder={PLACEHOLDERS.accommodation.city}
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <Input
          placeholder={PLACEHOLDERS.accommodation.place}
          value={formData.place}
          onChangeText={(text) => setFormData({ ...formData, place: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>체크인 날짜</Text>
        <DatePicker
          value={formData.checkin_date}
          onChange={(date) => setFormData({ ...formData, checkin_date: date })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>체크아웃 날짜</Text>
        <DatePicker
          value={formData.checkout_date}
          onChange={(date) => setFormData({ ...formData, checkout_date: date })}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>체크인 시간</Text>
          <TimePicker
            value={formData.checkin_time}
            onChange={(time) => setFormData({ ...formData, checkin_time: time })}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>체크아웃 시간</Text>
          <TimePicker
            value={formData.checkout_time}
            onChange={(time) => setFormData({ ...formData, checkout_time: time })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>설명</Text>
        <Input
          placeholder={PLACEHOLDERS.accommodation.description}
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>숙박 비용</Text>
        <View style={styles.row}>
          <Input
            containerStyle={{ flex: 1, marginRight: 8 }}
            placeholder={PLACEHOLDERS.expense.amount}
            value={expenseData.amount}
            onChangeText={(text) => setExpenseData({ ...expenseData, amount: text.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
          />
          <View style={{ width: 120 }}>
            <Input
              placeholder={PLACEHOLDERS.expense.currency}
              value={expenseData.currency}
              editable={false}
            />
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.button, styles.cancelButton]}
          onPress={onCancel}
        >
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        
        {accommodation && onDelete && (
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
          disabled={isLoading || !formData.name.trim() || !formData.country.trim() || !formData.city.trim()}
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
  countryPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
    zIndex: 8000,
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
  countryDropdownOuter: {
    position: 'relative',
    zIndex: 9999,
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
});
