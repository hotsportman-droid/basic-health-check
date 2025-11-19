
import React, { useState, useEffect, useRef } from 'react';
import { BrainIcon, MicIcon, SpeakerWaveIcon, StopIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_CONFIG } from '../constants';

const MAX_DAILY_LIMIT = 100000; // Increased limit for simulation

interface SymptomAnalyzerProps {
  onAnalysisSuccess?: () => void;
}

// --- SAFE KEY RETRIEVAL ---
// ฟังก์ชันดึง Key อย่างปลอดภัย ป้องกัน App Crash บน Browser
export const getSafeApiKey = (): string | null => {
  try {
    // 1. GLOBAL KEY (Priority สำหรับ Public App)
    if (SYSTEM_CONFIG.GLOBAL_API_KEY && SYSTEM_CONFIG.GLOBAL_API_KEY.trim().length > 0) {
        return SYSTEM_CONFIG.GLOBAL_API_KEY;
    }

    // 2. LocalStorage
    const localKey = localStorage.getItem('shc_api_key');
    if (localKey && localKey.trim().length > 0) return localKey;

    // 3. Environment Variables (Safe Access)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
        // @ts-ignore
        return import.meta.env.VITE_API_KEY;
    }
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      // @ts-ignore
      return process.env.API_KEY;
    }
  } catch (e) {
    return null;
  }
  return null;
};

