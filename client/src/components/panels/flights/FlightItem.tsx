import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { TimePicker, AirportPicker } from '@/ui/components/pickers';
import dayjs from 'dayjs';
import { flightsApi } from '@/services/flights';
import { attachmentsApi } from '@/services/attachments';
import { useAttachmentUpload } from '@/hooks/useAttachmentUpload';
import { useFilePicker } from '@/hooks/useFilePicker';
import AttachmentSection from '@/ui/components/attachmentSection';
import type {
  Attachment,
  DocumentUploadAnalyzeResponse,
  LocalFile,
} from '@/types/api';
import { handleGuestPromptError } from '@/utils/guestPrompt';
import {
  formatAttachmentUploadFailureMessage,
  showMessage,
} from '@/utils/crossPlatformAlert';
import { ExpenseCurrency, ExpenseCategory, currencyLabels } from '@/types/expense';
import Input from '@/ui/components/input/Input';
import { PLACEHOLDERS } from '@/constants/placeholders';
import { colors } from '@/ui/tokens/colors';
import { textStyles } from '@/ui/tokens/typography';
import { spacing } from '@/ui/tokens/spacing';
import { radii } from '@/ui/tokens/radii';
import BaseCalendar from '@/components/popup/calendar/BaseCalendar';
import CalendarIcon from '../../../../assets/calender.svg';
import AddIcon from '../../../../assets/add.svg';
import DeleteIcon from '../../../../assets/delete.svg';
import CloseIcon from '../../../../assets/delete_ai.svg';
import WarningBanner from '@/ui/components/toast/warning';
import AiDocumentAnalyzeModal from '@/components/modals/AiDocumentAnalyzeModal';
import AiAnalyzeFailureModal from '@/components/modals/AiAnalyzeFailureModal';
import type { AiAttachmentAnalyzeSelection } from '@/ui/components/attachmentSection.types';
import { analyzeDocumentUpload } from '@/services/aiDocument';
import { buildAnalyzeUploadPayload } from '@/utils/attachmentAiAnalyze';

interface FlightItemProps {
  flight?: any;
  planId: number;
  planData?: any;
  onSave: (flight: any) => void;
  onCancel: () => void;
  onDelete?: (flightId: string) => void;
  existingFlights?: any[]; 
  onShowWarning?: (message?: string) => void;
  readOnly?: boolean; 
  onEdit?: () => void; 
}

