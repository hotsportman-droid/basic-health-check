
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicIcon, StopIcon, StethoscopeIcon, CheckCircleIcon, ExclamationIcon } from './icons';
import { GoogleGenAI, Modality, Type } from "@google/genai";
import type { LiveServerMessage, FunctionDeclaration } from "@google/genai";

// --- TYPES ---
interface AnalysisData {
  symptoms: string;
  advice: string;
  precautions: string;
}

// --- AUDIO HELPERS ---
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  return {
    data: base64,
    mimeType: 'audio/pcm;rate=16000',
  };
}

function decodeAudio(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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

// --- UI HELPERS ---
const MarkdownContent = ({ text }: { text: string }) => {
    if (!text) return <p className="text-slate-400 italic">ไม่มีข้อมูล</p>;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
             const content = cleanLine.replace(/^[\-\*]\s?/, '');
             currentList.push(<li key={`li-${idx}`} className="mb-1">{content}</li>);
        } else {
             if (currentList.length > 0) {
                 elements.push(<ul key={`ul-${idx}`} className="list-disc pl-5 mb-3 space-y-1">{[...currentList]}</ul>);
                 currentList = [];
             }
             elements.push(<p key={`p-${idx}`} className="mb-2">{cleanLine}</p>);
        }
    });
    if (currentList.length > 0) {
        elements.push(<ul key={`ul-end`} className="list-disc pl-5 mb-3 space-y-1">{[...currentList]}</ul>);
    }
    return <>{elements}</>;
};

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
      {/* Animated mouth for speaking */}
      {isSpeaking && (
        <ellipse cx="200" cy="250" rx="10" ry="5" fill="#D84315" opacity="0.6" className="animate-pulse" />
      )}
    </g>
  </svg>
);

const analysisTool: FunctionDeclaration = {
  name: 'updateAnalysis',
  parameters: {
    type: Type.OBJECT,
    properties: {
      symptoms: { type: Type.STRING, description: "List of symptoms detected from user's description" },
      advice: { type: Type.STRING, description: "Initial health advice based on symptoms" },
      precautions: { type: Type.STRING, description: "Warning signs or precautions to take" }
    },
    required: ['symptoms', 'advice', 'precautions']
  }
};

