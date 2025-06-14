# 🎤 Sarvam Voice Translator App

A React-based voice translation application that allows users to record audio, transcribe it, translate to different Indian languages, and generate voice output using advanced AI APIs.

## Features

- **Audio Recording**: Record voice using browser's microphone
- **Speech-to-Text**: Transcribe audio using Sarvam AI's ASR API
- **Translation**: Translate text to Hindi, Marathi, Odia, or Punjabi
- **Voice Generation**: Generate voice output using F5 API
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS

## Technology Stack

- **Frontend**: React (Functional Components)
- **Styling**: Tailwind CSS
- **APIs**: 
  - Sarvam AI (Transcription & Translation)
  - F5 API (Voice Generation)

## Supported Languages

- Hindi (hi-IN)
- Marathi (mr-IN)
- Odia (od-IN)
- Punjabi (pa-IN)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```

## Usage

1. **Select Target Language**: Choose from Hindi, Marathi, Odia, or Punjabi
2. **Record Audio**: Click "Start Recording" to record your voice
3. **Process**: Click "Send & Process" to transcribe, translate, and generate audio
4. **Listen**: Play the generated audio in your selected language

## API Configuration

The app uses the following APIs:
- **Sarvam AI API Key**: `954b2595-6a49-49ec-8974-268a7cec4b69`
- **F5 API**: `http://34.100.221.107:8967/f5` (No authentication required)

## Workflow

1. **Audio Recording** → User records audio using microphone
2. **Transcription** → Audio is transcribed to text using Sarvam AI
3. **Translation** → Text is translated to selected target language
4. **Voice Generation** → F5 API generates voice output from translated text
5. **Playback** → User can play the generated audio

## Browser Compatibility

This app requires:
- Modern browser with microphone access
- Support for Web Audio API
- JavaScript enabled

## Development

To start the development server:
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Production Build

To create a production build:
```bash
npm run build
```

## License

This project is created for demonstration purposes.
