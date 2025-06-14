import React, { useState, useRef } from 'react';
import { SarvamAIClient } from 'sarvamai';

const API_KEY = '954b2595-6a49-49ec-8974-268a7cec4b69';

// Language options with their codes
const LANGUAGES = [
  { code: 'bn-IN', name: 'Bengali' },
  { code: 'gu-IN', name: 'Gujarati' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'kn-IN', name: 'Kannada' },
  { code: 'ml-IN', name: 'Malayalam' },
  { code: 'mr-IN', name: 'Marathi' },
  { code: 'od-IN', name: 'Odia' },
  { code: 'pa-IN', name: 'Punjabi' },
  { code: 'ta-IN', name: 'Tamil' },
  { code: 'te-IN', name: 'Telugu' }
];

// F5 API Class
class F5AudioAPI {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl; // Empty string uses proxy
  }

  // Convert audio blob to WAV format
  async convertToWav(audioBlob) {
    try {
      console.log('🔄 Converting audio to WAV format...');
      
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV
      const wavBlob = this.audioBufferToWav(audioBuffer);
      
      console.log('✅ Audio converted to WAV:', {
        originalSize: audioBlob.size,
        originalType: audioBlob.type,
        wavSize: wavBlob.size,
        wavType: wavBlob.type,
        channels: audioBuffer.numberOfChannels,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration
      });
      
      return wavBlob;
    } catch (error) {
      console.error('❌ Audio conversion failed:', error);
      throw new Error(`Audio conversion failed: ${error.message}`);
    }
  }

  // Convert AudioBuffer to WAV blob
  audioBufferToWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2; // 16-bit samples
    
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF'); // ChunkID
    view.setUint32(4, 36 + length, true); // ChunkSize
    writeString(8, 'WAVE'); // Format
    writeString(12, 'fmt '); // Subchunk1ID
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat (PCM)
    view.setUint16(22, numberOfChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, sampleRate * numberOfChannels * 2, true); // ByteRate
    view.setUint16(32, numberOfChannels * 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, 'data'); // Subchunk2ID
    view.setUint32(40, length, true); // Subchunk2Size
    
    // Convert audio data to 16-bit PCM (interleaved for multiple channels)
    let offset = 44;
    const channelData = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      channelData.push(audioBuffer.getChannelData(channel));
    }
    
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  
  async generateAudio(genText, refText, audioFile) {
    try {
      // First convert to proper WAV format
      const wavBlob = await this.convertToWav(audioFile);
      const audioBase64 = await this.fileToBase64(wavBlob);
      
      const payload = {
        gen_text: genText,
        ref_text: refText,
        audio_base64: `data:audio/wav;base64,${audioBase64}`
      };
      
      // Debug logging
      console.log('🎯 F5 API Debug Info:');
      console.log('Generated Text:', genText);
      console.log('Reference Text:', refText);
      console.log('Original Audio:', { type: audioFile.type, size: audioFile.size });
      console.log('Converted WAV:', { type: wavBlob.type, size: wavBlob.size });
      console.log('Base64 Audio Length:', audioBase64.length);
      console.log('Base64 Audio Preview:', audioBase64.substring(0, 100) + '...');
      console.log('Full Payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch(`${this.baseUrl}/f5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('🔍 F5 API Response Info:');
      console.log('Response Status:', response.status);
      console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error Response Body:', errorText);
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Success Response:', data);
      
      if (!data.audio_base64) {
        throw new Error('No audio data in response');
      }
      
      return { success: true, audio_base64: data.audio_base64 };
      
    } catch (error) {
      console.warn('F5 API Error:', error);
      return { success: false, error: error.message };
    }
  }
  
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [transcribedText, setTranscribedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const sarvamClient = new SarvamAIClient({ apiSubscriptionKey: API_KEY });
  const f5Api = new F5AudioAPI();

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Check supported formats and choose the best one
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/wav'
      ];
      
      let selectedType = '';
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type;
          console.log('🎯 Selected MediaRecorder type:', type);
          break;
        }
      }
      
      mediaRecorderRef.current = new MediaRecorder(stream, selectedType ? { mimeType: selectedType } : {});
      audioChunksRef.current = [];
      
      console.log('🎤 MediaRecorder created with type:', mediaRecorderRef.current.mimeType);

      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const actualMimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
        
        // Debug: Check what MediaRecorder actually produced
        console.log('🎤 MediaRecorder Debug Info:');
        console.log('Chunks count:', audioChunksRef.current.length);
        console.log('Blob type:', blob.type);
        console.log('Blob size:', blob.size);
        console.log('MediaRecorder mimeType:', mediaRecorderRef.current.mimeType);
        
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // Auto-start processing after audioBlob is set
        setTimeout(() => {
          // Call processAudio with the blob directly to avoid state timing issues
          processAudioWithBlob(blob);
        }, 100);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Process audio with a specific blob (for auto-processing)
  const processAudioWithBlob = async (blob) => {
    if (!blob) {
      console.error('No audio blob provided');
      return;
    }
    
    setProcessing(true);
    setCurrentStep('Transcribing audio...');

    try {
      // Step 1: Transcribe audio
      const audioFile = new File([blob], 'recording.wav', { type: 'audio/wav' });
      
      const transcriptionResponse = await sarvamClient.speechToText.transcribe(audioFile, {
        model: 'saarika:v2',
      });

      const transcribed = transcriptionResponse.transcript;
      const detectedLanguage = transcriptionResponse.language_code;
      setTranscribedText(transcribed);
      setCurrentStep('Translating text...');

      // Step 2: Translate text
      const translationResponse = await sarvamClient.text.translate({
        input: transcribed,
        source_language_code: detectedLanguage,
        target_language_code: selectedLanguage,
        model: 'sarvam-translate:v1'
      });

      const translated = translationResponse.translated_text;
      setTranslatedText(translated);

      // Step 3: Generate audio using F5 API (with fallback)
      setCurrentStep('Generating audio...');
      const audioResult = await f5Api.generateAudio(translated, transcribed, blob);
      
      if (audioResult.success) {
        setGeneratedAudio(audioResult.audio_base64);
        setCurrentStep('Complete!');
      } else {
        console.warn('Audio generation failed, but translation completed:', audioResult.error);
        setCurrentStep('Translation completed! (Audio generation service unavailable)');
        // Don't set generatedAudio, so the Play Audio button won't appear
      }

      setTimeout(() => {
        setProcessing(false);
        setCurrentStep('');
      }, 2000);

    } catch (error) {
      console.error('Processing error:', error);
      alert(`Error processing: ${error.message}`);
      setProcessing(false);
      setCurrentStep('');
    }
  };

  // Process the complete workflow (for legacy compatibility)
  const processAudio = async () => {
    if (!audioBlob) {
      alert('Please record audio first');
      return;
    }
    
    await processAudioWithBlob(audioBlob);
  };

  // Reset all states
  const resetAll = () => {
    setAudioBlob(null);
    setTranscribedText('');
    setTranslatedText('');
    setGeneratedAudio(null);
    setProcessing(false);
    setCurrentStep('');
  };

  // Play generated audio
  const playGeneratedAudio = () => {
    if (generatedAudio) {
      const audio = new Audio(`data:audio/wav;base64,${generatedAudio}`);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        alert('Error playing audio');
      });
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F4EFE4' }}>
      <div className="max-w-3xl mx-auto">
                  <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-black mb-4">
              🎤 Sarvam Voice Translation
            </h1>
            <p className="text-xl text-black">
              Record, translate, and listen to your voice in different languages
            </p>
          </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Target Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={processing}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Recording Section */}
          <div className="text-center">
            <div className="mb-6">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="inline-flex items-center px-8 py-4 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-colors duration-200 shadow-lg"
                  disabled={processing}
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                  Start Recording
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="inline-flex items-center px-8 py-4 bg-gray-500 hover:bg-gray-600 text-white font-semibold rounded-full transition-colors duration-200 shadow-lg animate-pulse"
                >
                  <div className="w-6 h-6 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                  Stop Recording
                </button>
              )}
            </div>

            {audioBlob && !isRecording && !processing && (
              <div className="mb-6">
                <p className="text-green-600 font-medium">✓ Audio recorded successfully! Processing...</p>
              </div>
            )}
          </div>

          {/* Processing Status */}
          {processing && currentStep && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-blue-700 font-medium">{currentStep}</span>
              </div>
            </div>
          )}

          {/* Results Section */}
          {transcribedText && (
            <div className="space-y-6">
              {/* Audio Generation Section - Now First */}
              {generatedAudio ? (
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Audio:</h3>
                  <button
                    onClick={playGeneratedAudio}
                    className="inline-flex items-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors duration-200 shadow-md"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    Play Audio
                  </button>
                </div>
              ) : translatedText && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Audio Generation</h3>
                  <p className="text-yellow-700">
                    🔧 Audio generation service is currently unavailable. 
                    Your text has been successfully transcribed and translated!
                  </p>
                </div>
              )}

              {/* Transcribed Text Section - Now Second */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Transcribed Text:</h3>
                <p className="text-gray-700">{transcribedText}</p>
              </div>

              {/* Translated Text Section - Now Third */}
              {translatedText && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Translated Text ({LANGUAGES.find(l => l.code === selectedLanguage)?.name}):
                  </h3>
                  <p className="text-gray-700">{translatedText}</p>
                </div>
              )}
            </div>
          )}

          {/* Reset Button */}
          {(audioBlob || transcribedText) && !processing && (
            <div className="text-center pt-4">
              <button
                onClick={resetAll}
                className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Reset All
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