// --- SMART OFFLINE DOCTOR ---
// สมองกลสำรอง: ทำงานทันทีเมื่อ AI เชื่อมต่อไม่ได้
const analyzeSymptomsOffline = (input: string): string => {
  const text = input.toLowerCase();
  let diagnosisPart = "จากการประเมินอาการที่คุณเล่ามาเบื้องต้นครับ ";
  let advicePart = "";

  // Logic ตรวจจับอาการ (Keyword Detection)
  if (text.includes('หัว') || text.includes('ไมเกรน') || text.includes('มึน') || text.includes('เวียน')) {
      diagnosisPart += "หมอคาดว่าอาจเกิดจากความเครียด พักผ่อนน้อย หรือภาวะไมเกรนครับ ";
      advicePart += "* **พักผ่อน:** นอนพักในห้องที่เงียบและมืดครับ\n* **การดูแล:** ประคบเย็นบริเวณหน้าผากช่วยบรรเทาอาการได้ครับ\n* **ยา:** หากปวดมาก สามารถทานยาแก้ปวดพาราเซตามอลได้ครับ (ถ้าไม่แพ้)\n";
  }
  else if (text.includes('ท้อง') || text.includes('ไส้') || text.includes('อ้วก') || text.includes('ถ่าย') || text.includes('จุก') || text.includes('เสีย')) {
      diagnosisPart += "น่าจะเป็นอาการระคายเคืองในระบบทางเดินอาหารหรือกระเพาะอาหารครับ ";
      advicePart += "* **อาหาร:** งดอาหารรสจัด ของทอด ของมัน ทานข้าวต้มหรือโจ๊กอ่อนๆ ก่อนนะครับ\n* **น้ำดื่ม:** จิบน้ำเกลือแร่ (ORS) บ่อยๆ หากมีการถ่ายท้องหรืออาเจียนครับ\n* **ยา:** ทานยาแก้ปวดท้องหรือยาช่วยย่อยได้ตามอาการครับ\n";
  }
  else if (text.includes('ไข้') || text.includes('ร้อน') || text.includes('หนาว') || text.includes('สั่น')) {
      diagnosisPart += "ร่างกายอาจกำลังต่อสู้กับการติดเชื้อหรือการอักเสบครับ ทำให้มีไข้ ";
      advicePart += "* **ลดไข้:** เช็ดตัวด้วยน้ำอุณหภูมิห้อง (ห้ามใช้น้ำเย็นจัด) และทานยาลดไข้ครับ\n* **น้ำดื่ม:** ดื่มน้ำอุ่นมากๆ เพื่อช่วยระบายความร้อนครับ\n* **พักผ่อน:** นอนหลับให้ได้อย่างน้อย 8-10 ชั่วโมงนะครับ\n";
  }
  else if (text.includes('คอ') || text.includes('ไอ') || text.includes('เสมหะ') || text.includes('หวัด') || text.includes('มูก')) {
      diagnosisPart += "เป็นอาการที่พบได้บ่อยในโรคหวัดหรือระบบทางเดินหายใจครับ ";
      advicePart += "* **คอ:** จิบน้ำอุ่นผสมมะนาว หรือกลั้วคอด้วยน้ำเกลือเพื่อลดเชื้อโรคครับ\n* **การปฏิบัติตัว:** ใส่หน้ากากอนามัย และงดของทอดของเย็นนะครับ\n* **สภาพแวดล้อม:** อยู่ในที่อากาศถ่ายเทสะดวกครับ\n";
  }
  else if (text.includes('ผื่น') || text.includes('คัน') || text.includes('ตุ่ม') || text.includes('แดง')) {
      diagnosisPart += "อาจเป็นปฏิกิริยาภูมิแพ้หรือการระคายเคืองทางผิวหนังครับ ";
      advicePart += "* **ห้ามเกา:** เพราะอาจทำให้ติดเชื้อแบคทีเรียแทรกซ้อนได้ครับ\n* **ความสะอาด:** อาบน้ำด้วยสบู่ที่อ่อนโยน ล้างน้ำเปล่าให้สะอาดครับ\n* **สังเกต:** ลองดูว่าเพิ่งเปลี่ยนสบู่ หรือทานอาหารแปลกๆ มาหรือไม่นะครับ\n";
  }
  else if (text.includes('ปวด') || text.includes('เมื่อย') || text.includes('เจ็บ') || text.includes('หลัง') || text.includes('เอว')) {
       diagnosisPart += "อาจเกิดจากการใช้งานกล้ามเนื้อหนักเกินไปหรือผิดท่าทางครับ ";
       advicePart += "* **พักการใช้งาน:** หลีกเลี่ยงกิจกรรมที่ทำให้เจ็บมากขึ้นครับ\n* **ประคบ:** ประคบเย็นใน 24 ชม.แรก และประคบอุ่นหลังจากนั้นครับ\n* **ยืดเหยียด:** บริหารกล้ามเนื้อเบาๆ ไม่กระชากนะครับ\n";
  }
  else {
      diagnosisPart += "หมอแนะนำให้ลองปรับพฤติกรรมการดูแลสุขภาพพื้นฐานก่อนนะครับ ";
      advicePart += "* **พักผ่อน:** การนอนหลับคือยาที่ดีที่สุดครับ\n* **น้ำ:** ดื่มน้ำสะอาดให้เพียงพอ (วันละ 8 แก้ว)\n* **สังเกต:** หากอาการเปลี่ยนแปลง ให้จดบันทึกไว้นะครับ\n";
  }

  return `### ผลการวิเคราะห์เบื้องต้น\n\n${diagnosisPart}\n\n**คำแนะนำจากหมอ:**\n${advicePart}\n\n* **สำคัญ:** หากอาการไม่ดีขึ้นภายใน 24-48 ชั่วโมง หรือมีอาการรุนแรงขึ้น รีบไปโรงพยาบาลทันทีนะครับ`;
};

