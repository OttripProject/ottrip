import { View, StyleSheet, Alert, Platform, useWindowDimensions, Text, Pressable } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useEffect, useState, useCallback, useMemo } from "react";
import api from "@/services/api";
import { plansApi } from "@/services/plans";
import { usePlanDataQuery } from "@/hooks/usePlanDataQuery";
import { usePlansQuery } from "@/hooks/usePlansQuery";
import dayjs from "dayjs";
import { colors } from "@/ui/tokens/colors";

// 새로운 모달 컴포넌트들
import HeaderModal from "@/components/modals/HeaderModal";
import WeeklyScheduleModal from "@/components/modals/WeeklyScheduleModal";
import DetailsModal from "@/components/modals/DetailsModal";
import ExpensesModal from "@/components/modals/ExpensesModal";
import AIAssistantModal from "@/components/modals/AIAssistantModal";

export default function DashboardScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [selectedItinerary, setSelectedItinerary] = useState<any>(null);
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'flight' | 'accommodation' | undefined>(undefined);
  const [openNewFlightForm, setOpenNewFlightForm] = useState<boolean>(false);
  const [openNewItineraryForm, setOpenNewItineraryForm] = useState<boolean>(false);
  const [selectedItineraryDate, setSelectedItineraryDate] = useState<Date | null>(null);
  const [openNewAccommodationForm, setOpenNewAccommodationForm] = useState<boolean>(false);
  const [newAccommodationDraft, setNewAccommodationDraft] = useState<any | null>(null);
  
  // 동적 비율 계산 (화면 크기에 따라 조정)
  const getResponsiveRatio = () => {
    if (width < 768) {
      return { left: 1, right: 0 }; // 모바일: 좌측만
    } else if (width < 1024) {
      return { left: 0.6, right: 0.4 };
    } else if (width < 1440) {
      return { left: 0.7, right: 0.3 }; 
    } else {
      return { left: 0.75, right: 0.25 }; 
    }
  };
  
  const ratio = getResponsiveRatio();
  const headerHeight = 64;
  const headerMarginBottom = 16; 
  const verticalPadding = 16 * 2; 
  const availableHeight = Math.max(360, width ? (typeof window !== 'undefined' ? window.innerHeight : 0) - verticalPadding - headerHeight - headerMarginBottom : 600);
  const innerGap = 16; 
  const leftTopHeight = Math.max(240, Math.floor((availableHeight - innerGap) * 0.7));
  const leftBottomHeight = Math.max(160, (availableHeight - innerGap) - leftTopHeight);
  
  // 상위에서 plans 목록 로드 (한 번만 호출)
  const plansQuery = usePlansQuery();
  
  // 선택된 plan의 상세 데이터 로드
  const planData = usePlanDataQuery(selectedTrip?.publicId || route?.params?.publicId);
  
  // plans를 trips 형태로 변환
  const trips = useMemo(() => plansQuery.plans.map(plan => ({
    id: plan.id.toString(),
    publicId: plan.publicId,
    name: plan.title,
    startDate: plan.startDate,
    endDate: plan.endDate,
  })), [plansQuery.plans]);

  useEffect(() => {
    if (planData.plan) {
      // plan이 로드된 후 ID 설정
      setSelectedPlanId(planData.plan.id);
      
      // URL에서 직접 접근할 때 selectedTrip 설정
      if (!selectedTrip && route?.params?.publicId) {
        const tripData = {
          id: planData.plan.id.toString(),
          publicId: planData.plan.publicId,
          name: planData.plan.title,
          startDate: planData.plan.startDate,
          endDate: planData.plan.endDate,
        };
        setSelectedTrip(tripData);
      }
    }
  }, [planData.plan, selectedTrip, route?.params?.publicId]);

  // 플랜 변경 시 상세 모달 상태 초기화
  useEffect(() => {
    setSelectedItinerary(null);
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    setActiveTab(undefined);
    setOpenNewFlightForm(false);
  }, [selectedPlanId]);


  useEffect(() => {
    if (selectedItinerary && planData.itineraries.length > 0) {
      const updatedItinerary = planData.itineraries.find((it: any) => it.id === selectedItinerary.id);
      if (updatedItinerary) {
        setSelectedItinerary(updatedItinerary);
      }
    }
  }, [planData.itineraries, selectedItinerary]);

  useEffect(() => {
    if (selectedFlight && planData.flights.length > 0) {
      const updatedFlight = planData.flights.find((flight: any) => flight.id === selectedFlight.id);
      if (updatedFlight) {
        setSelectedFlight(updatedFlight);
      }
    }
  }, [planData.flights, selectedFlight]);

  useEffect(() => {
    if (selectedAccommodation && planData.accommodations.length > 0) {
      const updatedAccommodation = planData.accommodations.find((acc: any) => acc.id === selectedAccommodation.id);
      if (updatedAccommodation) {
        setSelectedAccommodation(updatedAccommodation);
      }
    }
  }, [planData.accommodations, selectedAccommodation]);

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
    // 먼저 상세로 전환하여 리스트 깜빡임 방지
    setSelectedItinerary(newItinerary);
    setActiveTab('itinerary');
    setSelectedFlight(null);
    setSelectedAccommodation(null);
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
      // 새로 생성된 숙박을 선택된 상태로 설정
      setSelectedAccommodation(newAccommodation);
      setActiveTab('accommodation');
    }
  };

  const handleExpenseAdd = async (newExpense: any) => {
    if (selectedPlanId) {
      await planData.refreshExpenses();
    }
  };

  const handleShowItineraryModal = useCallback(() => {
    setActiveTab('itinerary');
    
    // 다른 선택된 아이템들 초기화
    setSelectedFlight(null);
    setSelectedAccommodation(null);
  }, []);

  const handleShowFlightModal = useCallback(() => {
    setActiveTab('flight');
    
    // 다른 선택된 아이템들 초기화
    setSelectedItinerary(null);
    setSelectedAccommodation(null);
  }, []);

  const handleRequestNewFlight = useCallback(() => {
    setActiveTab('flight');
    setSelectedItinerary(null);
    setSelectedAccommodation(null);
    setSelectedFlight(null); // 기존 편집 대상 초기화
    setOpenNewFlightForm(true);
  }, []);

  const handleRequestNewItinerary = useCallback((date?: Date) => {
    setActiveTab('itinerary');
    setSelectedFlight(null);
    setSelectedAccommodation(null);
    setSelectedItinerary(null); // 기존 편집 대상 초기화
    setOpenNewItineraryForm(true);
    // 선택된 날짜가 있으면 해당 날짜로 설정
    if (date) {
      setSelectedItineraryDate(date);
    } else {
      setSelectedItineraryDate(null);
    }
  }, []);

  const handleShowAccommodationModal = useCallback((accommodation: any, date?: string) => {
    setActiveTab('accommodation');
    
    // 다른 선택된 아이템들 초기화
    setSelectedItinerary(null);
    setSelectedFlight(null);
    
    if (accommodation) {
      setSelectedAccommodation(accommodation);
      setOpenNewAccommodationForm(false);
      setNewAccommodationDraft(null);
    } else {
      setSelectedAccommodation(null);
      // 새 숙박 추가를 위한 기본 데이터 설정
      if (date) {
        const draft = {
          checkinDate: date,
          checkoutDate: dayjs(date).add(1, 'day').format('YYYY-MM-DD'),
          checkinTime: '15:00',
          checkoutTime: '11:00',
        };
        setSelectedAccommodation(draft);
        setNewAccommodationDraft(draft);
      }
      setOpenNewAccommodationForm(true);
    }
  }, []);

  const handleShowItineraryDetail = useCallback((itinerary: any) => {
    setSelectedItinerary(itinerary);
    setActiveTab('itinerary');
    
    // 다른 선택된 아이템들 초기화
    setSelectedFlight(null);
    setSelectedAccommodation(null);
  }, []);

  const handleShowFlightDetail = useCallback((flight: any) => {
    setSelectedFlight(flight);
    setActiveTab('flight');
    
    // 다른 선택된 아이템들 초기화
    setSelectedItinerary(null);
    setSelectedAccommodation(null);
  }, []);

  const handleShowAccommodationDetail = useCallback((accommodation: any) => {
    setSelectedAccommodation(accommodation);
    setActiveTab('accommodation');
    
    // 다른 선택된 아이템들 초기화
    setSelectedItinerary(null);
    setSelectedFlight(null);
  }, []);

  // 에러 전용 화면으로의 전환은 렌더 중이 아닌 이펙트에서 수행 (React 경고 방지)
  useEffect(() => {
    if (planData.errorStatus === 404) {
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: 'NOT FOUND' }] });
    } else if (planData.errorStatus === 403) {
      // @ts-ignore
      navigation.reset({ index: 0, routes: [{ name: 'FORBIDDEN' }] });
    }
  }, [planData.errorStatus]);

  if (planData.errorStatus === 404 || planData.errorStatus === 403) {
    // 전용 화면으로 리다이렉트 중이므로 렌더 스킵
    return null;
  }


  return (
    <View style={styles.root}>
      {/* 1. 헤더 모달 */}
      <View style={styles.headerModal}>
        <HeaderModal />
      </View>

      {/* 메인 레이아웃 */}
      <View style={styles.container}>
      <View style={styles.mainLayout}>
        {/* 좌측 영역 (동적 비율) */}
        <View style={[styles.leftArea, { flex: ratio.left, height: availableHeight }]}>
          {/* 2. 주간 스케줄 모달 (70% 높이) */}
          <View style={[styles.scheduleModal, { height: leftTopHeight }]}>
      <WeeklyScheduleModal
              itineraries={planData.itineraries}
              flights={planData.flights}
              height={leftTopHeight}
              selectedTrip={selectedTrip}
              planData={planData}
              plans={plansQuery.plans}
              trips={trips}
              onPlansRefresh={plansQuery.fetchPlans}
              onPlanAdd={plansQuery.addPlan}
              onPlanUpdate={plansQuery.updatePlan}
              onPlanDelete={plansQuery.deletePlan}
              onItineraryAdd={handleItineraryAdd}
        onPlanSelect={(trip) => {
          setSelectedTrip(trip);
          setSelectedPlanId(trip ? parseInt(trip.id) : null);
          if (Platform.OS === 'web') {
            // 웹: navigate로 히스토리를 남겨 뒤로가기로 이전 플랜 보기
            if (trip?.publicId) {
              // @ts-ignore
              navigation.navigate('PLAN', { publicId: trip.publicId });
            } else {
              // @ts-ignore
              navigation.navigate('OTTRIP');
            }
          } else {
            // 모바일: 동일하게 navigate 사용
            if (trip?.publicId) {
              // @ts-ignore
              navigation.navigate('PLAN', { publicId: trip.publicId });
            } else {
              // @ts-ignore
              navigation.navigate('OTTRIP');
            }
          }
        }}
              onItinerarySelect={setSelectedItinerary}
              onFlightAdd={handleFlightAdd}
              onAccommodationAdd={handleAccommodationAdd}
              onShowItineraryModal={handleShowItineraryModal}
              onShowFlightModal={handleShowFlightModal}
              onRequestNewFlight={handleRequestNewFlight}
              onRequestNewItinerary={handleRequestNewItinerary}
              onShowAccommodationModal={handleShowAccommodationModal}
              onShowItineraryDetail={handleShowItineraryDetail}
              onShowFlightDetail={handleShowFlightDetail}
              onShowAccommodationDetail={handleShowAccommodationDetail}
            />
          </View>

          {/* 하단 모달들 (30% 높이) */}
          <View style={[styles.bottomRow, { height: leftBottomHeight }]}>
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
              <AIAssistantModal publicId={planData.plan?.publicId || null} />
            </View>
          </View>
        </View>

        {/* 우측 영역 (동적 비율) */}
        {ratio.right > 0 && (
        <View style={[styles.rightArea, { flex: ratio.right, height: availableHeight }]}>
          {/* 3. 상세 정보 모달 (전체 높이) */}
          <View style={styles.detailsModal}>
            <DetailsModal 
              planData={planData}
              selectedItinerary={selectedItinerary}
              selectedFlight={selectedFlight}
              selectedAccommodation={selectedAccommodation}
              activeTab={activeTab}
              onItineraryAdd={handleItineraryAdd}
              onItineraryClear={() => {
                setSelectedItinerary(null);
                setActiveTab(undefined);
              }}
              onFlightAdd={handleFlightAdd}
              onFlightClear={() => {
                setSelectedFlight(null);
                setActiveTab(undefined);
              }}
              onAccommodationAdd={handleAccommodationAdd}
              onAccommodationSelect={setSelectedAccommodation}
              onExpenseAdd={handleExpenseAdd}
              openNewFlightForm={openNewFlightForm}
              onConsumeOpenNewFlightForm={() => setOpenNewFlightForm(false)}
              openNewItineraryForm={openNewItineraryForm}
              onConsumeOpenNewItineraryForm={() => setOpenNewItineraryForm(false)}
              selectedItineraryDate={selectedItineraryDate}
              openNewAccommodationForm={openNewAccommodationForm}
              onConsumeOpenNewAccommodationForm={() => setOpenNewAccommodationForm(false)}
              newAccommodationDraft={newAccommodationDraft}
            />
          </View>
        </View>
        )}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.gray300,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  headerModal: {
    width: '100%',
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    minHeight: 0,
  },
  leftArea: {
    gap: 16,
    minHeight: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  rightArea: {
    // flex는 동적으로 설정
    minHeight: 0,
    flexShrink: 1,
    overflow: 'hidden',
  },
  scheduleModal: {
    flex: 0.7, // 70% 높이
    minHeight: 0,
    overflow: 'hidden',
  },
  bottomRow: {
    flex: 0.3, // 30% 높이
    flexDirection: 'row',
    gap: 16,
    minHeight: 0,
    overflow: 'hidden',
  },
  detailsModal: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  expensesModal: {
    flex: 1,
  },
  aiModal: {
    flex: 1,
  },
});
