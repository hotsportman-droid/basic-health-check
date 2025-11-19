
import React, { useState, useEffect, useRef } from 'react';
import { BrainIcon, MicIcon, SpeakerWaveIcon, StopIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';
import { GoogleGenAI } from '@google/genai';

const MAX_DAILY_LIMIT = 10; // เพิ่มโควต้าต่อวันให้มากขึ้นเล็กน้อย

interface SymptomAnalyzerProps {
  onAnalysisSuccess?: () => void;
}

export const SymptomAnalyzer: React.FC<SymptomAnalyzerProps> = ({ onAnalysisSuccess }) => {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('กำลังประมวลผลข้อมูล...');
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  
  // Voice Input States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice Output States
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Load usage data from local storage
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('shc_usage_date');
    const storedCount = parseInt(localStorage.getItem('shc_usage_count') || '0', 10);

    if (storedDate !== today) {
      // Reset if it's a new day
      localStorage.setItem('shc_usage_date', today);
      localStorage.setItem('shc_usage_count', '0');
      setDailyUsage(0);
    } else {
      setDailyUsage(storedCount);
    }

    // Cleanup speech synthesis when component unmounts
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const isInAppBrowser = () => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (ua.indexOf("FBAN") > -1) || (ua.indexOf("FBAV") > -1) || (ua.indexOf("Line") > -1);
  };

  const toggleListening = async () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('เบราว์เซอร์ของคุณไม่รองรับการสั่งงานด้วยเสียง');
      return;
    }
    
    setError(null);

    // For In-App Browsers (Line, FB)
    if (isInAppBrowser()) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('Microphone permission denied:', err);
          setError('⚠️ ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบการตั้งค่าแอปพลิเคชัน หรือเปิดลิงก์นี้ผ่าน Browser หลัก (Chrome/Safari)');
          return;
        }
      } else {
         setError('⚠️ เบราว์เซอร์ในแอปนี้อาจมีปัญหากับไมโครโฟน กรุณาเปิดผ่าน Chrome หรือ Safari');
         return;
      }
    } else {
       try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(track => track.stop());
       } catch (err) {
          setError('⚠️ กรุณาอนุญาตการใช้ไมโครโฟนที่แถบ URL (ไอคอนกุญแจ 🔒)');
          return;
       }
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH'; // ตั้งค่าเป็นภาษาไทย
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        const errorMsg = isInAppBrowser()
          ? '⚠️ ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบการตั้งค่าสิทธิ์ของแอปพลิเคชัน หรือเปิดผ่าน Browser หลัก'
          : '⚠️ ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณากดที่ไอคอนรูปกุญแจ 🔒 ที่แถบ URL แล้วเลือก "อนุญาต" (Allow) การใช้ไมโครโฟน';
        setError(errorMsg);
      } else if (event.error === 'no-speech') {
         setError('ไม่ได้ยินเสียงพูด กรุณาลองใหม่อีกครั้งใกล้ๆ ไมโครโฟน');
      } else {
        setError('เกิดข้อผิดพลาดในการรับเสียง: ' + event.error);
      }
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSymptoms((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;
    try {
        recognition.start();
    } catch (e) {
        console.error("Failed to start recognition", e);
        setError("ไม่สามารถเริ่มต้นระบบรับเสียงได้");
    }
  };

  const toggleSpeaking = () => {
    if (!('speechSynthesis' in window)) {
      alert('เบราว์เซอร์ของคุณไม่รองรับการอ่านออกเสียง');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      // Clean text for better speech synthesis
      const cleanText = result
        .replace(/[#*]/g, '')
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/&nbsp;/g, ' ');
        
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'th-TH';
      utterance.rate = 0.9; // Slightly slower for clarity
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // ฟังก์ชันช่วย Retry (ลองใหม่) เมื่อเจอ Error
  const generateContentWithRetry = async (ai: GoogleGenAI, params: any, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await ai.models.generateContent(params);
      } catch (error: any) {
        const isRateLimit = error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('503');
        
        if (isRateLimit && i < maxRetries - 1) {
          // คำนวณเวลาถอยหลัง: 1.5s, 3s, 6s... (Exponential Backoff)
          const waitTime = 1500 * Math.pow(2, i);
          setLoadingStatus(`ระบบกำลังหนาแน่น... กำลังเข้าคิวและลองใหม่ (ครั้งที่ ${i + 1})`);
          console.log(`Rate limit hit. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
  };

  const handleAnalyze = async () => {
    if (!symptoms.trim()) {
      setError('กรุณาป้อนอาการของคุณ');
      setIsModalOpen(false);
      return;
    }

    if (dailyUsage >= MAX_DAILY_LIMIT) {
      setError(`คุณใช้วิเคราะห์ครบโควต้า ${MAX_DAILY_LIMIT} ครั้งต่อวันแล้ว กรุณากลับมาใหม่พรุ่งนี้`);
      setIsModalOpen(false);
      return;
    }
    
    setIsModalOpen(false);
    setIsLoading(true);
    setLoadingStatus('กำลังประมวลผลข้อมูล (AI กำลังคิด)...');
    setError(null);
    setResult('');
    
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }

    try {
      // Initialize Gemini Client Side
      // ใช้ Environment variable API_KEY เท่านั้น
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const params = {
        model: 'gemini-2.5-flash',
        contents: symptoms,
        config: {
            systemInstruction: 'คุณคือผู้ช่วยอัจฉริยะด้านสุขภาพ (AI Doctor) หน้าที่ของคุณคือวิเคราะห์อาการป่วยเบื้องต้นจากข้อมูลที่ได้รับ และให้คำแนะนำที่เป็นประโยชน์ด้วย "ภาษาไทย" เท่านั้น!\n\nกฎเหล็ก:\n1. ห้ามตอบเป็นภาษาอังกฤษเด็ดขาด ยกเว้นชื่อเฉพาะทางการแพทย์\n2. คำตอบต้องไม่ใช่การวินิจฉัยทางการแพทย์ และต้องมีข้อความเตือนให้ไปพบแพทย์เสมอ\n3. แบ่งคำตอบเป็น 3 ส่วนชัดเจน: สาเหตุที่เป็นไปได้, การดูแลตนเอง, อาการที่ต้องรีบพบแพทย์\n4. ใช้ภาษาที่เข้าใจง่าย เป็นกันเอง เหมือนหมอใจดี',
            temperature: 0.4,
            topK: 40,
            topP: 0.95,
        }
      };

      // เรียกใช้ฟังก์ชัน Retry Wrapper
      const response = await generateContentWithRetry(ai, params);

      if (!response || !response.text) {
         throw new Error('ไม่ได้รับข้อมูลการวิเคราะห์จากระบบ');
      }

      setResult(response.text);

      // Increment usage count on success
      const newCount = dailyUsage + 1;
      setDailyUsage(newCount);
      localStorage.setItem('shc_usage_count', newCount.toString());

      if (onAnalysisSuccess) {
        onAnalysisSuccess();
      }

    } catch (err: any) {
      console.error("Gemini Error:", err);
      let errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบวิเคราะห์ AI';
      
      // Handle Rate Limit / Quota issues specifically
      if (err.message?.includes('429') || err.message?.includes('quota')) {
          errorMessage = 'ขณะนี้ระบบมีการใช้งานหนาแน่นมาก (ผู้ใช้งานเกิน 100,000 คน) กรุณารอสักครู่แล้วลองใหม่ในภายหลัง';
      } else if (err.message?.includes('API key')) {
          errorMessage = 'เกิดปัญหาเรื่องกุญแจการเข้าถึง (API Key Invalid) กรุณาตรวจสอบการตั้งค่า';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingStatus('กำลังประมวลผลข้อมูล...');
    }
  };
  
  const openConfirmationModal = () => {
    if (!symptoms.trim()) {
      setError('กรุณาป้อนอาการของคุณก่อน');
      return;
    }
    if (dailyUsage >= MAX_DAILY_LIMIT) {
       setError(`คุณใช้วิเคราะห์ครบโควต้า ${MAX_DAILY_LIMIT} ครั้งต่อวันแล้ว กรุณากลับมาใหม่พรุ่งนี้`);
       return;
    }
    setError(null);
    setIsModalOpen(true);
  }

  // Simple HTML cleanup for display if raw text comes back not perfectly formatted
  const formatResult = (text: string) => {
    // Check if it looks like HTML already
    if (text.includes('<h3>') || text.includes('<ul>')) {
        return text;
    }
    // Fallback formatter for Markdown-like text
    return text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br />');
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden flex flex-col h-full relative">
        <div className="p-6 flex-grow flex flex-col">
          <div className="flex items-center justify-between mb-4 pr-8">
            <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0">
                <BrainIcon />
                </div>
                <div>
                <h3 className="text-xl font-bold text-slate-800">วิเคราะห์อาการป่วย (AI)</h3>
                </div>
            </div>
          </div>
          <div className="flex justify-end mb-2">
              <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                  โควต้าวันนี้: {dailyUsage}/{MAX_DAILY_LIMIT}
              </div>
          </div>

          <p className="text-slate-600 mb-5 text-sm">
            ป้อนอาการของคุณเพื่อรับการวิเคราะห์เบื้องต้นด้วย AI (Gemini Flash)
            <strong className="text-red-600 block mt-1">
              เครื่องมือนี้ไม่ใช่การวินิจฉัยทางการแพทย์
            </strong>
          </p>

          <div className="space-y-4 flex-grow flex flex-col">
            <div className="flex-grow relative">
              <label htmlFor="symptoms" className="block text-sm font-medium text-slate-700 mb-2">
                อาการของคุณ
              </label>
              <div className="relative">
                <textarea
                  id="symptoms"
                  rows={5}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-12"
                  placeholder="ตัวอย่าง: ปวดหัวข้างขวาแบบตุบๆ มา 2 วันแล้ว มีอาการคลื่นไส้ร่วมด้วย..."
                />
                <button
                  onClick={toggleListening}
                  className={`absolute bottom-3 right-3 p-2 rounded-full transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse ring-2 ring-red-300' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={isListening ? "กำลังฟัง... คลิกเพื่อหยุด" : "คลิกเพื่อพูด"}
                >
                  <MicIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <button
              onClick={openConfirmationModal}
              disabled={isLoading || dailyUsage >= MAX_DAILY_LIMIT}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'กำลังวิเคราะห์...' : dailyUsage >= MAX_DAILY_LIMIT ? 'ครบโควต้าวันนี้แล้ว' : 'วิเคราะห์อาการ'}
            </button>
          </div>

          {error && (
            <div className="mt-6 text-center bg-red-50 text-red-700 p-4 rounded-lg whitespace-pre-line border border-red-100 animate-fade-in">
              <p className="font-semibold mb-1">เกิดข้อผิดพลาด</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {isLoading && (
              <div className="mt-6 text-center" aria-live="polite">
                  <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <p className="ml-3 text-slate-600 text-sm animate-pulse">{loadingStatus}</p>
                  </div>
              </div>
          )}

          {result && !isLoading && (
            <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200 relative animate-fade-in" aria-live="polite">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800">ผลการวิเคราะห์เบื้องต้น:</h4>
                <button 
                  onClick={toggleSpeaking}
                  className="flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                >
                  {isSpeaking ? (
                    <>
                      <StopIcon className="w-4 h-4" />
                      <span>หยุดอ่าน</span>
                    </>
                  ) : (
                    <>
                      <SpeakerWaveIcon className="w-4 h-4" />
                      <span>อ่านให้ฟัง</span>
                    </>
                  )}
                </button>
              </div>
              <div className="prose prose-sm max-w-none text-slate-700 pr-2 space-y-2">
                  <div dangerouslySetInnerHTML={{ __html: formatResult(result) }} />
              </div>
              <div className="mt-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 text-sm">
                <p className="font-bold">ข้อควรจำที่สำคัญ:</p>
                <p>ผลลัพธ์นี้เป็นเพียงข้อมูลเบื้องต้นเท่านั้น ไม่สามารถใช้แทนการวินิจฉัยจากแพทย์ได้</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        adSlot={<AdBanner />}
      >
        <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">ยืนยันการวิเคราะห์อาการ</h3>
            <p className="text-sm text-slate-600 mt-2">
                ผลลัพธ์จากการวิเคราะห์โดย AI เป็นเพียงข้อมูลเบื้องต้นเพื่อการศึกษาเท่านั้น
                และไม่สามารถใช้แทนการวินิจฉัยจากแพทย์ได้
            </p>
            <div className="mt-6 flex justify-center gap-4">
                <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold hover:bg-slate-300 transition-colors"
                >
                    ยกเลิก
                </button>
                <button
                    onClick={handleAnalyze}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                >
                    ยืนยันและวิเคราะห์
                </button>
            </div>
        </div>
      </Modal>
    </>
  );
};
