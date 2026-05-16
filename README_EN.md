# Pardus Dikte

<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="Pardus Dikte Logo" width="128">
</p>

<p align="center">
  <b>Voice-to-Text Assistant — AI-Powered Speech Recognition for Linux</b>
</p>

<p align="center">
  <a href="https://github.com/umutKaracelebi/Pardus-Dikte/releases"><img src="https://img.shields.io/github/v/release/umutKaracelebi/Pardus-Dikte?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="License"></a>
  <a href="https://inoturk.netlify.app/"><img src="https://img.shields.io/badge/Developer-İnoTürk-cyan?style=flat-square" alt="Developer"></a>
</p>

---

[🇹🇷 Türkçe](README.md)

## 📖 About

**Pardus Dikte** is an AI-powered voice-to-text assistant for Pardus and other Linux distributions. It uses [OpenAI Whisper](https://github.com/openai/whisper) models to convert speech to text in real-time. All processing happens on-device (offline) — your audio data never leaves your computer.

Developed by the **İnoTürk** team for the 2026 **Teknofest Pardus Bug Catching and Suggestion Competition** — Development Category.

## ✨ Features

- 🎤 **Real-Time Dictation** — Speak into your microphone and get instant text
- 🧠 **AI Models** — Choose from tiny, base, small, medium, large-v3 models
- 🌍 **Multi-Language Support** — Dictation in Turkish, English, and many more languages
- 🔒 **Fully Offline** — No internet connection required (after model download)
- ⌨️ **Global Shortcut** — Start/stop recording with your custom shortcut from any application
- 📋 **Auto-Paste** — Recognized text is automatically copied to clipboard
- 🎨 **Light/Dark Theme** — Interface adapts to your system theme
- 📊 **Live Audio Waveform** — Real-time audio visualization during recording
- 📝 **History** — Browse all your past dictation sessions
- 🖥️ **On-Screen Overlay** — Recording status indicator overlay

## 📦 Installation

### .deb Package (Recommended)

Download the `.deb` file from the [Releases](https://github.com/umutKaracelebi/Pardus-Dikte/releases) page:

```bash
sudo dpkg -i pardus-dikte_1.0.0_amd64.deb
```

#### Requirements

The following dependencies are automatically installed with the `.deb` package:

- `python3`, `python3-venv`, `python3-pip`
- `libwebkit2gtk-4.1-0`
- `libayatana-appindicator3-1`
- `xclip`

> **Note:** On first launch, the application automatically creates a Python virtual environment and installs the required AI libraries (`faster-whisper`, `numpy`, `sounddevice`). This may take a few minutes.

### Building from Source

```bash
# Install dependencies
sudo apt install python3 python3-venv python3-pip libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev libgtk-3-dev xclip

# Rust and Node.js must be installed
# https://rustup.rs/ and https://nodejs.org/

# Clone the project
git clone https://github.com/umutKaracelebi/Pardus-Dikte.git
cd Pardus-Dikte

# Install dependencies
npm install

# Create Python venv
cd src-tauri
python3 -m venv venv
venv/bin/pip install faster-whisper sounddevice numpy
cd ..

# Run in development mode
npm run tauri dev

# Build .deb package
npm run tauri build -- --bundles deb
```

## 🚀 Usage

1. Open the application or use the default `Ctrl+Shift+R` shortcut (customizable in settings)
2. Click the microphone button to start recording
3. Speak — text will be recognized in real-time
4. When recording stops, the text is automatically copied to your clipboard

### Model Selection

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| tiny | ~75 MB | ⚡ Very Fast | ★★☆☆☆ |
| base | ~145 MB | ⚡ Fast | ★★★☆☆ |
| small | ~490 MB | ⚡ Medium | ★★★★☆ |
| medium | ~1.5 GB | 🐢 Slow | ★★★★★ |
| large-v3 | ~3.1 GB | 🐌 Very Slow | ★★★★★ |

> **Recommendation:** The `small` model is recommended for general use. Use `medium` if you need higher accuracy.

## 🏗️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Rust + Tauri v2
- **STT Engine:** OpenAI Whisper ([faster-whisper](https://github.com/SYSTRAN/faster-whisper))
- **Overlay:** Python + GTK Layer Shell (Wayland compatible)

## 📁 Project Structure

```
pardus-dikte/
├── src/                    # React frontend
│   ├── App.tsx             # Main application component
│   ├── i18n.ts             # Internationalization (TR/EN)
│   └── components/         # UI components
├── src-tauri/              # Rust backend
│   ├── src/lib.rs          # Tauri core logic
│   ├── stt_engine.py       # Whisper STT engine
│   ├── overlay.py          # On-screen overlay
│   └── icons/              # Application icons
├── public/                 # Static assets
└── LICENSE                 # GPL-3.0 License
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the [GNU General Public License v3.0](LICENSE).

## 📧 Contact

- **Developer:** İnoTürk
- **Website:** [inoturk.netlify.app](https://inoturk.netlify.app/)
- **Email:** [inoturkteknolojitakimi@gmail.com](mailto:inoturkteknolojitakimi@gmail.com)
- **GitHub:** [github.com/umutKaracelebi/Pardus-Dikte](https://github.com/umutKaracelebi/Pardus-Dikte)

---

<p align="center">
  Developed with ❤️ by <b>İnoTürk</b>
</p>
