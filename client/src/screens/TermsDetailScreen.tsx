import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TERMS, TermsKey } from '@/constants/terms';
import { textStyles } from '@/ui/tokens/typography';
import { colors } from '@/ui/tokens/colors';

export default function TermsDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { height: windowHeight } = useWindowDimensions();
  const key = (route.params?.key || 'tos') as TermsKey;
  const doc = TERMS[key];
  const [headerHeight, setHeaderHeight] = React.useState(60);

  const handleHeaderLayout = (e: any) => {
    const { height } = e.nativeEvent.layout;
    setHeaderHeight(height);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header} onLayout={handleHeaderLayout}>
        <Text style={styles.title}>{doc.title}</Text>
        <Pressable 
          style={styles.closeButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
      </View>
      <View 
        style={[
          styles.scrollWrapper, 
          { maxHeight: windowHeight - headerHeight - 32 }
        ]}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <Text style={styles.content}>{doc.content}</Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { ...textStyles.h2, flex: 1 },
  closeButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: colors.gray200, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginLeft: 12
  },
  closeButtonText: { ...textStyles.h6, color: colors.gray600 },
  scrollWrapper: { 
    flex: 1, 
    minHeight: 0,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: colors.gray300, 
    borderRadius: 12,
    overflow: 'hidden',
  },
  scrollView: { 
    flex: 1,
  },
  scrollContent: { 
    padding: 16,
    paddingBottom: 24,
  },
  content: { ...textStyles.body3, color: colors.black },
});


