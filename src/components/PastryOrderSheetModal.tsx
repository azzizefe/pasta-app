import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CakeImage from './CakeImage';
import {
  CheckIcon,
  ChefHatIcon,
  CloseIcon,
  CopyIcon,
  DocumentIcon,
  ShareIcon,
  SparkleIcon,
} from './Icons';
import { CakeDetails, CakeKind } from '../types/savedCake';
import { evaluateBudget } from '../utils/budgetHelper';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  kind?: CakeKind;
  prompt: string;
  imageUri?: string | null;
  details?: CakeDetails;
}

type SheetTab = 'order' | 'recipe';

function calculateMouldSpec(tiers: number, guests: number): string {
  if (tiers >= 3 || guests >= 60) {
    return tx("Alt: Ø 26 cm · Orta: Ø 20 cm · Üst: Ø 14 cm");
  }
  if (tiers === 2 || guests >= 30) {
    return tx("Alt: Ø 22 cm · Üst: Ø 16 cm");
  }
  if (guests >= 20) {
    return tx("Tek Kat: Ø 22 cm (Yüksek Kesim: 14 cm)");
  }
  return 'Tek Kat: Ø 18 cm (Butik Kesim: 12 cm)';
}

export default function PastryOrderSheetModal({
  visible,
  onClose,
  title,
  kind = 'custom',
  prompt,
  imageUri,
  details,
}: Props) {
  useTx();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SheetTab>('order');
  const [copied, setCopied] = useState(false);

  const tiers = details?.tier || (kind === 'wedding' ? 3 : kind === 'engagement' ? 2 : 1);
  const guests = details?.guests || (tiers >= 3 ? 75 : tiers === 2 ? 40 : 16);

  const budgetEval = useMemo(
    () => evaluateBudget(details?.budget, guests, details?.currency || 'TRY'),
    [details?.budget, guests, details?.currency],
  );

  const portionWeight = details?.portionWeightGr || budgetEval.portionWeightGr;
  const portionMultiplier = portionWeight / 130;
  const scaleFactor = Math.max(0.6, Math.round(((guests / 15) * portionMultiplier) * 10) / 10);

  const flavorText = details?.flavor || tx("Madagaskar Vanilyalı & Badem Unlu");
  const coatingText = details?.coating || tx("İsviçre Mereng Tereyağlı Krema & Beyaz Ganaj");
  const paletteText = details?.color || tx("Fildişi, Şampanya & Altın");
  const shapeText = details?.shape || 'Klasik Silindirik';
  const decorLevel = details?.decor || 'Dengeli Haute Pâtisserie';
  const fillingsText =
    details?.fillingTags && details.fillingTags.length > 0
      ? details.fillingTags.join(', ')
      : tx("Orman Meyveli Kompote & Beyaz Çikolatalı Muslin Krema");
  const accentsText = [
    ...(details?.decorTags || []),
    ...(details?.metallicTags || []),
    ...(details?.textureTags || []),
    ...(details?.finishTags || []),
  ].join(' · ') || tx("El yapımı şeker çiçekler & zarif dokunuşlar");

  const mouldSpec = useMemo(() => calculateMouldSpec(tiers, guests), [tiers, guests]);

  const recipeData = useMemo(() => {
    const flourGr = Math.round(280 * scaleFactor);
    const sugarGr = Math.round(240 * scaleFactor);
    const butterGr = Math.round(220 * scaleFactor);
    const eggsCount = Math.max(4, Math.round(5 * scaleFactor));
    const creamMl = Math.round(400 * scaleFactor);
    const chocGr = Math.round(450 * scaleFactor);
    const fillingGr = Math.round(320 * scaleFactor);

    return {
      ingredients: [
        {
          group: tx("1. Pandispanya & Kek Bazı"),
          items: [
            tx("{flourGr} g pastacılık unu (elenmiş) — {flavorText} uyumlu", { flourGr, flavorText }),
            tx("{sugarGr} g ince kristal toz şeker", { sugarGr }),
            tx("{eggsCount} adet oda sıcaklığında organik yumurta", { eggsCount }),
            tx("{p0} g eritilmiş tereyağı & 120 ml tam yağlı süt", { p0: Math.round(butterGr * 0.45) }),
            tx("1 tatlı kaşığı saf vanilya özütü & 1 paket kabartma tozu"),
          ],
        },
        {
          group: tx("2. İç Krema & Dolgu Katmanı"),
          items: [
            tx("{creamMl} ml %35 yağlı sıvı krema (soğuk çırpılmış)", { creamMl }),
            tx("{p0} g kuvertür çikolata / pastacı kreması bazı", { p0: Math.round(chocGr * 0.6) }),
            tx("{fillingGr} g iç dolgu malzemesi ({fillingsText})", { fillingGr, fillingsText }),
          ],
        },
        {
          group: tx("3. Dış Mantolama & Dekorasyon"),
          items: [
            tx("Dış Sıvama: {coatingText} ({chocGr} g baz + {butterGr} g tuzsuz tereyağı)", { coatingText, chocGr, butterGr }),
            tx("Renk Paleti: {paletteText} (jel gıda boyası / doğal renklendirici)", { paletteText }),
            tx("Süsleme Detayları: {accentsText}", { accentsText }),
          ],
        },
      ],
      steps: [
        {
          step: '01',
          title: tx("Pandispanya Pişirme & Dinlendirme"),
          desc: tx("Yumurta ve şekeri 8 dakika boyunca hacmi 3 katına çıkana dek çırpın. Kuru malzemeleri spatula ile alttan üste katlayarak yedirin ve {mouldSpec} çemberlerde 170°C fanlı fırında pişirin. Streçleyip 1 gece +4°C'de dinlendirin.", { mouldSpec }),
        },
        {
          step: '02',
          title: tx("Katmanlama & Dolgu Montajı"),
          desc: tx("Kek patlarını eşit kalınlıkta kesin. Çember içerisine asetat kağıdı yerleştirip her katta krema barajı (dam) oluşturun ve ortasına \"{fillingsText}\" dolgusunu yayın.", { fillingsText }),
        },
        {
          step: '03',
          title: tx("Kırıntı Sıvama (Crumb Coat) & Ana Kaplama"),
          desc: tx("Montajı biten pastayı 2 saat soğutun. İnce bir kat kırıntı sıvaması yapıp 30 dakika dondurucuda sabitleyin, ardından \"{coatingText}\" ile \"{paletteText}\" tonlarında pürüzsüz bitiş sağlayın.", { coatingText, paletteText }),
        },
        {
          step: '04',
          title: tx("Haute Pâtisserie Süsleme & Sunum"),
          desc: tx("{p0}{accentsText} detaylarını yerleştirerek son dokunuşu tamamlayın.", { p0: tiers > 1 ? 'Katlar arasına gizli pasta kolonları (dowel) ve ara taban yerleştirerek katları üst üste sabitleyin. ' : '', accentsText }),
        },
      ],
    };
  }, [scaleFactor, flavorText, fillingsText, coatingText, paletteText, accentsText, mouldSpec, tiers]);

  const formattedShareText = useMemo(() => {
    const lines = [
      tx("🎂 LUMIÈRE SUCRÉE — PASTACI SİPARİŞ FİŞİ"),
      `━━━━━━━━━━━━━━━━━━━━`,
      `• Kategori: ${title}`,
      tx("• Kapasite: ~{guests} Kişilik ({tiers} Katlı)", { guests, tiers }),
      tx("• Kalıp Ölçüsü: {mouldSpec}", { mouldSpec }),
      tx("• Şekil: {shapeText}", { shapeText }),
      `• Kek & Aroma: ${flavorText}`,
      tx("• İç Dolgu: {fillingsText}", { fillingsText }),
      tx("• Dış Kaplama: {coatingText}", { coatingText }),
      `• Renk Paleti: ${paletteText}`,
      tx("• Süsleme Yoğunluğu: {decorLevel}", { decorLevel }),
      `• Dekoratif Detaylar: ${accentsText}`,
    ];
    if (details?.budget) {
      lines.push(tx("• Belirtilen Bütçe: {p0} {symbol} (~{p2} {p3}/kişi)", { p0: details.budget.toLocaleString(), symbol: budgetEval.currency.symbol, p2: Math.round(details.budget / guests).toLocaleString(), p3: budgetEval.currency.symbol }));
      lines.push(tx("• Bütçe Seviyesi: {badgeLabel}", { badgeLabel: budgetEval.badgeLabel }));
      lines.push(tx("• Porsiyon Ağırlığı: ~{portionWeight} g/kişi (Toplam ~{p1} kg)", { portionWeight, p1: Math.round((guests * portionWeight) / 100) / 10 }));
      if (budgetEval.pastryAdvice) {
        lines.push(tx("• Pastacı İçin Bütçe Notu: {pastryAdvice}", { pastryAdvice: budgetEval.pastryAdvice }));
      }
    }
    if (details?.writing) {
      lines.push(tx("• Pasta Üzeri Yazı: \"{writing}\"", { writing: details.writing }));
    }
    if (details?.dietTags && details.dietTags.length > 0) {
      lines.push(`• Diyet / Hassasiyet: ${details.dietTags.join(', ')}`);
    }
    if (details?.customNotes) {
      lines.push(tx("• Özel Not: {customNotes}", { customNotes: details.customNotes }));
    }
    lines.push(`━━━━━━━━━━━━━━━━━━━━`);
    lines.push(tx("✨ Tasarım Özeti:\n{prompt}", { prompt }));
    return lines.join('\n');
  }, [
    title,
    guests,
    tiers,
    mouldSpec,
    shapeText,
    flavorText,
    fillingsText,
    coatingText,
    paletteText,
    decorLevel,
    accentsText,
    details,
    prompt,
    budgetEval,
    portionWeight,
  ]);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formattedShareText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  const handleShareSheet = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: tx("{title} — Sipariş Fişi", { title }),
          text: formattedShareText,
        });
      } else {
        await Share.share({
          title: tx("{title} — Sipariş Fişi", { title }),
          message: formattedShareText,
        });
      }
    } catch {
      handleCopy();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <LinearGradient
          colors={[home.washTop, home.washMid, home.washEnd]}
          locations={[0, 0.24, 0.58]}
          style={StyleSheet.absoluteFill}
        />

        {/* Üst Başlık */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) + 6 }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx("Kapat")}
            onPress={onClose}
            hitSlop={10}
            style={styles.closeBtn}
          >
            <CloseIcon size={20} color={home.ink} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerSuper}>{tx("ATELIER LUMIÈRE SUCRÉE")}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{tx("Sipariş Fişi & Şef Reçetesi")}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tx("Kopyala")}
            onPress={handleCopy}
            hitSlop={10}
            style={styles.closeBtn}
          >
            {copied ? (
              <CheckIcon size={18} color="#2E7D32" />
            ) : (
              <CopyIcon size={18} color={home.ink} />
            )}
          </Pressable>
        </View>

        {/* Sekme Seçici */}
        <View style={styles.tabSwitchWrapper}>
          <View style={styles.tabSwitch}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'order' }}
              onPress={() => setActiveTab('order')}
              style={[styles.tabBtn, activeTab === 'order' && styles.tabBtnActive]}
            >
              <DocumentIcon
                size={15}
                color={activeTab === 'order' ? '#FFFDF9' : home.ink}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'order' && styles.tabBtnTextActive,
                ]}
              >{tx("Pastacı Sipariş Fişi")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'recipe' }}
              onPress={() => setActiveTab('recipe')}
              style={[styles.tabBtn, activeTab === 'recipe' && styles.tabBtnActive]}
            >
              <ChefHatIcon
                size={16}
                color={activeTab === 'recipe' ? '#FFFDF9' : home.ink}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  activeTab === 'recipe' && styles.tabBtnTextActive,
                ]}
              >{tx("AI Malzeme & Tarif")}</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 32 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Özet Hero Kartı */}
          <View style={styles.dossierBanner}>
            {imageUri ? (
              <CakeImage
                source={{ uri: imageUri }}
                style={styles.dossierThumb}
                contentFit="cover"
                borderRadius={14}
                showShimmer={false}
              />
            ) : (
              <View style={styles.dossierThumbPlaceholder}>
                <ChefHatIcon size={24} color={home.accentGold} />
              </View>
            )}
            <View style={styles.dossierInfo}>
              <View style={styles.dossierBadge}>
                <SparkleIcon size={11} color={home.accentGold} />
                <Text style={styles.dossierBadgeText}>{tx("FICHE TECHNIQUE")}</Text>
              </View>
              <Text style={styles.dossierTitle} numberOfLines={1}>
                {details?.templateTitle || title}
              </Text>
              <Text style={styles.dossierSub}>{tx("~{guests} Kişilik · {tiers} Katlı · {shapeText}", { guests, tiers, shapeText })}</Text>
            </View>
          </View>

          {activeTab === 'order' ? (
            <>
              {/* Teknik Spesifikasyon Fişi */}
              <View style={styles.paperTicket}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTitle}>{tx("PASTANE ÜRETİM DETAYLARI")}</Text>
                  <Text style={styles.ticketCode}>#{String(guests * tiers + 104).padStart(4, '0')}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Porsiyon & Kat")}</Text>
                  <Text style={styles.specValue}>{tx("{guests} Kişilik ({tiers} Katlı)", { guests, tiers })}</Text>
                </View>

                {details?.budget ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>{tx("Müşteri Bütçesi")}</Text>
                    <Text style={styles.specValueHighlight}>{tx("{p0} {symbol} (~{p2} {p3}/kişi)", { p0: details.budget.toLocaleString(), symbol: budgetEval.currency.symbol, p2: Math.round(details.budget / guests).toLocaleString(), p3: budgetEval.currency.symbol })}</Text>
                  </View>
                ) : null}

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Porsiyon Gramajı")}</Text>
                  <Text style={styles.specValue}>{tx("~{portionWeight} g / Porsiyon (Toplam: ~{p1} kg)", { portionWeight, p1: Math.round((guests * portionWeight) / 100) / 10 })}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Önerilen Çember")}</Text>
                  <Text style={styles.specValue}>{mouldSpec}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Kek & Aroma Bazı")}</Text>
                  <Text style={styles.specValue}>{flavorText}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("İç Dolgu Katmanı")}</Text>
                  <Text style={styles.specValue}>{fillingsText}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Dış Kaplama")}</Text>
                  <Text style={styles.specValue}>{coatingText}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Renk Paleti")}</Text>
                  <Text style={styles.specValue}>{paletteText}</Text>
                </View>

                <View style={styles.specRow}>
                  <Text style={styles.specLabel}>{tx("Süsleme & Dokular")}</Text>
                  <Text style={styles.specValue}>
                    {decorLevel} — {accentsText}
                  </Text>
                </View>

                {details?.writing ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>{tx("Üzerindeki Yazı")}</Text>
                    <Text style={styles.specValueHighlight}>"{details.writing}"</Text>
                  </View>
                ) : null}

                {details?.dietTags && details.dietTags.length > 0 ? (
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>{tx("Diyet / Alerjen")}</Text>
                    <Text style={styles.specValue}>{details.dietTags.join(', ')}</Text>
                  </View>
                ) : null}

                {details?.customNotes ? (
                  <View style={[styles.specRow, styles.specRowLast]}>
                    <Text style={styles.specLabel}>{tx("Özel Şef Notu")}</Text>
                    <Text style={styles.specValue}>{details.customNotes}</Text>
                  </View>
                ) : null}

                {details?.budget && budgetEval.pastryAdvice ? (
                  <View style={styles.budgetPastryNoteBox}>
                    <Text style={styles.budgetPastryNoteLabel}>{tx("PASTACI İÇİN BÜTÇE OPTİMİZASYON TÜYOSU")}</Text>
                    <Text style={styles.budgetPastryNoteText}>{budgetEval.pastryAdvice}</Text>
                  </View>
                ) : null}

                <View style={styles.ticketFooterNote}>
                  <Text style={styles.ticketFooterText}>{tx("Bu fişi pastanenize göstererek veya WhatsApp üzerinden ileterek görseldeki tasarımın birebir üretimini talep edebilirsiniz.")}</Text>
                </View>
              </View>
            </>
          ) : (
            <>
              {/* AI Şefin Malzeme & Tarif Rehberi */}
              <View style={styles.paperTicket}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTitle}>{tx("ÖLÇEKLENMİŞ MALZEME LİSTESİ ({guests} KİŞİLİK)", { guests })}</Text>
                </View>

                {recipeData.ingredients.map((group) => (
                  <View key={group.group} style={styles.ingGroup}>
                    <Text style={styles.ingGroupTitle}>{group.group}</Text>
                    {group.items.map((item, idx) => (
                      <View key={idx} style={styles.ingItemRow}>
                        <View style={styles.ingBullet} />
                        <Text style={styles.ingItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              <View style={[styles.paperTicket, { marginTop: 16 }]}>
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketTitle}>{tx("ADIM ADIM ATÖLYE REHBERİ")}</Text>
                </View>

                {recipeData.steps.map((s, idx) => (
                  <View
                    key={s.step}
                    style={[
                      styles.stepCard,
                      idx === recipeData.steps.length - 1 && styles.specRowLast,
                    ]}
                  >
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>{s.step}</Text>
                    </View>
                    <View style={styles.stepBody}>
                      <Text style={styles.stepTitle}>{tx(s.title)}</Text>
                      <Text style={styles.stepDesc}>{tx(s.desc)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Paylaşım ve Kopyalama Aksiyonları */}
          <View style={styles.bottomActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Sipariş Fişini Paylaş")}
              onPress={handleShareSheet}
              style={styles.primaryShareBtn}
            >
              <ShareIcon size={17} color="#FFFDF9" />
              <Text style={styles.primaryShareBtnText}>{tx("Pastacıya Gönder / Paylaş")}</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Panoya Kopyala")}
              onPress={handleCopy}
              style={styles.secondaryCopyBtn}
            >
              {copied ? (
                <>
                  <CheckIcon size={16} color="#2E7D32" />
                  <Text style={[styles.secondaryCopyBtnText, { color: '#2E7D32' }]}>{tx("Sipariş Fişi Kopyalandı!")}</Text>
                </>
              ) : (
                <>
                  <CopyIcon size={16} color={home.ink} />
                  <Text style={styles.secondaryCopyBtnText}>{tx("Metin Olarak Kopyala")}</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: home.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.45)',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  headerSuper: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: home.gold,
  },
  headerTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: home.ink,
    marginTop: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSwitchWrapper: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  tabSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(237, 223, 201, 0.55)',
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(216, 196, 168, 0.55)',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: home.ctaFrom,
    shadowColor: '#2B1A0E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: home.ink,
  },
  tabBtnTextActive: {
    color: '#FFFDF9',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  dossierBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    marginBottom: 14,
    gap: 14,
  },
  dossierThumb: {
    width: 72,
    height: 72,
    borderRadius: 14,
  },
  dossierThumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: 'rgba(243, 217, 166, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dossierInfo: {
    flex: 1,
    gap: 3,
  },
  dossierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(243, 217, 166, 0.32)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dossierBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: home.gold,
  },
  dossierTitle: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: home.ink,
  },
  dossierSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: home.muted,
  },
  paperTicket: {
    backgroundColor: '#FFFDF9',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(201, 154, 75, 0.35)',
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 2,
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.5)',
  },
  ticketTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
    color: home.gold,
  },
  ticketCode: {
    fontSize: 11,
    fontWeight: '700',
    color: home.muted,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.28)',
    gap: 14,
  },
  specRowLast: {
    borderBottomWidth: 0,
  },
  specLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: home.muted,
    minWidth: 115,
  },
  specValue: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
    textAlign: 'right',
    lineHeight: 19,
  },
  specValueHighlight: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    fontStyle: 'italic',
    color: home.gold,
    textAlign: 'right',
  },
  budgetPastryNoteBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(138, 90, 28, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(138, 90, 28, 0.22)',
  },
  budgetPastryNoteLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: home.gold,
    marginBottom: 4,
  },
  budgetPastryNoteText: {
    fontSize: 12,
    lineHeight: 17,
    color: home.ink,
  },
  ticketFooterNote: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(243, 217, 166, 0.22)',
  },
  ticketFooterText: {
    fontSize: 12,
    lineHeight: 17,
    color: home.muted,
    textAlign: 'center',
  },
  ingGroup: {
    marginTop: 12,
  },
  ingGroupTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
    marginBottom: 8,
  },
  ingItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 4,
  },
  ingBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: home.accentGold,
    marginTop: 6,
  },
  ingItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: home.ink,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(216, 196, 168, 0.28)',
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: home.ctaFrom,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepBadgeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FFFDF9',
  },
  stepBody: {
    flex: 1,
    gap: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: home.ink,
  },
  stepDesc: {
    fontSize: 12.5,
    lineHeight: 18.5,
    color: home.muted,
  },
  bottomActions: {
    marginTop: 18,
    gap: 10,
  },
  primaryShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 18,
    backgroundColor: home.ctaFrom,
    borderWidth: 1,
    borderColor: 'rgba(243, 217, 166, 0.35)',
  },
  primaryShareBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFDF9',
  },
  secondaryCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
  },
  secondaryCopyBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
  },
});
