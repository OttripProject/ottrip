import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { getTodayKoreanDate } from '@/utils/dateUtils';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';

export default function TodayScreen() {
  const formattedDate = getTodayKoreanDate();

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.greeting}>오늘의 여행</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>

        {/* 현재 진행 중 활동 카드 */}
        <View style={styles.currentCard}>
          <View style={styles.statusBadge}>
            <View style={styles.pulse} />
            <Text style={styles.statusText}>진행 중</Text>
          </View>
          
          <Text style={styles.cardTitle}>현지 카페에서 아침 식사</Text>
          <Text style={styles.cardLocation}>📍 나자르 보렉 (Nazar Borek)</Text>
          
          <View style={styles.noteBox}>
            <Text style={styles.note}>"터키쉬 차(Chai) 추천"</Text>
          </View>
          
          <Text style={styles.timeInfo}>09:00 - 10:00</Text>
        </View>

        {/* 오늘의 일정 타임라인 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 일정</Text>
          
          {/* 완료된 일정 */}
          <View style={[styles.timelineItem, styles.doneItem]}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.itemTime}>05:30 - 08:00</Text>
              <Text style={styles.itemTitle}>카파도키아 벌룬 투어</Text>
              <Text style={styles.itemLocation}>괴레메 국립공원</Text>
            </View>
          </View>

          {/* 다음 일정 */}
          <View style={[styles.timelineItem, styles.nextItem]}>
            <View style={[styles.timelineDot, styles.nextDot]} />
            <View style={styles.timelineContent}>
              <Text style={styles.itemTime}>11:00 - 13:00</Text>
              <Text style={styles.itemTitle}>괴레메 야외 박물관 관람</Text>
              <Text style={styles.itemLocation}>괴레메 야외 박물관</Text>
            </View>
          </View>

          {/* 예정된 일정 */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineDot} />
            <View style={styles.timelineContent}>
              <Text style={styles.itemTime}>13:30 - 14:30</Text>
              <Text style={styles.itemTitle}>항아리 케밥 점심</Text>
              <Text style={styles.itemLocation}>Topdeck Cave</Text>
            </View>
          </View>
        </View>

        {/* 오늘의 비용 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>오늘의 비용</Text>
          <View style={styles.costCard}>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>총 지출</Text>
              <Text style={styles.costAmount}>₩250,820</Text>
            </View>
            <View style={styles.costDivider} />
            <Text style={styles.costDetail}>활동 ₩250,000 · 식사 ₩820</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: colors.white,
  },
  greeting: {
    ...textStyles.h2,
    color: colors.black,
    marginBottom: 4,
  },
  date: {
    ...textStyles.body2,
    color: colors.gray600,
  },
  
  // 현재 활동 카드
  currentCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0EA5E9',
    marginRight: 8,
  },
  statusText: {
    ...textStyles.body3,
    color: '#0EA5E9',
    fontWeight: '600',
  },
  cardTitle: {
    ...textStyles.h3,
    color: colors.black,
    marginBottom: 8,
  },
  cardLocation: {
    ...textStyles.body2,
    color: colors.gray600,
    marginBottom: 12,
  },
  noteBox: {
    backgroundColor: colors.gray100,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  note: {
    ...textStyles.body3,
    color: colors.gray700,
    fontStyle: 'italic',
  },
  timeInfo: {
    ...textStyles.body3,
    color: colors.gray500,
  },
  
  // 섹션
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    ...textStyles.h4,
    color: colors.black,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  
  // 타임라인
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 8,
  },
  doneItem: {
    opacity: 0.5,
  },
  nextItem: {
    // 다음 일정 강조
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gray300,
    marginTop: 4,
    marginRight: 16,
  },
  nextDot: {
    backgroundColor: colors.primary,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
  },
  itemTime: {
    ...textStyles.body3,
    color: colors.gray500,
    marginBottom: 4,
  },
  itemTitle: {
    ...textStyles.body1,
    color: colors.black,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemLocation: {
    ...textStyles.body3,
    color: colors.gray600,
  },
  
  // 비용 카드
  costCard: {
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  costLabel: {
    ...textStyles.body2,
    color: colors.gray600,
  },
  costAmount: {
    ...textStyles.h3,
    color: colors.black,
    fontWeight: '700',
  },
  costDivider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 12,
  },
  costDetail: {
    ...textStyles.body3,
    color: colors.gray500,
  },
});

