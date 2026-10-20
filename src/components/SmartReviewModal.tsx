import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, home } from '../theme/theme';
import { CheckIcon, ChefHatIcon, CloseIcon, SparkleIcon } from './Icons';
import {
  markReviewPrompted,
  submitInternalFeedback,
  triggerNativeStoreReview,
} from '../services/reviewService';

interface SmartReviewModalProps {
  visible: boolean;
  cakeTitle?: string;
  onClose: () => void;
}

export default function SmartReviewModal({
  visible,
  cakeTitle,
  onClose,
}: SmartReviewModalProps) {
  const [step, setStep] = useState<'filter' | 'feedback' | 'success'>('filter');
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDismiss = async () => {
    await markReviewPrompted();
    setStep('filter');
    setFeedbackText('');
    onClose();
  };

  // 5 Yıldız Potansiyeli -> Apple StoreKit review tetikle
  const handlePositiveReview = async () => {
    await triggerNativeStoreReview();
    setStep('filter');
    setFeedbackText('');
    onClose();
  };

  // Geliştirme Fırsatı -> Şirket içi geri bildirim formuna al (Mağazaya gönderme!)
  const handleShowFeedback = () => {
    setStep('feedback');
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      handleDismiss();
      return;
    }

    setIsSubmitting(true);
    try {
      await submitInternalFeedback(feedbackText, cakeTitle);
      setStep('success');
      setTimeout(() => {
        handleDismiss();
      }, 1600);
    } catch {
      handleDismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropPressable} onPress={handleDismiss} />

        <View style={styles.cardContainer}>
          <LinearGradient
            colors={[home.cardGradFrom, home.cardGradTo]}
            style={styles.cardGradient}
          >
            {/* Kapatma Butonu */}
            <Pressable
              hitSlop={12}
              style={styles.closeBtn}
              onPress={handleDismiss}
              accessibilityLabel="Kapat"
            >
              <CloseIcon size={18} color={home.muted} />
            </Pressable>

            {/* AŞAMA 1: Akıllı Memnuniyet Filtresi */}
            {step === 'filter' && (
              <View style={styles.contentWrapper}>
                <View style={styles.iconCircle}>
                  <SparkleIcon size={28} color="#C5A880" />
                </View>

                <Text style={styles.title}>Tasarımınızı Beğendiniz mi?</Text>
                <Text style={styles.subtitle}>
                  Lumière Sucrée atölyesinden çıkan bu tasarım hayalinizdeki zarafeti yansıtıyor mu?
                </Text>

                <View style={styles.buttonGroup}>
                  {/* Pozitif Yanıt (5 Yıldız StoreKit Tetikleyici) */}
                  <Pressable
                    style={styles.primaryButton}
                    onPress={handlePositiveReview}
                  >
                    <LinearGradient
                      colors={['#8A5A1C', '#4A2C18']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.primaryGradient}
                    >
                      <SparkleIcon size={16} color="#F6D9A8" />
                      <Text style={styles.primaryBtnText}>Evet, Çok Beğendim ✨</Text>
                    </LinearGradient>
                  </Pressable>

                  {/* Negatif / Geliştirilebilir Yanıt (İçsel Geri Bildirim Savunması) */}
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={handleShowFeedback}
                  >
                    <Text style={styles.secondaryBtnText}>
                      Geliştirilebilir / Düşüncem Var
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* AŞAMA 2: Şirket İçi Geri Bildirim Formu */}
            {step === 'feedback' && (
              <View style={styles.contentWrapper}>
                <View style={styles.chefIconCircle}>
                  <ChefHatIcon size={26} color={home.gold} />
                </View>

                <Text style={styles.title}>Şeflerimize İletin</Text>
                <Text style={styles.subtitle}>
                  Pasta tasarımında hangi detayları geliştirmemizi istersiniz? Fikirleriniz sonraki koleksiyonlarımıza ilham verir.
                </Text>

                <TextInput
                  style={styles.feedbackInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Örn: Renk paleti biraz daha pastel olabilirdi, çiçek süslemeleri..."
                  placeholderTextColor={home.muted}
                  value={feedbackText}
                  onChangeText={setFeedbackText}
                  maxLength={500}
                />

                <View style={styles.buttonGroup}>
                  <Pressable
                    style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
                    onPress={handleSubmitFeedback}
                    disabled={isSubmitting}
                  >
                    <LinearGradient
                      colors={['#8A5A1C', '#4A2C18']}
                      style={styles.primaryGradient}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isSubmitting ? 'İletiliyor...' : 'Geri Bildirimi Gönder'}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => setStep('filter')}
                  >
                    <Text style={styles.secondaryBtnText}>Geri Dön</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* AŞAMA 3: Başarılı Geri Bildirim Teşekkürü */}
            {step === 'success' && (
              <View style={styles.contentWrapper}>
                <View style={styles.successIconCircle}>
                  <CheckIcon size={28} color="#2E7D32" strokeWidth={2.5} />
                </View>

                <Text style={styles.title}>Teşekkür Ederiz</Text>
                <Text style={styles.subtitle}>
                  Değerli notunuz atölye şeflerimize iletildi. Tasarımlarımızı mükemmelleştirmeye devam edeceğiz.
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 18, 12, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFill,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: home.cardBorderRich,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 224, 198, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  contentWrapper: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF1DD',
    borderWidth: 1.5,
    borderColor: '#EFE0C6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  chefIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FAF1DD',
    borderWidth: 1.5,
    borderColor: '#EFE0C6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 21,
    color: home.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: home.body,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  feedbackInput: {
    width: '100%',
    minHeight: 96,
    maxHeight: 140,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: home.cardBorder,
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: home.ink,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  primaryBtnText: {
    color: '#FFFDF9',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  secondaryButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: home.cardBorder,
    backgroundColor: 'rgba(255, 253, 249, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: home.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
