import React, { useState, useEffect, useRef } from 'react';
import { MicIcon } from './icons';
import { getSafeApiKey } from './SymptomAnalyzer';
import { GoogleGenAI } from '@google/genai';

// --- TYPES ---
interface WeatherData {
    temperature: number;
    weather: string;
    pm25: number;
}

// --- WEATHER UTILS ---
const weatherCodes: { [key: number]: string } = {
    0: 'ท้องฟ้าแจ่มใส',
    1: 'มีเมฆเล็กน้อย', 2: 'มีเมฆเป็นส่วนมาก', 3: 'มีเมฆครึ้ม',
    45: 'มีหมอก', 48: 'มีหมอกหนา',
    51: 'มีฝนตกปรอยๆ', 53: 'มีฝนตกปานกลาง', 55: 'มีฝนตกหนัก',
    61: 'มีฝนตกเล็กน้อย', 63: 'มีฝนตกปานกลาง', 65: 'มีฝนตกหนัก',
    80: 'มีฝนโปรย', 81: 'มีฝนโปรย', 82: 'มีฝนโปรย',
    95: 'มีพายุฝนฟ้าคะนอง',
};

const getPM25Category = (pm: number): string => {
    if (pm <= 25) return `คุณภาพดีมาก (ค่าฝุ่น ${pm.toFixed(0)})`;
    if (pm <= 50) return `คุณภาพดี (ค่าฝุ่น ${pm.toFixed(0)})`;
    if (pm <= 100) return `ปานกลาง (ค่าฝุ่น ${pm.toFixed(0)})`;
    if (pm <= 200) return `เริ่มมีผลกระทบต่อสุขภาพ (ค่าฝุ่น ${pm.toFixed(0)})`;
    return `มีผลกระทบต่อสุขภาพมาก (ค่าฝุ่น ${pm.toFixed(0)})`;
};


