
import React, { useState, useEffect, useRef } from 'react';
import { BrainIcon, MicIcon, SpeakerWaveIcon, StopIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';
import { GoogleGenAI } from '@google/genai';

const MAX_DAILY_LIMIT = 20;

interface SymptomAnalyzerProps {
  onAnalysisSuccess?: () => void;
}

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

  // Helper to speak text (Accessibility)
  const speak = (text: string, force: boolean = false) => {
    if (!('speechSynthesis' in window)) return;
    
    if (window.speechSynthesis.speaking && !force) return;
    
    window.speechSynthesis.cancel(); // Stop previous

    const cleanText = text.replace(/[#*]/g, '').replace(/<\/?[^>]+(>|$)/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'th-TH';
    utterance.rate = 0.7; // Slower rate for better accessibility
    utterance.volume = 1;

    // Try to find a male voice if possible (Basic attempt, varies by OS)
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(v => v.lang === 'th-TH');
    if (thaiVoice) utterance.voice = thaiVoice;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
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
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
      speak("ได้รับข้อมูลแล้วครับ หากมีเพิ่ม ให้กดพูดต่อ หรือกดปุ่มวิเคราะห์ได้เลย", true);
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
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      speak(result, true);
    }
  };

  // Function: Check & Start Analysis
  const initiateAnalysis = async () => {
    // 1. Check internet
    if (!navigator.onLine) {
        const msg = 'ไม่มีสัญญาณอินเทอร์เน็ต';
        setError(msg);
        speak(msg);
        return;
    }

    // 2. Check Usage Limit
    if (dailyUsage >= MAX_DAILY_LIMIT) {
        const msg = 'วันนี้ใช้งานครบโควต้าแล้ว พรุ่งนี้มาใหม่นะครับ';
        setError(msg);
        speak(msg);
        return;
    }

    performAnalysis();
  };

  // Function: Perform Actual API Call
  const performAnalysis = async () => {
    setIsConfirmModalOpen(false);
    setIsLoading(true);
    setLoadingStatus('หมอกำลังวิเคราะห์ข้อมูล...');
    setError(null);
    setResult('');
    
    speak("กำลังวิเคราะห์ข้อมูล รอสักครู่นะครับ");

    try {
      const apiKey = process.env.API_KEY;

      let text = "";

      // SILENT FALLBACK: If no API Key, simulate a response instead of crashing or showing popups
      if (!apiKey) {
        console.warn("No API Key found. Using offline simulation mode.");
        await new Promise(r => setTimeout(r, 2000)); // Simulate delay
        text = `### คำแนะนำเบื้องต้น (โหมดออฟไลน์)\n\nเนื่องจากระบบยังไม่ได้เชื่อมต่อกับสมองกลอัจฉริยะ หมอขอแนะนำการดูแลตัวเองพื้นฐานดังนี้ครับ:\n\n* **พักผ่อนให้เพียงพอ:** การนอนหลับช่วยฟื้นฟูร่างกายได้ดีที่สุด\n* **ดื่มน้ำมากๆ:** ช่วยให้ระบบต่างๆ ในร่างกายทำงานได้ดี\n* **สังเกตอาการ:** หากมีไข้สูง หายใจลำบาก หรืออาการแย่ลง ให้รีบไปโรงพยาบาลทันที\n\nหมายเหตุ: โปรดเชื่อมต่ออินเทอร์เน็ตหรือติดต่อผู้ดูแลระบบเพื่อใช้งานเต็มรูปแบบครับ`;
      } else {
        // Real AI Call
        const ai = new GoogleGenAI({ apiKey });
        
        const params = {
          model: 'gemini-2.5-flash',
          contents: symptoms,
          config: {
              systemInstruction: 'คุณคือ "หมอประจำบ้าน" ใจดี พูดภาษาไทยง่ายๆ สำหรับผู้สูงอายุ\n\nหน้าที่:\n1. วิเคราะห์อาการที่ได้รับมา\n2. ตอบด้วยน้ำเสียงห่วงใย สุภาพ นุ่มนวล (ต้องลงท้ายประโยคด้วย "ครับ" ทุกครั้ง ห้ามใช้ "คะ")\n3. ห้ามใช้ศัพท์แพทย์ยากๆ ถ้าใช้ต้องแปลทันที\n4. แยกคำตอบเป็นข้อๆ ให้อ่านง่ายที่สุด\n5. ต้องย้ำเสมอว่า "นี่ไม่ใช่การวินิจฉัยจริง ถ้าอาการหนักต้องไปโรงพยาบาลทันที"',
              temperature: 0.4,
          }
        };
  
        const response = await ai.models.generateContent(params);
        text = response?.text || "";
      }
      
      if (!text) throw new Error('ระบบไม่ตอบสนอง');

      setResult(text);
      
      // Update usage
      const newCount = dailyUsage + 1;
      setDailyUsage(newCount);
      localStorage.setItem('shc_usage_count', newCount.toString());
      
      if (onAnalysisSuccess) onAnalysisSuccess();
      
      speak("วิเคราะห์เสร็จแล้วครับ ผลการวิเคราะห์มีดังนี้ " + text.substring(0, 100) + "..."); 

    } catch (err: any) {
      let msg = 'เกิดข้อผิดพลาด กรุณาลองใหม่';
      if (err.message.includes('429')) msg = 'คนใช้งานเยอะ กรุณารอสักครู่';
      
      // Fallback for unknown errors to keep app usable
      setResult(`### ขออภัยครับ ระบบขัดข้องชั่วคราว\n\nคำแนะนำเบื้องต้น:\n* พักผ่อนให้เพียงพอ\n* หากอาการรุนแรง โปรดไปพบแพทย์ทันทีนะครับ`);
      speak("เกิดข้อผิดพลาดเล็กน้อย แต่หมอมีคำแนะนำเบื้องต้นให้ครับ");
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
          
          {/* Header with Accessibility focus */}
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

            {/* Large Accessibility Controls */}
            <div className="grid grid-cols-4 gap-3 h-16">
               {/* Mic Button - Large Target */}
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

                {/* Analyze Button - Huge & Clear */}
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

          {/* Status / Error Message Area (Live Region) */}
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

          {/* Result Area */}
          {result && !isLoading && (
            <div className="mt-6 bg-green-50 p-6 rounded-2xl border-2 border-green-100 animate-fade-in shadow-sm" role="region" aria-label="ผลการวิเคราะห์">
              <div className="flex justify-between items-start mb-4 border-b border-green-200 pb-2">
                <h4 className="text-lg font-bold text-green-800 flex items-center">
                    👨‍⚕️ ผลการวิเคราะห์
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
      
      {/* Confirmation Modal - Simplified */}
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
