import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
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
        Alert.alert(
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
      Alert.alert('Hata', err?.message || 'Fotoğraf seçilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
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
      Alert.alert('Hata', err?.message || 'Fotoğraf çekilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <SparkleIcon size={16} color={home.accentGold} />
        </View>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>İlham Fotoğrafı (Opsiyonel)</Text>
          <Text style={styles.subtitle}>
            Gelinlik kumaşı, parti teması veya davetiye yükleyin; AI renk ve desenleri pastanıza işlesin.
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
              <SparkleIcon size={12} color={home.accentGold} />
              <Text style={styles.analysisBadgeText}>AI Bu Görseli Analiz Edecek</Text>
            </View>
            <Text style={styles.previewHint}>
              Renk paleti, doku ve çiçek motifleri pastanızın süslemesine aktarılacaktır.
            </Text>

            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                onPress={handlePickGallery}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Fotoğrafı Değiştir</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        /* Boş Durum: Galeri veya Kamera Butonları */
        <View style={styles.emptyContainer}>
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={home.ink} />
              <Text style={styles.loadingText}>Fotoğraf işleniyor...</Text>
            </View>
          ) : (
            <View style={styles.buttonsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Galeriden Fotoğraf Seç"
                onPress={handlePickGallery}
                style={({ pressed }) => [styles.pickerButton, pressed && styles.pickerButtonPressed]}
              >
                <ImageIcon size={18} color={home.ink} />
                <Text style={styles.pickerButtonText}>Galeriden Seç</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kamera ile Çek"
                onPress={handleTakePhoto}
                style={({ pressed }) => [styles.pickerButton, pressed && styles.pickerButtonPressed]}
              >
                <CameraIcon size={18} color={home.ink} />
                <Text style={styles.pickerButtonText}>Fotoğraf Çek</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FAF3E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFE2CE',
    padding: 16,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE2CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  headerTextCol: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.displayMedium,
    fontSize: 15,
    color: home.ink,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12,
    color: home.muted,
    lineHeight: 16,
  },
  emptyContainer: {
    paddingTop: 4,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E7DAC4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pickerButtonPressed: {
    backgroundColor: '#FDFBF7',
    transform: [{ scale: 0.98 }],
  },
  pickerButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: home.ink,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  loadingText: {
    fontSize: 13,
    color: home.muted,
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFE2CE',
  },
  previewImageWrapper: {
    width: 86,
    height: 86,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F0E5D5',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(59, 36, 22, 0.75)',
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
    backgroundColor: '#FDF6EA',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  analysisBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A5A1C',
  },
  previewHint: {
    fontSize: 11,
    color: home.muted,
    lineHeight: 15,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  secondaryButton: {
    paddingVertical: 4,
  },
  secondaryButtonText: {
    fontSize: 12,
    color: home.gold,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