export default function FlightItem({ 
  flight, 
  planId, 
  planData,
  onSave, 
  onCancel, 
  onDelete,
  existingFlights = [],
  onShowWarning,
  readOnly = false,
  onEdit,
}: FlightItemProps) {
  const formatAmountWithCommas = (digits: string) => {
    if (!digits) return '';
    const normalized = digits.replace(/^0+(?=\d)/, '');
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const normalizeAmountToIntDigits = (value: unknown) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const integerPart = raw.split('.')[0];
    return integerPart.replace(/[^0-9]/g, '');
  };
  const [formData, setFormData] = useState({
    reservation_number: flight?.reservationNumber || flight?.reservation_number || '',
    passenger_name: flight?.passengerName || flight?.passenger_name || '',
    ticket_number: flight?.ticketNumber || flight?.ticket_number || '',
    booking_reference: flight?.bookingReference || flight?.booking_reference || '',
  });

  const [airportOpen, setAirportOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [segmentDatePickerOpen, setSegmentDatePickerOpen] = useState<Record<string, boolean>>({});

  const [expenseData, setExpenseData] = useState({
    amount: normalizeAmountToIntDigits(flight?.expense?.amount),
  });

  useEffect(() => {
    setExpenseData({
      amount: normalizeAmountToIntDigits(flight?.expense?.amount),
    });
  }, [flight]);

  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');

  type SegmentForm = {
    id?: number;
    airline: string;
    flight_number: string;
    departure_airport: string;
    arrival_airport: string;
    departure_date: string; 
    departure_time: string; 
    arrival_date: string;   
    arrival_time: string;   
    seat_class?: string;
    seat_number?: string;
    gate?: string;
    terminal?: string;
  };

  const [flightSegments, setFlightSegments] = useState<SegmentForm[]>(() => {
    if (flight?.flightSegments && flight.flightSegments.length > 0) {
      const sortedSegments = [...flight.flightSegments].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      return sortedSegments.map((segment: any) => {
        const depTime = segment.departureTime ? dayjs(segment.departureTime) : dayjs();
        const arrTime = segment.arrivalTime ? dayjs(segment.arrivalTime) : dayjs().add(1, 'hour');
        return {
          id: segment.id, 
          airline: segment.airline || '',
          flight_number: segment.flightNumber || '',
          departure_airport: segment.departureAirport || '',
          arrival_airport: segment.arrivalAirport || '',
          departure_date: depTime.format('YYYY-MM-DD'),
          departure_time: depTime.format('HH:mm'),
          arrival_date: arrTime.format('YYYY-MM-DD'),
          arrival_time: arrTime.format('HH:mm'),
          seat_class: segment.seatClass || '',
          seat_number: segment.seatNumber || '',
          gate: segment.gate || '',
          terminal: segment.terminal || '',
        };
      });
    } else {
      const planStartDate = planData?.plan?.startDate || planData?.plan?.start_date;
      const defaultDate = planStartDate ? dayjs(planStartDate) : dayjs();
      const later = defaultDate.add(1, 'hour');
      return [{
        airline: '',
        flight_number: '',
        departure_airport: '',
        arrival_airport: '',
        departure_date: defaultDate.format('YYYY-MM-DD'),
        departure_time: '',
        arrival_date: later.format('YYYY-MM-DD'),
        arrival_time: '',
        seat_class: '',
        seat_number: '',
        gate: '',
        terminal: '',
      }];
    }
  });

  const [expenseDate, setExpenseDate] = useState(() => {
    if (flight?.expense?.exDate) {
      return flight.expense.exDate;
    }
    if (flightSegments.length > 0) {
      return flightSegments[0].departure_date;
    }
    const planStartDate = planData?.plan?.startDate || planData?.plan?.start_date;
    return planStartDate ? dayjs(planStartDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const [pendingFiles, setPendingFiles] = useState<LocalFile[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [aiAnalyzeModalVisible, setAiAnalyzeModalVisible] = useState(false);
  const [aiAnalyzeResult, setAiAnalyzeResult] =
    useState<DocumentUploadAnalyzeResponse | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalyzeFailureVisible, setAiAnalyzeFailureVisible] = useState(false);
  const [aiAnalyzeFailureMessage, setAiAnalyzeFailureMessage] = useState('');

  const { pickImage, pickDocument } = useFilePicker();
  const { isUploading, uploadFiles } = useAttachmentUpload({
    planId,
    entityType: 'flight',
  });

  const flightAttachmentEntityId = useMemo(() => {
    const raw = flight?.id;
    if (raw == null || raw === '') return undefined;
    const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    return Number.isFinite(n) ? n : undefined;
  }, [flight?.id]);

  const handleAiAnalyzePress = useCallback(
    async (selection: AiAttachmentAnalyzeSelection) => {
      setAiAnalyzeFailureVisible(false);
      setAiAnalyzeFailureMessage('');
      setIsAiAnalyzing(true);
      try {
        const payload = await buildAnalyzeUploadPayload(selection, {
          pendingFiles,
          existingAttachments,
        });
        const res = await analyzeDocumentUpload(payload.file, {
          filename: payload.filename,
        });
        const err = res.error?.trim();
        if (!res.success || err) {
          setAiAnalyzeFailureMessage(err || '분석에 실패했습니다.');
          setAiAnalyzeFailureVisible(true);
          return;
        }
        setAiAnalyzeResult(res);
        setAiAnalyzeModalVisible(true);
      } catch (e) {
        setAiAnalyzeFailureMessage(
          e instanceof Error ? e.message : '분석 요청에 실패했습니다.',
        );
        setAiAnalyzeFailureVisible(true);
      } finally {
        setIsAiAnalyzing(false);
      }
    },
    [pendingFiles, existingAttachments],
  );

  const firstSegment = flightSegments[0];
  const isFirstSegmentValid = Boolean(
    firstSegment &&
    firstSegment.departure_airport.trim() &&
    firstSegment.arrival_airport.trim() &&
    String(firstSegment.departure_date || '').trim() &&
    String(firstSegment.departure_time || '').trim() &&
    String(firstSegment.arrival_date || '').trim() &&
    String(firstSegment.arrival_time || '').trim()
  );

  useEffect(() => {
    const id = flightAttachmentEntityId;
    if (id == null) {
      setExistingAttachments([]);
      setIsLoadingAttachments(false);
      return;
    }
    let cancelled = false;
    setExistingAttachments([]);
    setIsLoadingAttachments(true);
    attachmentsApi
      .getAttachments(planId, 'flight', id)
      .then((list) => {
        if (!cancelled) setExistingAttachments(list);
      })
      .catch(() => {
        if (!cancelled) setExistingAttachments([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAttachments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [flightAttachmentEntityId, planId]);

  useEffect(() => {
    setPendingFiles((prev) => {
      if (Platform.OS === 'web') {
        prev.forEach((f) => {
          if (f.uri?.startsWith('blob:')) {
            try {
              URL.revokeObjectURL(f.uri);
            } catch {
              /* noop */
            }
          }
        });
      }
      return [];
    });
  }, [flightAttachmentEntityId]);

  useEffect(() => {
    if (readOnly) {
      setPendingFiles((prev) => {
        if (Platform.OS === 'web') {
          prev.forEach((f) => {
            if (f.uri?.startsWith('blob:')) {
              try {
                URL.revokeObjectURL(f.uri);
              } catch {
                /* noop */
              }
            }
          });
        }
        return [];
      });
    }
  }, [readOnly]);

  const appendImage = async () => {
    try {
      const f = await pickImage();
      if (f) setPendingFiles((p) => [...p, f]);
    } catch (e) {
      showMessage(
        '알림',
        e instanceof Error ? e.message : '파일을 선택하지 못했습니다.',
      );
    }
  };

  const appendDocument = async () => {
    try {
      const f = await pickDocument();
      if (f) setPendingFiles((p) => [...p, f]);
    } catch (e) {
      showMessage(
        '알림',
        e instanceof Error ? e.message : '파일을 선택하지 못했습니다.',
      );
    }
  };

  const removePendingAt = (index: number) => {
    setPendingFiles((prev) => {
      const t = prev[index];
      if (Platform.OS === 'web' && t?.uri?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(t.uri);
        } catch {
          /* noop */
        }
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingAttachment = async (attachmentId: number) => {
    try {
      await attachmentsApi.deleteAttachment(attachmentId);
      setExistingAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (error) {
      if (handleGuestPromptError(error)) return;
      showMessage('알림', '첨부파일 삭제에 실패했습니다.');
    }
  };

  const showAttachmentSection =
    !readOnly ||
    (readOnly &&
      flightAttachmentEntityId != null &&
      (isLoadingAttachments || existingAttachments.length > 0));

  const handleSave = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!isFirstSegmentValid) {
      setWarningMessage('입력되지 않은 값이 있어요.');
      setShowWarning(true);
      return;
    }

    for (const existingFlight of existingFlights) {
      if (flight && existingFlight.id === flight.id) {
        continue;
      }

      if (!existingFlight.flightSegments || existingFlight.flightSegments.length === 0) {
        continue;
      }

      for (const newSegment of flightSegments) {
        const newDepTime = dayjs(`${newSegment.departure_date} ${newSegment.departure_time}`);
        const newArrTime = dayjs(`${newSegment.arrival_date} ${newSegment.arrival_time}`);

        for (const existingSegment of existingFlight.flightSegments) {
          const existingDepTime = dayjs(existingSegment.departureTime);
          const existingArrTime = dayjs(existingSegment.arrivalTime);
          
          const hasOverlap = (
            (newDepTime.isAfter(existingDepTime) || newDepTime.isSame(existingDepTime)) && newDepTime.isBefore(existingArrTime) ||
            newArrTime.isAfter(existingDepTime) && (newArrTime.isBefore(existingArrTime) || newArrTime.isSame(existingArrTime)) ||
            (newDepTime.isBefore(existingDepTime) && newArrTime.isAfter(existingArrTime))
          );

          if (hasOverlap) {
            setWarningMessage('겹치는 항공 일정이 있어요');
            setShowWarning(true);
            return;
          }
        }
      }
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      let savedFlight;
      const toIso = (date: string, time: string) => {
        if (!date || !time) return null;
        const timeWithSeconds = (time.length === 5) ? `${time}:00` : time;
        
        const localDateTime = new Date(`${date}T${timeWithSeconds}`);
        return localDateTime.toISOString();
      };

      if (flight) {
        await flightsApi.updateFlight(flight.id, {
          reservationNumber: formData.reservation_number || null,
          passengerName: formData.passenger_name || null,
          ticketNumber: formData.ticket_number || null,
          bookingReference: formData.booking_reference || null,
          segments: flightSegments.map(s => ({
            id: s.id || undefined,
            airline: s.airline || null,
            flightNumber: s.flight_number || null,
            departureAirport: s.departure_airport,
            arrivalAirport: s.arrival_airport,
            departureTime: toIso(s.departure_date, s.departure_time),
            arrivalTime: toIso(s.arrival_date, s.arrival_time),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          })),
          expense: {
            exDate: flightSegments.length > 0 && flightSegments[0].departure_date 
              ? flightSegments[0].departure_date 
              : expenseDate,
            amount: parseInt(expenseData.amount || '0', 10) || 0,
            currency: ExpenseCurrency.KRW,
            category: ExpenseCategory.FLIGHT as any,
            planId: planId,
            description: formData.reservation_number || null,
          },
        });
        savedFlight = await flightsApi.getFlight(flight.id);
      } else {
        const createResponse = await flightsApi.createFlight({
          planId: planId,
          reservationNumber: formData.reservation_number || null,
          passengerName: formData.passenger_name || null,
          ticketNumber: formData.ticket_number || null,
          bookingReference: formData.booking_reference || null,
          segments: flightSegments.map(s => ({
            airline: s.airline || null,
            flightNumber: s.flight_number || null,
            departureAirport: s.departure_airport,
            arrivalAirport: s.arrival_airport,
            departureTime: toIso(s.departure_date, s.departure_time),
            arrivalTime: toIso(s.arrival_date, s.arrival_time),
            seatClass: s.seat_class || null,
            seatNumber: s.seat_number || null,
            gate: s.gate || null,
            terminal: s.terminal || null,
          })),
          expense: {
            exDate: flightSegments.length > 0 && flightSegments[0].departure_date 
              ? flightSegments[0].departure_date 
              : expenseDate,
            amount: parseInt(expenseData.amount || '0', 10) || 0,
            currency: ExpenseCurrency.KRW,
            category: ExpenseCategory.FLIGHT as any,
            planId: planId,
            description: formData.reservation_number || null,
          },
        });
        savedFlight = await flightsApi.getFlight(createResponse.id);
      }

      if (pendingFiles.length > 0 && savedFlight?.id) {
        try {
          await uploadFiles(pendingFiles, savedFlight.id);
          const list = await attachmentsApi.getAttachments(
            planId,
            'flight',
            savedFlight.id,
          );
          setExistingAttachments(list);
          setPendingFiles([]);
        } catch (e) {
          if (!handleGuestPromptError(e)) {
            showMessage(
              '알림',
              formatAttachmentUploadFailureMessage(
                e,
                '항공편은 저장됐으나 일부 파일 업로드에 실패했습니다.',
              ),
            );
          }
        }
      }

      onSave(savedFlight);
    } catch (error) {
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (isSubmittingRef.current) {
      return;
    }

    if (!flight) {
      onCancel();
      return;
    }
    
    if (flight && onDelete) {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      try {
        await flightsApi.deleteFlight(flight.id);
        onDelete(flight.id);
        onCancel();
      } catch (error) {
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const isSegmentComplete = (segment: SegmentForm): boolean => {
    return !!(
      segment.departure_airport &&
      segment.arrival_airport &&
      segment.departure_date &&
      segment.departure_time &&
      segment.arrival_date &&
      segment.arrival_time
    );
  };

  return (
    <>
    <ScrollView 
      style={[styles.container, { position: 'relative', overflow: 'visible' }]}
      contentContainerStyle={[styles.contentContainer, { overflow: 'visible' }]}
    >
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {readOnly ? '항공편 정보' : (flight ? '항공편 수정' : '항공편 추가')}
          </Text>
          <Pressable
            onPress={() => {onCancel();}}
            style={styles.closeButton}
          >
            <CloseIcon width={24} height={24} />
          </Pressable>
        </View>

        <View style={styles.formSection}>
          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>예약번호 (PNR)</Text>
              <Input
                variant={readOnly ? "outlined" : "filled"}
                placeholder={PLACEHOLDERS.flight.reservationNumber}
                value={formData.reservation_number}
                onChangeText={(text) => !readOnly && setFormData({ ...formData, reservation_number: text })}
                style={readOnly ? styles.readOnlyInput : styles.input}
                placeholderTextColor={colors.gray600}
                editable={!readOnly}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>승객명</Text>
              <Input
                variant={readOnly ? "outlined" : "filled"}
                placeholder={PLACEHOLDERS.flight.passengerName}
                value={formData.passenger_name}
                onChangeText={(text) => !readOnly && setFormData({ ...formData, passenger_name: text })}
                style={readOnly ? styles.readOnlyInput : styles.input}
                placeholderTextColor={colors.gray600}
                editable={!readOnly}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>항공권 번호</Text>
            <Input
              variant={readOnly ? "outlined" : "filled"}
              placeholder={PLACEHOLDERS.flight.ticketNumber}
              value={formData.ticket_number}
              onChangeText={(text) => !readOnly && setFormData({ ...formData, ticket_number: text })}
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>예약번호 (여행사 예약 번호)</Text>
            <Input
              variant={readOnly ? "outlined" : "filled"}
              placeholder={PLACEHOLDERS.flight.bookingReference}
              value={formData.booking_reference}
              onChangeText={(text) => !readOnly && setFormData({ ...formData, booking_reference: text })}
              style={readOnly ? styles.readOnlyInput : styles.input}
              placeholderTextColor={colors.gray600}
              editable={!readOnly}
            />
          </View>

          <View style={[styles.row, { gap: spacing.sm }]}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>항공료</Text>
              <View style={styles.amountInputWrapper}>
                <Input
                  variant={readOnly ? "outlined" : "filled"}
                  placeholder={PLACEHOLDERS.expense.amount}
                  value={formatAmountWithCommas(expenseData.amount.toString())}
                  onChangeText={(text) => {
                    if (readOnly) return;
                    setExpenseData({ ...expenseData, amount: normalizeAmountToIntDigits(text) });
                  }}
                  keyboardType="numeric"
                  style={[
                    readOnly ? styles.readOnlyInput : styles.input,
                    styles.amountInputPadding,
                  ]}
                  placeholderTextColor={colors.gray600}
                  editable={!readOnly}
                />
                <Text style={styles.amountSuffix} pointerEvents="none">
                  {currencyLabels[ExpenseCurrency.KRW]}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.inputGroup, { zIndex: 5000 }]}>
          {flightSegments.map((segment, idx) => {
            const isComplete = isSegmentComplete(segment);
            return (
              <View 
                key={idx} 
                style={[
                  styles.segmentContainer,
                  { 
                    zIndex: (flightSegments.length - idx) * 1000,
                    backgroundColor: isComplete ? colors.gray200 : colors.white
                  }
                ]}
              >
                <View style={styles.segmentTitleRow}>
                  <Text style={styles.segmentTitle}>구간{idx + 1}</Text>
                  {!readOnly && flightSegments.length > 1 && (
                    <Pressable
                      onPress={() => {
                        setFlightSegments(prev => prev.filter((_, i) => i !== idx));
                      }}
                      style={styles.segmentDeleteButton}
                    >
                      <DeleteIcon width={16} height={16} />
                    </Pressable>
                  )}
                </View>
                
                <View style={styles.segmentContent}>
                  <View style={[styles.row, { gap: spacing.sm, zIndex: 3000 }]}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>항공사</Text>
                      <Input
                        variant={readOnly ? "outlined" : "filled"}
                        placeholder={PLACEHOLDERS.flight.airline}
                        value={segment.airline}
                        onChangeText={(text) => {
                          if (!readOnly) {
                            const newSegments = [...flightSegments];
                            newSegments[idx].airline = text;
                            setFlightSegments(newSegments);
                          }
                        }}
                        style={readOnly ? [styles.segmentInput, { borderColor: colors.gray400 }] : styles.segmentInput}
                        placeholderTextColor={colors.gray600}
                        editable={!readOnly}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>항공편명</Text>
                      <Input
                        variant="outlined"
                        placeholder={PLACEHOLDERS.flight.flightNumber}
                        value={segment.flight_number}
                        onChangeText={(text) => {
                          if (!readOnly) {
                            const newSegments = [...flightSegments];
                            newSegments[idx].flight_number = text;
                            setFlightSegments(newSegments);
                          }
                        }}
                        style={readOnly ? [styles.segmentInput, { borderColor: colors.gray400 }] : styles.segmentInput}
                        placeholderTextColor={colors.gray600}
                        editable={!readOnly}
                      />
                    </View>
                  </View>

                  <View style={[styles.row, { gap: spacing.sm, zIndex: 2000 }]}>
                    <View style={[styles.inputGroup, styles.halfWidth, styles.airportPickerWrapper]}>
                      <Text style={styles.label}>출발 공항*</Text>
                      <AirportPicker
                        value={segment.departure_airport}
                        onChange={(code) => {
                          if (!readOnly) {
                            const newSegments = [...flightSegments];
                            newSegments[idx].departure_airport = code;
                            setFlightSegments(newSegments);
                          }
                        }}
                        placeholder={PLACEHOLDERS.flight.departureAirport}
                        disabled={readOnly}
                      />
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth, styles.airportPickerWrapper]}>
                      <Text style={styles.label}>도착 공항*</Text>
                      <AirportPicker
                        value={segment.arrival_airport}
                        onChange={(code) => {
                          if (!readOnly) {
                            const newSegments = [...flightSegments];
                            newSegments[idx].arrival_airport = code;
                            setFlightSegments(newSegments);
                          }
                        }}
                        placeholder={PLACEHOLDERS.flight.arrivalAirport}
                        disabled={readOnly}
                      />
                    </View>
                  </View>

                  <View style={[styles.row, { gap: spacing.sm, zIndex: 1000 }]}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>출발 일자*</Text>
                      <Pressable 
                        style={styles.segmentDateInput} 
                        onPress={() => {
                          if (!readOnly) {
                            const depKey = `dep_${idx}`;
                            const arrKey = `arr_${idx}`;
                            setSegmentDatePickerOpen({ 
                              ...segmentDatePickerOpen, 
                              [depKey]: true,
                              [arrKey]: false 
                            });
                          }
                        }}
                        disabled={readOnly}
                      >
                        <View style={styles.segmentDateTextContainer}>
                          <Text style={segment.departure_date ? styles.segmentDateText : styles.segmentPlaceholderText}>
                            {segment.departure_date ? dayjs(segment.departure_date).format('YYYY.MM.DD') : '기타'}
                          </Text>
                          <View style={styles.iconWrapper}>
                            <CalendarIcon width={16} height={16} />
                          </View>
                        </View>
                      </Pressable>
                      {segmentDatePickerOpen[`dep_${idx}`] && (
                        <BaseCalendar
                          visible={true}
                          selectedDate={segment.departure_date}
                          onDayPress={(day) => {
                            if (!readOnly) {
                              const newSegments = [...flightSegments];
                              newSegments[idx].departure_date = day.dateString;
                              setFlightSegments(newSegments);
                              const key = `dep_${idx}`;
                              setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                            }
                          }}
                          onClose={() => {
                            const key = `dep_${idx}`;
                            setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                          }}
                          style={styles.calendarPopup}
                          minDate={idx > 0 ? flightSegments[idx - 1].arrival_date : undefined}
                          hideButtons={true}
                          autoCloseOnSelect={true}
                        />
                      )}
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>출발 시간*</Text>
                      <TimePicker
                        value={segment.departure_time}
                        onChange={(time) => {
                          if (!readOnly) {
                            const newSegments = [...flightSegments];
                            newSegments[idx].departure_time = time;
                            setFlightSegments(newSegments);
                          }
                        }}
                        onOpen={() => !readOnly && setTimeOpen(true)}
                        onClose={() => setTimeOpen(false)}
                        minTime={idx > 0 && segment.departure_date === flightSegments[idx - 1].arrival_date ? flightSegments[idx - 1].arrival_time : undefined}
                        style={styles.segmentTimePicker}
                        disabled={readOnly}
                      />
                    </View>
                  </View>

                  <View style={[styles.row, { gap: spacing.sm, zIndex: 500 }]}>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>도착 일자*</Text>
                      <Pressable 
                        style={styles.segmentDateInput} 
                        onPress={() => {
                          if (!readOnly) {
                            const depKey = `dep_${idx}`;
                            const arrKey = `arr_${idx}`;
                            setSegmentDatePickerOpen({ 
                              ...segmentDatePickerOpen, 
                              [depKey]: false,
                              [arrKey]: true 
                            });
                          }
                        }}
                        disabled={readOnly}
                      >
                        <View style={styles.segmentDateTextContainer}>
                          <Text style={segment.arrival_date ? styles.segmentDateText : styles.segmentPlaceholderText}>
                            {segment.arrival_date ? dayjs(segment.arrival_date).format('YYYY.MM.DD') : '기타'}
                          </Text>
                          <View style={styles.iconWrapper}>
                            <CalendarIcon width={16} height={16} />
                          </View>
                        </View>
                      </Pressable>
                      {segmentDatePickerOpen[`arr_${idx}`] && (
                        <BaseCalendar
                          visible={true}
                          selectedDate={segment.arrival_date}
                          onDayPress={(day) => {
                            if (!readOnly) {
                              const newSegments = [...flightSegments];
                              newSegments[idx].arrival_date = day.dateString;
                              setFlightSegments(newSegments);
                              const key = `arr_${idx}`;
                              setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                            }
                          }}
                          onClose={() => {
                            const key = `arr_${idx}`;
                            setSegmentDatePickerOpen({ ...segmentDatePickerOpen, [key]: false });
                          }}
                          style={styles.calendarPopup}
                          hideButtons={true}
                          autoCloseOnSelect={true}
                        />
                      )}
                    </View>
                    <View style={[styles.inputGroup, styles.halfWidth]}>
                      <Text style={styles.label}>도착 시간*</Text>
                      <TimePicker
                        value={segment.arrival_time}
                        onChange={(time) => {
                          if (!readOnly) {
                            const newSegments = [...flightSegments];
                            newSegments[idx].arrival_time = time;
                            setFlightSegments(newSegments);
                          }
                        }}
                        onOpen={() => !readOnly && setTimeOpen(true)}
                        onClose={() => setTimeOpen(false)}
                        style={styles.segmentTimePicker}
                        disabled={readOnly}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {!readOnly && (
            <Pressable
              style={[styles.addSegmentButton, { zIndex: 1 }]}
              onPress={() => {
              const lastSegment = flightSegments[flightSegments.length - 1];
              let defaultDepartureDate: string;
              let defaultDepartureTime: string;
              let defaultArrivalDate: string;
              
              if (lastSegment && lastSegment.arrival_date) {
                defaultDepartureDate = lastSegment.arrival_date;
                defaultDepartureTime = lastSegment.arrival_time;
                defaultArrivalDate = lastSegment.arrival_date;
              } else {
                const planStartDate = planData?.plan?.startDate || planData?.plan?.start_date;
                const defaultDate = planStartDate ? dayjs(planStartDate) : dayjs();
                defaultDepartureDate = defaultDate.format('YYYY-MM-DD');
                defaultDepartureTime = '';
                defaultArrivalDate = defaultDate.format('YYYY-MM-DD');
              }
              
              const newSegment: SegmentForm = {
                airline: '',
                flight_number: '',
                departure_airport: '',
                arrival_airport: '',
                departure_date: defaultDepartureDate,
                departure_time: defaultDepartureTime,
                arrival_date: defaultArrivalDate,
                arrival_time: '',
              };
              setFlightSegments(prev => [...prev, newSegment]);
            }}
          >
            <View style={styles.addIconWrapper}>
              <AddIcon width={16} height={16} />
            </View>
            <Text style={styles.addSegmentButtonText}>항공권 구간 추가</Text>
          </Pressable>
          )}

          {showAttachmentSection && (
            <AttachmentSection
              style={styles.attachmentSection}
              showTopDivider
              pendingFiles={readOnly ? [] : pendingFiles}
              onPickImage={appendImage}
              onPickDocument={appendDocument}
              onRemoveFile={removePendingAt}
              onAppendPendingFiles={
                Platform.OS === 'web'
                  ? (files) => setPendingFiles((p) => [...p, ...files])
                  : undefined
              }
              existingAttachments={existingAttachments}
              onRemoveExisting={
                !readOnly && flightAttachmentEntityId != null
                  ? handleRemoveExistingAttachment
                  : undefined
              }
              isLoadingExisting={
                flightAttachmentEntityId != null && isLoadingAttachments
              }
              isUploading={isUploading}
              disabled={readOnly || isSubmitting}
              hideAddControls={readOnly}
              onAiAnalyzePress={
                Platform.OS === 'web' && !readOnly
                  ? handleAiAnalyzePress
                  : undefined
              }
              isAiAnalyzing={isAiAnalyzing}
            />
          )}

          {!readOnly ? (
            <View style={[styles.buttonRow, { position: 'relative', zIndex: 1 }]}>
              <Pressable
                style={styles.deleteButton}
                onPress={flight ? handleDelete : onCancel}
                disabled={isSubmitting}
              >
                <Text style={styles.deleteButtonText}>
                  {flight ? '삭제' : '취소'}
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
                disabled={isSubmitting}
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
          bottomOffset={70}
          onHide={() => {
            setShowWarning(false);
            setWarningMessage('');
          }}
        />
        </View>



    </ScrollView>
    <AiDocumentAnalyzeModal
      visible={aiAnalyzeModalVisible}
      analyzeResult={aiAnalyzeResult}
      onClose={() => {
        setAiAnalyzeModalVisible(false);
        setAiAnalyzeResult(null);
      }}
      entityTypeLabel="항공"
    />
    <AiAnalyzeFailureModal
      visible={aiAnalyzeFailureVisible}
      message={aiAnalyzeFailureMessage}
      onClose={() => {
        setAiAnalyzeFailureVisible(false);
        setAiAnalyzeFailureMessage('');
      }}
    />
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
    marginBottom: spacing.xl,
  },
  title: {
    ...textStyles.h5,
  },
  closeButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    gap: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
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
  input: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...textStyles.body4,
  },
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
  placeholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  iconWrapper: {
    marginTop: 0,
  },
  calendarPopup: {
    position: 'absolute',
    top: 70,
    left: 0,
    zIndex: 20000,
  },
  currencyDisplay: {
    backgroundColor: colors.gray200,
    height: 40,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  currencyText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  amountInputWrapper: {
    position: 'relative',
  },
  amountInputPadding: {
    paddingRight: 20,
    textAlign: 'right',
  },
  amountSuffix: {
    position: 'absolute',
    right: spacing.sm,
    top: '50%',
    transform: [{ translateY: -10 }],
    ...textStyles.body4,
    color: colors.black,
  },
  segmentContainer: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.white,
  },
  segmentTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  segmentTitle: {
    ...textStyles.h6,
    color: colors.black,
  },
  segmentDeleteButton: {
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentContent: {
    gap: spacing.lg,
  },
  segmentInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    color: colors.black,
  },
  segmentDateInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    height: 40,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  segmentDateTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  segmentDateText: {
    ...textStyles.body4,
    color: colors.gray800,
  },
  segmentPlaceholderText: {
    ...textStyles.body4,
    color: colors.gray600,
  },
  segmentTimePicker: {
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    height: 40,
  },
  airportPickerWrapper: {
    overflow: 'visible',
    position: 'relative',
  },
  segmentButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  segmentCancelButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  segmentCancelButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  segmentAddButton: {
    backgroundColor: colors.gray900,
    borderRadius: 8,
    height: 32,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  segmentAddButtonText: {
    ...textStyles.h8,
    color: colors.white,
  },
  addSegmentButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray400,
    borderRadius: 8,
    height: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  addIconWrapper: {
    marginTop: -2,
  },
  addSegmentButtonText: {
    ...textStyles.h8,
    color: colors.black,
  },
  attachmentSection: {
    marginTop: spacing.lg,
    width: '100%',
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
    borderWidth: 1,
    borderColor: colors.gray400,
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
});
