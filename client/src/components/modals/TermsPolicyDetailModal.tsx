import { TERMS, type TermsKey } from "@/constants/terms";
import MotionPressable, { MotionIcon } from "@/ui/components/MotionPressable";
import { colors } from "@/ui/tokens/colors";
import { radii } from "@/ui/tokens/radii";
import { shadows } from "@/ui/tokens/shadows";
import { spacing } from "@/ui/tokens/spacing";
import { surfaces } from "@/ui/tokens/surfaces";
import { textStyles } from "@/ui/tokens/typography";
import { useMemo } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from "react-native";

import XIcon from "../../../assets/x.svg";

const ARTICLE_HEADING = /^제\d+조/;
const NUMBERED_HEADING = /^\d+\./;

type TermsSection = { heading: string; body: string };

function dedent(lines: string[]) {
  const indents = lines
    .filter(line => line.trim())
    .map(line => line.length - line.trimStart().length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines
    .map(line => line.slice(min))
    .join("\n")
    .trim();
}

function parseSections(content: string): TermsSection[] {
  const heading = ARTICLE_HEADING.test(content)
    ? ARTICLE_HEADING
    : NUMBERED_HEADING;
  const sections: { heading: string; lines: string[] }[] = [];
  for (const line of content.split("\n")) {
    if (heading.test(line)) sections.push({ heading: line.trim(), lines: [] });
    else sections[sections.length - 1]?.lines.push(line);
  }
  return sections.map(s => ({ heading: s.heading, body: dedent(s.lines) }));
}

type TermsPolicyDetailModalProps = {
  visible: boolean;
  termsKey: TermsKey;
  onClose: () => void;
  dimBackdrop?: boolean;
};

export default function TermsPolicyDetailModal({
  visible,
  termsKey,
  onClose,
  dimBackdrop = true,
}: TermsPolicyDetailModalProps) {
  const { height: windowHeight } = useWindowDimensions();
  const doc = TERMS[termsKey];
  const sections = useMemo(() => parseSections(doc.content), [doc.content]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, !dimBackdrop && styles.overlayNoDim]}>
        <View
          style={[styles.card, { height: Math.min(680, windowHeight - 80) }]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                {doc.detailModalTitle ?? doc.title}
              </Text>
              {doc.effectiveDate ? (
                <Text style={styles.effectiveDate}>{doc.effectiveDate}</Text>
              ) : null}
            </View>
            <MotionPressable
              onPress={onClose}
              hitSlop={8}
              style={styles.closeButton}
              accessibilityLabel="닫기"
            >
              <MotionIcon>
                <XIcon width={16} height={16} color={colors.gray900} />
              </MotionIcon>
            </MotionPressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
          >
            {sections.map(section => (
              <View key={section.heading} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                {section.body ? (
                  <Text style={styles.sectionBody}>{section.body}</Text>
                ) : null}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <MotionPressable
              style={styles.confirmButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="확인"
            >
              <Text style={styles.confirmButtonText}>확인</Text>
            </MotionPressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    ...surfaces.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lgPlus,
  },
  overlayNoDim: {
    backgroundColor: "transparent",
    backdropFilter: "none",
  } as ViewStyle,
  card: {
    width: 520,
    maxWidth: "100%",
    backgroundColor: colors.white,
    borderRadius: radii["2xl"],
    overflow: "hidden",
    ...shadows.xl,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray300,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...textStyles.h2,
    color: colors.gray900,
  },
  effectiveDate: {
    ...textStyles.body5,
    color: colors.gray700,
    marginTop: spacing.xs,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs,
    flexShrink: 0,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing["2xl"],
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeading: {
    ...textStyles.h5,
    color: colors.gray900,
  },
  sectionBody: {
    ...textStyles.body5,
    color: colors.gray800,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingTop: spacing.lg,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.gray300,
  },
  confirmButton: {
    height: 44,
    paddingHorizontal: spacing["2xl"],
    borderRadius: radii.md,
    ...surfaces.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonText: {
    ...textStyles.h7,
    color: colors.white,
  },
});
