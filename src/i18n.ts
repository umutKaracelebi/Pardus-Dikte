// ─── Pardus Dikte i18n ──────────────────────────────────────────────────

const translations: Record<string, Record<string, string>> = {
  tr: {
    // Sidebar
    'nav.record': 'Kayıt',
    'nav.settings': 'Ayarlar',
    'nav.history': 'Geçmiş',
    'nav.about': 'Hakkında',

    // Status
    'status.ready': 'Hazır',
    'status.loading': 'Model Yükleniyor...',
    'status.recording': 'Dinleniyor...',
    'status.analyzing': 'Analiz...',
    'status.paused': 'Duraklatıldı',
    'status.downloading': 'Model İndiriliyor...',

    // Record screen
    'record.press_mic': 'Mikrofon butonuna basın',
    'record.start': 'Kayıt başlat',
    'record.continue': 'Devam et',
    'record.stop': 'Bitir',
    'record.cancel': 'İptal',
    'record.pause': 'Duraklat',
    'record.resume': 'Devam Et',
    'record.done': 'Tamam',
    'record.clear': 'Temizle',
    'record.copy': 'Kopyala',
    'record.listening': 'KAYIT',
    'record.paused_label': 'DURAKLATILDI',
    'record.edit_placeholder': 'Metni düzenleyebilirsiniz...',
    'record.analyzing_text': 'Analiz ediliyor...',

    // Settings
    'settings.recognition': 'Tanıma Ayarları',
    'settings.model': 'Yapay Zeka Modeli',
    'settings.model_desc': 'Büyük modeller daha doğru ama yavaştır',
    'settings.language': 'Dikte Dili',
    'settings.language_desc': 'Konuştuğunuz dili seçin',
    'settings.paste': 'Yapıştırma',
    'settings.paste_method': 'Yapıştırma Yöntemi',
    'settings.paste_method_desc': 'Metni hedef pencereye nasıl aktarsın?',
    'settings.auto_copy': 'Panoya Kopyala',
    'settings.auto_copy_desc': 'Sonucu otomatik olarak panoya kopyala',
    'settings.shortcut': 'Kısayol',
    'settings.shortcut_label': 'Kayıt Kısayolu',
    'settings.shortcut_desc': 'Herhangi bir uygulamadayken kaydı başlat/durdur',
    'settings.shortcut_change': 'Değiştir',
    'settings.shortcut_press': 'Bir tuş kombinasyonu basın...',
    'settings.push_to_talk': 'Bas-Konuş Modu',
    'settings.push_to_talk_desc': 'Tuşu basılı tuttuğunuz sürece kayıt yapar',
    'settings.appearance': 'Görünüm',
    'settings.overlay': 'Bildirim Çubuğu',
    'settings.overlay_desc': 'Kayıt sırasında gösterilen durum çubuğunun konumu',
    'settings.theme': 'Tema',
    'settings.theme_desc': 'Uygulama arayüz teması',
    'settings.ui_lang': 'Arayüz Dili',
    'settings.ui_lang_desc': 'Uygulama arayüz dili',
    'settings.audio': 'Ses',
    'settings.mute': 'Kayıtta Sessize Al',
    'settings.mute_desc': 'Kayıt sırasında hoparlörü sessize alır',
    'settings.dictionary': 'Özel Sözlük',
    'settings.custom_words': 'Özel Kelimeler',
    'settings.custom_words_desc': 'Modelin doğru tanımasını istediğiniz özel isim, terim veya kısaltmaları ekleyin',
    'settings.add_word': 'Kelime ekle...',
    'settings.add': 'Ekle',
    'settings.history_limit': 'Geçmiş Limiti',
    'settings.history_limit_desc': 'Saklanacak maksimum kayıt sayısı',

    // Overlay positions
    'overlay.bottom': 'Alt',
    'overlay.top': 'Üst',
    'overlay.off': 'Kapalı',

    // Paste methods
    'paste.ctrl_v': 'Ctrl + V (Standart)',
    'paste.ctrl_shift_v': 'Ctrl + Shift + V (Formatsız)',
    'paste.none': 'Kapalı (Sadece Panoya Kopyala)',

    // Theme
    'theme.light': 'Açık',
    'theme.dark': 'Koyu',
    'theme.system': 'Sistem',

    // UI Languages — always native names
    'lang.tr': 'Türkçe',
    'lang.en': 'English',

    // Model options
    'model.tiny': 'Tiny — Çok hızlı, düşük doğruluk',
    'model.base': 'Base — Hızlı, temel doğruluk',
    'model.small': 'Small — Dengeli (Önerilen)',
    'model.medium': 'Medium — Yavaş, yüksek doğruluk',
    'model.large-v3': 'Large-v3 — Maksimum doğruluk',

    // Dictation language options
    'dlang.tr': 'Türkçe',
    'dlang.en': 'İngilizce',
    'dlang.de': 'Almanca',
    'dlang.fr': 'Fransızca',
    'dlang.es': 'İspanyolca',
    'dlang.auto': 'Otomatik Algıla',

    // History
    'history.title': 'Geçmiş Kayıtlar',
    'history.delete_all': 'Tümünü Sil',
    'history.empty': 'Henüz kayıt bulunmuyor.',

    // About
    'about.app_info': 'Uygulama Bilgileri',
    'about.subtitle': 'Sesli Yazı Asistanı',
    'about.developer': 'Geliştirici',
    'about.team': 'İnoTürk Takımı',
    'about.competition': '2026 Teknofest Pardus Hata Yakalama ve Öneri Yarışması — Geliştirme Kategorisi için hazırlanmıştır.',
    'about.open_source': 'Açık Kaynak',
    'about.source_code': 'Kaynak Kod',
    'about.source_desc': 'Pardus Dikte açık kaynak kodlu bir yazılımdır. Kaynak kodlara aşağıdaki bağlantıdan ulaşabilirsiniz.',
    'about.shortcut_info': 'Kısayol Bilgisi',
    'about.shortcut_info_desc': 'Global kısayol herhangi bir uygulamadayken çalışır.',
    'about.shortcut_action': 'Kayıt Başlat / Durdur',
    'about.license': 'Lisans',
    'about.license_text': 'Bu yazılım GPL-3.0 lisansı ile dağıtılmaktadır.',

    // Tray
    'tray.settings': '⚙ Ayarlar',
    'tray.quit': '✕ Çıkış',
  },
  en: {
    // Sidebar
    'nav.record': 'Record',
    'nav.settings': 'Settings',
    'nav.history': 'History',
    'nav.about': 'About',

    // Status
    'status.ready': 'Ready',
    'status.loading': 'Loading Model...',
    'status.recording': 'Listening...',
    'status.analyzing': 'Analyzing...',
    'status.paused': 'Paused',
    'status.downloading': 'Downloading Model...',

    // Record screen
    'record.press_mic': 'Press the microphone button',
    'record.start': 'Start recording',
    'record.continue': 'Continue',
    'record.stop': 'Finish',
    'record.cancel': 'Cancel',
    'record.pause': 'Pause',
    'record.resume': 'Resume',
    'record.done': 'Done',
    'record.clear': 'Clear',
    'record.copy': 'Copy',
    'record.listening': 'RECORDING',
    'record.paused_label': 'PAUSED',
    'record.edit_placeholder': 'You can edit the text...',
    'record.analyzing_text': 'Analyzing...',

    // Settings
    'settings.recognition': 'Recognition',
    'settings.model': 'AI Model',
    'settings.model_desc': 'Larger models are more accurate but slower',
    'settings.language': 'Dictation Language',
    'settings.language_desc': 'Select the language you will speak',
    'settings.paste': 'Paste',
    'settings.paste_method': 'Paste Method',
    'settings.paste_method_desc': 'How to paste text to the target window?',
    'settings.auto_copy': 'Copy to Clipboard',
    'settings.auto_copy_desc': 'Automatically copy result to clipboard',
    'settings.shortcut': 'Shortcut',
    'settings.shortcut_label': 'Record Shortcut',
    'settings.shortcut_desc': 'Start/stop recording from any application',
    'settings.shortcut_change': 'Change',
    'settings.shortcut_press': 'Press a key combination...',
    'settings.push_to_talk': 'Push-to-Talk',
    'settings.push_to_talk_desc': 'Records while you hold the key',
    'settings.appearance': 'Appearance',
    'settings.overlay': 'Status Bar',
    'settings.overlay_desc': 'Position of the status bar shown during recording',
    'settings.theme': 'Theme',
    'settings.theme_desc': 'Application UI theme',
    'settings.ui_lang': 'Interface Language',
    'settings.ui_lang_desc': 'Application interface language',
    'settings.audio': 'Audio',
    'settings.mute': 'Mute During Recording',
    'settings.mute_desc': 'Mutes speakers while recording',
    'settings.dictionary': 'Custom Dictionary',
    'settings.custom_words': 'Custom Words',
    'settings.custom_words_desc': 'Add custom names, terms, or abbreviations for better recognition',
    'settings.add_word': 'Add word...',
    'settings.add': 'Add',
    'settings.history_limit': 'History Limit',
    'settings.history_limit_desc': 'Maximum number of records to keep',

    // Overlay positions
    'overlay.bottom': 'Bottom',
    'overlay.top': 'Top',
    'overlay.off': 'Off',

    // Paste methods
    'paste.ctrl_v': 'Ctrl + V (Standard)',
    'paste.ctrl_shift_v': 'Ctrl + Shift + V (Plain text)',
    'paste.none': 'Off (Copy to clipboard only)',

    // Theme
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.system': 'System',

    // UI Languages — always native names
    'lang.tr': 'Türkçe',
    'lang.en': 'English',

    // Model options
    'model.tiny': 'Tiny — Very fast, low accuracy',
    'model.base': 'Base — Fast, basic accuracy',
    'model.small': 'Small — Balanced (Recommended)',
    'model.medium': 'Medium — Slow, high accuracy',
    'model.large-v3': 'Large-v3 — Maximum accuracy',

    // Dictation language options
    'dlang.tr': 'Turkish',
    'dlang.en': 'English',
    'dlang.de': 'German',
    'dlang.fr': 'French',
    'dlang.es': 'Spanish',
    'dlang.auto': 'Auto Detect',

    // History
    'history.title': 'Past Records',
    'history.delete_all': 'Delete All',
    'history.empty': 'No records yet.',

    // About
    'about.app_info': 'Application Info',
    'about.subtitle': 'Voice-to-Text Assistant',
    'about.developer': 'Developer',
    'about.team': 'İnoTürk Team',
    'about.competition': 'Developed for 2026 Teknofest Pardus Bug Catching and Suggestion Competition — Development Category.',
    'about.open_source': 'Open Source',
    'about.source_code': 'Source Code',
    'about.source_desc': 'Pardus Dikte is an open source software. You can access the source code from the link below.',
    'about.shortcut_info': 'Shortcut Info',
    'about.shortcut_info_desc': 'Global shortcut works from any application.',
    'about.shortcut_action': 'Start / Stop Recording',
    'about.license': 'License',
    'about.license_text': 'This software is distributed under the GPL-3.0 license.',

    // Tray
    'tray.settings': '⚙ Settings',
    'tray.quit': '✕ Quit',
  },
};

let currentLang: string = 'tr';

export function setLanguage(lang: string) {
  currentLang = lang;
}

export function t(key: string): string {
  return translations[currentLang]?.[key] || translations['tr']?.[key] || key;
}

export function getLanguage(): string {
  return currentLang;
}
