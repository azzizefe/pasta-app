import React, { useCallback, useEffect, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TabBar, { type TabKey } from '../components/TabBar';
import CakeFeatureCard from '../components/CakeFeatureCard';
import PromptComposer from '../components/PromptComposer';
import RecentCakes from '../components/RecentCakes';
import ProfilePane from '../components/ProfilePane';
import SavedPane from '../components/SavedPane';
import UpcomingBanner from '../components/UpcomingBanner';
import OccasionsModal from '../components/OccasionsModal';
import { CalendarIcon, CoinsIcon } from '../components/Icons';
import { FadeInUp, PressableScale } from '../components/motion';
import { useCredits } from '../context/CreditsContext';
import { useOccasions } from '../context/OccasionsContext';
import { type CakeKind, type OpenBuilderOptions } from './CakeBuilderScreen';
import { type CakeDetails } from '../types/savedCake';
import { fonts, home } from '../theme/theme';
import { PRIVACY_URL, TERMS_URL } from '../config/app';
import { useLanguage } from '../context/LanguageContext';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

/** Warm wash behind the greeting, fading back into plain ivory. */
const WASH_COLORS = [home.washTop, home.washMid, home.washEnd] as const;
const WASH_STOPS = [0, 0.24, 0.58] as const;

const CONTENT_MAX_WIDTH = 460;

const WEDDING_CAKE = require('../../assets/wedding-cake.png');
const BIRTHDAY_CAKE = require('../../assets/birthday-cake.png');
const ENGAGEMENT_CAKE = require('../../assets/engagement-cake.png');
const CUSTOM_CAKE = require('../../assets/custom-cake.png');
const MIXER = require('../../assets/mixer.png');

// Intrinsic height / width of each cropped asset.
const WEDDING_ASPECT = 420 / 301;
const BIRTHDAY_ASPECT = 301 / 337;
const ENGAGEMENT_ASPECT = 436 / 340;
const CUSTOM_ASPECT = 230 / 217;
const MIXER_ASPECT = 281 / 261;

type Props = {
  userName?: string;
  userEmail?: string;
  authProvider?: 'apple' | 'google' | null;
  onSignOut: () => void;
  onDeleteAccount: () => void;
  onOpenBuilder: (kind: CakeKind, details?: CakeDetails, options?: OpenBuilderOptions) => void;
};

export default function HomeScreen({
  userName,
  userEmail,
  authProvider,
  onSignOut,
  onDeleteAccount,
  onOpenBuilder,
}: Props) {
  useTx();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>('home');
  const [measuredPaneHeight, setMeasuredPaneHeight] = useState<number | null>(null);
  const [customName, setCustomName] = useState<string | null>(null);
  const { upcomingOccasions } = useOccasions();
  const { credits, openPurchaseModal } = useCredits();

  useEffect(() => {
    AsyncStorage.getItem('@lumiere_user_custom_name')
      .then((val) => {
        if (val) setCustomName(val);
      })
      .catch(() => {});
  }, []);

  const effectiveName = (customName || userName || '').trim();
  const firstName = effectiveName.split(' ')[0];
  const greeting = firstName ? `${tx("Merhaba")} ${firstName}` : tx("Hoş geldin");

  // Dynamic card height so exactly 3 cards fit on screen without the 4th peeking/overflowing.
  // When scrolled down, subsequent cards appear cleanly.
  const availablePaneHeight =
    measuredPaneHeight ??
    Math.max(450, windowHeight - (insets.top + 60) - (insets.bottom + 55));
  const cardGap = 14;
  const cardHeight = Math.max(160, Math.floor((availablePaneHeight - 48) / 3));

  const handleWeddingCake = useCallback(() => onOpenBuilder('wedding'), [onOpenBuilder]);
  const handleBirthdayCake = useCallback(() => onOpenBuilder('birthday'), [onOpenBuilder]);
  const handleEngagementCake = useCallback(() => onOpenBuilder('engagement'), [onOpenBuilder]);
  const handleCustomCake = useCallback(() => onOpenBuilder('custom'), [onOpenBuilder]);
  const handleDiyCake = useCallback(() => onOpenBuilder('diy'), [onOpenBuilder]);
  const handleOpenPrivacy = useCallback(() => {
    Linking.openURL(PRIVACY_URL).catch((err) => console.warn('Could not open privacy:', err));
  }, []);

  const handleOpenTerms = useCallback(() => {
    Linking.openURL(TERMS_URL).catch((err) => console.warn('Could not open terms:', err));
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
        {tab === 'home' ? (
          <View style={styles.greetingBlock}>
            <Text style={styles.brand} numberOfLines={1}>
              {greeting}
            </Text>
            <Text style={styles.greetingSub} numberOfLines={1}>
              {tx("Bugün ne kutluyoruz?")}
            </Text>
          </View>
        ) : (
          <View />
        )}
        {tab === 'home' && (
          <View style={styles.headerActions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={tx("Kredi bakiyesi {credits}", { credits })}
              onPress={openPurchaseModal}
              contentStyle={styles.creditChip}
            >
              <CoinsIcon size={16} color={home.gold} />
              <Text style={styles.creditChipText}>{credits}</Text>
            </PressableScale>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tx("Özel Gün Takvimi ve Hatırlatıcılar")}
              onPress={() => setTab('calendar')}
              style={styles.headerButton}
              hitSlop={8}
            >
              <CalendarIcon size={19} color={home.ink} strokeWidth={1.8} />
              {upcomingOccasions.length > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{upcomingOccasions.length}</Text>
                </View>
              )}
            </Pressable>
          </View>
        )}
      </View>

      <View
        style={[styles.pane, tab !== 'home' && styles.paneHidden]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 300 && h !== measuredPaneHeight) {
            setMeasuredPaneHeight(h);
          }
        }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scroll, { flexGrow: 1, paddingTop: 8, paddingBottom: 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
        >

          {upcomingOccasions.length > 0 && (
            <View style={styles.bannerWrap}>
              <FadeInUp delay={80}>
                <UpcomingBanner
                  occasion={upcomingOccasions[0]}
                  onOpenCalendar={() => setTab('calendar')}
                  onOpenBuilder={onOpenBuilder}
                />
              </FadeInUp>
            </View>
          )}

          <FadeInUp delay={120} style={styles.composerWrap}>
            <PromptComposer
              onGenerate={(kind, details) => onOpenBuilder(kind, details, { autoGenerate: true })}
              onOpenBuilder={(kind, details) => onOpenBuilder(kind, details)}
            />
          </FadeInUp>

          <FadeInUp delay={200} style={styles.recentWrap}>
            <RecentCakes onOpenBuilder={(kind, details) => onOpenBuilder(kind, details)} onSeeAll={() => setTab('saved')} />
          </FadeInUp>
        </ScrollView>
      </View>

      <View style={[styles.pane, tab !== 'calendar' && styles.paneHidden]}>
        <OccasionsModal embedded visible onClose={() => setTab('home')} onOpenBuilder={onOpenBuilder} />
      </View>

      <View style={[styles.pane, tab !== 'saved' && styles.paneHidden]}>
        <SavedPane onOpenBuilder={onOpenBuilder} />
      </View>

      <View style={[styles.pane, tab !== 'profile' && styles.paneHidden]}>
        <ProfilePane
          name={effectiveName || tx("Lumière Misafiri")}
          email={userEmail || ''}
          authProvider={authProvider}
          onPrivacyPolicy={handleOpenPrivacy}
          onTermsOfUse={handleOpenTerms}
          onSignOut={onSignOut}
          onDeleteAccount={onDeleteAccount}
          onOpenCalendar={() => setTab('calendar')}
          onUpdateName={setCustomName}
        />
      </View>

      <TabBar active={tab} onChange={setTab} />

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
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    minHeight: 38,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  greetingBlock: {
    flexShrink: 1,
    marginRight: 12,
  },
  greetingSub: {
    marginTop: 2,
    fontSize: 13.5,
    color: home.body,
  },
  brand: {
    flexShrink: 1,
    fontFamily: fonts.display,
    fontSize: 22,
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
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 28,
  },
  composerWrap: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  recentWrap: {
    paddingHorizontal: 20,
  },
  bannerWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  nextCard: {
    marginTop: 16,
  },
  creditChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
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
