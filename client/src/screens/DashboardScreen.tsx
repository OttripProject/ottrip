import { useIsWideScreen } from "@/hooks/useIsWideScreen";
import { View, StyleSheet, Alert, Platform, useWindowDimensions, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { usePlanData } from "@/hooks/usePlanData";

// 새로운 모달 컴포넌트들
import HeaderModal from "@/components/HeaderModal";
import WeeklyScheduleModal from "@/components/WeeklyScheduleModal";
import DetailsModal from "@/components/DetailsModal";
import ExpensesModal from "@/components/ExpensesModal";
import AIAssistantModal from "@/components/AIAssistantModal";

export default function DashboardScreen() {
  const isWide = useIsWideScreen();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  
  // 동적 비율 계산 (화면 크기에 따라 조정)
  const getResponsiveRatio = () => {
    if (width < 768) {
      return { left: 1, right: 0 }; // 모바일: 좌측만
    } else if (width < 1024) {
      return { left: 0.6, right: 0.4 }; // 태블릿: 60:40
    } else if (width < 1440) {
      return { left: 0.7, right: 0.3 }; // 데스크톱: 70:30
    } else {
      return { left: 0.75, right: 0.25 }; // 대형 화면: 75:25
    }
  };
  
  const ratio = getResponsiveRatio();
  
  // 선택된 Plan의 데이터 로딩
  const planData = usePlanData(selectedPlanId);

  // 이미 로그인된 사용자가 초대 링크(#invite=...)로 진입한 경우 자동 수락 처리
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#invite=')) {
      const token = hash.replace('#invite=', '');
      const accept = async () => {
        try {
          await api.post(`/private/plans/invitations/${token}/accept`);
          Alert.alert('완료', '초대를 수락했습니다.');
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('plans-refresh'));
          }
        } catch (e: any) {
          const msg = e?.response?.data?.detail || '초대 수락에 실패했습니다.';
          Alert.alert('오류', msg);
        } finally {
          // 해시 제거
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      accept();
    }
  }, []);

  const handleItineraryAdd = async (newItinerary: any) => {
    if (selectedPlanId) {
      await planData.refreshItineraries();
    }
  };

  const handleFlightAdd = async (newFlight: any) => {
    if (selectedPlanId) {
      await planData.refreshFlights();
    }
  };

  const handleAccommodationAdd = async (newAccommodation: any) => {
    if (selectedPlanId) {
      await planData.refreshAccommodations();
    }
  };

  const handleExpenseAdd = async (newExpense: any) => {
    if (selectedPlanId) {
      await planData.refreshExpenses();
    }
  };
  
  return (
    <ScrollView 
      style={styles.scrollContainer}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={true}
      bounces={false}
    >
      {/* 1. 헤더 모달 */}
      <View style={styles.headerModal}>
        <HeaderModal />
      </View>

      {/* 메인 레이아웃 */}
      <View style={styles.mainLayout}>
        {/* 좌측 영역 (동적 비율) */}
        <View style={[styles.leftArea, { flex: ratio.left }]}>
          {/* 2. 주간 스케줄 모달 (70% 높이) */}
          <View style={styles.scheduleModal}>
            <WeeklyScheduleModal 
              itineraries={planData.itineraries}
              flights={planData.flights}
              height={400}
              onItineraryAdd={handleItineraryAdd}
              onPlanSelect={setSelectedPlanId}
              onItinerarySelect={setSelectedItinerary}
            />
          </View>

          {/* 하단 모달들 (30% 높이) */}
          <View style={styles.bottomRow}>
            {/* 4. 지출 모달 (좌측 하단) */}
            <View style={styles.expensesModal}>
              <ExpensesModal 
                planData={{
                  ...planData,
                  refreshItineraries: planData.refreshItineraries,
                  refreshFlights: planData.refreshFlights,
                  refreshAccommodations: planData.refreshAccommodations,
                }}
                onExpenseAdd={handleExpenseAdd}
              />
            </View>

            {/* 5. AI 어시스턴트 모달 (우측 하단) */}
            <View style={styles.aiModal}>
              <AIAssistantModal planId={selectedPlanId} />
            </View>
          </View>
        </View>

        {/* 우측 영역 (동적 비율) */}
        {ratio.right > 0 && (
        <View style={[styles.rightArea, { flex: ratio.right }]}>
          {/* 3. 상세 정보 모달 (전체 높이) */}
          <View style={styles.detailsModal}>
            <DetailsModal 
              planData={planData}
              selectedItinerary={selectedItinerary}
              onItineraryAdd={handleItineraryAdd}
              onFlightAdd={handleFlightAdd}
              onAccommodationAdd={handleAccommodationAdd}
              onExpenseAdd={handleExpenseAdd}
            />
          </View>
        </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    minHeight: '100%',
    padding: 16,
  },
  headerModal: {
    height: 56,
    marginBottom: 16,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
  },
  leftArea: {
    gap: 16,
  },
  rightArea: {
    // flex는 동적으로 설정
  },
  scheduleModal: {
    flex: 0.7, // 70% 높이
    minHeight: 400,
  },
  bottomRow: {
    flex: 0.3, // 30% 높이
    flexDirection: 'row',
    gap: 16,
  },
  detailsModal: {
    flex: 1,
  },
  expensesModal: {
    flex: 1,
  },
  aiModal: {
    flex: 1,
  },
});
