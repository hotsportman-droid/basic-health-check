
import React, { useState, useEffect, useRef } from 'react';
import { StethoscopeIcon, CheckCircleIcon, ExclamationIcon, SpeakerWaveIcon, MicIcon, StopIcon } from './icons';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types for Speech Recognition ---
// Use a type assertion to handle non-standard browser APIs
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

// --- UI HELPERS ---
const MarkdownContent = ({ text }: { text: string }) => {
    if (!text || text === '-') return <p className="text-slate-400 italic">ไม่มีข้อมูล</p>;
    return (
      <div className="space-y-2">
        {text.split('\n').map((line, i) => {
            const trimmed = line.trim();
            // Handle bullets: -, *, •
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
      <circle cx="100" cy="100" r="90" fill="#FCE7F3" className={`opacity-50 ${interactionState === 'listening_wake' || interactionState === 'listening_symptoms' || interactionState === 'speaking' ? 'animate-pulse' : ''}`} />
      <circle cx="100" cy="100" r="82" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="2" />
      
      {/* Female Doctor Illustration */}
      <g transform="translate(0, 10)">
        {/* Body/Coat */}
        <path d="M50,190 Q50,150 100,150 T150,190 V200 H50 Z" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M100,150 L100,200" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M85,150 L100,170 L115,150" fill="#FBCFE8" /> {/* Pink Blouse inner */}
        
        {/* Neck */}
        <path d="M90,120 L90,150 L110,150 L110,120 Z" fill="#FFDFC4" />
        
        {/* Hair (Back/Bun) */}
        <circle cx="100" cy="65" r="38" fill="#2D3748" /> 

        {/* Face Shape */}
        <path d="M70,65 Q70,135 100,135 Q130,135 130,65 Z" fill="#FFDFC4" /> {/* Soft chin */}
        <rect x="70" y="55" width="60" height="40" fill="#FFDFC4" /> {/* Forehead */}

        {/* Hair (Front/Bangs) */}
        <path d="M65,70 Q65,20 100,20 Q135,20 135,70 Q135,45 100,45 Q65,45 65,70 Z" fill="#2D3748" />
        
        {/* Ears */}
        <circle cx="68" cy="92" r="4" fill="#FFDFC4" />
        <circle cx="132" cy="92" r="4" fill="#FFDFC4" />
        
        {/* Glasses */}
        <g stroke="#334155" strokeWidth="2" fill="rgba(255,255,255,0.4)">
            <circle cx="84" cy="90" r="13" />
            <circle cx="116" cy="90" r="13" />
            <line x1="97" y1="90" x2="103" y2="90" strokeWidth="2" />
        </g>
        
        {/* Eyes & Lashes */}
        <circle cx="84" cy="90" r="3" fill="#1E293B" />
        <circle cx="116" cy="90" r="3" fill="#1E293B" />
        <path d="M76,84 Q84,80 92,84" fill="none" stroke="#1E293B" strokeWidth="1.5" />
        <path d="M108,84 Q116,80 124,84" fill="none" stroke="#1E293B" strokeWidth="1.5" />
        
        {/* Smile - Changes with state */}
        {interactionState === 'speaking' ? (
            <ellipse cx="100" cy="115" rx="10" ry="3" fill="#DB2777" />
        ) : (
            <path d="M90,115 Q100,120 110,115" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />
        )}
        
        {/* Stethoscope */}
        <path d="M138,165 Q150,165 150,130 Q150,110 135,110" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <path d="M62,165 Q50,165 50,130 Q50,110 65,110" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <circle cx="138" cy="170" r="7" fill="#CBD5E1" stroke="#475569" strokeWidth="2" />
      </g>
    </svg>
    
    {/* Mic / Status Button */}
    <button 
        onClick={onMicClick}
        className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center justify-center rounded-full p-2 shadow-md transition-all duration-300 z-20
            ${(interactionState === 'listening_wake' || interactionState === 'listening_symptoms') 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' 
                : 'bg-green-500 hover:bg-green-600'}
        `}
        title={(interactionState === 'listening_wake' || interactionState === 'listening_symptoms') ? 'หยุดฟัง' : 'กดเพื่อคุยกับหมอ'}
    >
        {(interactionState === 'listening_wake' || interactionState === 'listening_symptoms') ? (
            <div className="w-5 h-5 text-white flex items-center justify-center">
                 <div className="w-2 h-2 bg-white rounded-sm animate-ping absolute"></div>
                 <div className="w-2.5 h-2.5 bg-white rounded-sm relative"></div>
            </div>
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

type InteractionState = 'idle' | 'listening_wake' | 'processing_greeting' | 'speaking' | 'listening_symptoms' | 'processing_analysis';

export const DrRakAvatar: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [interactionState, setInteractionState] = useState<InteractionState>('idle');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);
    
    // Refs for controlling flow
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);

    // Initialize Speech Recognition
    useEffect(() => {
        if (SpeechRecognition) {
            const recognizer = new SpeechRecognition();
            recognizer.lang = 'th-TH';
            recognizer.continuous = false;
            recognizer.interimResults = false;

            recognizer.onstart = () => {
                isListeningRef.current = true;
            };

            recognizer.onend = () => {
                isListeningRef.current = false;
                // State management is handled in individual start functions
            };

            recognizer.onerror = (event: any) => {
                console.error("Speech error", event.error);
                if (interactionState !== 'idle' && event.error !== 'no-speech') {
                     setInteractionState('idle');
                     if (event.error === 'not-allowed') {
                        setError('กรุณาอนุญาตให้ใช้ไมโครโฟนเพื่อคุยกับหมอค่ะ');
                     }
                }
            };

            setRecognition(recognizer);
            recognitionRef.current = recognizer;
        }
    }, []);

    // Cleanup speech synthesis
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const speak = (text: string, onEndCallback?: () => void) => {
        window.speechSynthesis.cancel();
        if (!text) {
             if (onEndCallback) onEndCallback();
             return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;
        
        const voices = window.speechSynthesis.getVoices();
        // Try to find a Thai female voice or any Thai voice
        const thaiVoice = voices.find(v => v.lang.includes('th') && (v.name.includes('Somsri') || v.name.includes('Female')));
        if (thaiVoice) {
            utterance.voice = thaiVoice;
        } else {
             const anyThai = voices.find(v => v.lang.includes('th'));
             if (anyThai) utterance.voice = anyThai;
        }

        utterance.onstart = () => setInteractionState('speaking');
        utterance.onend = () => {
            if (onEndCallback) {
                // Small delay to ensure state clears before next action
                setTimeout(onEndCallback, 100);
            } else {
                setInteractionState('idle');
            }
        };
        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setInteractionState('idle');
            // Fallback: if TTS fails, still try to proceed if it was a chain
            if (onEndCallback) onEndCallback();
        };

        window.speechSynthesis.speak(utterance);
    };

    const startListeningForWakeWord = () => {
        if (!recognition) {
            setError('ขออภัยค่ะ อุปกรณ์ของคุณไม่รองรับการสั่งงานด้วยเสียง');
            return;
        }
        setError(null);
        setInteractionState('listening_wake');
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript.toLowerCase();
            console.log('Heard (Wake):', transcript);
            
            // More lenient wake word detection
            if (transcript.includes('สวัสดี') || transcript.includes('หมอ') || transcript.includes('หวัดดี') || transcript.includes('hello')) {
                handleGreeting();
            } else {
                // If wrong word, just stop or stay idle
                setInteractionState('idle');
                setError('หมอได้ยินไม่ชัด รบกวนพูดว่า "สวัสดีหมอรักษ์" ใหม่อีกครั้งนะคะ');
            }
        };
        
        recognition.onend = () => {
            // If state is still listening_wake, it means no result (or error) stopped it.
            // We reset to idle to let user press button again.
            if (interactionState === 'listening_wake') {
                 setInteractionState('idle');
            }
        };

        try {
            recognition.start();
        } catch (e) {
            // Already started
            recognition.stop();
        }
    };

    const startListeningForSymptoms = () => {
        if (!recognition) return;
        
        setInteractionState('listening_symptoms');
        setInputText(''); // Clear previous text

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            console.log('Heard (Symptoms):', transcript);
            setInputText(transcript);
            // Auto trigger analysis after getting text
            setTimeout(() => handleAnalyze(transcript), 500);
        };
        
        recognition.onend = () => {
            // If we didn't get result (silence), go back to idle
             if (inputText === '') setInteractionState('idle');
        };

        try {
            recognition.start();
        } catch (e) {
             recognition.stop();
             setTimeout(() => recognition.start(), 200);
        }
    };

    const handleMicClick = () => {
        if (interactionState === 'idle') {
            // "Prime" the speech synthesis engine for mobile browsers
            window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
            startListeningForWakeWord();
        } else if (interactionState === 'speaking') {
            window.speechSynthesis.cancel();
            setInteractionState('idle');
        } else {
            if (recognition) recognition.stop();
            setInteractionState('idle');
        }
    };

    const handleGreeting = async () => {
        setInteractionState('processing_greeting');
        
        // Fallback function if geolocation fails or times out
        const fallbackGreeting = () => {
             speak("สวัสดีค่ะเพื่อนหมอรักษ์ หมอไม่สามารถระบุตำแหน่งของคุณได้ แต่เพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ มีอาการอะไรบอกหมอได้เลยนะ", startListeningForSymptoms);
        };

        if (!navigator.geolocation) {
            fallbackGreeting();
            return;
        }

        // Wrap Geolocation in a Promise with Timeout
        const getPosition = new Promise<GeolocationPosition>((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error("Geolocation timeout"));
            }, 5000); // 5 seconds timeout

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clearTimeout(timeoutId);
                    resolve(pos);
                },
                (err) => {
                    clearTimeout(timeoutId);
                    reject(err);
                }
            );
        });

        try {
            const position = await getPosition;
            const { latitude, longitude } = position.coords;
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Explicit prompt to force Search Grounding usage
            const prompt = `
                Perform a Google Search to find the current weather and PM2.5 (Air Quality) at coordinates: Latitude ${latitude}, Longitude ${longitude}.
                
                Then, strictly act as "Dr. Rak" (a kind female doctor) and generate a spoken response in Thai.
                The response must follow this pattern:
                "สวัสดีค่ะเพื่อนหมอรักษ์ [Current Weather & PM2.5 Report]. เพื่อนหมอรักษ์ เป็นอย่างไรบ้างคะ"

                Keep it natural, caring, and short (under 3 sentences).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }] 
                }
            });
            
            const text = response.text;
            
            if (text) {
                // Speak greeting, then auto-listen for symptoms
                speak(text, () => {
                     startListeningForSymptoms();
                });
            } else {
                throw new Error("No response from AI");
            }

        } catch (e) {
            console.error("Greeting Error:", e);
            fallbackGreeting();
        }
    };

    const handleAnalyze = async (textToAnalyze?: string) => {
        const text = textToAnalyze || inputText;
        if (!text.trim()) return;

        setInteractionState('processing_analysis');
        setAnalysis(null);
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
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
                    }
                }
            });

            const resultText = response.text || "{}";
            let result;
            
            try {
                result = JSON.parse(resultText);
            } catch (e) {
                console.error("JSON Parse Error", e);
                throw new Error("Invalid JSON response");
            }

            const symptoms = result.symptoms || "-";
            const advice = result.advice || "-";
            const precautions = result.precautions || "-";
            const speechText = result.speech || "หมอได้รับข้อมูลแล้วค่ะ";

            setAnalysis({
                symptoms,
                advice,
                precautions,
                speechText
            });

            // Construct full speech for reading out loud
            // We strip markdown bullets for smoother speech
            const fullReadOut = `
                ${speechText}
                สำหรับอาการที่คุณเล่ามา. ${symptoms.replace(/[-*•]/g, '')}.
                หมอขอแนะนำดังนี้ค่ะ. ${advice.replace(/[-*•]/g, '')}.
                และข้อควรระวังคือ. ${precautions.replace(/[-*•]/g, '')}.
                ขอให้หายไวๆ นะคะ
            `;
            
            speak(fullReadOut);

        } catch (err) {
            console.error("AI Error:", err);
            setError("เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้งค่ะ");
            setInteractionState('idle');
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-xl border border-pink-50 p-6 md:p-8 flex flex-col items-center text-center max-w-3xl mx-auto relative overflow-hidden transition-all hover:shadow-2xl">
            {/* Top Gradient Decoration */}
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-pink-400 via-rose-400 to-indigo-400"></div>
            
            <div className="w-full max-w-2xl z-10">
                {/* Avatar Section with Interactive Mic */}
                <DrRakImage onMicClick={handleMicClick} interactionState={interactionState} />

                {/* Header / Status Text */}
                <div className="mb-8">
                    <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">ปรึกษาหมอรักษ์</h3>
                    <p className={`text-base transition-colors duration-300 mt-2
                        ${(interactionState === 'listening_wake' || interactionState === 'listening_symptoms') ? 'text-pink-600 font-bold animate-pulse' : 
                          'text-slate-500'}`
                    }>
                        {interactionState === 'listening_wake' && "กำลังฟัง... พูดว่า 'สวัสดีหมอรักษ์'"}
                        {interactionState === 'processing_greeting' && "หมอกำลังตรวจสอบสภาพอากาศ..."}
                        {interactionState === 'listening_symptoms' && "กำลังฟังอาการของคุณ..."}
                        {interactionState === 'processing_analysis' && "หมอกำลังวิเคราะห์อาการ..."}
                        {interactionState === 'speaking' && "หมอกำลังพูด..."}
                        {interactionState === 'idle' && "กดปุ่มไมค์ แล้วพูดว่า \"สวัสดีหมอรักษ์\" หรือพิมพ์อาการได้เลยค่ะ"}
                    </p>
                </div>

                {/* Input & Action */}
                <div className="text-left space-y-5">
                    <div className="relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="พิมพ์อาการของคุณที่นี่... เช่น ปวดหัวข้างเดียว ตุ้บๆ แพ้แสง มา 2 วันแล้ว..."
                            className="w-full p-5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:border-pink-400 focus:ring-4 focus:ring-pink-100 text-slate-700 resize-none transition-all h-36 text-base shadow-inner placeholder-slate-400"
                            disabled={interactionState === 'processing_analysis' || interactionState === 'processing_greeting' || interactionState === 'listening_symptoms'}
                        />
                        {interactionState === 'listening_symptoms' && (
                            <div className="absolute bottom-3 left-3 flex items-center text-pink-500 text-xs animate-pulse font-bold bg-white/80 px-2 py-1 rounded-lg shadow-sm">
                                <MicIcon className="w-4 h-4 mr-1" /> กำลังบันทึกเสียง...
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={() => handleAnalyze()}
                        disabled={interactionState === 'processing_analysis' || !inputText.trim()}
                        className={`w-full py-3.5 px-6 rounded-xl font-bold text-white text-lg transition-all transform active:scale-[0.98] flex items-center justify-center shadow-lg
                            ${interactionState === 'processing_analysis' || !inputText.trim() 
                                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                : 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 hover:shadow-pink-200'
                            }`}
                    >
                        {interactionState === 'processing_analysis' ? (
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

            {/* Analysis Results */}
            {analysis && (
                <div className="mt-10 w-full text-left animate-fade-in border-t border-slate-100 pt-8">
                    {/* Speech Bubble */}
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
                        {/* Symptoms Card */}
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

                        {/* Advice Card */}
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

                        {/* Precautions Card */}
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
