
import React, { useState, useEffect, useRef } from 'react';
import { MicIcon } from './icons';
import { GoogleGenAI } from '@google/genai';

// --- TYPES ---
interface WeatherData {
    temperature: number;
    weather: string;
    pm25: number;
}

// --- CONSTANTS ---
// Weather code mapping (simplified for user)
const weatherCodeMap: { [key: number]: string } = {
    0: 'ท้องฟ้าแจ่มใส',
    1: 'มีเมฆเล็กน้อย',
    2: 'มีเมฆเป็นส่วนมาก',
    3: 'มีเมฆครึ้ม',
    45: 'มีหมอก',
    48: 'มีหมอก',
    51: 'มีฝนตกปรอยๆ',
    53: 'มีฝนตกปรอยๆ',
    55: 'มีฝนตกปรอยๆ',
    61: 'มีฝนตก',
    63: 'มีฝนตก',
    65: 'มีฝนตกหนัก',
    80: 'มีฝนฟ้าคะนอง',
    81: 'มีฝนฟ้าคะนอง',
    82: 'มีฝนฟ้าคะนองรุนแรง',
    95: 'มีพายุฝนฟ้าคะนอง',
    96: 'มีพายุฝนฟ้าคะนอง',
    99: 'มีพายุฝนฟ้าคะนอง'
};

// --- SUB COMPONENTS ---

const DrRakImage = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="skin-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#FFF0E6" />
        <stop offset="100%" stopColor="#EAC0B0" />
      </linearGradient>
      <linearGradient id="hair-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
        <stop offset="0%" stopColor="#3E2723" />
        <stop offset="100%" stopColor="#1A100E" />
      </linearGradient>
      <linearGradient id="bg-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#E0E7FF" />
        <stop offset="100%" stopColor="#C7D2FE" />
      </linearGradient>
      <filter id="soft-glow">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    {/* Background */}
    <circle cx="200" cy="200" r="195" fill="url(#bg-gradient)" stroke="#ffffff" strokeWidth="8"/>

    {/* Hair Back */}
    <path d="M120 140 Q90 250 100 340 L300 340 Q310 250 280 140 Z" fill="url(#hair-gradient)"/>

    {/* Shoulders & Coat */}
    <path d="M80 420 L90 340 Q90 300 140 290 L260 290 Q310 300 310 340 L320 420 Z" fill="#FFFFFF"/>
    
    {/* Inner Blue Shirt */}
    <path d="M160 290 L200 340 L240 290 L240 310 Q200 350 160 310 Z" fill="#60A5FA"/>
    
    {/* Neck */}
    <path d="M170 230 L170 300 Q200 315 230 300 L230 230 Z" fill="url(#skin-gradient)"/>

    {/* Coat Lapels */}
    <path d="M140 290 L200 370 L260 290 L280 330 L200 430 L120 330 Z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1"/>

    {/* Face Shape */}
    <path d="M135 150 Q135 270 200 270 Q265 270 265 150 Q265 70 200 70 Q135 70 135 150" fill="url(#skin-gradient)"/>

    {/* Ears */}
    <circle cx="132" cy="190" r="10" fill="#EAC0B0"/>
    <circle cx="268" cy="190" r="10" fill="#EAC0B0"/>

    {/* Bangs / Front Hair */}
    <path d="M200 60 Q110 60 110 190 C110 220 120 160 160 120 Q200 160 240 120 C280 160 290 220 290 190 Q290 60 200 60" fill="url(#hair-gradient)"/>

    {/* Eyebrows */}
    <path d="M155 165 Q170 155 185 165" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <path d="M215 165 Q230 155 245 165" stroke="#3E2723" strokeWidth="3" fill="none" strokeLinecap="round"/>

    {/* Eyes - Detailed Anime Style */}
    <g fill="#2D2424">
        <ellipse cx="170" cy="185" rx="11" ry="13" />
        <ellipse cx="230" cy="185" rx="11" ry="13" />
        {/* Highlights */}
        <circle cx="173" cy="181" r="4" fill="white" opacity="0.9"/>
        <circle cx="233" cy="181" r="4" fill="white" opacity="0.9"/>
        <circle cx="167" cy="190" r="2" fill="white" opacity="0.5"/>
        <circle cx="227" cy="190" r="2" fill="white" opacity="0.5"/>
    </g>

    {/* Eyelashes */}
    <path d="M158 180 Q155 175 154 170 M242 180 Q245 175 246 170" stroke="#2D2424" strokeWidth="2"/>

    {/* Blush */}
    <ellipse cx="160" cy="215" rx="14" ry="8" fill="#FF8FA3" opacity="0.4" filter="url(#soft-glow)"/>
    <ellipse cx="240" cy="215" rx="14" ry="8" fill="#FF8FA3" opacity="0.4" filter="url(#soft-glow)"/>

    {/* Nose */}
    <path d="M200 205 Q198 215 202 218" stroke="#D69E8E" strokeWidth="2" fill="none" strokeLinecap="round"/>

    {/* Smile */}
    <path d="M185 240 Q200 250 215 240" stroke="#D84315" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

    {/* Stethoscope */}
    <path d="M150 310 C150 370 250 370 250 310" stroke="#475569" strokeWidth="5" fill="none" strokeLinecap="round"/>
    <circle cx="200" cy="370" r="14" fill="#94A3B8" stroke="#334155" strokeWidth="2"/>
    
    {/* Highlights on hair */}
    <path d="M150 80 Q200 110 250 80" stroke="#5D4037" strokeWidth="3" fill="none" opacity="0.5"/>
  </svg>
);

