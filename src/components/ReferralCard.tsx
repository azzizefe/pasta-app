import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  GiftIcon,
  ShareIcon,
  SparkleIcon,
} from './Icons';
import { ShineSweep } from './motion';
import {
  getUserReferralCode,
  shareReferralInvite,
  REFERRAL_BONUS_CREDITS,
} from '../services/referralService';
import { fonts, home } from '../theme/theme';
import { tx } from '../i18n/tx';
import { useTx } from '../context/LanguageContext';

export default function ReferralCard() {
  useTx();
  const [referralCode, setReferralCode] = useState<string>('LUMI-....');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    getUserReferralCode().then(setReferralCode);
  }, []);

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      await shareReferralInvite(referralCode);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={['#FFFDF9', '#FAF3E3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Üst Başlık & Hediye Rozeti */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.iconCircle}>
              <GiftIcon size={18} color="#8A5A1C" />
            </View>
            <View style={styles.headerTextCol}>
              <Text style={styles.cardTitle} numberOfLines={1}>{tx("Arkadaşını Davet Et")}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>{tx("Davet et, hediye kredi kazandır")}</Text>
            </View>
          </View>

          <View style={styles.bonusBadge}>
            <SparkleIcon size={10} color="#8A5A1C" />
            <Text style={styles.bonusBadgeText}>{tx("+{REFERRAL_BONUS_CREDITS} Kredi", { REFERRAL_BONUS_CREDITS })}</Text>
          </View>
        </View>

        {/* Açıklama Metni */}
        <Text style={styles.description}>{tx("Arkadaşını Lumière Sucrée&apos;ye davet et. Davet bağlantınla kaydolduğunda")}{' '}
          <Text style={styles.descriptionBold}>{tx("anında 5 hediye kredi")}</Text>{' '}{tx("kazansın!")}</Text>

        {/* Paylaş Butonu */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tx("Davet Bağlantısını Paylaş")}
          onPress={handleShare}
          disabled={isSharing}
          style={({ pressed }) => [
            styles.shareBtn,
            pressed && styles.shareBtnPressed,
          ]}
        >
          <LinearGradient
            colors={['#3B2416', '#22130A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.shareBtnGradient}
          >
            <ShineSweep initialDelay={1200} interval={4500} />
            {isSharing ? (
              <ActivityIndicator size="small" color="#F5E6CC" />
            ) : (
              <>
                <ShareIcon size={16} color="#F5E6CC" />
                <Text style={styles.shareBtnText}>{tx("Davet Bağlantısını Paylaş")}</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#EFE5D3',
    overflow: 'hidden',
    shadowColor: '#3B2416',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginVertical: 4,
  },
  cardGradient: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  headerTextCol: {
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7E9CE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ECD4A8',
  },
  cardTitle: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: home.ink,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 11.5,
    color: home.muted,
    marginTop: 1,
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8ECCF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ECD4A8',
    flexShrink: 0,
    alignSelf: 'center',
  },
  bonusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A5A1C',
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    color: home.body,
    marginBottom: 14,
  },
  descriptionBold: {
    fontWeight: '700',
    color: home.ink,
  },
  shareBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  shareBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  shareBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  shareBtnText: {
    color: '#FFFDF9',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
