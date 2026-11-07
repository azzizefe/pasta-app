import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckIcon, CloseIcon } from './Icons';
import { CurrencyConfig, SUPPORTED_CURRENCIES } from '../utils/budgetHelper';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

interface Props {
  visible: boolean;
  selectedCurrency: string;
  onSelect: (currency: CurrencyConfig) => void;
  onClose: () => void;
}

export default function CurrencyPickerModal({
  visible,
  selectedCurrency,
  onSelect,
  onClose,
}: Props) {
  useTx();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <LinearGradient
            colors={[home.washTop, home.washMid, home.washEnd]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Sürükleme / Üst çubuk */}
          <View style={styles.grabBar} />

          {/* Başlık ve Kapat Butonu */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{tx("Para Birimi Seçin")}</Text>
              <Text style={styles.headerSubtitle}>{tx("Bütçenize göre porsiyon ve maliyet hesaplaması için")}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Kapat")}
              onPress={onClose}
              hitSlop={10}
              style={styles.closeBtn}
            >
              <CloseIcon size={20} color={home.ink} />
            </Pressable>
          </View>

          {/* Para Birimleri Listesi */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {SUPPORTED_CURRENCIES.map((item) => {
              const isSelected = item.code === selectedCurrency;
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} (${item.code})`}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={[styles.currencyRow, isSelected && styles.currencyRowSelected]}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.flagEmoji}>{item.flag}</Text>
                    <View style={styles.currencyMeta}>
                      <View style={styles.codeRow}>
                        <Text style={[styles.currencyCode, isSelected && styles.currencyCodeSelected]}>
                          {item.code}
                        </Text>
                        <Text style={styles.currencySymbol}>{item.symbol}</Text>
                      </View>
                      <Text style={styles.currencyName}>{item.name}</Text>
                    </View>
                  </View>

                  <View style={styles.rowRight}>
                    <Text style={styles.marketHint}>{tx("Taban ~{p0} {symbol}", { p0: item.minBasePrice.toLocaleString(), symbol: item.symbol })}</Text>
                    {isSelected && (
                      <View style={styles.checkCircle}>
                        <CheckIcon size={14} color="#FFFDF9" strokeWidth={2.4} />
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(42, 26, 21, 0.45)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: home.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 20,
  },
  grabBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: home.cardBorder,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    color: home.ink,
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: home.body,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(59, 36, 22, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    flexGrow: 0,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 24,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: home.cardBorder,
    marginBottom: 8,
  },
  currencyRowSelected: {
    backgroundColor: '#FFFDF9',
    borderColor: home.accentGold,
    borderWidth: 1.6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  flagEmoji: {
    fontSize: 26,
  },
  currencyMeta: {
    flex: 1,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyCode: {
    fontSize: 15,
    fontWeight: '700',
    color: home.ink,
  },
  currencyCodeSelected: {
    color: home.gold,
  },
  currencySymbol: {
    fontSize: 13,
    fontWeight: '600',
    color: home.muted,
  },
  currencyName: {
    fontSize: 12,
    color: home.body,
    marginTop: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  marketHint: {
    fontSize: 11.5,
    color: home.muted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: home.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
