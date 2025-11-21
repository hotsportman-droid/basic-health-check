import React, { useState, useEffect, useRef } from 'react';
import { StethoscopeIcon, CheckCircleIcon, ExclamationIcon, SpeakerWaveIcon, MicIcon, StopIcon, VolumeOffIcon } from './icons';
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";

// --- Types for Speech Recognition ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// --- UI HELPERS ---
const MarkdownContent = ({ text }: { text: string }) => {
    if (!text || text === '-') return <p className="text-slate-400 italic">ไม่มีข้อมูล</p>;
    return (
      <div className="space-y-2">
        {text.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('-') || trimmed.startsWith('*') || trimmed.startsWith('•')) {
                return (
                    <div key={i} className="flex items-start">
                        <span className="mr-2 text-pink-500 mt-1.5">•</span>
                        <p className="flex-1 leading-relaxed">{trimmed.replace(/^[-*•]\s*/, '')}</p>
                    </div>
                );
            }
            if (trimmed) return <p key={i} className="leading-relaxed">{trimmed}</p>;
            return null;
        })}
      </div>
    );
};

const DrRakImage = ({ onMicClick, interactionState }: { onMicClick: () => void, interactionState: string }) => (
  <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 group">
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl filter transition-transform duration-500 transform group-hover:scale-105">
      {/* Background Aura */}
      <circle cx="100" cy="100" r="90" fill={interactionState === 'waitingForWakeWord' ? '#E0E7FF' : '#FCE7F3'} className={`opacity-70 transition-colors duration-500 ${interactionState === 'listening' || interactionState === 'speaking' || interactionState === 'waitingForWakeWord' ? 'animate-pulse' : ''}`} />
      <circle cx="100" cy="100" r="82" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="2" />
      
      {/* Female Doctor Illustration */}
      <g transform="translate(0, 10)">
        <path d="M50,190 Q50,150 100,150 T150,190 V200 H50 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M100,150 L100,200" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M85,150 L100,170 L115,150" fill="#FBCFE8" />
        <path d="M90,120 L90,150 L110,150 L110,120 Z" fill="#FFDFC4" />
        <circle cx="100" cy="65" r="38" fill="#2D3748" />
        <path d="M70,65 Q70,135 100,135 Q130,135 130,65 Z" fill="#FFDFC4" />
        <rect x="70" y="55" width="60" height="40" fill="#FFDFC4" />
        <path d="M65,70 Q65,20 100,20 Q135,20 135,70 Q135,45 100,45 Q65,45 65,70 Z" fill="#2D3748" />
        <circle cx="68" cy="92" r="4" fill="#FFDFC4" />
        <circle cx="132" cy="92" r="4" fill="#FFDFC4" />
        <g stroke="#334155" strokeWidth="2" fill="rgba(255,255,255,0.4)">
            <circle cx="84" cy="90" r="13" />
            <circle cx="116" cy="90" r="13" />
            <line x1="97" y1="90" x2="103" y2="90" strokeWidth="2" />
        </g>
        <circle cx="84" cy="90" r="3" fill="#1E293B" />
        <circle cx="116" cy="90" r="3" fill="#1E293B" />
        <path d="M76,84 Q84,80 92,84" fill="none" stroke="#1E293B" strokeWidth="1.5" />
        <path d="M108,84 Q116,80 124,84" fill="none" stroke="#1E293B" strokeWidth="1.5" />
        {interactionState === 'speaking' ? (
            <ellipse cx="100" cy="115" rx="10" ry="3" fill="#DB2777" />
        ) : (
            <path d="M90,115 Q100,120 110,115" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />
        )}
        <path d="M138,165 Q150,165 150,130 Q150,110 135,110" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <path d="M62,165 Q50,165 50,130 Q50,110 65,110" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <circle cx="138" cy="170" r="7" fill="#CBD5E1" stroke="#475569" strokeWidth="2" />
      </g>
    </svg>
    
    <button 
        onClick={onMicClick}
        className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center justify-center rounded-full p-2.5 shadow-md transition-all duration-300 z-20
            ${interactionState === 'listening' 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
                : interactionState === 'waitingForWakeWord'
                ? 'bg-blue-500 hover:bg-blue-600 scale-110'
                : 'bg-indigo-600 hover:bg-indigo-700'}
        `}
        aria-label={interactionState === 'listening' ? 'หยุดฟัง' : 'กดเพื่อเริ่มบอกอาการ'}
    >
        {interactionState === 'listening' ? (
            <StopIcon className="w-5 h-5 text-white" />
        ) : (
            <MicIcon className="w-5 h-5 text-white" />
        )}
    </button>
  </div>
);

interface AnalysisResult {
    symptoms: string;
    advice: string;
    precautions: string;
    speechText: string;
}

type InteractionState = 'idle' | 'waitingForWakeWord' | 'listening' | 'processing' | 'speaking';

export const DrRakAvatar: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [interactionState, setInteractionState] = useState<InteractionState>('idle');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const [isMuted, setIsMuted] = useState(false);
    const isMutedRef = useRef(isMuted);

    const recognitionRef = useRef<any>(null);
    const silenceTimeoutRef = useRef<number | null>(null);
    const interactionStateRef = useRef(interactionState);
    const wakeWordDetectedRef = useRef(false);

    useEffect(() => {
        isMutedRef.current = isMuted;
        if (isMuted) {
            window.speechSynthesis.cancel();
            if (interactionState === 'speaking') {
                setInteractionState('idle');
            }
        }
    }, [isMuted]);

    useEffect(() => {
        interactionStateRef.current = interactionState;
    }, [interactionState]);


    const speak = (text: string, onEndCallback?: () => void) => {
        window.speechSynthesis.cancel();
        if (!text || isMutedRef.current) {
             if (onEndCallback) onEndCallback();
             return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang.includes('th-TH'));
        if (thaiVoice) utterance.voice = thaiVoice;

        utterance.onstart = () => setInteractionState('speaking');
        utterance.onend = () => {
            if (interactionStateRef.current === 'speaking') { // Ensure we don't idle prematurely
                setInteractionState('idle');
            }
            if (onEndCallback) onEndCallback();
        };
        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setInteractionState('idle');
            if (onEndCallback) onEndCallback();
        };

        window.speechSynthesis.speak(utterance);
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
            silenceTimeoutRef.current = null;
        }
        if (interactionStateRef.current !== 'speaking') {
            setInteractionState('idle');
        }
    };

    useEffect(() => {
        if (!SpeechRecognition) {
            console.warn("Speech Recognition not supported by this browser.");
            return;
        }

        const recognizer = new SpeechRecognition();
        recognizer.lang = 'th-TH';
        recognizer.continuous = true;
        recognizer.interimResults = true;

        recognizer.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }

            if (interactionStateRef.current === 'waitingForWakeWord' && finalTranscript.includes('หมอ')) {
                wakeWordDetectedRef.current = true;
                recognitionRef.current.stop();
                return;
            }

            if (interactionStateRef.current === 'listening') {
                if (finalTranscript) {
                    setInputText(prev => (prev ? prev + ' ' : '') + finalTranscript);
                }
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = window.setTimeout(() => {
                    stopListening();
                }, 3000);
            }
        };

        recognizer.onerror = (event: any) => {
            console.error("Speech error", event.error);
            wakeWordDetectedRef.current = false;
            setInteractionState('idle');
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setError('กรุณาอนุญาตให้ใช้ไมโครโฟนเพื่อคุยกับหมอค่ะ');
            } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
                setError('เกิดข้อผิดพลาดในการรับเสียง กรุณาลองอีกครั้ง');
            }
        };

        recognizer.onend = () => {
            if (wakeWordDetectedRef.current) {
                wakeWordDetectedRef.current = false; // Reset flag
                
                const GREETINGS = [
                    "สวัสดีค่ะ หมอรักษ์ยินดีให้คำปรึกษาค่ะ เล่าอาการให้หมอฟังได้เลยนะคะ",
                    "ได้ยินแล้วค่ะ วันนี้มีอาการอะไรให้หมอช่วยดูเป็นพิเศษไหมคะ",
                    "สวัสดีค่ะ ไม่ต้องกังวลนะคะ เล่าอาการที่เป็นอยู่ให้หมอฟังช้าๆ ได้เลยค่ะ",
                    "ค่ะ หมออยู่นี่แล้ว มีอะไรให้ช่วยคะ เล่าอาการมาได้เลย"
                ];
                const randomGreeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];

                speak(randomGreeting, () => {
                    setInputText('');
                    setInteractionState('listening');
                    setTimeout(() => recognitionRef.current.start(), 100);
                });
            } else if (interactionStateRef.current === 'waitingForWakeWord' || interactionStateRef.current === 'listening') {
                setInteractionState('idle');
            }
        };

        recognitionRef.current = recognizer;
        
        return () => {
            recognitionRef.current?.abort();
            window.speechSynthesis.cancel();
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        };
    }, []);

    const handleMicClick = () => {
        setError(null);
        if (interactionState === 'listening' || interactionState === 'waitingForWakeWord') {
            stopListening();
        } else {
            if (recognitionRef.current) {
                setInputText('');
                setAnalysis(null);
                setInteractionState('waitingForWakeWord');
                recognitionRef.current.start();
            } else {
                setError('ขออภัยค่ะ อุปกรณ์ของคุณไม่รองรับการสั่งงานด้วยเสียง');
            }
        }
    };
    
    const handleAnalyze = async () => {
        if (!inputText.trim()) {
            setError("กรุณาบอกอาการก่อนนะคะ");
            return;
        }

        if (!process.env.API_KEY) {
            setError("ไม่พบ API Key! กรุณาตั้งค่า Environment Variable ชื่อ 'API_KEY' ใน Vercel หรือไฟล์ .env");
            return;
        }

        setInteractionState('processing');
        setAnalysis(null);
        setError(null);

        const delayPromise = new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const apiPromise = ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: inputText,
                config: {
                    systemInstruction: `คุณคือ "หมอรักษ์" แพทย์หญิงผู้ช่วย AI ที่มีความเชี่ยวชาญสูง
                    - บุคลิก: สุภาพ อ่อนโยน มีความเห็นอกเห็นใจ
                    - ภาษา: แทนตัวเองว่า "หมอ" ลงท้าย "คะ/ค่ะ"
                    - หน้าที่: ให้คำแนะนำสุขภาพเบื้องต้น (ห้ามวินิจฉัยโรค/จ่ายยา)
                    `,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            speech: { type: Type.STRING, description: "ข้อความพูดสรุปสั้นๆ ให้กำลังใจ (1-2 ประโยค)" },
                            symptoms: { type: Type.STRING, description: "สรุปอาการที่จับใจความได้ พร้อมสาเหตุที่เป็นไปได้ (ใช้ bullet points)" },
                            advice: { type: Type.STRING, description: "คำแนะนำการดูแลตัวเอง (ใช้ bullet points)" },
                            precautions: { type: Type.STRING, description: "ข้อควรระวังหรือสัญญาณอันตรายที่ต้องไปพบแพทย์" }
                        },
                        required: ["speech", "symptoms", "advice", "precautions"]
                    },
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
                    ]
                }
            });

            const [_, response] = await Promise.all([delayPromise, apiPromise]);

            let resultText = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}";
            
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1) throw new Error("Invalid JSON format from AI");
            resultText = resultText.substring(firstBrace, lastBrace + 1);

            const result = JSON.parse(resultText);

            const analysisResult: AnalysisResult = {
                symptoms: result.symptoms || "-",
                advice: result.advice || "-",
                precautions: result.precautions || "-",
                speechText: result.speech || "หมอได้รับข้อมูลแล้วค่ะ"
            };
            setAnalysis(analysisResult);

            const fullReadOut = `${analysisResult.speechText} จากอาการที่คุณเล่ามา ${analysisResult.symptoms.replace(/[-*•]/g, '')} หมอขอแนะนำดังนี้ค่ะ ${analysisResult.advice.replace(/[-*•]/g, '')} และข้อควรระวังคือ ${analysisResult.precautions.replace(/[-*•]/g, '')} ขอให้หายไวๆ นะคะ`;
            speak(fullReadOut);

        } catch (err: any) {
            console.error("AI Error:", err);
            let errorMessage = "เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้งค่ะ";
            if (err.message?.includes('API Key')) errorMessage = "ไม่พบ API Key หรือการตั้งค่าผิดพลาด";
            else if (err.message?.includes('SAFETY')) errorMessage = "เนื้อหาคำถามอาจขัดต่อนโยบายความปลอดภัย";
            else if (err.message?.includes('JSON')) errorMessage = "เกิดข้อผิดพลาดในการอ่านข้อมูลจาก AI";
            
            setError(errorMessage);
            setInteractionState('idle');
        }
    };

    const getStatusText = () => {
        switch (interactionState) {
            case 'waitingForWakeWord':
                return "พร้อมรับฟัง... กรุณาเรียก 'หมอ' เพื่อเริ่มสนทนาค่ะ";
            case 'listening':
                return "กำลังฟัง... เล่าอาการได้เลยค่ะ (จะหยุดอัตโนมัติเมื่อเงียบ)";
            case 'processing':
                return "หมอกำลังวิเคราะห์อาการ...";
            case 'speaking':
                return "หมอกำลังพูด...";
            default:
                return "กดปุ่มไมค์เพื่อเริ่มบอกอาการ หรือพิมพ์ได้เลยค่ะ";
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-pink-50 p-6 md:p-8 flex flex-col items-center text-center max-w-3xl mx-auto relative overflow-hidden transition-all hover:shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-pink-400 via-rose-400 to-indigo-400"></div>
            
            <button
                onClick={() => setIsMuted(!isMuted)}
                className="absolute top-4 right-4 z-20 p-2 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-pink-500 transition-colors border border-slate-100 shadow-sm"
                title={isMuted ? "เปิดเสียงอ่าน" : "ปิดเสียงอ่าน"}
            >
                {isMuted ? <VolumeOffIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
            </button>

            <div className="w-full max-w-2xl z-10">
                <DrRakImage onMicClick={handleMicClick} interactionState={interactionState} />

                <div className="mb-8">
                    <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">ปรึกษาหมอรักษ์</h3>
                    <p className={`text-base transition-colors duration-300 mt-2 min-h-[24px]
                        ${interactionState === 'listening' || interactionState === 'waitingForWakeWord' || interactionState === 'speaking' ? 'text-pink-600 font-semibold' : 'text-slate-500'}`
                    }>
                       {getStatusText()}
                    </p>
                </div>

                <div className="text-left space-y-5">
                    <div className="relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="พิมพ์อาการของคุณที่นี่... เช่น ปวดหัวข้างเดียว ตุ้บๆ แพ้แสง มา 2 วันแล้ว..."
                            className="w-full p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-slate-700 resize-none transition-all h-36 text-base shadow-inner placeholder-slate-400"
                            disabled={interactionState !== 'idle'}
                        />
                        {(interactionState === 'listening' || interactionState === 'waitingForWakeWord') && (
                            <div className="absolute bottom-3 left-3 flex items-center text-pink-500 text-xs animate-pulse font-bold bg-white/80 px-2 py-1 rounded-lg shadow-sm">
                                <MicIcon className="w-4 h-4 mr-1" /> กำลังบันทึกเสียง...
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={handleAnalyze}
                        disabled={interactionState !== 'idle' || !inputText.trim()}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-lg transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg
                            ${interactionState !== 'idle' || !inputText.trim() 
                                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 hover:shadow-pink-200'
                            }`}
                    >
                        {interactionState === 'processing' ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                กำลังวิเคราะห์ข้อมูล...
                            </>
                        ) : (
                            <>
                                <StethoscopeIcon className="w-6 h-6 mr-2" />
                                วิเคราะห์อาการ
                            </>
                        )}
                    </button>
                    
                    {error && (
                        <div className="animate-fade-in p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start text-red-800 shadow-sm">
                            <ExclamationIcon className="w-6 h-6 mr-3 shrink-0 text-red-600 mt-0.5" />
                            <span className="text-sm font-medium leading-relaxed">{error}</span>
                        </div>
                    )}
                </div>
            </div>

            {analysis && (
                <div className="mt-10 w-full text-left animate-fade-in border-t border-slate-100 pt-8">
                    <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-5 rounded-2xl relative mb-6 shadow-sm border border-pink-100">
                         <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start">
                                <div className="shrink-0 mr-3 mt-1 bg-white p-1.5 rounded-full shadow-sm">
                                    {interactionState === 'speaking' ? 
                                        <SpeakerWaveIcon className="w-5 h-5 text-pink-500 animate-pulse"/> : 
                                        <span className="text-xl">👩‍⚕️</span>
                                    }
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-pink-400 uppercase tracking-wide mb-1">หมอรักษ์พูดว่า:</p>
                                    <p className="text-pink-900 text-base leading-relaxed font-medium">
                                        "{analysis.speechText}"
                                    </p>
                                </div>
                            </div>
                         </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-1">
                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-4 pb-3 border-b border-slate-100">
                                <div className="p-2.5 bg-blue-100 rounded-xl text-blue-600 mr-4">
                                    <StethoscopeIcon className="w-6 h-6" />
                                </div>
                                <h5 className="font-bold text-lg text-slate-800">วิเคราะห์อาการเบื้องต้น</h5>
                            </div>
                            <div className="text-slate-600 text-base pl-2">
                                <MarkdownContent text={analysis.symptoms} />
                            </div>
                        </div>

                        <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-4 pb-3 border-b border-emerald-100/50">
                                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 mr-4">
                                    <CheckCircleIcon className="w-6 h-6" />
                                </div>
                                <h5 className="font-bold text-lg text-emerald-800">คำแนะนำการดูแลตัวเอง</h5>
                            </div>
                            <div className="text-slate-700 text-base pl-2">
                                <MarkdownContent text={analysis.advice} />
                            </div>
                        </div>

                        <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-4 pb-3 border-b border-amber-100/50">
                                <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600 mr-4">
                                    <ExclamationIcon className="w-6 h-6" />
                                </div>
                                <h5 className="font-bold text-lg text-amber-800">ข้อควรระวัง / สัญญาณอันตราย</h5>
                            </div>
                            <div className="text-slate-700 text-base pl-2">
                                <MarkdownContent text={analysis.precautions} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