// --- 3D AVATAR MOCKUP ---
const Avatar = ({ isSpeaking, isListening }: { isSpeaking: boolean, isListening: boolean }) => {
    const borderColor = isSpeaking ? 'border-indigo-400' : isListening ? 'border-green-400' : 'border-slate-200';
    const shadow = isSpeaking ? 'shadow-[0_0_15px_rgba(99,102,241,0.5)]' : isListening ? 'shadow-[0_0_15px_rgba(52,211,153,0.5)]' : '';
    const statusBg = isSpeaking || isListening ? 'bg-green-500' : 'bg-slate-400';

    return (
      <div className="relative w-32 h-32 mx-auto">
          <div className={`w-full h-full rounded-full overflow-hidden border-4 ${borderColor} ${shadow} bg-indigo-50 relative transition-all duration-300`}>
              <img 
                  src="https://i.ibb.co/6n2wz7Y/Dr-Ruk-Avatar.jpg" 
                  alt="Dr. Ruk Avatar" 
                  className={`w-full h-full object-cover ${isSpeaking || isListening ? 'scale-110' : 'scale-100'} transition-transform duration-500`}
              />
          </div>
          <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${statusBg}`}>
              {(isSpeaking || isListening) && <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>}
              {!(isSpeaking || isListening) && <div className="w-2 h-2 bg-white rounded-full"></div>}
          </div>
      </div>
    );
};

export const DrRakAvatar: React.FC = () => {
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [statusText, setStatusText] = useState('แตะปุ่มไมค์เพื่อเปิดระบบรอฟัง');
    const [error, setError] = useState<string | null>(null);
    const [conversationState, setConversationState] = useState<'idle' | 'listening_for_feeling' | 'analyzing'>('idle');
    
    const recognitionRef = useRef<any>(null);
    const shouldSpeakRef = useRef(false);
    const wakeWordCooldownRef = useRef(false);

    const stopSpeaking = () => {
        shouldSpeakRef.current = false;
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    };

    const speak = (text: string, onEndCallback?: () => void) => {
        if (!('speechSynthesis' in window)) return;
        stopSpeaking();
        shouldSpeakRef.current = true;
        setIsSpeaking(true);
        setStatusText("กำลังพูด...");

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 0.8;
        utterance.volume = 1;

        const allVoices = window.speechSynthesis.getVoices();
        const thaiVoice = allVoices.find(v => v.lang === 'th-TH');
        if (thaiVoice) utterance.voice = thaiVoice;

        utterance.onend = () => {
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
            if(onEndCallback) onEndCallback();
            else if(isMonitoring) setStatusText('กำลังรอฟังคำว่า "สวัสดีหมอรักษ์"');
            else setStatusText('แตะปุ่มไมค์เพื่อเปิดระบบรอฟัง');
        };
        utterance.onerror = (e) => {
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
        };
        window.speechSynthesis.speak(utterance);
    };
    
    const analyzeFeelingAndReply = async (feeling: string) => {
        setConversationState('analyzing');
        setStatusText("กำลังคิดสักครู่นะคะ...");
        
        const apiKey = getSafeApiKey();
        if (!apiKey || !navigator.onLine) {
            speak("ขออภัยค่ะ หมอเชื่อมต่อระบบวิเคราะห์ไม่ได้ในขณะนี้ ลองใหม่อีกครั้งนะคะ", () => {
                setConversationState('idle');
                if(isMonitoring) setStatusText('กำลังรอฟังคำว่า "สวัสดีหมอรักษ์"');
            });
            return;
        }

        try {
            const ai = new GoogleGenAI({ apiKey });
            const params = {
              model: 'gemini-2.5-flash',
              contents: `ผู้ใช้บอกว่าเขารู้สึก: "${feeling}"`,
              config: {
                systemInstruction: 'คุณคือ "หมอรักษ์" หมอ AI ผู้หญิงที่ใจดีและเห็นอกเห็นใจ ตอบกลับสั้นๆ ไม่เกิน 2-3 ประโยคเป็นภาษาไทย ถ้าผู้ใช้บอกอาการป่วย (ปวดหัว, ไม่สบาย, ไอ, เจ็บคอ) ห้ามวิเคราะห์เด็ดขาด แต่ให้แสดงความห่วงใยและแนะนำให้ใช้ "ฟังก์ชันวิเคราะห์อาการ" ด้านล่างแทน ลงท้ายด้วย "ค่ะ" เสมอ',
                temperature: 0.7,
              }
            };
            const response = await ai.models.generateContent(params);
            speak(response.text, () => {
                setConversationState('idle');
                 if(isMonitoring) setStatusText('กำลังรอฟังคำว่า "สวัสดีหมอรักษ์"');
            });
        } catch (e) {
            speak("ขออภัยค่ะ หมอมีปัญหาในการเชื่อมต่อเล็กน้อย ลองใหม่อีกครั้งนะคะ", () => {
                setConversationState('idle');
                 if(isMonitoring) setStatusText('กำลังรอฟังคำว่า "สวัสดีหมอรักษ์"');
            });
        }
    };

    const fetchWeatherAndSpeak = (lat: number, lon: number) => {
        setStatusText("กำลังตรวจสอบสภาพอากาศ...");
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&hourly=pm2_5&timezone=auto`)
            .then(res => res.json())
            .then(data => {
                const weather: WeatherData = {
                    temperature: data.current.temperature_2m,
                    weather: weatherCodes[data.current.weather_code] || 'ไม่ทราบสภาพอากาศ',
                    pm25: data.hourly.pm2_5[0] || 0
                };
                const pm25Text = getPM25Category(weather.pm25);
                const response = `สวัสดีค่ะ เพื่อนหมอรักษ์ ตอนนี้อุณหภูมิอยู่ที่ ${weather.temperature.toFixed(0)} องศา สภาพอากาศโดยรวมคือ${weather.weather} ส่วนค่าฝุ่น PM 2.5 อยู่ในเกณฑ์${pm25Text}ค่ะ แล้วเพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ?`;
                speak(response, () => {
                    setConversationState('listening_for_feeling');
                    setStatusText('หมอรักษ์กำลังรอฟังอยู่ค่ะ...');
                });
            })
            .catch(() => {
                 speak("สวัสดีค่ะ เพื่อนหมอรักษ์ หมอเชื่อมต่อระบบข้อมูลอากาศไม่ได้ค่ะ แล้วเพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ?", () => {
                    setConversationState('listening_for_feeling');
                    setStatusText('หมอรักษ์กำลังรอฟังอยู่ค่ะ...');
                 });
            });
    };

    const triggerWakeWordResponse = () => {
        if (wakeWordCooldownRef.current) return;
        
        wakeWordCooldownRef.current = true;
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeatherAndSpeak(position.coords.latitude, position.coords.longitude);
            },
            () => { // Geolocation failed
                 speak("สวัสดีค่ะ เพื่อนหมอรักษ์ หมอหาตำแหน่งของคุณไม่เจอค่ะ แล้วเพื่อนหมอรักษ์เป็นอย่างไรบ้างคะ?", () => {
                    setConversationState('listening_for_feeling');
                    setStatusText('หมอรักษ์กำลังรอฟังอยู่ค่ะ...');
                 });
            }
        );
        
        setTimeout(() => wakeWordCooldownRef.current = false, 8000);
    };

    const toggleMonitoring = () => {
        if (isMonitoring) {
            if (recognitionRef.current) recognitionRef.current.stop();
            setIsMonitoring(false);
            speak("ปิดระบบรับฟังอัตโนมัติแล้วค่ะ");
            setStatusText('แตะปุ่มไมค์เพื่อเปิดระบบรอฟัง');
            setConversationState('idle');
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            speak('เครื่องของคุณไม่รองรับการสั่งงานด้วยเสียงค่ะ');
            return;
        }
        
        setError(null);
        speak("เปิดระบบรับฟังแล้วค่ะ เรียก 'สวัสดีหมอรักษ์' ได้เลยค่ะ");
        setIsMonitoring(true);
        setStatusText('กำลังรอฟังคำว่า "สวัสดีหมอรักษ์"');
    };

    useEffect(() => {
        if (!isMonitoring) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            return;
        };

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.interimResults = false;
        recognition.continuous = true;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('').trim().toLowerCase();
            
            if (conversationState === 'idle') {
                if (transcript.includes("สวัสดีหมอรักษ์") || transcript.includes("สวัสดีหมอรัก") || transcript.includes("หวัดดีหมอรักษ์")) {
                    triggerWakeWordResponse();
                }
            } else if (conversationState === 'listening_for_feeling') {
                 if (transcript.trim().length > 2) {
                    recognition.stop();
                    analyzeFeelingAndReply(transcript.trim());
                 }
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                setIsMonitoring(false);
                setError("ไม่ได้รับอนุญาตให้ใช้ไมค์ ระบบรับฟังอัตโนมัติถูกปิด");
                setStatusText('โปรดอนุญาตการใช้ไมโครโฟน');
            }
        };

        recognition.onend = () => {
            // Only auto-restart if we are in idle monitoring mode
            if (isMonitoring && conversationState === 'idle') {
                setTimeout(() => {
                    if (recognitionRef.current) recognitionRef.current.start();
                }, 200);
            } else if (conversationState === 'listening_for_feeling') {
                // If listening for feeling timed out, reset to idle
                setConversationState('idle');
                setStatusText('ไม่ได้ยินคำตอบค่ะ กลับสู่โหมดรอฟัง');
            }
        };

        try { recognition.start(); } catch (e) { console.error("Could not start recognition", e); }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onend = null;
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
        };
    }, [isMonitoring, conversationState]);

    useEffect(() => {
        return () => { // Cleanup on unmount
           stopSpeaking();
           if(recognitionRef.current) {
               recognitionRef.current.onend = null;
               recognitionRef.current.stop();
           }
        }
    }, []);

    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 p-6 flex flex-col items-center text-center">
            <Avatar isSpeaking={isSpeaking} isListening={isMonitoring || conversationState === 'listening_for_feeling'} />
            <h3 className="text-xl font-bold text-slate-800 mt-4">หมอรักษ์ชวนคุย</h3>
            <p className="text-sm text-slate-500 min-h-[40px] mt-1 mb-4 flex items-center justify-center">
                {error || statusText}
            </p>
            <button
                onClick={toggleMonitoring}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                isMonitoring 
                    ? 'bg-green-500 text-white ring-4 ring-green-200 animate-pulse' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-200'
                }`}
                aria-label={isMonitoring ? "ปิดระบบรับฟังอัตโนมัติ" : "เปิดระบบรับฟังอัตโนมัติ"}
            >
                <MicIcon className="w-8 h-8" />
            </button>
        </div>
    );
};