export const SymptomAnalyzer: React.FC<SymptomAnalyzerProps> = ({ onAnalysisSuccess }) => {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('กำลังประมวลผล...');
  const [error, setError] = useState<string | null>(null);
  
  // Modal States
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [dailyUsage, setDailyUsage] = useState(0);
  
  // Voice Input States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice Output States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const shouldSpeakRef = useRef(false); // Ref to control speech queue

  const stopSpeaking = () => {
    shouldSpeakRef.current = false;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Helper to speak text (Accessibility) with Smart Chunking
  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    
    // Stop previous speech
    stopSpeaking();
    
    // Activate flag
    shouldSpeakRef.current = true;
    setIsSpeaking(true);

    // 1. Clean text
    const cleanText = text.replace(/[#*]/g, '').replace(/<\/?[^>]+(>|$)/g, "");

    // 2. Smart Chunking Strategy
    // Split by newlines first (paragraphs)
    const rawChunks = cleanText.split(/[\n\r]+/);
    const chunks: string[] = [];

    rawChunks.forEach(chunk => {
        chunk = chunk.trim();
        if (!chunk) return;

        // If chunk is too long (>150 chars), split by space
        if (chunk.length > 150) {
            const subChunks = chunk.match(/.{1,150}(?:\s|$)/g);
            if (subChunks) {
                subChunks.forEach(s => chunks.push(s));
            } else {
                chunks.push(chunk);
            }
        } else {
            chunks.push(chunk);
        }
    });

    if (chunks.length === 0) {
        setIsSpeaking(false);
        return;
    }

    let currentIndex = 0;

    // Recursive player
    const playNext = () => {
        if (!shouldSpeakRef.current || currentIndex >= chunks.length) {
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
        utterance.lang = 'th-TH';
        utterance.rate = 0.75; // Slow rate
        utterance.volume = 1;

        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang === 'th-TH');
        if (thaiVoice) utterance.voice = thaiVoice;

        utterance.onend = () => {
            currentIndex++;
            playNext();
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
        };

        window.speechSynthesis.speak(utterance);
    };

    playNext();
  };

  useEffect(() => {
    // Load usage data
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('shc_usage_date');
    const storedCount = parseInt(localStorage.getItem('shc_usage_count') || '0', 10);

    if (storedDate !== today) {
      localStorage.setItem('shc_usage_date', today);
      localStorage.setItem('shc_usage_count', '0');
      setDailyUsage(0);
    } else {
      setDailyUsage(storedCount);
    }

    return () => {
      stopSpeaking();
    };
  }, []);

  const isInAppBrowser = () => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Line") > -1);
  };

  const toggleListening = async () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      speak("หยุดรับเสียงแล้วครับ");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const msg = 'เครื่องของคุณไม่รองรับการสั่งงานด้วยเสียง';
      setError(msg);
      speak(msg);
      return;
    }
    
    setError(null);
    speak("กำลังฟังครับ พูดอาการได้เลย");

    // Permission checks...
    if (isInAppBrowser()) {
      if (!navigator.mediaDevices?.getUserMedia) {
         setError('กรุณาเปิดผ่าน Chrome หรือ Safari เพื่อใช้ไมโครโฟน');
         return;
      }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onerror = (event: any) => {
      let msg = 'เกิดข้อผิดพลาดในการรับเสียง';
      if (event.error === 'not-allowed') msg = 'กรุณาอนุญาตให้ใช้ไมโครโฟน';
      if (event.error === 'no-speech') msg = 'ไม่ได้ยินเสียงพูด ลองใหม่อีกครั้งนะครับ';
      
      setError(msg);
      speak(msg);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSymptoms((prev) => {
        const newVal = prev + (prev ? ' ' : '') + transcript;
        return newVal;
      });
      speak("ได้รับข้อมูลแล้วครับ หากมีเพิ่ม ให้กดพูดต่อ หรือกดปุ่มวิเคราะห์ได้เลย");
    };

    recognitionRef.current = recognition;
    try {
        recognition.start();
    } catch (e) {
        console.error(e);
        setError("ไม่สามารถเริ่มไมโครโฟนได้");
    }
  };

  const toggleSpeakingResult = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(result);
    }
  };

  // Function: Check & Start Analysis
  const initiateAnalysis = async () => {
    if (dailyUsage >= MAX_DAILY_LIMIT) {
        const msg = 'วันนี้ใช้งานครบโควต้าแล้ว พรุ่งนี้มาใหม่นะครับ';
        setError(msg);
        speak(msg);
        return;
    }
    performAnalysis();
  };

  // Function: Perform Actual Analysis (Hybrid: AI -> Offline Backup)
  const performAnalysis = async () => {
    setIsConfirmModalOpen(false);
    setIsLoading(true);
    setLoadingStatus('หมอกำลังวิเคราะห์ข้อมูล...');
    setError(null);
    setResult('');
    
    speak("กำลังวิเคราะห์ข้อมูล รอสักครู่นะครับ");

    try {
      // 1. ดึง Key แบบปลอดภัย
      const apiKey = getSafeApiKey();
      let text = "";

      // 2. ถ้ามี Key และมีเน็ต ลองเรียก AI
      if (apiKey && navigator.onLine) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const params = {
              model: 'gemini-2.5-flash',
              contents: symptoms,
              config: {
                  systemInstruction: 'คุณคือ "หมอประจำบ้าน" ผู้ชาย ใจดี พูดภาษาไทยง่ายๆ สำหรับผู้สูงอายุ\n\nหน้าที่:\n1. วิเคราะห์อาการที่ได้รับมา\n2. ตอบด้วยน้ำเสียงห่วงใย สุภาพ นุ่มนวล (ต้องลงท้ายประโยคด้วย "ครับ" ทุกครั้ง ห้ามใช้ "คะ")\n3. ห้ามใช้ศัพท์แพทย์ยากๆ ถ้าใช้ต้องแปลทันที\n4. แยกคำตอบเป็นข้อๆ ให้อ่านง่ายที่สุด\n5. ต้องย้ำเสมอว่า "นี่ไม่ใช่การวินิจฉัยจริง ถ้าอาการหนักต้องไปโรงพยาบาลทันที"',
                  temperature: 0.4,
              }
            };
            
            // Timeout 25 วินาที
            const aiPromise = ai.models.generateContent(params);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000));
            
            const response: any = await Promise.race([aiPromise, timeoutPromise]);
            
            if (response && response.text) {
                text = response.text;
            }
        } catch (apiErr: any) {
            console.warn("AI Connection issue, switching to backup engine.", apiErr);
        }
      }
      
      // 3. ถ้าไม่มี Text -> ใช้ Offline Engine ทันที
      if (!text) {
         await new Promise(r => setTimeout(r, 1500));
         text = analyzeSymptomsOffline(symptoms);
      }

      setResult(text);
      
      // Update usage
      const newCount = dailyUsage + 1;
      setDailyUsage(newCount);
      localStorage.setItem('shc_usage_count', newCount.toString());
      
      if (onAnalysisSuccess) onAnalysisSuccess();
      
      // Speak Full Result
      const intro = "วิเคราะห์เสร็จแล้วครับ ผลการวิเคราะห์มีดังนี้ ";
      speak(intro + text); 

    } catch (err: any) {
      const safeText = analyzeSymptomsOffline(symptoms);
      setResult(safeText);
      speak("วิเคราะห์เสร็จแล้วครับ");
    } finally {
      setIsLoading(false);
    }
  };

  // Formatting for readability
  const formatResult = (text: string) => {
    return text
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-indigo-700 mt-4 mb-2">$1</h3>')
        .replace(/^\* (.*$)/gim, '<li class="ml-4 mb-1 text-slate-700">$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>')
        .replace(/\n/g, '<br />');
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 overflow-hidden flex flex-col h-full relative">
        <div className="p-6 flex-grow flex flex-col">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0 shadow-sm">
                  <BrainIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">หมอ AI ประจำบ้าน</h3>
                  <p className="text-slate-500 text-sm">ผู้ช่วยวิเคราะห์อาการเบื้องต้น</p>
                </div>
            </div>
          </div>

          <div className="flex-grow flex flex-col space-y-4">
            <label htmlFor="symptoms" className="sr-only">พิมพ์อาการของคุณที่นี่</label>
            
            <div className="relative flex-grow">
              <textarea
                id="symptoms"
                rows={5}
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="block w-full h-full min-h-[180px] px-4 py-4 text-lg bg-slate-50 border-2 border-slate-200 rounded-2xl shadow-inner placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                placeholder="พิมพ์อาการตรงนี้... หรือ กดปุ่มไมโครโฟนด้านล่างเพื่อพูด"
                aria-label="ช่องใส่ข้อความอาการเจ็บป่วย"
              />
            </div>

            <div className="grid grid-cols-4 gap-3 h-16">
               <button
                  onClick={toggleListening}
                  className={`col-span-1 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-200'
                  }`}
                  aria-label={isListening ? "กำลังฟัง หยุดพูด" : "กดเพื่อพูดอาการ"}
                  title="กดเพื่อพูด"
                >
                  <MicIcon className="w-8 h-8" />
                </button>

                <button
                  onClick={() => {
                      if (!symptoms.trim()) {
                          const msg = "กรุณาบอกอาการก่อนนะครับ";
                          setError(msg);
                          speak(msg);
                          return;
                      }
                      setIsConfirmModalOpen(true);
                  }}
                  disabled={isLoading}
                  className="col-span-3 bg-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
                  aria-label="กดเพื่อเริ่มวิเคราะห์อาการ"
                >
                  {isLoading ? 'กำลังคิด...' : 'วิเคราะห์อาการ'}
                </button>
            </div>
          </div>

          <div aria-live="assertive" className="mt-4 min-h-[20px]">
             {error && (
                <div className="text-center p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 font-medium flex items-center justify-center">
                  <span className="mr-2">⚠️</span> {error}
                </div>
             )}
             {isLoading && (
                 <div className="flex justify-center items-center text-indigo-600 font-medium animate-pulse">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                    {loadingStatus}
                 </div>
             )}
          </div>

          {result && !isLoading && (
            <div className="mt-6 bg-green-50 p-6 rounded-2xl border-2 border-green-100 animate-fade-in shadow-sm" role="region" aria-label="ผลการวิเคราะห์">
              <div className="flex justify-between items-start mb-4 border-b border-green-200 pb-2">
                <h4 className="text-lg font-bold text-green-800 flex items-center">
                    👨‍⚕️ ผลการวิเคราะห์เบื้องต้น
                </h4>
                <button 
                  onClick={toggleSpeakingResult}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-white rounded-full shadow-sm text-indigo-600 font-bold text-sm hover:bg-indigo-50 border border-indigo-100"
                  aria-label={isSpeaking ? "หยุดอ่าน" : "อ่านผลลัพธ์ให้ฟัง"}
                >
                  {isSpeaking ? <StopIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                  <span>{isSpeaking ? 'หยุดเสียง' : 'ฟังผล'}</span>
                </button>
              </div>
              
              <div 
                className="prose prose-lg max-w-none text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatResult(result) }} 
              />
              
              <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100 flex items-start">
                 <span className="text-2xl mr-3">🚨</span>
                 <p className="text-red-800 text-sm font-medium mt-1">
                    โปรดจำไว้ว่า: หมอ AI เป็นเพียงตัวช่วยเบื้องต้น หากอาการไม่ดีขึ้น หรือรู้สึกแย่ลง ต้องไปโรงพยาบาลทันทีนะครับ
                 </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} adSlot={<AdBanner />}>
        <div className="text-center p-2">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">พร้อมให้หมอตรวจไหมครับ?</h3>
            <p className="text-slate-600 mb-8 text-lg">
                ข้อมูลนี้ไม่ใช่การรักษาจริงนะครับ
            </p>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="py-4 rounded-xl bg-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-300"
                    aria-label="ยกเลิก ไม่ตรวจแล้ว"
                >
                    ยกเลิก
                </button>
                <button
                    onClick={initiateAnalysis}
                    className="py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700"
                    aria-label="ยืนยัน ตรวจเลย"
                >
                    ตรวจเลย
                </button>
            </div>
        </div>
      </Modal>
    </>
  );
};
