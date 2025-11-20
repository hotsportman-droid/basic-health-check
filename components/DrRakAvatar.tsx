
import React, { useState, useEffect, useRef } from 'react';
import { MicIcon, StopIcon } from './icons';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

// --- AUDIO HELPER FUNCTIONS ---
// These functions are required for processing audio data for the Live API.

// Decodes a base64 string into a Uint8Array.
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Encodes a Uint8Array into a base64 string.
function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decodes raw PCM audio data into an AudioBuffer for playback.
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Creates a Blob object for the Live API from microphone audio data.
function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}


// --- SUB COMPONENTS ---

const DrRakImage = ({ isSpeaking }: { isSpeaking: boolean }) => (
  <svg viewBox="0 0 400 400" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
     <defs>
      <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={isSpeaking ? '#a5b4fc' : '#E0E7FF'} />
        <stop offset="100%" stopColor={isSpeaking ? '#818cf8' : '#C7D2FE'} />
      </linearGradient>
    </defs>
    <circle cx="200" cy="200" r="195" fill="url(#bg-gradient)" stroke="#ffffff" strokeWidth="8" className="transition-all duration-300"/>
    <g transform="translate(0, 10)">
      <path d="M120 140 Q90 250 100 340 L300 340 Q310 250 280 140 Z" fill="#3E2723"/>
      <path d="M80 420 L90 340 Q90 300 140 290 L260 290 Q310 300 310 340 L320 420 Z" fill="#FFFFFF"/>
      <path d="M160 290 L200 340 L240 290 L240 310 Q200 350 160 310 Z" fill="#60A5FA"/>
      <path d="M170 230 L170 300 Q200 315 230 300 L230 230 Z" fill="#FFF0E6"/>
      <path d="M140 290 L200 370 L260 290 L280 330 L200 430 L120 330 Z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1"/>
      <path d="M135 150 Q135 270 200 270 Q265 270 265 150 Q265 70 200 70 Q135 70 135 150" fill="#FFF0E6"/>
      <circle cx="132" cy="190" r="10" fill="#EAC0B0"/>
      <circle cx="268" cy="190" r="10" fill="#EAC0B0"/>
      <path d="M200 60 Q110 60 110 190 C110 220 120 160 160 120 Q200 160 240 120 C280 160 290 220 290 190 Q290 60 200 60" fill="#3E2723"/>
      <path d="M155 165 Q170 155 185 165" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M215 165 Q230 155 245 165" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <g fill="#2D2424">
          <ellipse cx="170" cy="185" rx="11" ry="13" />
          <ellipse cx="230" cy="185" rx="11" ry="13" />
          <circle cx="173" cy="181" r="4" fill="white" opacity="0.9"/>
          <circle cx="233" cy="181" r="4" fill="white" opacity="0.9"/>
      </g>
      <path d="M200 205 Q198 215 202 218" stroke="#D69E8E" strokeWidth="2" fill="none" strokeLinecap="round"/>
      <path d="M185 240 Q200 250 215 240" stroke="#D84315" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M150 310 C150 370 250 370 250 310" stroke="#475569" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <circle cx="200" cy="370" r="14" fill="#94A3B8" stroke="#334155" strokeWidth="2"/>
    </g>
  </svg>
);

