import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

const MOCK_WEEK = [
  { day: '월', date: 23, isToday: false },
  { day: '화', date: 24, isToday: false },
  { day: '수', date: 25, isToday: true },
  { day: '목', date: 26, isToday: false },
  { day: '금', date: 27, isToday: false },
  { day: '토', date: 28, isToday: false },
  { day: '일', date: 29, isToday: false },
];

export default function WeeklyScreen() {
  const [selectedDate, setSelectedDate] = useState(25);

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🇹🇷 터키 카파도키아 여행</Text>
        <Text style={styles.headerSubtitle}>10월 23일 - 10월 29일</Text>
      </View>

      {/* 주간 날짜 선택 */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.weekScroll}
        contentContainerStyle={styles.weekContent}
      >
        {MOCK_WEEK.map((item) => (
          <Pressable
            key={item.date}
            style={[
              styles.dayButton,
              item.isToday && styles.dayButtonToday,
              selectedDate === item.date && styles.dayButtonSelected,
            ]}
            onPress={() => setSelectedDate(item.date)}
          >
            <Text
              style={[
                styles.dayText,
                (item.isToday || selectedDate === item.date) && styles.dayTextActive,
              ]}
            >
              {item.day}
            </Text>
            <Text
              style={[
                styles.dateText,
                (item.isToday || selectedDate === item.date) && styles.dateTextActive,
              ]}
            >
              {item.date}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* 일정 목록 */}
      <ScrollView 
        style={styles.scheduleList}
        contentContainerStyle={styles.scheduleContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.scheduleDate}>10월 {selectedDate}일</Text>

        {/* 일정 아이템들 */}
        <View style={styles.scheduleItem}>
          <View style={styles.scheduleTime}>
            <Text style={styles.scheduleTimeText}>05:30</Text>
            <View style={styles.scheduleTimeLine} />
            <Text style={styles.scheduleTimeText}>08:00</Text>
          </View>
          
          <View style={styles.scheduleCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>🎈 활동</Text>
            </View>
            <Text style={styles.scheduleTitle}>카파도키아 벌룬 투어</Text>
            <Text style={styles.scheduleLocation}>괴레메 국립공원</Text>
            <Text style={styles.scheduleNote}>05:00 호텔 로비 픽업. 따뜻한 옷 꼭 챙기기.</Text>
          </View>
        </View>

        <View style={styles.scheduleItem}>
          <View style={styles.scheduleTime}>
            <Text style={styles.scheduleTimeText}>09:00</Text>
            <View style={styles.scheduleTimeLine} />
            <Text style={styles.scheduleTimeText}>10:00</Text>
          </View>
          
          <View style={[styles.scheduleCard, styles.currentCard]}>
            <View style={[styles.categoryBadge, styles.currentBadge]}>
              <Text style={styles.categoryText}>🍽️ 식사</Text>
            </View>
            <Text style={styles.scheduleTitle}>현지 카페에서 아침 식사</Text>
            <Text style={styles.scheduleLocation}>나자르 보렉 (Nazar Borek)</Text>
            <View style={styles.currentIndicator}>
              <View style={styles.currentDot} />
              <Text style={styles.currentText}>진행 중</Text>
            </View>
          </View>
        </View>

        <View style={styles.scheduleItem}>
          <View style={styles.scheduleTime}>
            <Text style={styles.scheduleTimeText}>11:00</Text>
            <View style={styles.scheduleTimeLine} />
            <Text style={styles.scheduleTimeText}>13:00</Text>
          </View>
          
          <View style={styles.scheduleCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>🎨 활동</Text>
            </View>
            <Text style={styles.scheduleTitle}>괴레메 야외 박물관 관람</Text>
            <Text style={styles.scheduleLocation}>괴레메 야외 박물관</Text>
          </View>
        </View>

        <View style={styles.scheduleItem}>
          <View style={styles.scheduleTime}>
            <Text style={styles.scheduleTimeText}>13:30</Text>
            <View style={styles.scheduleTimeLine} />
            <Text style={styles.scheduleTimeText}>14:30</Text>
          </View>
          
          <View style={styles.scheduleCard}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>🍽️ 식사</Text>
            </View>
            <Text style={styles.scheduleTitle}>항아리 케밥 점심</Text>
            <Text style={styles.scheduleLocation}>Topdeck Cave</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: colors.white,
  },
  headerTitle: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...textStyles.body2,
    color: colors.gray600,
  },
  
  // 주간 날짜 선택
  weekScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  weekContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayButton: {
    width: 48,
    height: 64,
    borderRadius: 12,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: colors.blue500,
  },
  dayButtonSelected: {
    backgroundColor: colors.blue500,
  },
  dayText: {
    ...textStyles.body3,
    color: colors.gray600,
    marginBottom: 4,
  },
  dayTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  dateText: {
    ...textStyles.body1,
    color: colors.gray800,
    fontWeight: '600',
  },
  dateTextActive: {
    color: colors.white,
  },
  
  // 일정 목록
  scheduleList: {
    flex: 1,
  },
  scheduleContent: {
    padding: 16,
    paddingBottom: 100,
  },
  scheduleDate: {
    ...textStyles.h4,
    color: colors.black,
    marginBottom: 20,
  },
  
  // 일정 아이템
  scheduleItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  scheduleTime: {
    width: 60,
    alignItems: 'center',
    marginRight: 12,
  },
  scheduleTimeText: {
    ...textStyles.body3,
    color: colors.gray500,
    fontWeight: '500',
  },
  scheduleTimeLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.gray300,
    marginVertical: 4,
  },
  
  // 일정 카드
  scheduleCard: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  currentCard: {
    borderColor: '#0EA5E9',
    borderWidth: 2,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gray100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  currentBadge: {
    backgroundColor: '#E0F2FE',
  },
  categoryText: {
    ...textStyles.body4,
    color: colors.gray700,
    fontWeight: '500',
  },
  scheduleTitle: {
    ...textStyles.body1,
    color: colors.black,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleLocation: {
    ...textStyles.body3,
    color: colors.gray600,
    marginBottom: 8,
  },
  scheduleNote: {
    ...textStyles.body4,
    color: colors.gray500,
    fontStyle: 'italic',
  },
  
  // 진행 중 인디케이터
  currentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
    marginRight: 6,
  },
  currentText: {
    ...textStyles.body4,
    color: '#0EA5E9',
    fontWeight: '600',
  },
});

