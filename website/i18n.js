/* ==========================================================================
   LUMIÈRE SUCRÉE (PASTA-APP) — MULTI-LANGUAGE (8 LANGUAGES) I18N ENGINE
   Supports: Türkçe (tr), İngilizce (en), 日本語 (ja), Almanca (de),
             Fransızca (fr), 한국어 (ko), İtalyanca (it), İspanyolca (es)
   ========================================================================== */

(function () {
  'use strict';

  const LANGUAGE_OPTIONS = [
    { code: 'tr', labelTr: 'Türkçe', nativeLabel: 'Türkçe' },
    { code: 'en', labelTr: 'İngilizce', nativeLabel: 'İngilizce' },
    { code: 'ja', labelTr: '日本語', nativeLabel: '日本語' },
    { code: 'de', labelTr: 'Almanca', nativeLabel: 'Almanca' },
    { code: 'fr', labelTr: 'Fransızca', nativeLabel: 'Fransızca' },
    { code: 'ko', labelTr: '한국어', nativeLabel: '한국어' },
    { code: 'it', labelTr: 'İtalyanca', nativeLabel: 'İtalyanca' },
    { code: 'es', labelTr: 'İspanyolca', nativeLabel: 'İspanyolca' },
  ];

  const TRANSLATIONS = {
    tr: {
      'nav.about': 'Pasta-App Nedir?',
      'nav.studio': '3D Stüdyo',
      'nav.features': 'Özellikler',
      'nav.gallery': 'Koleksiyon',
      'nav.pricing': 'Fiyatlandırma',
      'nav.faq': 'SSS',
      'nav.legal': 'Gizlilik & Şartlar',
      'nav.cta': 'Uygulamayı İndir',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · PASTA-APP RESMİ VİTRİNİ',
      'hero.title': 'Hayalinizdeki Pastayı <em>Yapay Zeka</em> ile Tasarlayın',
      'hero.lead':
        'Fransız pastacılık ekolünün zarafeti, Gemini Vision çok modlu yapay zekasıyla buluşuyor. Düğün, nişan, doğum günü ve özel kutlamalarınız için saniyeler içinde 4K/8K pasta konseptleri, gerçek pastacı sipariş fişi (Baker’s Spec) ve canlı porsiyon-bütçe simülatörü.',
      'hero.appstore.small': 'App Store’dan',
      'hero.appstore.big': 'iOS İçin İndir',
      'hero.play.small': 'Google Play’den',
      'hero.play.big': 'Android İçin İndir',
      'hero.studio.btn': '3D Pasta Atölyesini Dene',
      'hero.trust1': '🎁 15 Kredi Hoş Geldin Hediyesi',
      'hero.trust2': '💎 Yüksek Çözünürlüklü 4K/8K Render',
      'hero.trust3': '🛡️ Apple Guideline 5.1.1 & 3.1.1 Tam Uyumlu',
      'about.kicker': 'PASTA-APP (LUMIÈRE SUCRÉE) NEDİR?',
      'about.title': 'Kişisel Dijital Pasta Şefiniz ve Tasarım Atölyeniz',
      'about.desc':
        'Lumière Sucrée (pasta-app), hayalinizdeki pastayı tarif etme zorluğunu ortadan kaldıran dünyanın ilk Haute Pâtisserie yapay zeka mobil uygulamasıdır. İster gelinliğinizin dantelini yükleyin, ister davetli sayınızı girin; saniyeler içinde pastanenize verebileceğiniz teknik üretim reçetesi ve 4K stüdyo fotoğrafı hazır.',
      'studio.kicker': 'İNTERAKTİF 3D MİNİ STÜDYO & SİMÜLATÖR',
      'studio.title': 'Pastanızı 360° Özelleştirin & Porsiyon Hesaplayın',
      'studio.desc':
        'Kat sayısını, Fransız fondan kaplama rengini, 24K altın varak süslemelerini ve davetli sayınızı seçin; Three.js 3D sahnesi ve Pastacı Sipariş Fişi (Baker’s Spec) anında güncellensin.',
      'features.kicker': 'TEKNOLOJİ & ZANAAT',
      'features.title': 'Lumière Sucrée’yi Benzersiz Kılan 6 Süper Güç',
      'features.desc':
        'Sadece bir görsel üretici değil; pastacılık matematiğini, porsiyon mühendisliğini ve çok modlu görsel yapay zekayı tek bir lüks deneyimde birleştiren uçtan uca platform.',
      'gallery.kicker': 'KÜRASYON KOLEKSİYONU',
      'gallery.title': 'Parisien Haute Pâtisserie Kreasyonları',
      'gallery.desc':
        'pasta-app içerisinde Gemini Vision motoruyla saniyeler içinde üretilmiş, gerçek pastanelerde birebir uygulanabilir imza pasta tasarımları.',
      'pricing.kicker': 'ŞEFFAF KREDİ SİSTEMİ · ABONELİK YOK',
      'pricing.title': 'Fiyatlandırma ve Kredi Paketleri',
      'pricing.desc':
        'Aylık zorunlu abonelik veya gizli ücret yok. Yeni üyelere 15 Kredi (1 Adet 4K Pasta Tasarımı) hediye! İhtiyacınız kadar kredi yükleyin, üretemediğiniz hiçbir tasarım için kredi kaybetmeyin.',
      'faq.kicker': 'MERAK EDİLENLER',
      'faq.title': 'Sıkça Sorulan Sorular (SSS)',
      'faq.desc':
        'Lumière Sucrée (pasta-app) kullanımı, kredi sistemi, pastacı sipariş fişi ve veri güvenliği hakkında tüm sorularınızın yanıtları.',
      'legal.kicker': 'APPLE APP STORE & GOOGLE PLAY UYUMLULUK MERKEZİ',
      'legal.title': 'Hukuk, Gizlilik ve Hesap Silme Merkezi',
      'legal.desc':
        'Apple App Store Guideline 5.1.1(v) ve 3.1.1 standartlarına %100 uyumlu resmi Gizlilik Politikası, Kullanım Koşulları (EULA) ve Web Üzerinden Anında Hesap/Veri Silme aracımız.',
    },
    en: {
      'nav.about': 'What is Pasta-App?',
      'nav.studio': '3D Studio',
      'nav.features': 'Features',
      'nav.gallery': 'Collection',
      'nav.pricing': 'Pricing',
      'nav.faq': 'FAQ',
      'nav.legal': 'Privacy & Legal',
      'nav.cta': 'Download App',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · OFFICIAL PASTA-APP SHOWCASE',
      'hero.title': 'Design Your Dream Cake with <em>Artificial Intelligence</em>',
      'hero.lead':
        'The elegance of French haute pâtisserie meets Gemini Vision multimodal AI. Generate bespoke 4K/8K cake concepts, technical Baker’s Spec sheets, and live portion & budget simulations for weddings, engagements, and celebrations in seconds.',
      'hero.appstore.small': 'Download on the',
      'hero.appstore.big': 'App Store (iOS)',
      'hero.play.small': 'Get it on',
      'hero.play.big': 'Google Play',
      'hero.studio.btn': 'Try 3D Cake Atelier',
      'hero.trust1': '🎁 15 Free Welcome Credits',
      'hero.trust2': '💎 4K/8K Ultra-HD Studio Renders',
      'hero.trust3': '🛡️ Apple Guideline 5.1.1 & 3.1.1 Compliant',
      'about.kicker': 'WHAT IS PASTA-APP (LUMIÈRE SUCRÉE)?',
      'about.title': 'Your Personal AI Pastry Chef & Bespoke Cake Atelier',
      'about.desc':
        'Lumière Sucrée (pasta-app) is the world’s first Haute Pâtisserie AI mobile application that bridges imagination and real-world confectionery. Upload your wedding dress lace or floral bouquet, choose your guest count, and receive a 4K studio render plus a full Baker’s Spec sheet.',
      'studio.kicker': 'INTERACTIVE 3D MINI STUDIO & SIMULATOR',
      'studio.title': 'Customize Your Cake in 360° & Calculate Portions',
      'studio.desc':
        'Select the tier count, French fondant finish, 24K gold leaf ornaments, and guest count — watch the Three.js 3D model and live Baker’s Spec Sheet update instantaneously.',
      'features.kicker': 'TECHNOLOGY & CRAFTSMANSHIP',
      'features.title': '6 Superpowers That Make Lumière Sucrée Unique',
      'features.desc':
        'More than an image generator: a complete pastry engineering suite combining multimodal vision AI, portion mathematics, budget evaluation, and occasion reminders.',
      'gallery.kicker': 'CURATED COLLECTION',
      'gallery.title': 'Parisian Haute Pâtisserie Creations',
      'gallery.desc':
        'Signature bespoke cake concepts generated in seconds inside pasta-app with exact Pantone palettes and tier dimensions ready for real patisseries.',
      'pricing.kicker': 'TRANSPARENT CREDITS · NO SUBSCRIPTION REQUIRED',
      'pricing.title': 'Pricing & Consumable Credit Packages',
      'pricing.desc':
        'No recurring subscriptions or hidden fees. Every new member receives 15 Welcome Credits (1 Free 4K Cake Design)! Top up only when you need, with 100% automatic refund guarantee on failed generations.',
      'faq.kicker': 'QUESTIONS & ANSWERS',
      'faq.title': 'Frequently Asked Questions (FAQ)',
      'faq.desc':
        'Everything you need to know about how Lumière Sucrée (pasta-app) works, credits, Baker’s Spec sheets, and privacy.',
      'legal.kicker': 'APPLE APP STORE & GOOGLE PLAY COMPLIANCE HUB',
      'legal.title': 'Legal, Privacy & Account Deletion Center',
      'legal.desc':
        'Official Privacy Policy, Standard Apple EULA Terms of Use, and instant web-based Account & Data Deletion request tool in full compliance with Apple Guideline 5.1.1(v).',
    },
    fr: {
      'nav.about': 'Qu’est-ce que Pasta-App ?',
      'nav.studio': 'Atelier 3D',
      'nav.features': 'Fonctionnalités',
      'nav.gallery': 'Collection',
      'nav.pricing': 'Tarifs',
      'nav.faq': 'FAQ',
      'nav.legal': 'Confidentialité',
      'nav.cta': 'Télécharger',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · VITRINE OFFICIELLE',
      'hero.title': 'Créez le Gâteau de Vos Rêves avec <em>l’Intelligence Artificielle</em>',
      'hero.lead':
        'L’excellence de la haute pâtisserie française rencontre l’IA multimodale Gemini Vision. Concevez des gâteaux de mariage, fiançailles et anniversaire en 4K/8K avec fiche technique pâtissier et simulateur de portions.',
      'hero.appstore.small': 'Télécharger sur',
      'hero.appstore.big': 'l’App Store',
      'hero.play.small': 'Disponible sur',
      'hero.play.big': 'Google Play',
      'hero.studio.btn': 'Essayer l’Atelier 3D',
      'hero.trust1': '🎁 15 Crédits Offerts',
      'hero.trust2': '💎 Rendu Studio 4K/8K',
      'hero.trust3': '🛡️ Conforme Apple Guideline 5.1.1',
      'about.kicker': 'DÉCOUVREZ LUMIÈRE SUCRÉE (PASTA-APP)',
      'about.title': 'Votre Chef Pâtissier Personnel & Atelier Couture Digital',
      'about.desc':
        'Importez une photo de votre robe de mariée ou de vos fleurs, indiquez le nombre d’invités et obtenez instantanément un visuel 4K ainsi qu’une fiche technique complète pour votre pâtissier.',
      'studio.kicker': 'MINI STUDIO 3D INTERACTIF',
      'studio.title': 'Personnalisez Votre Gâteau à 360°',
      'studio.desc':
        'Choisissez le nombre d’étages, la finition velours ou feuille d’or 24K et le nombre de convives en temps réel.',
      'features.kicker': 'TECHNOLOGIE & SAVOIR-FAIRE',
      'features.title': '6 Innovations Exclusives Lumière Sucrée',
      'features.desc':
        'Une alliance unique entre vision par ordinateur, calcul géométrique des portions et haute gastronomie sucrée.',
      'gallery.kicker': 'COLLECTION HAUTE COUTURE',
      'gallery.title': 'Créations Pâtissières Parisiennes',
      'gallery.desc':
        'Des œuvres pâtissières générées en quelques secondes avec codes couleurs Pantone/HEX et diamètres précis.',
      'pricing.kicker': 'TARIFICATION TRANSPARENTE · SANS ABONNEMENT',
      'pricing.title': 'Forfaits de Crédits Lumière',
      'pricing.desc':
        'Aucun abonnement mensuel. 15 crédits offerts à l’inscription (1 création 4K gratuite). Payez uniquement à l’usage via Apple StoreKit 2 ou Google Play.',
      'faq.kicker': 'AIDE & ASSISTANCE',
      'faq.title': 'Questions Fréquentes (FAQ)',
      'faq.desc':
        'Toutes les réponses concernant le fonctionnement de pasta-app, les crédits et la confidentialité.',
      'legal.kicker': 'CONFORMITÉ APPLE APP STORE & RGPD',
      'legal.title': 'Centre Juridique, Confidentialité & Suppression de Compte',
      'legal.desc':
        'Politique de confidentialité, CLUF (EULA) et formulaire officiel de suppression de compte conformément à la directive Apple 5.1.1(v).',
    },
    de: {
      'nav.about': 'Was ist Pasta-App?',
      'nav.studio': '3D-Atelier',
      'nav.features': 'Funktionen',
      'nav.gallery': 'Kollektion',
      'nav.pricing': 'Preise',
      'nav.faq': 'FAQ',
      'nav.legal': 'Rechtliches',
      'nav.cta': 'App Laden',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · OFFIZIELLES SHOWCASE',
      'hero.title': 'Entwerfen Sie Ihre Traumtorte mit <em>Künstlicher Intelligenz</em>',
      'hero.lead':
        'Französische Patisserie-Kunst vereint mit Gemini Vision KI. Erstellen Sie in Sekunden maßgeschneiderte 4K/8K-Tortenkonzepte, Konditor-Spezifikationsblätter und Portionsberechnungen.',
      'about.title': 'Ihr persönlicher KI-Patissier & digitales Torten-Atelier',
      'studio.title': '360° 3D-Tortenkonfigurator & Portionsrechner',
      'features.title': '6 einzigartige Funktionen von Lumière Sucrée',
      'gallery.title': 'Kuratierte Pariser Patisserie-Kollektion',
      'pricing.title': 'Transparente Kreditpakete ohne Abo',
      'faq.title': 'Häufig gestellte Fragen (FAQ)',
      'legal.title': 'Datenschutz, AGB & Kontolöschung (Apple 5.1.1)',
    },
    ja: {
      'nav.about': 'Pasta-Appとは？',
      'nav.studio': '3Dアトリエ',
      'nav.features': '機能紹介',
      'nav.gallery': 'コレクション',
      'nav.pricing': '料金プラン',
      'nav.faq': 'よくある質問',
      'nav.legal': 'プライバシーと規約',
      'nav.cta': 'アプリを入手',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · 公式ショーケース',
      'hero.title': 'AIで描く、あなただけの<em>オートクチュール・ケーキ</em>',
      'hero.lead':
        'フランス伝統菓子の美学とGemini VisionマルチモーダルAIが融合。ウェディングや記念日のための4K/8Kケーキデザイン、パティシエ仕様書、人数別サイズ計算を数秒で生成します。',
      'about.title': 'あなた専属のAIパティシエ＆デジタルケーキアトリエ',
      'studio.title': '360° 3Dケーキスタジオ＆ポーションシミュレーター',
      'features.title': 'Lumière Sucréeの6つの革新的な機能',
      'gallery.title': 'パリジャン・オートパティスリー・コレクション',
      'pricing.title': 'シンプルなクレジット制（月額課金なし）',
      'faq.title': 'よくある質問（FAQ）',
      'legal.title': 'プライバシーポリシー・利用規約・アカウント削除',
    },
    ko: {
      'nav.about': 'Pasta-App 소개',
      'nav.studio': '3D 스튜디오',
      'nav.features': '주요 기능',
      'nav.gallery': '컬렉션',
      'nav.pricing': '요금 안내',
      'nav.faq': '자주 묻는 질문',
      'nav.legal': '개인정보 및 약관',
      'nav.cta': '앱 다운로드',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · 공식 쇼케이스',
      'hero.title': '인공지능으로 완성하는 <em>꿈의 오트 쿠튀르 케이크</em>',
      'hero.lead':
        '프랑스 하이엔드 파티세리의 우아함과 Gemini Vision 멀티모달 AI의 만남. 웨딩, 약혼, 특별한 기념일을 위한 4K/8K 케이크 디자인과 파티시에 주문서 및 인분 계산기를 즉시 경험하세요.',
      'about.title': '나만의 AI 파티시에 & 비스포크 케이크 아틀리에',
      'studio.title': '360° 3D 케이크 커스터마이징 & 인분 시뮬레이터',
      'features.title': 'Lumière Sucrée만의 6가지 핵심 기술',
      'gallery.title': '파리지앵 오트 파티세리 컬렉션',
      'pricing.title': '합리적인 크레딧 패키지 (구독 없음)',
      'faq.title': '자주 묻는 질문 (FAQ)',
      'legal.title': '개인정보 처리방침 · 이용약관 · 계정 삭제 센터',
    },
    it: {
      'nav.about': 'Cos’è Pasta-App?',
      'nav.studio': 'Atelier 3D',
      'nav.features': 'Funzionalità',
      'nav.gallery': 'Collezione',
      'nav.pricing': 'Prezzi',
      'nav.faq': 'FAQ',
      'nav.legal': 'Privacy e Note Legali',
      'nav.cta': 'Scarica l’App',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · VETRINA UFFICIALE',
      'hero.title': 'Progetta la Torta dei Tuoi Sogni con <em>l’Intelligenza Artificiale</em>',
      'hero.lead':
        'L’eleganza dell’alta pasticceria francese incontra l’IA multimodale Gemini Vision. Crea concept 4K/8K, schede tecniche per il pasticciere e calcola porzioni e budget in pochi secondi.',
      'about.title': 'Il Tuo Chef Pasticciere IA & Atelier Digitale',
      'studio.title': 'Mini Studio 3D Interattivo & Calcolatore Porzioni',
      'features.title': '6 Superpoteri di Lumière Sucrée',
      'gallery.title': 'Collezione Haute Pâtisserie Parigina',
      'pricing.title': 'Pacchetti Crediti Trasparenti · Nessun Abbonamento',
      'faq.title': 'Domande Frequenti (FAQ)',
      'legal.title': 'Centro Legale, Privacy ed Eliminazione Account',
    },
    es: {
      'nav.about': '¿Qué es Pasta-App?',
      'nav.studio': 'Estudio 3D',
      'nav.features': 'Características',
      'nav.gallery': 'Colección',
      'nav.pricing': 'Precios',
      'nav.faq': 'Preguntas Frecuentes',
      'nav.legal': 'Privacidad y Legal',
      'nav.cta': 'Descargar App',
      'hero.badge': '✨ HAUTE PÂTISSERIE ARTIFICIELLE · VITRINA OFICIAL',
      'hero.title': 'Diseña el Pastel de Tus Sueños con <em>Inteligencia Artificial</em>',
      'hero.lead':
        'La elegancia de la alta pastelería francesa se une a la IA multimodal Gemini Vision. Genera diseños 4K/8K, fichas técnicas para pasteleros y simulaciones de porciones al instante.',
      'about.title': 'Tu Chef Pastelero IA y Atelier de Alta Costura',
      'studio.title': 'Mini Estudio 3D Interactivo y Simulador de Porciones',
      'features.title': '6 Superpoderes que Hacen Único a Lumière Sucrée',
      'gallery.title': 'Colección Curada de Alta Pastelería',
      'pricing.title': 'Paquetes de Créditos Transparentes · Sin Suscripción',
      'faq.title': 'Preguntas Frecuentes (FAQ)',
      'legal.title': 'Centro Legal, Privacidad y Eliminación de Cuenta',
    },
  };

  function applyLanguage(langCode) {
    const dict = TRANSLATIONS[langCode] || TRANSLATIONS.tr;
    const fallback = TRANSLATIONS.tr;

    document.documentElement.lang = langCode;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = dict[key] || fallback[key];
      if (val) {
        if (el.hasAttribute('data-i18n-html')) {
          el.innerHTML = val;
        } else {
          el.textContent = val;
        }
      }
    });

    // Update the bottom language trigger label and active option
    const selectedLangObj =
      LANGUAGE_OPTIONS.find((l) => l.code === langCode) || LANGUAGE_OPTIONS[0];
    const currentLabelEl = document.getElementById('current-lang-label');
    if (currentLabelEl) {
      currentLabelEl.textContent = selectedLangObj.labelTr;
    }

    document.querySelectorAll('.lang-option-item').forEach((btn) => {
      const code = btn.getAttribute('data-lang-code');
      btn.classList.toggle('active', code === langCode);
    });

    try {
      localStorage.setItem('@lumiere_web_lang', langCode);
    } catch (_) {}
  }

  window.LumiereI18n = {
    LANGUAGE_OPTIONS,
    TRANSLATIONS,
    applyLanguage,
  };
})();