// --- MAIN COMPONENT ---
export const DrRakAvatar: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [statusText, setStatusText] = useState('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [transcript, setTranscript] = useState({ input: '', output: '' });

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const playbackQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const currentInputTranscriptRef = useRef('');
    const currentOutputTranscriptRef = useRef('');

    const stopAllProcesses = () => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(() => {});
            sessionPromiseRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if(audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
        }
        playbackQueueRef.current.forEach(source => source.stop());
        playbackQueueRef.current.clear();
        setIsSessionActive(false);
        setIsSpeaking(false);
        setStatusText('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
        setTranscript({ input: '', output: '' });
    };

    const handleToggleSystem = async () => {
        if (isSessionActive) {
            stopAllProcesses();
            return;
        }

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            setStatusText('กรุณาอนุญาตให้ใช้ไมโครโฟนค่ะ');
            return;
        }

        setIsSessionActive(true);
        setStatusText('กำลังเชื่อมต่อ...');
        currentInputTranscriptRef.current = '';
        currentOutputTranscriptRef.current = '';
        setTranscript({ input: '', output: '' });

        if (!inputAudioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            inputAudioContextRef.current = new AudioContext({ sampleRate: 16000 });
        }
        if (!outputAudioContextRef.current) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            outputAudioContextRef.current = new AudioContext({ sampleRate: 24000 });
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' }}},
                systemInstruction: 'คุณคือ "หมอรักษ์" ผู้ช่วย AI ที่มีความเห็นอกเห็นใจและเป็นมิตร พูดคุยกับผู้ใช้ด้วยความเป็นห่วงเป็นใย ตอบคำถามสั้นๆ และให้กำลังใจ ลงท้ายด้วย "ค่ะ" เสมอ เมื่อผู้ใช้บอกอาการเจ็บป่วย ให้แนะนำให้ใช้ฟังก์ชัน "วิเคราะห์อาการ" ในแอป',
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
            callbacks: {
                onopen: async () => {
                    setStatusText('เชื่อมต่อแล้ว พูดได้เลยค่ะ...');
                    streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const source = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current);
                    audioProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    
                    audioProcessorRef.current.onaudioprocess = (event) => {
                        const inputData = event.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    
                    source.connect(audioProcessorRef.current);
                    audioProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        currentInputTranscriptRef.current += message.serverContent.inputTranscription.text;
                        setTranscript(prev => ({ ...prev, input: currentInputTranscriptRef.current }));
                    }
                    if (message.serverContent?.outputTranscription) {
                        currentOutputTranscriptRef.current += message.serverContent.outputTranscription.text;
                        setTranscript(prev => ({ ...prev, output: currentOutputTranscriptRef.current }));
                    }

                    if (message.serverContent?.turnComplete) {
                        currentInputTranscriptRef.current = '';
                        currentOutputTranscriptRef.current = '';
                    }

                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData) {
                        setIsSpeaking(true);
                        const outputContext = outputAudioContextRef.current!;
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
                        
                        const audioBuffer = await decodeAudioData(decode(audioData), outputContext, 24000, 1);
                        const source = outputContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputContext.destination);

                        source.addEventListener('ended', () => {
                            playbackQueueRef.current.delete(source);
                            if (playbackQueueRef.current.size === 0) {
                                setIsSpeaking(false);
                            }
                        });

                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += audioBuffer.duration;
                        playbackQueueRef.current.add(source);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live API Error:', e);
                    setStatusText('เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
                    stopAllProcesses();
                },
                onclose: (e: CloseEvent) => {
                    stopAllProcesses();
                },
            },
        });
    };
    
    useEffect(() => {
        return () => stopAllProcesses();
    }, []);

    const displayTranscript = () => {
        if(transcript.output) return `หมอรักษ์: ${transcript.output}`;
        if(transcript.input) return `คุณ: ${transcript.input}`;
        return statusText;
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 w-32 h-32">
                <DrRakImage isSpeaking={isSpeaking} />
                {isSessionActive && !isSpeaking && (
                     <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin"></div>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">หมอรักษ์ชวนคุย</h3>
            <p className="text-slate-600 text-sm min-h-[40px] flex items-center justify-center px-4 break-words">
                {displayTranscript()}
            </p>
            <button
                onClick={handleToggleSystem}
                className={`mt-4 rounded-full flex items-center justify-center w-16 h-16 transition-all duration-300 shadow-lg ${
                    isSessionActive ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                }`}
                aria-label={isSessionActive ? "หยุดการสนทนา" : "เริ่มการสนทนา"}
            >
                {isSessionActive ? <StopIcon className="w-8 h-8"/> : <MicIcon className="w-8 h-8" />}
            </button>
        </div>
    );
};
