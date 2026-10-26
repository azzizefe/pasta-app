import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { showAlert } from '../utils/alert';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraIcon, CloseIcon, ImageIcon, SparkleIcon } from './Icons';
import { fonts, home } from '../theme/theme';

type Props = {
  imageUri: string | null;
  onImageSelected: (uri: string, base64: string) => void;
  onImageRemoved: () => void;
};

/**
 * Lüks İlham Fotoğrafı Seçici (Image-to-Cake)
 * Kullanıcının gelinlik kumaşı, davetiye, parti konsepti veya mekan fotoğrafı
 * yükleyerek pastaya doğrudan ilham vermesini sağlar.
 */
export default function ReferenceImagePicker({
  imageUri,
  onImageSelected,
  onImageRemoved,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePickGallery = async () => {
    try {
      setIsLoading(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Galeri İzni Gerekli',
          'İlham fotoğrafı seçebilmek için fotoğraf galerisi erişimine izin vermelisiniz.',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.base64) {
          onImageSelected(asset.uri, asset.base64);
        }
      }
    } catch (err: any) {
      showAlert('Hata', err?.message || 'Fotoğraf seçilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showAlert(
          'Kamera İzni Gerekli',
          'İlham fotoğrafı çekebilmek için kamera erişimine izin vermelisiniz.',
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.base64) {
          onImageSelected(asset.uri, asset.base64);
        }
      }
    } catch (err: any) {
      showAlert('Hata', err?.message || 'Fotoğraf çekilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[home.cardGradFrom, home.cardGradTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <SparkleIcon size={18} color={home.accentGold} />
        </View>
        <View style={styles.headerTextCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>İlham Fotoğrafı</Text>
            <View style={styles.optionalPill}>
              <Text style={styles.optionalPillText}>İSTEĞE BAĞLI</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Bir fotoğraf yükle, yapay zekâ renklerini ve desenlerini pastana işlesin.
          </Text>
        </View>
      </View>

      {imageUri ? (
        /* Yüklü Görsel Önizleme Durumu */
        <View style={styles.previewContainer}>
          <View style={styles.previewImageWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.previewImage}
              contentFit="cover"
              transition={200}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fotoğrafı Kaldır"
              onPress={onImageRemoved}
              style={styles.removeButton}
              hitSlop={8}
            >
              <CloseIcon size={14} color="#FFFFFF" strokeWidth={2.2} />
            </Pressable>
          </View>

          <View style={styles.previewInfo}>
            <View style={styles.analysisBadge}>
              <SparkleIcon size={12} color={home.gold} />
              <Text style={styles.analysisBadgeText}>Yapay zekâ inceleyecek</Text>
            </View>
            <Text style={styles.previewHint}>
              Renk paleti, doku ve motifler pastanın süslemesine aktarılacak.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={handlePickGallery}
              style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
            >
              <ImageIcon size={15} color={home.ink} />
              <Text style={styles.changeButtonText}>Fotoğrafı Değiştir</Text>
            </Pressable>
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={home.ink} />
          <Text style={styles.loadingText}>Fotoğraf işleniyor...</Text>
        </View>
      ) : (
        /* Boş Durum: Galeri veya Kamera */
        <>
          <View style={styles.buttonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Galeriden Fotoğraf Seç"
              onPress={handlePickGallery}
              style={({ pressed }) => [styles.buttonWrap, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={[home.ctaFrom, home.ctaTo]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <ImageIcon size={17} color={home.accentGold} />
                <Text
                  style={styles.primaryButtonText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  Galeriden Seç
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kamera ile Çek"
              onPress={handleTakePhoto}
              style={({ pressed }) => [styles.buttonWrap, styles.secondaryButton, pressed && styles.pressed]}
            >
              <CameraIcon size={17} color={home.ink} />
              <Text
                style={styles.secondaryButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Fotoğraf Çek
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    padding: 16,
    marginBottom: 22,
    shadowColor: '#8A6A3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: home.ctaFrom,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 18,
    color: home.ink,
  },
  optionalPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(243, 217, 166, 0.55)',
  },
  optionalPillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#6B4512',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: home.body,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  buttonWrap: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: 23,
    overflow: 'hidden',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  primaryButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#FFFDF9',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: home.cardBorderRich,
  },
  secondaryButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: home.ink,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: home.body,
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
  },
  previewImageWrapper: {
    width: 104,
    height: 104,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F0E5D5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(59, 36, 22, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  analysisBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(243, 217, 166, 0.45)',
  },
  analysisBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B4512',
  },
  previewHint: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: home.body,
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: home.card,
    borderWidth: 1,
    borderColor: home.cardBorderRich,
  },
  changeButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: home.ink,
  },
});
