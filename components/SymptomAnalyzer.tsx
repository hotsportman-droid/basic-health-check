import React, { useState, useEffect, useRef } from 'react';
import { BrainIcon, MicIcon, SpeakerWaveIcon, StopIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';

const MAX_DAILY_LIMIT = 5;

export const SymptomAnalyzer: React.FC = () => {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const toggleListening = () => {
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
      setError('เกิดข้อผิดพลาดในการรับเสียง: ' + event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSymptoms((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
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
      // Remove markdown symbols for better speech
      const cleanText = result.replace(/[#*]/g, '');
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'th-TH';
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (e) => {
        console.error('Speech synthesis error', e);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
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
    setError(null);
    setResult('');
    // Stop speaking if analyzing new text
    if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }

    try {
      // Call our secure backend function (Groq)
      const response = await fetch('/api/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาดในการสื่อสารกับเซิร์ฟเวอร์');
      }
      
      setResult(data.analysis);

      // Increment usage count on success
      const newCount = dailyUsage + 1;
      setDailyUsage(newCount);
      localStorage.setItem('shc_usage_count', newCount.toString());

    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการวิเคราะห์ โปรดลองอีกครั้ง';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
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

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden flex flex-col h-full">
        <div className="p-6 flex-grow flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0">
                <BrainIcon />
                </div>
                <div>
                <h3 className="text-xl font-bold text-slate-800">วิเคราะห์อาการป่วยเบื้องต้น (SHC)</h3>
                </div>
            </div>
            <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                โควต้าวันนี้: {dailyUsage}/{MAX_DAILY_LIMIT}
            </div>
          </div>
          <p className="text-slate-600 mb-5 text-sm">
            ป้อนอาการของคุณเพื่อรับการวิเคราะห์เบื้องต้นเกี่ยวกับสาเหตุที่เป็นไปได้
            <strong className="text-red-600 block mt-1">
              เครื่องมือนี้ไม่ใช่การวินิจฉัยทางการแพทย์ โปรดปรึกษาแพทย์
            </strong>
          </p>

          <div className="space-y-4 flex-grow flex flex-col">
            <div className="flex-grow relative">
              <label htmlFor="symptoms" className="block text-sm font-medium text-slate-700 mb-2">
                อาการของคุณ (เช่น ปวดหัว, มีไข้, ไอ)
              </label>
              <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-800">
                <p className="font-semibold mb-2">ข้อแนะนำในการบอกอาการ:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><span className="font-semibold">อาการหลัก:</span> เป็นอะไร, ตรงไหน, รุนแรงแค่ไหน</li>
                  <li><span className="font-semibold">ระยะเวลา:</span> เริ่มเป็นเมื่อไหร่, เป็นมานานเท่าไหร่</li>
                  <li><span className="font-semibold">อาการร่วม:</span> มีอาการอื่นร่วมด้วยหรือไม่</li>
                </ul>
              </div>
              <div className="relative">
                <textarea
                  id="symptoms"
                  rows={5}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-12"
                  placeholder="ตัวอย่าง: ปวดหัวข้างขวาแบบตุบๆ มา 2 วันแล้ว มีอาการคลื่นไส้ร่วมด้วย... (กดไอคอนไมค์เพื่อพูดได้)"
                  aria-label="Symptom input"
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
            <div className="mt-6 text-center bg-red-50 text-red-700 p-4 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          {isLoading && (
              <div className="mt-6 text-center" aria-live="polite">
                  <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                      <p className="ml-3 text-slate-600">กำลังประมวลผลข้อมูล...</p>
                  </div>
              </div>
          )}

          {result && !isLoading && (
            <div className="mt-6 bg-slate-50 p-4 rounded-lg border border-slate-200 relative" aria-live="polite">
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
              <div className="prose prose-sm max-w-none text-slate-700 pr-2" dangerouslySetInnerHTML={{ __html: result.replace(/###/g, '<h3>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></div>
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
                ผลลัพธ์จากการวิเคราะห์โดย SHC เป็นเพียงข้อมูลเบื้องต้นเพื่อการศึกษาเท่านั้น
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