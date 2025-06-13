# 🎤 Sarvam Voice Translation

A modern web application that allows users to record their voice, transcribe it, translate it to different Indian languages, and generate audio in the target language.

## ✨ Features

- **🎤 Voice Recording**: Record audio directly in the browser
- **📝 Auto Speech-to-Text**: Automatic language detection and transcription using Sarvam AI
- **🌍 Multi-language Translation**: Translate between multiple Indian languages
- **🔊 Voice Generation**: Generate audio in the target language using F5 TTS API
- **🎨 Modern UI**: Beautiful, responsive design with Tailwind CSS

## 🌐 Supported Languages

- **Hindi** (hi-IN)
- **Marathi** (mr-IN)
- **Odia** (od-IN)
- **Punjabi** (pa-IN)

## 🚀 Technology Stack

- **Frontend**: React 19, Tailwind CSS
- **Speech-to-Text**: Sarvam AI API
- **Translation**: Sarvam AI Translation API
- **Text-to-Speech**: F5 TTS API
- **Audio Processing**: Web Audio API for WAV conversion
- **Build Tool**: Create React App

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Sarvam AI API key
- Access to F5 TTS API

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/arijeet-sarvam/voice-translate-demo.git
   cd voice-translate-demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Key**
   - Update the `API_KEY` constant in `src/App.js` with your Sarvam AI API key
   ```javascript
   const API_KEY = 'your-sarvam-ai-api-key-here';
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   - Navigate to `http://localhost:3000`

## 🎯 How to Use

1. **Select Target Language**: Choose the language you want to translate to
2. **Record Audio**: Click "Start Recording" and speak in any supported language
3. **Stop Recording**: Click "Stop Recording" when finished
4. **Process**: Click "Send & Process" to transcribe, translate, and generate audio
5. **Listen**: Play the generated audio in the target language

## 🔧 Configuration

### Sarvam AI Setup
1. Sign up at [Sarvam AI](https://www.sarvam.ai/)
2. Get your API subscription key
3. Replace the `API_KEY` in `src/App.js`

### F5 TTS API
The app is configured to use the F5 TTS API at `http://34.100.221.107:8967`. Make sure this service is accessible or update the base URL in the `F5AudioAPI` class.

## 🏗️ Architecture

```
User Records Audio
    ↓
MediaRecorder (WebM/Opus)
    ↓
Web Audio API (Convert to WAV)
    ↓
Sarvam AI (Speech-to-Text + Auto Language Detection)
    ↓
Sarvam AI (Translation to Target Language)
    ↓
F5 TTS API (Generate Audio in Target Language)
    ↓
Audio Playback
```

## 🔄 API Flow

1. **Speech-to-Text**: `POST` to Sarvam AI with audio file
2. **Translation**: `POST` to Sarvam AI with detected language → target language
3. **Audio Generation**: `POST` to F5 API with translated text and reference audio

## 🐛 Troubleshooting

### CORS Issues
The app uses a proxy configuration for the F5 API to avoid CORS issues in development:
```json
"proxy": "http://34.100.221.107:8967"
```

### Audio Format Issues
The app automatically converts MediaRecorder output to WAV format using Web Audio API before sending to the F5 TTS API.

### Browser Compatibility
- Requires a modern browser with Web Audio API support
- Microphone access permission required

## 📁 Project Structure

```
src/
├── App.js              # Main application component
├── index.js            # React entry point
├── index.css           # Global styles and Tailwind imports
├── App.css             # Component-specific styles
public/
├── index.html          # HTML template
├── manifest.json       # PWA manifest
package.json            # Dependencies and scripts
tailwind.config.js      # Tailwind CSS configuration
postcss.config.js       # PostCSS configuration
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify/Vercel
1. Build the project
2. Deploy the `build` folder
3. Configure environment variables for API keys

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Sarvam AI](https://www.sarvam.ai/) for speech-to-text and translation APIs
- [F5 TTS](https://github.com/SWivid/F5-TTS) for voice generation
- [React](https://reactjs.org/) for the frontend framework
- [Tailwind CSS](https://tailwindcss.com/) for the beautiful UI

## 📞 Support

If you have any questions or run into issues, please open an issue on GitHub.

---

**Made with ❤️ for multilingual communication**
