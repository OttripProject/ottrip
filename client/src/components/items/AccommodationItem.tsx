import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import DateRangePicker from '@/components/DateRangePicker';
import dayjs from 'dayjs';
import { accommodationsApi } from '@/services/accommodations';

interface AccommodationItemProps {
  accommodation?: any;
  planId: number;
  onSave: (accommodation: any) => void;
  onCancel: () => void;
  onDelete?: (accommodationId: string) => void;
}

export default function AccommodationItem({ 
  accommodation, 
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
    checkin_date: accommodation?.checkin_date || dayjs().format('YYYY-MM-DD'),
    checkout_date: accommodation?.checkout_date || dayjs().add(1, 'day').format('YYYY-MM-DD'),
    checkin_time: accommodation?.checkin_time || '15:00',
    checkout_time: accommodation?.checkout_time || '11:00',
    description: accommodation?.description || '',
  });

  const [expenseData, setExpenseData] = useState({
    amount: accommodation?.expense?.amount || '',
    currency: accommodation?.expense?.currency || 'KRW',
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.country.trim() || !formData.city.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      let savedAccommodation;
      if (accommodation) {
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
    if (accommodation && onDelete) {
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
        {accommodation && (
          <Pressable
            style={styles.editButton}
            onPress={() => {
              // 편집 모드 토글 로직은 부모 컴포넌트에서 처리
            }}
          >
            <Text style={styles.editButtonText}>편집</Text>
          </Pressable>
        )}
      </View>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>숙소 이름 *</Text>
        <TextInput
          style={styles.input}
          placeholder="숙소 이름"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>국가 *</Text>
          <TextInput
            style={styles.input}
            placeholder="국가"
            value={formData.country}
            onChangeText={(text) => setFormData({ ...formData, country: text })}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>도시 *</Text>
          <TextInput
            style={styles.input}
            placeholder="도시"
            value={formData.city}
            onChangeText={(text) => setFormData({ ...formData, city: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>장소</Text>
        <TextInput
          style={styles.input}
          placeholder="장소"
          value={formData.place}
          onChangeText={(text) => setFormData({ ...formData, place: text })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>체크인 날짜</Text>
        <DateRangePicker
          startDate={formData.checkin_date}
          endDate={formData.checkin_date}
          onStartDateChange={(date) => setFormData({ ...formData, checkin_date: date })}
          onEndDateChange={(date) => setFormData({ ...formData, checkin_date: date })}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>체크아웃 날짜</Text>
        <DateRangePicker
          startDate={formData.checkout_date}
          endDate={formData.checkout_date}
          onStartDateChange={(date) => setFormData({ ...formData, checkout_date: date })}
          onEndDateChange={(date) => setFormData({ ...formData, checkout_date: date })}
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>체크인 시간</Text>
          <TextInput
            style={styles.input}
            placeholder="15:00"
            value={formData.checkin_time}
            onChangeText={(text) => setFormData({ ...formData, checkin_time: text })}
          />
        </View>
        <View style={[styles.inputGroup, styles.halfWidth]}>
          <Text style={styles.label}>체크아웃 시간</Text>
          <TextInput
            style={styles.input}
            placeholder="11:00"
            value={formData.checkout_time}
            onChangeText={(text) => setFormData({ ...formData, checkout_time: text })}
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>설명</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="설명"
          value={formData.description}
          onChangeText={(text) => setFormData({ ...formData, description: text })}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>숙박 비용</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8 }]}
            placeholder="금액"
            value={expenseData.amount}
            onChangeText={(text) => setExpenseData({ ...expenseData, amount: text.replace(/[^0-9]/g, '') })}
            keyboardType="numeric"
          />
          <View style={{ width: 120 }}>
            <TextInput
              style={styles.input}
              placeholder="통화"
              value={expenseData.currency}
              onChangeText={(text) => setExpenseData({ ...expenseData, currency: text })}
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
  editButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
