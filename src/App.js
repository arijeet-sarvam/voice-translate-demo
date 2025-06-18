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
    // Use Vercel serverless proxy in production, local proxy in development
    this.baseUrl = baseUrl || (process.env.NODE_ENV === 'production' 
      ? '/api' // Use Vercel serverless function proxy
      : ''); // Empty string uses local proxy in development
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
  
  // Sarvam AI Text-to-Speech using Bulbul model
  async generateAudioWithSarvam(text, targetLanguage, apiKey) {
    try {
      console.log('🔄 Using Sarvam TTS Bulbul model...');
      
      const payload = {
        text: text,
        target_language_code: targetLanguage,
        speaker: "anushka",
        model: "bulbul:v2",
        enable_preprocessing: true,
        sample_rate: 22050
      };
      
      console.log('🎯 Sarvam TTS Bulbul Payload:', payload);
      
      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log('🔍 Sarvam TTS Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Sarvam TTS HTTP Error:', errorText);
        console.log('❌ Response Status:', response.status);
        console.log('❌ Response Headers:', Object.fromEntries(response.headers.entries()));
        
        // Try to parse error as JSON for better debugging
        try {
          const errorData = JSON.parse(errorText);
          console.log('❌ Parsed Error Data:', errorData);
        } catch (parseError) {
          console.log('❌ Error text (not JSON):', errorText);
        }
        
        throw new Error(`Sarvam TTS failed: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('✅ Sarvam TTS Bulbul Success Response:', data);
      console.log('🔍 Response keys:', Object.keys(data));
      
      // Check for different possible field names
      let audioData = null;
      if (data.audios && Array.isArray(data.audios) && data.audios.length > 0) {
        audioData = data.audios[0];
        console.log('📦 Found audio data in "audios" array (Sarvam TTS format)');
      } else if (data.audio) {
        audioData = data.audio;
        console.log('📦 Found audio data in "audio" field');
      } else if (data.audio_base64) {
        audioData = data.audio_base64;
        console.log('📦 Found audio data in "audio_base64" field');
      } else if (data.data) {
        audioData = data.data;
        console.log('📦 Found audio data in "data" field');
      } else if (data.audio_url) {
        console.log('📦 Found audio URL:', data.audio_url);
        // Handle URL case - download the audio
        try {
          const audioResponse = await fetch(data.audio_url);
          const audioBlob = await audioResponse.blob();
          const reader = new FileReader();
          return new Promise((resolve) => {
            reader.onload = () => {
              const base64 = reader.result.split(',')[1];
              resolve({ success: true, audio_base64: base64 });
            };
            reader.readAsDataURL(audioBlob);
          });
        } catch (urlError) {
          console.error('❌ Failed to download audio from URL:', urlError);
          throw new Error(`Failed to download audio: ${urlError.message}`);
        }
      } else {
        console.error('❌ No recognized audio field found in response');
        console.log('📋 Full response structure:', JSON.stringify(data, null, 2));
        
        // Also log each field individually for better debugging
        console.log('🔍 Detailed field analysis:');
        Object.keys(data).forEach(key => {
          const value = data[key];
          console.log(`  - "${key}": ${typeof value} (${value ? value.toString().substring(0, 50) + '...' : 'null/undefined'})`);
        });
        
        alert(`🚨 DEBUG: Sarvam TTS returned unexpected response format. Check console for details.\n\nResponse keys: ${Object.keys(data).join(', ')}`);
        throw new Error('No audio data found in Sarvam response. Response structure logged to console.');
      }
      
      if (!audioData) {
        throw new Error('Audio data is empty');
      }
      
      console.log('🎵 Audio data preview:', audioData.substring(0, 100) + '...');
      return { success: true, audio_base64: audioData };
      
    } catch (error) {
      console.warn('Sarvam TTS Error:', error);
      return { success: false, error: error.message };
    }
  }

  async generateAudio(genText, refText, audioFile, targetLanguage, apiKey, voiceMode = 'standard') {
    console.log(`🎯 Audio generation mode: ${voiceMode}`);
    
    // If standard mode is selected, go directly to Sarvam TTS
          if (voiceMode === 'standard') {
        console.log('📢 Using standard TTS mode - going directly to Sarvam TTS Bulbul');
        const result = await this.generateAudioWithSarvam(genText, targetLanguage, apiKey);
        
        if (result.success) {
          return { success: true, audio_base64: result.audio_base64, source: 'Sarvam-Bulbul' };
        } else {
          return { success: false, error: `Sarvam TTS Bulbul failed: ${result.error}` };
        }
      }
    
        // Voice cloning mode - try F5 first, then fallback to Sarvam TTS
    try {
      console.log('🎭 Using voice cloning mode - trying advanced voice cloning first');
      console.log('🔗 Checking F5 API connectivity...');
      
      // First convert to proper WAV format
      const conversionStartTime = performance.now();
      const wavBlob = await this.convertToWav(audioFile);
      const audioBase64 = await this.fileToBase64(wavBlob);
      const conversionEndTime = performance.now();
      console.log(`⚡ Audio conversion completed in ${(conversionEndTime - conversionStartTime).toFixed(2)}ms`);
      
      const payload = {
        gen_text: genText,
        ref_text: refText,
        audio_base64: `data:audio/wav;base64,${audioBase64}`
      };
      
      // Debug logging
      console.log('🎯 Voice Cloning API Debug Info:');
      console.log('Generated Text:', genText);
      console.log('Reference Text:', refText);
      console.log('Original Audio:', { type: audioFile.type, size: audioFile.size });
      console.log('Converted WAV:', { type: wavBlob.type, size: wavBlob.size });
      console.log('Base64 Audio Length:', audioBase64.length);
      console.log('Base64 Audio Preview:', audioBase64.substring(0, 100) + '...');
      console.log('Full Payload:', JSON.stringify(payload, null, 2));
      
      const f5Url = process.env.NODE_ENV === 'production' 
        ? `${this.baseUrl}/f5-proxy` 
        : `${this.baseUrl}/f5`;
      console.log('🎯 Voice Cloning API URL:', f5Url);
      console.log('🌍 Environment:', process.env.NODE_ENV);
      
      const f5ApiStartTime = performance.now();
      let response;
      
      try {
        response = await fetch(f5Url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          // Add timeout to prevent hanging
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
      } catch (fetchError) {
        // Handle fetch failures (CORS, network, timeout, etc.)
        console.error('❌ Voice cloning fetch failed:', fetchError.message);
        console.log('🔄 Falling back to standard TTS due to connectivity issues...');
        throw new Error(`Voice cloning service connectivity issue: ${fetchError.message}`);
      }
      
      const f5ApiEndTime = performance.now();
      
      console.log('🔍 Voice Cloning API Response Info:');
      console.log('Response Status:', response.status);
      console.log(`🚀 Voice Cloning API call completed in ${(f5ApiEndTime - f5ApiStartTime).toFixed(2)}ms`);
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
      
      return { success: true, audio_base64: data.audio_base64, source: 'F5-VoiceClone' };
      
    } catch (error) {
        // Check if this is a connection error to the F5 API
        const isConnectionError = error.message.includes('ECONNREFUSED') || 
                                 error.message.includes('Failed to fetch') ||
                                 error.message.includes('NetworkError') ||
                                 error.message.includes('Connection refused') ||
                                 error.message.includes('Voice cloning service unavailable') ||
                                 error.message.includes('Voice cloning service connectivity issue') ||
                                 error.message.includes('TypeError: Failed to fetch') ||
                                 error.name === 'TypeError';
        
        if (isConnectionError) {
          console.warn('🚨 Voice cloning service has connectivity issues, using standard TTS fallback...');
        } else {
          console.warn('🚨 Voice cloning failed for other reasons, trying Sarvam TTS Bulbul fallback...', error);
        }
        
        // Fallback to Sarvam TTS Bulbul API
        const fallbackStartTime = performance.now();
        const fallbackResult = await this.generateAudioWithSarvam(genText, targetLanguage, apiKey);
        const fallbackEndTime = performance.now();
        console.log(`🔄 Sarvam TTS fallback completed in ${(fallbackEndTime - fallbackStartTime).toFixed(2)}ms`);
        
        if (fallbackResult.success) {
          return { success: true, audio_base64: fallbackResult.audio_base64, source: 'Sarvam-Bulbul-Fallback' };
        }
        
        // More user-friendly error message
        const errorMsg = isConnectionError 
          ? 'Voice cloning service has connectivity issues and standard TTS also failed. Please try again later.'
          : `Both voice cloning and standard TTS failed. Please check your internet connection.`;
          
        return { success: false, error: errorMsg };
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
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceCloningMode, setVoiceCloningMode] = useState('cloning'); // 'standard' or 'cloning'
  const [sessionHistory, setSessionHistory] = useState([]); // Store all interactions
  const [playingHistoryIndex, setPlayingHistoryIndex] = useState(null); // Track which history item is playing
  const [audioGenerationFailed, setAudioGenerationFailed] = useState(false); // Track when both voice cloning and TTS APIs fail
  
  // Text-to-Speech temporarily disabled - only voice translation available
  const [activeTab, setActiveTab] = useState('voice-translation'); // Only 'voice-translation' for now
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [ttsLanguage, setTtsLanguage] = useState('hi-IN');
  const [ttsGeneratedAudio, setTtsGeneratedAudio] = useState(null);
  const [ttsProcessing, setTtsProcessing] = useState(false);
  const [ttsCurrentStep, setTtsCurrentStep] = useState('');
  const [ttsHistory, setTtsHistory] = useState([]);
  const [isPlayingTtsAudio, setIsPlayingTtsAudio] = useState(false);
  const [playingTtsHistoryIndex, setPlayingTtsHistoryIndex] = useState(null);
  
  // Reference audio recording states
  const [isRecordingReference, setIsRecordingReference] = useState(false);
  const [referenceAudioBlob, setReferenceAudioBlob] = useState(null);
  const [referenceText, setReferenceText] = useState('');
  const [useVoiceCloning, setUseVoiceCloning] = useState(false);
  const [chunkResults, setChunkResults] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(-1);
  
  const referenceRecorderRef = useRef(null);
  const referenceAudioChunksRef = useRef([]);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const sarvamClient = new SarvamAIClient({ apiSubscriptionKey: API_KEY });
  const f5Api = new F5AudioAPI();

  // Convert technical source names to user-friendly display text
  const getDisplaySourceName = (technicalSource) => {
    switch (technicalSource) {
      case 'F5-VoiceClone':
        return 'Voice Cloning';
      case 'Sarvam-Bulbul':
        return 'Text-to-Speech';
      case 'Sarvam-Bulbul-Fallback':
        return 'Text-to-Speech (Fallback)';
      case 'Sarvam-TTS-Fallback':
        return 'Text-to-Speech (Fallback)';
      default:
        return technicalSource;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      // Clear previous results immediately when starting new recording
      setTranscribedText('');
      setTranslatedText('');
      setGeneratedAudio(null);
      setProcessing(false);
      setCurrentStep('');
      setIsPlayingAudio(false);
      setPlayingHistoryIndex(null);
      setAudioGenerationFailed(false);
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
        
        // Auto-start processing immediately with error handling
        processAudioWithBlob(blob).catch(error => {
          console.error('❌ Audio processing error:', error);
          setProcessing(false);
          setCurrentStep('');
          alert(`Processing failed: ${error.message}`);
        });
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
    
    const startTime = performance.now();
    console.log('⏱️ Processing started at:', startTime);
    
    setProcessing(true);
    setCurrentStep('Transcribing audio...');

    try {
      // Step 1: Transcribe audio
      const transcriptionStartTime = performance.now();
      console.log('🎤 Starting transcription...');
      
      const audioFile = new File([blob], 'recording.wav', { type: 'audio/wav' });
      
      const transcriptionResponse = await sarvamClient.speechToText.transcribe(audioFile, {
        model: 'saarika:v2',
      });

      const transcriptionEndTime = performance.now();
      console.log(`✅ Transcription completed in ${(transcriptionEndTime - transcriptionStartTime).toFixed(2)}ms`);

      const transcribed = transcriptionResponse.transcript;
      const detectedLanguage = transcriptionResponse.language_code;
      setTranscribedText(transcribed);
      setCurrentStep('Translating text...');

      // Step 2: Translate text
      const translationStartTime = performance.now();
      console.log('🔄 Starting translation...');
      
      const translationResponse = await sarvamClient.text.translate({
        input: transcribed,
        source_language_code: detectedLanguage,
        target_language_code: selectedLanguage,
        model: 'sarvam-translate:v1'
      });

      const translationEndTime = performance.now();
      console.log(`✅ Translation completed in ${(translationEndTime - translationStartTime).toFixed(2)}ms`);

      const translated = translationResponse.translated_text;
      setTranslatedText(translated);

      // Step 3: Generate audio based on selected mode
      setCurrentStep('Generating audio...');
      const audioStartTime = performance.now();
      console.log('🎵 Starting audio generation...');
      
      let audioResult;
      try {
        audioResult = await f5Api.generateAudio(translated, transcribed, blob, selectedLanguage, API_KEY, voiceCloningMode);
      } catch (audioError) {
        console.error('❌ Voice processing error:', audioError);
        audioResult = { success: false, error: audioError.message };
      }
      
      if (audioResult.success) {
        const audioEndTime = performance.now();
        const totalTime = audioEndTime - startTime;
        const audioGenerationTime = audioEndTime - audioStartTime;
        
        console.log(`✅ Audio generation completed in ${audioGenerationTime.toFixed(2)}ms using ${audioResult.source} (${getDisplaySourceName(audioResult.source)})`);
        console.log(`🏁 Total processing time: ${totalTime.toFixed(2)}ms`);
        
        setGeneratedAudio(audioResult.audio_base64);
        setAudioGenerationFailed(false); // Clear any previous failure state
        setCurrentStep(`Complete! (${getDisplaySourceName(audioResult.source)} completed)`);
        
        // Add to session history
        const historyEntry = {
          id: Date.now(),
          timestamp: new Date().toLocaleTimeString(),
          transcribedText: transcribed,
          translatedText: translated,
          targetLanguage: selectedLanguage,
          languageName: LANGUAGES.find(l => l.code === selectedLanguage)?.name,
          generatedAudio: audioResult.audio_base64,
          audioSource: audioResult.source,
          voiceMode: voiceCloningMode
        };
        
        setSessionHistory(prev => [historyEntry, ...prev]); // Add to beginning of array
        
        // Auto-play the generated audio immediately
        playAudioData(audioResult.audio_base64);
        
      } else {
        console.warn('Audio generation failed:', audioResult.error);
        setAudioGenerationFailed(true); // Both voice cloning and TTS APIs failed
        setCurrentStep('Translation completed! (Audio generation failed)');
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



  // Reset all states
  const resetAll = () => {
    setAudioBlob(null);
    setTranscribedText('');
    setTranslatedText('');
    setGeneratedAudio(null);
    setProcessing(false);
    setCurrentStep('');
    setVoiceCloningMode('cloning'); // Reset to default mode
    setIsPlayingAudio(false);
    setPlayingHistoryIndex(null);
    setAudioGenerationFailed(false);
  };

  // Clear session history
  const clearHistory = () => {
    setSessionHistory([]);
  };

  // Generic function to play audio data
  const playAudioData = (audioData, isHistoryItem = false, historyIndex = null) => {
    if (!audioData || isPlayingAudio || (isHistoryItem && playingHistoryIndex !== null)) {
      return; // Prevent multiple simultaneous playback
    }
    
    try {
      setIsPlayingAudio(true);
      if (isHistoryItem) {
        setPlayingHistoryIndex(historyIndex);
      }
      
      // Handle different audio formats from different APIs
      let audioDataUrl;
      
      // iOS-specific handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (audioData.startsWith('data:')) {
        // Audio already has data URL format
        audioDataUrl = audioData;
      } else {
        // For iOS, always use WAV format as it's more reliable
        if (isIOS) {
          audioDataUrl = `data:audio/wav;base64,${audioData}`;
          console.log('🎵 Using WAV format for iOS device');
        } else {
          // For other devices, detect format based on base64 header
          audioDataUrl = audioData.startsWith('UklGR') 
            ? `data:audio/wav;base64,${audioData}`
            : `data:audio/mp3;base64,${audioData}`;
        }
      }
      
      console.log('🎵 Playing audio with format:', audioDataUrl.substring(0, 50) + '...');
      
      // Create new Audio context for each playback
      const audio = new Audio();
      
      // iOS requires these settings
      if (isIOS) {
        audio.preload = 'auto';
        audio.autoplay = false;
      }
      
      audio.oncanplaythrough = () => {
        console.log('✅ Audio loaded successfully');
        // For iOS, we need to play after canplaythrough
        if (isIOS) {
          audio.play().catch(error => {
            console.error('❌ iOS playback error:', error);
            handlePlaybackError(error, audioData, isHistoryItem, historyIndex);
          });
        }
      };
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlayingHistoryIndex(null);
        console.log('🏁 Audio playback completed');
      };
      
      audio.onerror = (error) => {
        console.error('❌ Audio load error:', error);
        handlePlaybackError(error, audioData, isHistoryItem, historyIndex);
      };
      
      // Set source and start loading
      audio.src = audioDataUrl;
      
      // For non-iOS devices, play immediately
      if (!isIOS) {
        audio.play().catch(error => {
          console.error('❌ Playback error:', error);
          handlePlaybackError(error, audioData, isHistoryItem, historyIndex);
        });
      }
      
    } catch (error) {
      setIsPlayingAudio(false);
      setPlayingHistoryIndex(null);
      console.error('❌ Audio setup error:', error);
      alert('Error setting up audio playback');
    }
  };

  // Helper function to handle playback errors
  const handlePlaybackError = (error, audioData, isHistoryItem, historyIndex) => {
    setIsPlayingAudio(false);
    setPlayingHistoryIndex(null);
    
    // Try alternative format
    if (!audioData.startsWith('data:')) {
      console.log('🔄 Retrying with alternative format...');
      const alternativeFormat = audioData.startsWith('UklGR') 
        ? `data:audio/mp3;base64,${audioData}`
        : `data:audio/wav;base64,${audioData}`;
      
      const audio = new Audio(alternativeFormat);
      audio.onended = () => {
        setIsPlayingAudio(false);
        setPlayingHistoryIndex(null);
      };
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setPlayingHistoryIndex(null);
        alert('Unable to play audio. Please try using a different browser or device.');
      };
      audio.play().catch(() => {
        setIsPlayingAudio(false);
        setPlayingHistoryIndex(null);
        alert('Unable to play audio. Please try using a different browser or device.');
      });
    } else {
      alert('Unable to play audio. Please try using a different browser or device.');
    }
  };

  // Play current generated audio
  const playGeneratedAudio = () => {
    if (generatedAudio && !isPlayingAudio) {
      playAudioData(generatedAudio);
    }
  };

  // Play audio from history
  const playHistoryAudio = (audioData, index) => {
    playAudioData(audioData, true, index);
  };

  // Text-to-Speech Functions
  const extractTextFromUrl = async (url) => {
    try {
      setTtsCurrentStep('Fetching webpage content...');
      
      // For demo purposes, we'll try to fetch the URL directly
      // In production, you'd want to use a CORS proxy or backend service
      const response = await fetch(url, {
        mode: 'cors',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TextToSpeech/1.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Basic HTML content extraction (you might want to use a more sophisticated parser)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove script and style elements
      const scripts = doc.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());
      
      // Try to get main content areas
      let content = '';
      const contentSelectors = [
        'article',
        '[role="main"]',
        '.content',
        '#content',
        '.post-content',
        '.entry-content',
        'main'
      ];
      
      for (const selector of contentSelectors) {
        const element = doc.querySelector(selector);
        if (element) {
          content = element.textContent || element.innerText || '';
          break;
        }
      }
      
      // Fallback to body if no specific content area found
      if (!content) {
        content = doc.body?.textContent || doc.body?.innerText || '';
      }
      
      // Clean up the content
      content = content
        .replace(/\s+/g, ' ')
        .replace(/\n+/g, '\n')
        .trim();
      
      return content.substring(0, 5000); // Limit to 5000 characters for TTS
      
    } catch (error) {
      console.error('Error extracting content from URL:', error);
      throw new Error(`Unable to extract content from URL: ${error.message}. You may need to copy and paste the text manually due to CORS restrictions.`);
    }
  };



  const handleUrlExtraction = async () => {
    if (!inputUrl.trim()) {
      alert('Please enter a URL to extract content from.');
      return;
    }

    setTtsProcessing(true);
    try {
      const content = await extractTextFromUrl(inputUrl);
      setInputText(content);
      setTtsCurrentStep('Content extracted successfully! Ready to generate audio.');
    } catch (error) {
      console.error('URL extraction error:', error);
      alert(error.message);
      setTtsCurrentStep('Content extraction failed');
    } finally {
      setTimeout(() => {
        setTtsProcessing(false);
        setTtsCurrentStep('');
      }, 2000);
    }
  };

  const playTtsAudio = (audioData, isHistoryItem = false, historyIndex = null) => {
    if (!audioData || isPlayingTtsAudio || (isHistoryItem && playingTtsHistoryIndex !== null)) {
      return;
    }
    
    try {
      setIsPlayingTtsAudio(true);
      if (isHistoryItem) {
        setPlayingTtsHistoryIndex(historyIndex);
      }
      
      let audioDataUrl;
      if (audioData.startsWith('data:')) {
        audioDataUrl = audioData;
      } else {
        audioDataUrl = audioData.startsWith('UklGR') 
          ? `data:audio/wav;base64,${audioData}`
          : `data:audio/mp3;base64,${audioData}`;
      }
      
      const audio = new Audio(audioDataUrl);
      
      audio.onended = () => {
        setIsPlayingTtsAudio(false);
        setPlayingTtsHistoryIndex(null);
      };
      
      audio.onerror = () => {
        setIsPlayingTtsAudio(false);
        setPlayingTtsHistoryIndex(null);
        alert('Unable to play audio. Format may not be supported.');
      };
      
      audio.play().catch(error => {
        setIsPlayingTtsAudio(false);
        setPlayingTtsHistoryIndex(null);
        console.error('❌ TTS Audio playback error:', error);
      });
      
    } catch (error) {
      setIsPlayingTtsAudio(false);
      setPlayingTtsHistoryIndex(null);
      console.error('❌ TTS Audio setup error:', error);
    }
  };

  const clearTtsStates = () => {
    setInputText('');
    setInputUrl('');
    setTtsGeneratedAudio(null);
    setTtsProcessing(false);
    setTtsCurrentStep('');
    setIsPlayingTtsAudio(false);
    setPlayingTtsHistoryIndex(null);
    setChunkResults([]);
    setCurrentChunkIndex(-1);
    // Don't clear reference audio states when clearing text
    // setReferenceAudioBlob(null);
    // setReferenceText('');
    // setUseVoiceCloning(false);
  };

  const clearTtsHistory = () => {
    setTtsHistory([]);
  };

  // Reference Audio Recording Functions
  const startReferenceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
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
          break;
        }
      }
      
      referenceRecorderRef.current = new MediaRecorder(stream, selectedType ? { mimeType: selectedType } : {});
      referenceAudioChunksRef.current = [];
      
      referenceRecorderRef.current.ondataavailable = (event) => {
        referenceAudioChunksRef.current.push(event.data);
      };

      referenceRecorderRef.current.onstop = () => {
        const actualMimeType = referenceRecorderRef.current.mimeType || 'audio/webm';
        const blob = new Blob(referenceAudioChunksRef.current, { type: actualMimeType });
        setReferenceAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        console.log('🎙️ Reference audio recorded:', { size: blob.size, type: blob.type });
        
        // Automatically transcribe the reference audio
        transcribeReferenceAudio(blob);
      };

      referenceRecorderRef.current.start();
      setIsRecordingReference(true);
    } catch (error) {
      console.error('Error starting reference recording:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  const stopReferenceRecording = () => {
    if (referenceRecorderRef.current && isRecordingReference) {
      referenceRecorderRef.current.stop();
      setIsRecordingReference(false);
    }
  };

  // Auto-transcribe reference audio after recording
  const transcribeReferenceAudio = async (audioBlob) => {
    try {
      setTtsCurrentStep('Transcribing reference audio...');
      
      const audioFile = new File([audioBlob], 'reference.wav', { type: 'audio/wav' });
      
      const transcriptionResponse = await sarvamClient.speechToText.transcribe(audioFile, {
        model: 'saarika:v2',
      });

      const transcribed = transcriptionResponse.transcript;
      setReferenceText(transcribed);
      
      console.log('🎯 Reference audio transcribed:', transcribed);
      setTtsCurrentStep('Reference audio transcribed successfully!');
      
      setTimeout(() => {
        setTtsCurrentStep('');
      }, 2000);
      
    } catch (error) {
      console.error('Error transcribing reference audio:', error);
      setTtsCurrentStep('Failed to transcribe reference audio');
      setTimeout(() => {
        setTtsCurrentStep('');
      }, 2000);
    }
  };

  // Text chunking function (10-15 words per chunk)
  const chunkText = (text, maxWords = 15) => {
    const words = text.trim().split(/\s+/);
    const chunks = [];
    
    for (let i = 0; i < words.length; i += maxWords) {
      const chunk = words.slice(i, i + maxWords).join(' ');
      chunks.push(chunk);
    }
    
    return chunks;
  };

  // Enhanced TTS generation with chunking for voice cloning
  const generateTtsAudioWithChunking = async (text, language) => {
    if (!text.trim()) {
      alert('Please enter some text to convert to speech.');
      return;
    }

    setTtsProcessing(true);
    setTtsGeneratedAudio(null);
    setChunkResults([]);
    setCurrentChunkIndex(-1);

    try {
      if (useVoiceCloning && referenceAudioBlob) {
        // Check if we have transcribed text, if not wait a bit or use a default message
        if (!referenceText) {
          setTtsCurrentStep('Waiting for reference audio transcription...');
          // Wait a bit and try again, or skip if transcription failed
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (!referenceText) {
            throw new Error('Reference audio transcription not available. Please try recording again.');
          }
        }
        // Voice cloning mode with chunking
        setTtsCurrentStep('Processing text chunks with voice cloning...');
        
        const chunks = chunkText(text, 15);
        console.log(`📝 Processing ${chunks.length} text chunks for voice cloning`);
        
        const results = [];
        
        for (let i = 0; i < chunks.length; i++) {
          setCurrentChunkIndex(i);
          setTtsCurrentStep(`Processing chunk ${i + 1} of ${chunks.length}...`);
          
          try {
            const startTime = performance.now();
            
            // Use voice cloning API with reference audio
            const result = await f5Api.generateAudio(
              chunks[i], 
              referenceText, 
              referenceAudioBlob, 
              language, 
              API_KEY, 
              'cloning'
            );
            
            const endTime = performance.now();
            
            if (result.success) {
              const chunkResult = {
                chunkIndex: i,
                text: chunks[i],
                audio: result.audio_base64,
                source: result.source,
                processingTime: (endTime - startTime).toFixed(2)
              };
              
              results.push(chunkResult);
              setChunkResults(prev => [...prev, chunkResult]);
              
              console.log(`✅ Chunk ${i + 1} completed in ${chunkResult.processingTime}ms`);
            } else {
              console.warn(`❌ Chunk ${i + 1} failed:`, result.error);
              // Add failed chunk with fallback to regular TTS
              const fallbackResult = await generateRegularTts(chunks[i], language);
              if (fallbackResult.success) {
                const chunkResult = {
                  chunkIndex: i,
                  text: chunks[i],
                  audio: fallbackResult.audio_base64,
                  source: 'Sarvam-TTS-Fallback',
                  processingTime: 'fallback'
                };
                results.push(chunkResult);
                setChunkResults(prev => [...prev, chunkResult]);
              }
            }
          } catch (error) {
            console.error(`Error processing chunk ${i + 1}:`, error);
          }
        }
        
        setTtsCurrentStep(`Completed! Generated audio for ${results.length} chunks.`);
        
        // Auto-play first chunk if available
        if (results.length > 0 && results[0].audio) {
          setTimeout(() => playTtsAudio(results[0].audio), 500);
        }
        
      } else {
        // Regular TTS mode (no chunking)
        setTtsCurrentStep('Generating audio...');
        const result = await generateRegularTts(text, language);
        
        if (result.success) {
          setTtsGeneratedAudio(result.audio_base64);
          
          // Add to TTS history
          const historyEntry = {
            id: Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
            fullText: text,
            language: language,
            languageName: LANGUAGES.find(l => l.code === language)?.name,
            generatedAudio: result.audio_base64
          };
          
          setTtsHistory(prev => [historyEntry, ...prev]);
          playTtsAudio(result.audio_base64);
          setTtsCurrentStep('Complete! Audio generated successfully.');
        }
      }

    } catch (error) {
      console.error('TTS generation error:', error);
      alert(`Error generating audio: ${error.message}`);
      setTtsCurrentStep('Audio generation failed');
    } finally {
      setTimeout(() => {
        setTtsProcessing(false);
        setTtsCurrentStep('');
        setCurrentChunkIndex(-1);
      }, 2000);
    }
  };

  // Regular TTS generation (helper function)
  const generateRegularTts = async (text, language) => {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        target_language_code: language,
        speaker: "anushka",
        model: "bulbul:v2",
        enable_preprocessing: true,
        sample_rate: 22050
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TTS API failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.audios && Array.isArray(data.audios) && data.audios.length > 0) {
      return { success: true, audio_base64: data.audios[0] };
    } else {
      throw new Error('No audio data received from TTS API');
    }
  };

  const clearReferenceAudio = () => {
    setReferenceAudioBlob(null);
    setReferenceText('');
    setUseVoiceCloning(false);
    setChunkResults([]);
    setCurrentChunkIndex(-1);
  };



  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#F4EFE4' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-black mb-4">
            🎤 Sarvam AI Voice & Text Solutions
          </h1>
          <p className="text-xl text-black">
            Voice translation and text-to-speech powered by Sarvam AI
          </p>
        </div>

        {/* Tab Navigation - Text to Speech disabled temporarily */}
        <div className="bg-white rounded-t-2xl shadow-xl">
          <div className="flex border-b border-gray-200">
            <button
              className="flex-1 px-6 py-4 text-center font-medium rounded-t-2xl bg-blue-500 text-white border-b-2 border-blue-500"
            >
              🎤 Voice Translation
            </button>
            {/* Text to Speech tab temporarily disabled */}
            {/* 
            <button
              onClick={() => setActiveTab('text-to-speech')}
              className="flex-1 px-6 py-4 text-center font-medium bg-gray-200 text-gray-400 cursor-not-allowed"
              disabled
            >
              📝 Text to Speech (Coming Soon)
            </button>
            */}
          </div>
        </div>

        <div className="bg-white rounded-b-2xl shadow-xl p-8 space-y-8">
          {/* Voice Translation Tab - Only active tab */}
          <div>
            <>
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

          {/* Voice Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Audio Generation Mode
            </label>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  id="standard-mode"
                  name="voice-mode"
                  type="radio"
                  value="standard"
                  checked={voiceCloningMode === 'standard'}
                  onChange={(e) => setVoiceCloningMode(e.target.value)}
                  disabled={processing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="standard-mode" className="ml-3 block text-sm text-gray-700">
                  <span className="font-medium">Without Voice Clone</span>
                  <span className="text-gray-500 block text-xs">Standard text-to-speech</span>
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="cloning-mode"
                  name="voice-mode"
                  type="radio"
                  value="cloning"
                  checked={voiceCloningMode === 'cloning'}
                  onChange={(e) => setVoiceCloningMode(e.target.value)}
                  disabled={processing}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <label htmlFor="cloning-mode" className="ml-3 block text-sm text-gray-700">
                  <span className="font-medium">Voice Cloning</span>
                  <span className="text-gray-500 block text-xs">Clone your voice style (Default)</span>
                </label>
              </div>
            </div>
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
                    disabled={isPlayingAudio}
                    className={`inline-flex items-center px-6 py-3 font-semibold rounded-lg transition-colors duration-200 shadow-md ${
                      isPlayingAudio 
                        ? 'bg-green-500 text-white cursor-not-allowed' 
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {isPlayingAudio ? (
                      <>
                        <svg className="w-5 h-5 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-1.594-.471-3.076-1.343-4.243a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-.757 2.829 1 1 0 11-1.415-1.415A3.987 3.987 0 0014 12a3.987 3.987 0 00-.171-1.414 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                        Playing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play Audio
                      </>
                    )}
                  </button>
                </div>
              ) : audioGenerationFailed && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Audio Generation Failed</h3>
                  <p className="text-red-700">
                    ❌ {voiceCloningMode === 'cloning' 
                      ? 'Both voice cloning and text-to-speech (Sarvam TTS) services failed.' 
                      : 'Text-to-speech (Sarvam TTS) service failed.'
                    }<br />
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

          {/* Session History */}
          {sessionHistory.length > 0 && (
            <div className="mt-8 pt-8 border-t-2 border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Session History</h2>
                <button
                  onClick={clearHistory}
                  className="px-4 py-2 bg-red-400 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  Clear History
                </button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {sessionHistory.map((entry, index) => (
                  <div key={entry.id} className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="text-sm text-gray-500">
                        <span className="font-medium">#{sessionHistory.length - index}</span> • {entry.timestamp} • {entry.languageName} • {entry.voiceMode} mode
                      </div>
                      <div className="text-xs text-gray-400">
                        {getDisplaySourceName(entry.audioSource)}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Transcribed Text */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Original</h4>
                        <p className="text-sm text-gray-600">{entry.transcribedText}</p>
                      </div>
                      
                      {/* Translated Text */}
                      <div className="bg-green-50 rounded-lg p-3">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Translated</h4>
                        <p className="text-sm text-gray-600">{entry.translatedText}</p>
                      </div>
                      
                      {/* Audio Player */}
                      <div className="bg-purple-50 rounded-lg p-3 flex flex-col justify-center items-center">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">Audio</h4>
                        <button
                          onClick={() => playHistoryAudio(entry.generatedAudio, index)}
                          disabled={isPlayingAudio}
                          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                            playingHistoryIndex === index && isPlayingAudio
                              ? 'bg-green-500 text-white cursor-not-allowed'
                              : 'bg-purple-500 hover:bg-purple-600 text-white'
                          }`}
                        >
                          {playingHistoryIndex === index && isPlayingAudio ? (
                            <>
                              <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                              </svg>
                              Playing
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              Play
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
            </>
          </div>

          {/* Text to Speech Tab - Temporarily disabled */}
          {false && (
            <>
              {/* Language Selection for TTS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Audio Language
                </label>
                <select
                  value={ttsLanguage}
                  onChange={(e) => setTtsLanguage(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={ttsProcessing}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>



              {/* URL Input Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Extract Content from URL (News Articles, Blogs, etc.)
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={ttsProcessing}
                  />
                  <button
                    onClick={handleUrlExtraction}
                    disabled={ttsProcessing || !inputUrl.trim()}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    Extract
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Note: Some websites may block content extraction due to CORS policies. In such cases, please copy and paste the text manually.
                </p>
              </div>

              {/* Text Input Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Or Paste Your Text Here
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste your article, story, or any text you want to convert to speech..."
                  rows={8}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                  disabled={ttsProcessing}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-500">
                    Characters: {inputText.length} / 5000 (recommended limit)
                  </p>
                  <button
                    onClick={clearTtsStates}
                    className="text-sm text-gray-500 hover:text-gray-700"
                    disabled={ttsProcessing}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Generate Audio Button */}
              <div className="text-center">
                <button
                  onClick={() => {
                    // TTS functionality temporarily disabled
                    console.log('TTS functionality temporarily disabled');
                  }}
                  disabled={true}
                  className="inline-flex items-center px-8 py-4 bg-gray-300 text-gray-500 font-semibold rounded-full cursor-not-allowed"
                >
                  <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                  </svg>
                  {ttsProcessing ? 'Generating...' : 'Generate Audio'}
                </button>
              </div>

              {/* Processing Status */}
              {ttsProcessing && ttsCurrentStep && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="animate-spin h-5 w-5 text-blue-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-blue-700 font-medium">{ttsCurrentStep}</span>
                  </div>
                  
                  {useVoiceCloning && currentChunkIndex >= 0 && (
                    <div className="mt-3">
                      <div className="bg-white rounded-lg p-3">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Processing chunks:</span>
                          <span>{currentChunkIndex + 1} / {chunkText(inputText, 15).length}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${((currentChunkIndex + 1) / chunkText(inputText, 15).length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chunk Results Display */}
              {chunkResults.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Voice Cloning Results</h3>
                  {chunkResults.some(chunk => chunk.source.includes('Fallback')) && (
                    <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-2 mb-3">
                      <p className="text-sm text-yellow-700">
                        ⚠️ Some chunks used TTS fallback due to voice cloning connectivity issues
                      </p>
                    </div>
                  )}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {chunkResults.map((chunk, index) => (
                      <div key={chunk.chunkIndex} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">
                                Chunk {chunk.chunkIndex + 1}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                chunk.source.includes('VoiceClone') || chunk.source.includes('F5')
                                  ? 'bg-purple-100 text-purple-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {getDisplaySourceName(chunk.source)}
                              </span>
                              {chunk.processingTime !== 'fallback' && (
                                <span className="text-xs text-gray-500">
                                  {chunk.processingTime}ms
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{chunk.text}</p>
                          </div>
                          <button
                            onClick={() => playTtsAudio(chunk.audio, true, index)}
                            disabled={isPlayingTtsAudio}
                            className={`ml-3 inline-flex items-center px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                              playingTtsHistoryIndex === index && isPlayingTtsAudio
                                ? 'bg-green-500 text-white'
                                : 'bg-purple-500 hover:bg-purple-600 text-white'
                            }`}
                          >
                            {playingTtsHistoryIndex === index && isPlayingTtsAudio ? (
                              <>
                                <svg className="w-3 h-3 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                                </svg>
                                Playing
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Play
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Audio Player */}
              {ttsGeneratedAudio && (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Audio:</h3>
                  <button
                    onClick={() => playTtsAudio(ttsGeneratedAudio)}
                    disabled={isPlayingTtsAudio}
                    className={`inline-flex items-center px-6 py-3 font-semibold rounded-lg transition-colors duration-200 shadow-md ${
                      isPlayingTtsAudio 
                        ? 'bg-green-500 text-white cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isPlayingTtsAudio ? (
                      <>
                        <svg className="w-5 h-5 mr-2 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                        </svg>
                        Playing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play Audio
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* TTS History */}
              {ttsHistory.length > 0 && (
                <div className="mt-8 pt-8 border-t-2 border-gray-200">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Generated Audio History</h2>
                    <button
                      onClick={clearTtsHistory}
                      className="px-4 py-2 bg-red-400 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      Clear History
                    </button>
                  </div>
                  
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {ttsHistory.map((entry, index) => (
                      <div key={entry.id} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-sm text-gray-500">
                            <span className="font-medium">#{ttsHistory.length - index}</span> • {entry.timestamp} • {entry.languageName}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Text Content */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Text</h4>
                            <p className="text-sm text-gray-600">{entry.text}</p>
                          </div>
                          
                          {/* Audio Player */}
                          <div className="bg-green-50 rounded-lg p-3 flex flex-col justify-center items-center">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Audio</h4>
                            <button
                              onClick={() => playTtsAudio(entry.generatedAudio, true, index)}
                              disabled={isPlayingTtsAudio}
                              className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                playingTtsHistoryIndex === index && isPlayingTtsAudio
                                  ? 'bg-green-500 text-white cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white'
                              }`}
                            >
                              {playingTtsHistoryIndex === index && isPlayingTtsAudio ? (
                                <>
                                  <svg className="w-4 h-4 mr-1 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                                  </svg>
                                  Playing
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                  Play
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