// --- MAIN COMPONENT ---
export const DrRakAvatar: React.FC = () => {
    // State management
    const [currentMessage, setCurrentMessage] = useState('แตะปุ่มไมค์เพื่อเปิดระบบรอฟังค่ะ');
    const [isTalking, setIsTalking] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSystemOn, setIsSystemOn] = useState(false);
    const recognitionRef = useRef<any>(null);
    const thinkingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Core Functions ---

    // Stop all audio/recognition processes
    const stopAllProcesses = () => {
        if (thinkingTimeoutRef.current) clearTimeout(thinkingTimeoutRef.current);
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (recognitionRef.current) recognitionRef.current.abort();
        setIsThinking(false);
        setIsTalking(false);
        setIsListening(false);
    };

    // Text-to-speech function
    const speak = (text: string, onEndCallback?: () => void) => {
        stopAllProcesses();
        if (!('speechSynthesis' in window)) {
            setCurrentMessage(text);
            if (onEndCallback) onEndCallback();
            return;
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 0.9;
        
        const allVoices = window.speechSynthesis.getVoices();
        const preferredVoice = allVoices.find(v => v.lang === 'th-TH');
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onstart = () => {
            setCurrentMessage(text);
            setIsTalking(true);
        };
        utterance.onend = () => {
            setIsTalking(false);
            if (onEndCallback) onEndCallback();
        };
        utterance.onerror = () => {
            setIsTalking(false);
            if (onEndCallback) onEndCallback();
        };
        
        window.speechSynthesis.speak(utterance);
    };

    // Main AI response logic
    const getAiResponse = async (userInput: string): Promise<string> => {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            if (userInput.includes('ปวด') || userInput.includes('ไข้') || userInput.includes('เจ็บ') || userInput.includes('ไม่สบาย')) {
                return 'ได้ยินแบบนี้แล้วหมอเป็นห่วงนะคะ เพื่อข้อมูลที่ละเอียดกว่า ลองใช้ฟังก์ชัน "วิเคราะห์อาการ" ด้านล่างดูนะคะ';
            }
            return 'ขอบคุณที่เล่าให้ฟังนะคะ ดูแลสุขภาพด้วยค่ะ';
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const params = {
                model: 'gemini-2.5-flash',
                contents: `ผู้ใช้ตอบกลับมาว่า: "${userInput}"`,
                config: {
                    systemInstruction: `คุณคือ "หมอรักษ์" ผู้ช่วย AI ที่มีความเห็นอกเห็นใจ ภารกิจของคุณคือ:
1.  วิเคราะห์คำพูดของผู้ใช้ว่าเขากำลังแสดงความรู้สึก (เช่น สบายดี, เหนื่อย) หรือบอกอาการเจ็บป่วย (เช่น ปวดหัว, ไม่สบาย)
2.  ถ้าผู้ใช้บอกอาการเจ็บป่วย: **ห้ามวินิจฉัยเด็ดขาด** ให้ตอบกลับอย่างนุ่มนวลเพื่อแนะนำให้เขาไปใช้เครื่องมือ "วิเคราะห์อาการ" ที่มีในแอปแทน เช่น "ได้ยินแบบนี้แล้วหมอเป็นห่วงนะคะ เพื่อข้อมูลที่ละเอียดกว่า ลองใช้ฟังก์ชัน 'วิเคราะห์อาการ' ด้านล่างดูนะคะ"
3.  ถ้าผู้ใช้แสดงความรู้สึกทั่วไป: ให้ตอบกลับสั้นๆ อย่างเห็นอกเห็นใจและให้กำลังใจ เช่น "ดีใจที่ได้ยินแบบนั้นค่ะ" หรือ "พักผ่อนเยอะๆ นะคะ"
4.  ตอบเป็นภาษาไทย และลงท้ายด้วย "ค่ะ" เสมอ`,
                    temperature: 0.5,
                }
            };
            const response = await ai.models.generateContent(params);
            return response.text || 'ขออภัยค่ะ หมอไม่เข้าใจคำพูดของคุณค่ะ';
        } catch (error) {
            console.error("AI response error:", error);
            return 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI ค่ะ ลองใหม่อีกครั้งนะคะ';
        }
    };

    // --- Listening Functions ---
    const startListeningForResponse = () => {
        stopAllProcesses();
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.continuous = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => {
            setIsListening(true);
            setCurrentMessage("หมอฟังอยู่ค่ะ...");
        };

        recognition.onresult = async (event: any) => {
            const transcript = event.results[0][0].transcript;
            setIsThinking(true);
            setCurrentMessage("หมอกำลังคิดสักครู่นะคะ...");
            const aiResponse = await getAiResponse(transcript);
            speak(aiResponse, startListeningForWakeWord);
        };
        
        recognition.onerror = () => { startListeningForWakeWord(); };
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    const handleWakeWordDetected = () => {
        setIsThinking(true);
        setCurrentMessage("กำลังดึงข้อมูลสภาพอากาศ...");
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    // Using a CORS proxy for open-meteo as it might be blocked in some environments
                    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&hourly=pm2_5&timezone=auto`);
                    const data = await response.json();

                    const weather: WeatherData = {
                        temperature: Math.round(data.current.temperature_2m),
                        weather: weatherCodeMap[data.current.weather_code] || 'สภาพอากาศทั่วไป',
                        pm25: Math.round(data.hourly.pm2_5[new Date().getHours()] || 0),
                    };

                    let greeting = `สวัสดีค่ะ อุณหภูมิตอนนี้อยู่ที่ ${weather.temperature} องศาเซลเซียส และสภาพอากาศโดยรวมคือ${weather.weather}ค่ะ`;
                    if (weather.pm25 > 35) {
                        greeting += ` ค่าฝุ่น PM2.5 ค่อนข้างสูง อยู่ที่ ${weather.pm25} นะคะ แนะให้ใส่หน้ากากอนามัยเมื่อออกไปข้างนอกค่ะ`;
                    }
                    greeting += " แล้วเพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ?";
                    speak(greeting, startListeningForResponse);

                } catch (error) {
                    console.error("Weather fetch error:", error);
                    speak("สวัสดีค่ะ มีอะไรให้หมอช่วยไหมคะ แล้วเพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ?", startListeningForResponse);
                }
            },
            (error) => {
                console.error("Geolocation error:", error);
                speak("สวัสดีค่ะ หมอหาตำแหน่งของคุณไม่เจอค่ะ มีอะไรให้หมอช่วยไหมคะ แล้วเพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ?", startListeningForResponse);
            }
        );
    };

    const startListeningForWakeWord = () => {
        if (!isSystemOn || isListening || isThinking || isTalking) return;
        
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.continuous = true;
        recognitionRef.current = recognition;

        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript.trim();
            if (transcript.includes("สวัสดีหมอรักษ์")) {
                recognition.stop();
                handleWakeWordDetected();
            }
        };
        recognition.onerror = () => {}; // Ignore errors like no-speech
        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart loop
            if (isSystemOn) {
                setTimeout(() => startListeningForWakeWord(), 250);
            }
        };
        recognition.start();
    };

    // --- Event Handlers & Effects ---
    const handleToggleSystem = () => {
        const nextState = !isSystemOn;
        setIsSystemOn(nextState);
        if (nextState) {
            setCurrentMessage("ระบบรอฟังเปิดอยู่ค่ะ พูด 'สวัสดีหมอรักษ์' เพื่อเริ่มสนทนา");
            startListeningForWakeWord();
        } else {
            stopAllProcesses();
            setCurrentMessage('แตะปุ่มไมค์เพื่อเปิดระบบรอฟังค่ะ');
        }
    };
    
    // Cleanup effect
    useEffect(() => {
        // This effect runs once on mount to get voice list
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
        }
        return () => {
            stopAllProcesses();
            setIsSystemOn(false);
        };
    }, []);

    // Effect to start/stop listening when system state changes
    useEffect(() => {
        if (isSystemOn) {
            startListeningForWakeWord();
        } else {
            stopAllProcesses();
        }
    }, [isSystemOn]);

    // --- Render ---
    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
                <DrRakImage 
                    className={`w-32 h-32 rounded-full border-4 transition-all duration-300 ${isTalking ? 'border-indigo-500 shadow-lg scale-105' : 'border-slate-200'}`}
                />
                {(isListening || isThinking) && (
                     <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin"></div>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">หมอรักษ์ชวนคุย</h3>
            <p className="text-slate-600 text-sm min-h-[40px] flex items-center justify-center px-4">
                {isThinking ? 'กำลังคิด...' : isListening ? '...' : currentMessage}
            </p>
            <button
                onClick={handleToggleSystem}
                className={`mt-4 rounded-full flex items-center justify-center w-16 h-16 transition-all duration-300 shadow-lg ${
                    isSystemOn ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                }`}
                aria-label={isSystemOn ? "ปิดระบบรอฟัง" : "เปิดระบบรอฟัง"}
            >
                <MicIcon className="w-8 h-8" />
            </button>
        </div>
    );
};
