# Pardus Dikte

<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="Pardus Dikte Logo" width="128">
</p>

<p align="center">
  <b>Sesli Yazı Asistanı — Yapay Zeka Destekli Konuşmadan Metne Dönüştürücü</b>
</p>

<p align="center">
  <a href="https://github.com/umutKaracelebi/Pardus-Dikte/releases"><img src="https://img.shields.io/github/v/release/umutKaracelebi/Pardus-Dikte?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lisans-GPL--3.0-blue?style=flat-square" alt="License"></a>
  <a href="https://inoturk.netlify.app/"><img src="https://img.shields.io/badge/Geliştirici-İnoTürk-cyan?style=flat-square" alt="Developer"></a>
</p>

---

[🇬🇧 English](README_EN.md)

## 📖 Hakkında

**Pardus Dikte**, Pardus ve diğer Linux dağıtımlarında çalışan, yapay zeka destekli bir sesli yazı asistanıdır. [OpenAI Whisper](https://github.com/openai/whisper) modellerini kullanarak konuşmayı gerçek zamanlı olarak metne dönüştürür. Tüm işlemler cihaz üzerinde (offline) gerçekleşir — ses verileriniz asla dışarıya gönderilmez.

2026 **Teknofest Pardus Hata Yakalama ve Öneri Yarışması** — Geliştirme Kategorisi için **İnoTürk** takımı tarafından geliştirilmiştir.

## ✨ Özellikler

- 🎤 **Gerçek Zamanlı Dikte** — Mikrofona konuşun, metin anında yazılsın
- 🧠 **Yapay Zeka Modelleri** — tiny, base, small, medium, large-v3 model seçenekleri
- 🌍 **Çoklu Dil Desteği** — Türkçe, İngilizce ve diğer dillerde dikte
- 🔒 **Tamamen Çevrimdışı** — İnternet bağlantısı gerektirmez (model indirildikten sonra)
- ⌨️ **Global Kısayol** — Atayacağınız kısayol ile herhangi bir uygulamadayken kayıt başlat/durdur
- 📋 **Otomatik Yapıştırma** — Algılanan metin otomatik olarak panoya kopyalanır
- 🎨 **Açık/Koyu Tema** — Sistem temasına uyumlu arayüz
- 📊 **Gerçek Zamanlı Ses Dalgası** — Kayıt sırasında canlı ses görselleştirme
- 📝 **Geçmiş Kayıtlar** — Tüm dikte geçmişinizi görüntüleyin
- 🖥️ **Ekran Üstü Gösterge** — Kayıt sırasında overlay bilgi paneli

## 📦 Kurulum

### .deb Paketi (Önerilen)

[Releases](https://github.com/umutKaracelebi/Pardus-Dikte/releases) sayfasından `.deb` dosyasını indirip kurun:

```bash
sudo dpkg -i pardus-dikte_1.0.0_amd64.deb
```

#### Gereksinimler

Aşağıdaki bağımlılıklar `.deb` paketi ile otomatik kurulur:

- `python3`, `python3-venv`, `python3-pip`
- `libwebkit2gtk-4.1-0`
- `libayatana-appindicator3-1`
- `xclip`

> **Not:** İlk çalıştırmada uygulama otomatik olarak bir Python sanal ortamı oluşturur ve gerekli AI kütüphanelerini (`faster-whisper`, `numpy`, `sounddevice`) kurar. Bu işlem birkaç dakika sürebilir.

### Kaynaktan Derleme

```bash
# Bağımlılıkları kurun
sudo apt install python3 python3-venv python3-pip libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev libgtk-3-dev xclip

# Rust ve Node.js kurulu olmalı
# https://rustup.rs/ ve https://nodejs.org/

# Projeyi klonlayın
git clone https://github.com/umutKaracelebi/Pardus-Dikte.git
cd Pardus-Dikte

# Bağımlılıkları kurun
npm install

# Python venv oluşturun
cd src-tauri
python3 -m venv venv
venv/bin/pip install faster-whisper sounddevice numpy
cd ..

# Geliştirme modunda çalıştırın
npm run tauri dev

# .deb paketi oluşturun
npm run tauri build -- --bundles deb
```

## 🚀 Kullanım

1. Uygulamayı açın veya varsayılanda `Ctrl+Shift+R` olan ve kendiniz değiştirebileceğiniz kısayolu kullanın
2. Mikrofon butonuna basarak kayıt başlatın
3. Konuşun — metin gerçek zamanlı olarak algılanacaktır
4. Kayıt bittiğinde metin otomatik olarak panoya kopyalanır

### Model Seçimi

| Model | Boyut | Hız | Doğruluk |
|-------|-------|-----|----------|
| tiny | ~75 MB | ⚡ Çok Hızlı | ★★☆☆☆ |
| base | ~145 MB | ⚡ Hızlı | ★★★☆☆ |
| small | ~490 MB | ⚡ Orta | ★★★★☆ |
| medium | ~1.5 GB | 🐢 Yavaş | ★★★★★ |
| large-v3 | ~3.1 GB | 🐌 Çok Yavaş | ★★★★★ |

> **Öneri:** Genel kullanım için `small` modeli önerilir. Yüksek doğruluk gerekiyorsa `medium` kullanın.

## 🏗️ Teknoloji Altyapısı

- **Frontend:** React + TypeScript + Vite
- **Backend:** Rust + Tauri v2
- **STT Engine:** OpenAI Whisper ([faster-whisper](https://github.com/SYSTRAN/faster-whisper))
- **Overlay:** Python + GTK Layer Shell (Wayland uyumlu)

## 📁 Proje Yapısı

```
pardus-dikte/
├── src/                    # React frontend
│   ├── App.tsx             # Ana uygulama bileşeni
│   ├── i18n.ts             # Çoklu dil desteği (TR/EN)
│   └── components/         # UI bileşenleri
├── src-tauri/              # Rust backend
│   ├── src/lib.rs          # Tauri ana mantık
│   ├── stt_engine.py       # Whisper STT motoru
│   ├── overlay.py          # Ekran üstü gösterge
│   └── icons/              # Uygulama ikonları
├── public/                 # Statik dosyalar
└── LICENSE                 # GPL-3.0 Lisans
```

## 🤝 Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Lütfen:

1. Projeyi fork edin
2. Yeni bir dal oluşturun (`git checkout -b ozellik/yeni-ozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Dalınıza push edin (`git push origin ozellik/yeni-ozellik`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje [GNU General Public License v3.0](LICENSE) ile lisanslanmıştır.

## 📧 İletişim

- **Geliştirici:** İnoTürk
- **Web Sitesi:** [inoturk.netlify.app](https://inoturk.netlify.app/)
- **E-posta:** [inoturkteknolojitakimi@gmail.com](mailto:inoturkteknolojitakimi@gmail.com)
- **GitHub:** [github.com/umutKaracelebi/Pardus-Dikte](https://github.com/umutKaracelebi/Pardus-Dikte)

---

<p align="center">
  <b>İnoTürk</b> tarafından ❤️ ile geliştirilmiştir.
</p>
