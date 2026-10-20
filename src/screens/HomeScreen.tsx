import React, { useCallback, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TabBar, { type TabKey } from '../components/TabBar';
import CakeFeatureCard from '../components/CakeFeatureCard';
import ProfilePane from '../components/ProfilePane';
import SavedPane from '../components/SavedPane';
import UpcomingBanner from '../components/UpcomingBanner';
import OccasionsModal from '../components/OccasionsModal';
import { CalendarIcon, CoinsIcon, SparkleIcon } from '../components/Icons';
import { FadeInUp, PressableScale } from '../components/motion';
import { useCredits } from '../context/CreditsContext';
import { useOccasions } from '../context/OccasionsContext';
import { type CakeKind } from './CakeBuilderScreen';
import { fonts, home } from '../theme/theme';

/** Warm wash behind the greeting, fading back into plain ivory. */
const WASH_COLORS = [home.washTop, home.washMid, home.washEnd] as const;
const WASH_STOPS = [0, 0.24, 0.58] as const;

const CONTENT_MAX_WIDTH = 460;

const USER_NAME = 'Amélie';
const USER_EMAIL = 'amelie@lumieresucree.app';

const WEDDING_CAKE = require('../../assets/wedding-cake.png');
const BIRTHDAY_CAKE = require('../../assets/birthday-cake.png');
const ENGAGEMENT_CAKE = require('../../assets/engagement-cake.png');
const CUSTOM_CAKE = require('../../assets/custom-cake.png');
const MIXER = require('../../assets/mixer.png');

// Intrinsic height / width of each cropped asset.
const WEDDING_ASPECT = 303 / 217;
const BIRTHDAY_ASPECT = 303 / 368;
const ENGAGEMENT_ASPECT = 291 / 231;
const CUSTOM_ASPECT = 230 / 217;
const MIXER_ASPECT = 281 / 261;

type Props = {
  userName?: string;
  userEmail?: string;
  onSignOut: () => void;
  onOpenBuilder: (kind: CakeKind) => void;
};

export default function HomeScreen({
  userName,
  userEmail,
  onSignOut,
  onOpenBuilder,
}: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('home');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { upcomingOccasions } = useOccasions();
  const { credits, openPurchaseModal } = useCredits();
  const firstName = (userName || USER_NAME).split(' ')[0];

  const handleWeddingCake = useCallback(() => onOpenBuilder('wedding'), [onOpenBuilder]);
  const handleBirthdayCake = useCallback(() => onOpenBuilder('birthday'), [onOpenBuilder]);
  const handleEngagementCake = useCallback(() => onOpenBuilder('engagement'), [onOpenBuilder]);
  const handleCustomCake = useCallback(() => onOpenBuilder('custom'), [onOpenBuilder]);
  const handleDiyCake = useCallback(() => onOpenBuilder('diy'), [onOpenBuilder]);
  const handleOpenPrivacy = useCallback(() => {
    Linking.openURL('https://lumieresucree.app/privacy').catch(() => {
      Linking.openURL('https://www.apple.com/legal/privacy/');
    });
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/').catch(err => {
      console.warn('Could not open terms:', err);
    });
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      <LinearGradient
        colors={WASH_COLORS}
        locations={WASH_STOPS}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerSidePlaceholder} />
        <Text style={styles.brand} numberOfLines={1}>
          Lumière Sucrée
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Özel Gün Takvimi ve Hatırlatıcılar"
          onPress={() => setIsCalendarOpen(true)}
          style={styles.headerButton}
          hitSlop={8}
        >
          <CalendarIcon size={20} color={home.ink} strokeWidth={1.8} />
          {upcomingOccasions.length > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{upcomingOccasions.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Panes stay mounted and are hidden instead of unmounted, so switching
          tabs never tears down and rebuilds the cards. */}
      <View style={[styles.pane, tab !== 'home' && styles.paneHidden]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <FadeInUp style={styles.hero} distance={10}>
            <View style={styles.heroTopRow}>
              <View style={styles.eyebrow}>
                <SparkleIcon size={12} color={home.gold} />
                <Text style={styles.eyebrowText}>YAPAY ZEKA PASTA STÜDYOSU</Text>
              </View>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Kredi bakiyesi ${credits}`}
                onPress={openPurchaseModal}
                contentStyle={styles.creditChip}
              >
                <CoinsIcon size={15} color={home.gold} />
                <Text style={styles.creditChipText}>{credits}</Text>
              </PressableScale>
            </View>
            <Text style={styles.heroTitle}>
              Merhaba {firstName},{'\n'}
              <Text style={styles.heroTitleAccent}>bugün ne tasarlıyoruz?</Text>
            </Text>
            <Text style={styles.heroSub}>
              Bir kategori seç, hayalindeki pastayı birkaç adımda görselleştir.
            </Text>
          </FadeInUp>

          {upcomingOccasions.length > 0 && (
            <FadeInUp delay={80}>
              <UpcomingBanner
                occasion={upcomingOccasions[0]}
                onOpenCalendar={() => setIsCalendarOpen(true)}
                onOpenBuilder={onOpenBuilder}
              />
            </FadeInUp>
          )}

          <FadeInUp delay={140}>
            <CakeFeatureCard
              image={WEDDING_CAKE}
              aspect={WEDDING_ASPECT}
              label={'Düğün Pastası\nOluştur'}
              accessibilityLabel="Düğün Pastası Oluştur"
              imageAlt="Three-tier wedding cake covered in sugar flowers"
              onPress={handleWeddingCake}
            />
          </FadeInUp>

          <FadeInUp delay={220} style={styles.nextCard}>
            <CakeFeatureCard
              image={BIRTHDAY_CAKE}
              aspect={BIRTHDAY_ASPECT}
              label={'Doğum Günü\nPastası Oluştur'}
              accessibilityLabel="Doğum Günü Pastası Oluştur"
              imageAlt="Lace-iced cake with butterflies and a pink ribbon bow"
              onPress={handleBirthdayCake}
            />
          </FadeInUp>

          <FadeInUp delay={300} style={styles.nextCard}>
            <CakeFeatureCard
              image={ENGAGEMENT_CAKE}
              aspect={ENGAGEMENT_ASPECT}
              label={'Nişan Pastası\nOluştur'}
              accessibilityLabel="Nişan Pastası Oluştur"
              imageAlt="Three-tier engagement cake with purple and white sugar flowers"
              onPress={handleEngagementCake}
            />
          </FadeInUp>

          <FadeInUp delay={380} style={styles.nextCard}>
            <CakeFeatureCard
              image={CUSTOM_CAKE}
              aspect={CUSTOM_ASPECT}
              label={'Özel Pasta\nOluştur'}
              accessibilityLabel="Özel Pasta Oluştur"
              imageAlt="White cake with gold accents topped with a gold crown"
              onPress={handleCustomCake}
            />
          </FadeInUp>

          <FadeInUp delay={460} style={styles.nextCard}>
            <CakeFeatureCard
              image={MIXER}
              aspect={MIXER_ASPECT}
              maxWidth={160}
              label={'Kendi Pastanı\nOluştur'}
              accessibilityLabel="Kendi Pastanı Oluştur"
              imageAlt="Stand mixer whipping cake batter in a metal bowl"
              onPress={handleDiyCake}
            />
          </FadeInUp>
        </ScrollView>
      </View>

      <View style={[styles.pane, tab !== 'saved' && styles.paneHidden]}>
        <SavedPane onOpenBuilder={onOpenBuilder} />
      </View>

      <View style={[styles.pane, tab !== 'profile' && styles.paneHidden]}>
        <ProfilePane
          name={userName || USER_NAME}
          email={userEmail || USER_EMAIL}
          onPrivacyPolicy={handleOpenPrivacy}
          onTermsOfUse={handleOpenTerms}
          onSignOut={onSignOut}
          onDeleteAccount={onSignOut}
          onOpenCalendar={() => setIsCalendarOpen(true)}
        />
      </View>

      <TabBar active={tab} onChange={setTab} />

      {/* Özel Günler & Hatırlatıcı Takvim Modalı */}
      <OccasionsModal
        visible={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onOpenBuilder={onOpenBuilder}
      />
    </View>
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
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  headerSidePlaceholder: {
    width: 38,
    height: 38,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: home.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
  },
  headerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: home.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  headerBadgeText: {
    fontSize: 10,
    color: '#3D2808',
    fontWeight: '700',
  },
  brand: {
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 0.2,
    color: home.ink,
  },
  // Without an explicit style, ScrollView has no bounded height on native and
  // its content can overflow the screen without becoming scrollable.
  scrollView: {
    flex: 1,
  },
  scroll: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  nextCard: {
    marginTop: 16,
  },
  hero: {
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    color: home.gold,
  },
  creditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  creditChipText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
  },
  heroTitle: {
    marginTop: 14,
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.2,
    color: home.ink,
  },
  heroTitleAccent: {
    color: home.gold,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: home.body,
  },
  pane: {
    flex: 1,
  },
  paneHidden: {
    display: 'none',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: home.muted,
  },
});