export const DrRakAvatar: React.FC = () => {
    const [isConnected, setIsConnected] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisData | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const nextStartTimeRef = useRef<number>(0);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<any>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const disconnect = useCallback(() => {
      if (sessionRef.current) {
        // We cannot explicitly close the session object in the current SDK version easily if not exposed,
        // but we can stop our processing.
        sessionRef.current = null;
      }
      
      if (inputAudioContextRef.current) {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
      }
      
      if (outputAudioContextRef.current) {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
      }
      
      sourcesRef.current.forEach(source => source.stop());
      sourcesRef.current.clear();
      
      setIsConnected(false);
      setIsSpeaking(false);
      nextStartTimeRef.current = 0;
    }, []);

    const connect = async () => {
      setError(null);
      setAnalysisResult(null);

      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Setup Audio Contexts
        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;

        // Get Microphone Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Connect to Live API
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setIsConnected(true);
              
              // Setup Audio Input Processing
              const source = inputCtx.createMediaStreamSource(stream);
              const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                
                sessionPromise.then((session) => {
                  if (isConnected) { // Double check connection state
                    session.sendRealtimeInput({ media: pcmBlob });
                  }
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputCtx.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Tool Calls
              if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                  if (fc.name === 'updateAnalysis') {
                    const args = fc.args as unknown as AnalysisData;
                    setAnalysisResult(args);
                    
                    // Send success response
                    sessionPromise.then((session) => {
                       session.sendToolResponse({
                        functionResponses: {
                          id: fc.id,
                          name: fc.name,
                          response: { result: "Analysis updated on screen." }
                        }
                       });
                    });
                  }
                }
              }

              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && outputCtx) {
                setIsSpeaking(true);
                
                // Sync timing
                const currentTime = outputCtx.currentTime;
                let startTime = nextStartTimeRef.current;
                if (startTime < currentTime) startTime = currentTime;
                
                const audioBuffer = await decodeAudioData(
                  decodeAudio(base64Audio),
                  outputCtx,
                  24000,
                  1
                );
                
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                   if (sourcesRef.current.size === 0) {
                     setIsSpeaking(false);
                   }
                });
                
                source.start(startTime);
                nextStartTimeRef.current = startTime + audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              // Handle Interruption
              if (message.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
                 setIsSpeaking(false);
              }
            },
            onclose: () => {
              disconnect();
            },
            onerror: (err) => {
              console.error("Live API Error:", err);
              setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
              disconnect();
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: `คุณคือ "หมอรักษ์" แพทย์ผู้ช่วย AI
            - หน้าที่: รับฟังอาการและให้คำแนะนำสุขภาพเบื้องต้นด้วยน้ำเสียงที่อบอุ่นและเป็นกันเอง
            - การตอบโต้: 
              1. หากผู้ใช้ปรึกษาอาการป่วย: คุณต้องเรียกใช้เครื่องมือ 'updateAnalysis' เพื่อแสดงข้อมูลบนหน้าจอ และพูดสรุปคำแนะนำสั้นๆ ให้กำลังใจผู้ป่วย ไม่ต้องอ่านรายละเอียดทั้งหมดในเครื่องมือ
              2. หากเป็นการพูดคุยทั่วไป: พูดคุยโต้ตอบตามปกติ
            - ห้ามวินิจฉัยโรคหรือสั่งยาเด็ดขาด ให้แนะนำพบแพทย์หากอาการรุนแรง`,
            tools: [{ functionDeclarations: [analysisTool] }]
          }
        });
        
        sessionRef.current = sessionPromise;

      } catch (e: any) {
        console.error("Connection failed", e);
        setError("ไม่สามารถเข้าถึงไมโครโฟนหรือเชื่อมต่อได้");
        disconnect();
      }
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        disconnect();
      };
    }, [disconnect]);

    const toggleConnection = () => {
      if (isConnected) {
        disconnect();
      } else {
        connect();
      }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 p-6 flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="relative mb-4 w-32 h-32">
                <DrRakImage isSpeaking={isSpeaking} />
                {isConnected && !isSpeaking && (
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin opacity-30"></div>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">หมอรักษ์ (Live)</h3>
            <p className="text-slate-600 text-sm min-h-[24px] mb-4">
                {error ? <span className="text-red-500">{error}</span> : 
                 isConnected ? (isSpeaking ? "กำลังพูด..." : "กำลังฟังคุณอยู่ค่ะ...") : 
                 "แตะปุ่มไมค์เพื่อเริ่มสนทนาสด"}
            </p>

            <button
                onClick={toggleConnection}
                className={`rounded-full flex items-center justify-center w-16 h-16 transition-all duration-300 shadow-lg transform hover:scale-105 ${
                    isConnected ? 'bg-red-500 text-white shadow-red-200' : 'bg-indigo-600 text-white shadow-indigo-200'
                }`}
                aria-label={isConnected ? "วางสาย" : "เริ่มสนทนา"}
            >
                {isConnected ? <StopIcon className="w-8 h-8"/> : <MicIcon className="w-8 h-8" />}
            </button>

            {analysisResult && (
                <div className="mt-8 w-full text-left animate-fade-in space-y-4">
                    <div className="flex items-center justify-center mb-2">
                         <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                            ผลการวิเคราะห์ล่าสุด
                         </span>
                    </div>
                    
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                                <StethoscopeIcon className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-blue-800 text-lg">อาการที่ตรวจพบ</h5>
                        </div>
                        <div className="text-slate-700 leading-relaxed pl-1 text-sm">
                            <MarkdownContent text={analysisResult.symptoms} />
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-xl p-5 border border-green-100 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600 mr-3">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-green-800 text-lg">คำแนะนำเบื้องต้น</h5>
                        </div>
                        <div className="text-slate-700 leading-relaxed pl-1 text-sm">
                            <MarkdownContent text={analysisResult.advice} />
                        </div>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-100 shadow-sm">
                        <div className="flex items-center mb-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                                <ExclamationIcon className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-amber-800 text-lg">ข้อควรระวัง</h5>
                        </div>
                        <div className="text-slate-700 leading-relaxed pl-1 text-sm">
                            <MarkdownContent text={analysisResult.precautions} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
