import React, { useState, useEffect, useRef } from 'react';
import { BrainIcon, MicIcon, SpeakerWaveIcon, StopIcon, SettingsIcon, StethoscopeIcon, CheckCircleIcon, ExclamationIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_CONFIG } from '../constants';

interface SymptomAnalyzerProps {
  onAnalysisSuccess?: () => void;
}

// --- SAFE KEY RETRIEVAL ---
export const getSafeApiKey = (): string | null => {
  try {
    if (SYSTEM_CONFIG.GLOBAL_API_KEY && SYSTEM_CONFIG.GLOBAL_API_KEY.trim().length > 0) {
        return SYSTEM_CONFIG.GLOBAL_API_KEY;
    }
    const localKey = localStorage.getItem('shc_api_key');
    if (localKey && localKey.trim().length > 0) return localKey;
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
const analyzeSymptomsOffline = (input: string): string => {
  const text = input.toLowerCase();
  let symptomsDetected = "";
  let adviceList = "";

  if (text.includes('หัว') || text.includes('ไมเกรน') || text.includes('มึน') || text.includes('เวียน')) {
      symptomsDetected = "คนไข้มีอาการปวดศีรษะและวิงเวียน ซึ่งอาจมีสาเหตุมาจากความเครียด พักผ่อนน้อย หรืออาการไมเกรนกำเริบค่ะ ในบางรายอาจเกิดจากความดันโลหิตที่ไม่ปกติได้เช่นกันค่ะ";
      adviceList = "- ควรนอนพักผ่อนในห้องที่เงียบ สงบ และมีแสงสว่างน้อย เพื่อลดการกระตุ้นประสาทค่ะ\n- หากมีอาการปวดมาก สามารถประคบเย็นบริเวณหน้าผากหรือท้ายทอยช่วยบรรเทาอาการได้ค่ะ\n- พยายามดื่มน้ำเปล่าให้เพียงพอและทานยาแก้ปวดพาราเซตามอลได้หากจำเป็น (ระวังอย่าทานเกินขนาดนะคะ)";
  }
  else if (text.includes('ท้อง') || text.includes('ไส้') || text.includes('อ้วก') || text.includes('ถ่าย') || text.includes('จุก') || text.includes('เสีย')) {
      symptomsDetected = "คนไข้มีอาการระคายเคืองในระบบทางเดินอาหาร ซึ่งอาจเป็นโรคกระเพาะอาหารอักเสบ อาหารเป็นพิษ หรือกรดไหลย้อนค่ะ ทำให้รู้สึกจุกเสียด ปวดท้อง หรือขับถ่ายผิดปกติ";
      adviceList = "- งดทานอาหารรสจัด เผ็ดจัด เปรี้ยวจัด รวมถึงของทอดและของมันในช่วงนี้นะคะ\n- เลือกทานอาหารอ่อนๆ ที่ย่อยง่าย เช่น ข้าวต้ม หรือโจ๊ก จนกว่าอาการจะดีขึ้นค่ะ\n- หากมีการถ่ายท้องหรืออาเจียน ต้องจิบน้ำเกลือแร่ (ORS) บ่อยๆ เพื่อชดเชยน้ำที่สูญเสียไปค่ะ\n- สามารถทานยาช่วยย่อย ยาขับลม หรือยาแก้ปวดท้องตามอาการได้ค่ะ";
  }
  else if (text.includes('ไข้') || text.includes('ร้อน') || text.includes('หนาว') || text.includes('สั่น')) {
      symptomsDetected = "คนไข้มีไข้หรืออุณหภูมิร่างกายสูงกว่าปกติ ซึ่งเป็นกลไกที่ร่างกายกำลังต่อสู้กับการติดเชื้อหรือการอักเสบค่ะ อาจทำให้รู้สึกหนาวสั่นหรือปวดเมื่อยตัวร่วมด้วยค่ะ";
      adviceList = "- หมั่นเช็ดตัวด้วยน้ำอุณหภูมิห้อง (ห้ามใช้น้ำเย็นจัด) เพื่อช่วยลดความร้อนในร่างกายค่ะ\n- ดื่มน้ำอุ่นหรือน้ำอุณหภูมิห้องมากๆ อย่างน้อยวันละ 8-10 แก้ว เพื่อไม่ให้ร่างกายขาดน้ำค่ะ\n- ทานยาลดไข้พาราเซตามอลทุก 4-6 ชั่วโมงหากยังมีไข้ และควรนอนพักผ่อนให้มากๆ ค่ะ";
  }
  else if (text.includes('คอ') || text.includes('ไอ') || text.includes('เสมหะ') || text.includes('หวัด') || text.includes('มูก')) {
      symptomsDetected = "คนไข้มีอาการติดเชื้อทางเดินหายใจส่วนต้น ทำให้เกิดการระคายเคืองคอ มีเสมหะ หรือน้ำมูกไหลค่ะ ซึ่งมักเกิดจากเชื้อไวรัสไข้หวัด หรือการแพ้อากาศค่ะ";
      adviceList = "- จิบน้ำอุ่นผสมมะนาว หรือน้ำผึ้ง บ่อยๆ จะช่วยให้ชุ่มคอและละลายเสมหะได้ดีค่ะ\n- กลั้วคอด้วยน้ำเกลืออุ่นๆ เช้าและเย็น เพื่อลดเชื้อโรคในลำคอค่ะ\n- สวมหน้ากากอนามัยเพื่อป้องกันการแพร่เชื้อ และหลีกเลี่ยงการโดนลมเย็นหรืออากาศเย็นจัดนะคะ";
  }
  else if (text.includes('ผื่น') || text.includes('คัน') || text.includes('ตุ่ม') || text.includes('แดง')) {
      symptomsDetected = "คนไข้มีอาการระคายเคืองผิวหนัง หรือผื่นแพ้ค่ะ ซึ่งอาจเกิดจากการสัมผัสสารเคมี แมลงกัดต่อย หรือภูมิแพ้ผิวหนังค่ะ ทำให้เกิดรอยแดงและอาการคัน";
      adviceList = "- หลีกเลี่ยงการเกาบริเวณที่เป็นเด็ดขาดนะคะ เพราะอาจทำให้เกิดแผลและติดเชื้อได้\n- อาบน้ำด้วยสบู่ที่อ่อนโยน ไม่ขัดถูแรงๆ และทาโลชั่นให้ความชุ่มชื้นหลังอาบน้ำค่ะ\n- ลองสังเกตว่าช่วงนี้ได้สัมผัสสบู่ ผงซักฟอก หรือทานอาหารแปลกใหม่หรือไม่ เพื่อหลีกเลี่ยงสิ่งกระตุ้นค่ะ";
  }
  else if (text.includes('ปวด') || text.includes('เมื่อย') || text.includes('เจ็บ') || text.includes('หลัง') || text.includes('เอว')) {
       symptomsDetected = "คนไข้มีอาการปวดเมื่อยกล้ามเนื้อ หรือกล้ามเนื้ออักเสบค่ะ อาจเกิดจากการใช้งานหนัก ยกของผิดท่า หรือนั่งในท่าเดิมนานเกินไปค่ะ";
       adviceList = "- พักการใช้งานกล้ามเนื้อส่วนที่ปวด หลีกเลี่ยงการยกของหนักในช่วงนี้นะคะ\n- หากเพิ่งมีอาการบาดเจ็บใน 24 ชม.แรก ให้ประคบเย็น แต่ถ้าปวดเรื้อรังมานานให้ประคบอุ่นค่ะ\n- ยืดเหยียดกล้ามเนื้อเบาๆ และปรับเปลี่ยนท่าทางบ่อยๆ ไม่ควรนั่งนานเกินไปค่ะ";
  }
  else {
      symptomsDetected = "อาการที่คนไข้แจ้งมาอาจเกิดจากความอ่อนเพลียทั่วไป หรือความเครียดสะสมค่ะ ซึ่งส่งผลต่อระบบต่างๆ ของร่างกายได้";
      adviceList = "- พยายามนอนหลับพักผ่อนให้เพียงพอ อย่างน้อยวันละ 8 ชั่วโมงนะคะ\n- ดื่มน้ำสะอาดให้เพียงพอ และรับประทานอาหารให้ครบ 5 หมู่ค่ะ\n- ลองสังเกตอาการดูอาการอีกครั้ง หากมีอาการอื่นๆ เพิ่มเติมค่อยมาปรึกษาหมอใหม่อีกรอบนะคะ";
  }

  return `### อาการที่ตรวจพบ\n${symptomsDetected}\n\n### คำแนะนำเบื้องต้น\n${adviceList}\n\n### ข้อควรระวัง\nหากอาการคนไข้ยังไม่ดีขึ้นภายใน 24-48 ชั่วโมง หรือมีอาการรุนแรงขึ้น เช่น หายใจไม่ออก หน้ามืด หมดสติ หรือปวดทนไม่ไหว ให้รีบให้ญาติพาไปโรงพยาบาลทันทีนะคะ`;
};

const parseAnalysisResult = (text: string) => {
  const sections = {
    symptoms: '',
    advice: '',
    precautions: ''
  };
  if (!text) return sections;
  const symptomsMatch = text.match(/### อาการที่ตรวจพบ([\s\S]*?)(?=###|$)/);
  const adviceMatch = text.match(/### คำแนะนำเบื้องต้น([\s\S]*?)(?=###|$)/);
  const precautionsMatch = text.match(/### ข้อควรระวัง([\s\S]*?)(?=###|$)/);

  if (symptomsMatch) sections.symptoms = symptomsMatch[1].trim();
  if (adviceMatch) sections.advice = adviceMatch[1].trim();
  if (precautionsMatch) sections.precautions = precautionsMatch[1].trim();
  
  if (!sections.symptoms && !sections.advice && !sections.precautions) {
    sections.symptoms = text;
  }
  return sections;
};

const MarkdownContent = ({ text }: { text: string }) => {
    if (!text) return <p className="text-slate-400 italic">ไม่มีข้อมูล</p>;
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const elements: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];

    lines.forEach((line, idx) => {
        const cleanLine = line.trim();
        if (cleanLine.startsWith('-') || cleanLine.startsWith('*')) {
             const content = cleanLine.replace(/^[\-\*]\s?/, '');
             const boldParsed = content.split(/(\*\*.*?\*\*)/).map((part, i) => 
                part.startsWith('**') && part.endsWith('**') 
                ? <strong key={i} className="text-slate-900">{part.slice(2, -2)}</strong> 
                : part
             );
             currentList.push(<li key={`li-${idx}`} className="mb-1">{boldParsed}</li>);
        } else {
             if (currentList.length > 0) {
                 elements.push(<ul key={`ul-${idx}`} className="list-disc pl-5 mb-3 space-y-1">{[...currentList]}</ul>);
                 currentList = [];
             }
             const boldParsed = cleanLine.split(/(\*\*.*?\*\*)/).map((part, i) => 
                part.startsWith('**') && part.endsWith('**') 
                ? <strong key={i} className="text-slate-900">{part.slice(2, -2)}</strong> 
                : part
             );
             elements.push(<p key={`p-${idx}`} className="mb-2">{boldParsed}</p>);
        }
    });
    if (currentList.length > 0) {
        elements.push(<ul key={`ul-end`} className="list-disc pl-5 mb-3 space-y-1">{[...currentList]}</ul>);
    }
    return <>{elements}</>;
};

export const SymptomAnalyzer: React.FC<SymptomAnalyzerProps> = ({ onAnalysisSuccess }) => {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('กำลังประมวลผล...');
  const [error, setError] = useState<string | null>(null);
  
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  
  // Voice Input States (Simplified for one-shot STT)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Voice Output States
  const [isSpeaking, setIsSpeaking] = useState(false);
  const shouldSpeakRef = useRef(false);
  
  const [speechRate, setSpeechRate] = useState(0.75);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const stopSpeaking = () => {
    shouldSpeakRef.current = false;
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  useEffect(() => {
    const loadVoices = () => {
        if (!('speechSynthesis' in window)) return;
        const voices = window.speechSynthesis.getVoices();
        const thaiVoices = voices.filter(v => v.lang.includes('th'));
        if (thaiVoices.length > 0) {
            setAvailableVoices(thaiVoices);
        } else {
            setAvailableVoices([]); 
        }
    };
    loadVoices();
    if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    const savedRate = localStorage.getItem('shc_speech_rate');
    if (savedRate) setSpeechRate(parseFloat(savedRate));
    const savedVoice = localStorage.getItem('shc_voice_uri');
    if (savedVoice) setSelectedVoiceURI(savedVoice);

    return () => {
      stopSpeaking();
      if ('speechSynthesis' in window) {
          window.speechSynthesis.onvoiceschanged = null;
      }
      if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
      }
    };
  }, []);

  const handleRateChange = (newRate: number) => {
      setSpeechRate(newRate);
      localStorage.setItem('shc_speech_rate', newRate.toString());
  };

  const handleVoiceChange = (uri: string) => {
      setSelectedVoiceURI(uri);
      localStorage.setItem('shc_voice_uri', uri);
  };

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    stopSpeaking();
    shouldSpeakRef.current = true;
    setIsSpeaking(true);

    const cleanText = text.replace(/[#*]/g, '').replace(/<\/?[^>]+(>|$)/g, "");
    const rawChunks = cleanText.split(/[\n\r]+/);
    const chunks: string[] = [];

    rawChunks.forEach(chunk => {
        chunk = chunk.trim();
        if (!chunk) return;
        if (chunk.length > 150) {
            const subChunks = chunk.match(/.{1,150}(?:\s|$)/g);
            if (subChunks) subChunks.forEach(s => chunks.push(s));
            else chunks.push(chunk);
        } else {
            chunks.push(chunk);
        }
    });

    if (chunks.length === 0) {
        setIsSpeaking(false);
        return;
    }

    let currentIndex = 0;
    const allVoices = window.speechSynthesis.getVoices();

    const playNext = () => {
        if (!shouldSpeakRef.current || currentIndex >= chunks.length) {
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
            return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[currentIndex]);
        utterance.lang = 'th-TH';
        utterance.rate = speechRate;
        utterance.volume = 1;

        if (selectedVoiceURI) {
            const userVoice = allVoices.find(v => v.voiceURI === selectedVoiceURI);
            if (userVoice) utterance.voice = userVoice;
        } else {
            const thaiVoice = allVoices.find(v => v.lang === 'th-TH');
            if (thaiVoice) utterance.voice = thaiVoice;
        }

        utterance.onend = () => {
            currentIndex++;
            playNext();
        };
        utterance.onerror = (e) => {
            setIsSpeaking(false);
            shouldSpeakRef.current = false;
        };
        window.speechSynthesis.speak(utterance);
    };

    playNext();
  };

  const handleMicClick = () => {
    if (isListening) {
        recognitionRef.current?.stop();
        return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setError('เครื่องของคุณไม่รองรับการสั่งงานด้วยเสียงค่ะ');
        return;
    }

    setError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;
    
    let finalTranscript = symptoms;

    recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += (finalTranscript ? ' ' : '') + event.results[i][0].transcript.trim();
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }
        setSymptoms(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') setError('กรุณาอนุญาตให้ใช้ไมโครโฟนค่ะ');
        else if (event.error === 'no-speech') setError('ไม่ได้ยินเสียงพูด กรุณาลองใหม่ค่ะ');
        else setError('เกิดข้อผิดพลาดในการรับเสียงค่ะ');
        setIsListening(false);
    };
    
    recognition.onend = () => {
        setIsListening(false);
        setSymptoms(prev => prev.trim());
    };

    recognition.start();
    setIsListening(true);
  };

  const performAnalysis = async () => {
    setIsConfirmModalOpen(false);
    setIsLoading(true);
    setLoadingStatus('หมอรักษ์กำลังวิเคราะห์ข้อมูล...');
    setError(null);
    setResult('');
    speak("กำลังวิเคราะห์ข้อมูล รอสักครู่นะคะ");

    try {
      const apiKey = getSafeApiKey();
      let text = "";

      if (apiKey && navigator.onLine) {
        try {
            const ai = new GoogleGenAI({ apiKey });
            const params = {
              model: 'gemini-2.5-flash',
              contents: symptoms,
              config: {
                  systemInstruction: 'คุณคือ "หมอรักษ์" หมอประจำบ้านผู้หญิง ใจดี พูดภาษาไทยง่ายๆ สำหรับผู้สูงอายุ\n\nหน้าที่:\nวิเคราะห์อาการแล้วตอบโดยจัดรูปแบบดังนี้เท่านั้น:\n\n### อาการที่ตรวจพบ\n(อธิบายความเป็นไปได้ของโรคหรือสาเหตุอย่างละเอียดและเข้าใจง่าย)\n\n### คำแนะนำเบื้องต้น\n(แนะนำวิธีดูแลตัวเองอย่างละเอียด เป็นข้อๆ ใช้สัญลักษณ์ - ควรบอกปริมาณหรือระยะเวลาที่ชัดเจนถ้าทำได้)\n\n### ข้อควรระวัง\n(อาการสัญญาณเตือนที่ต้องรีบไปพบแพทย์ทันที)\n\nกฎการตอบ:\n1. ใช้ภาษาพูดสุภาพ นุ่มนวล ลงท้ายด้วย "ค่ะ" เสมอ\n2. เรียกผู้ใช้งานว่า "คนไข้" ห้ามใช้คำอื่น\n3. อธิบายให้ชัดเจนและละเอียด เพื่อให้คนไข้เข้าใจสาเหตุและการปฏิบัติตัว\n4. ห้ามตอบนอกเหนือจาก 3 หัวข้อที่กำหนด',
                  temperature: 0.4,
              }
            };
            const aiPromise = ai.models.generateContent(params);
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 25000));
            const response: any = await Promise.race([aiPromise, timeoutPromise]);
            if (response && response.text) {
                text = response.text;
            }
        } catch (apiErr: any) {
            console.warn("AI Connection issue", apiErr);
        }
      }
      
      if (!text) {
         await new Promise(r => setTimeout(r, 1500));
         text = analyzeSymptomsOffline(symptoms);
      }

      setResult(text);
      if (onAnalysisSuccess) onAnalysisSuccess();
      
      const intro = "วิเคราะห์เสร็จแล้วค่ะ ";
      speak(intro + text); 

    } catch (err: any) {
      const safeText = analyzeSymptomsOffline(symptoms);
      setResult(safeText);
      speak("วิเคราะห์เสร็จแล้วค่ะ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 overflow-hidden flex flex-col h-full relative">
        <div className="p-6 flex-grow flex flex-col">
          
          <div className="flex items-center mb-6">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0 shadow-sm">
                <BrainIcon className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">หมอรักษ์ ประจำบ้าน</h3>
                <p className="text-slate-500 text-sm">ผู้ช่วยวิเคราะห์อาการเบื้องต้น</p>
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
                placeholder="พิมพ์อาการ หรือกดไมค์เพื่อพูด..."
                aria-label="ช่องใส่ข้อความอาการเจ็บป่วย"
              />
               <button
                  onClick={handleMicClick}
                  className={`absolute bottom-4 right-4 rounded-full flex items-center justify-center w-12 h-12 transition-all shadow-md ${
                    isListening 
                      ? 'bg-red-500 text-white ring-4 ring-red-200 animate-pulse' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                  aria-label={isListening ? "หยุดพูด" : "พูดอาการ"}
                  title={isListening ? "แตะเพื่อหยุด" : "แตะเพื่อพูด"}
                >
                  <MicIcon className="w-6 h-6" />
                </button>
            </div>

            <button
                onClick={() => {
                    if (!symptoms.trim()) {
                        const msg = "กรุณาบอกอาการก่อนนะคะ";
                        setError(msg);
                        speak(msg);
                        return;
                    }
                    setIsConfirmModalOpen(true);
                }}
                disabled={isLoading}
                className="w-full h-16 bg-indigo-600 text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
                aria-label="กดเพื่อเริ่มวิเคราะห์อาการ"
              >
                {isLoading ? 'กำลังคิด...' : 'วิเคราะห์อาการ'}
              </button>
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
            <div className="mt-6 animate-fade-in space-y-4" role="region" aria-label="ผลการวิเคราะห์">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-slate-800 flex items-center">
                    👩‍⚕️ ผลการวิเคราะห์จากหมอรักษ์
                </h4>
                <div className="flex space-x-2">
                   <button
                      onClick={() => setIsVoiceSettingsOpen(true)}
                      className="flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      aria-label="ตั้งค่าเสียงพูด"
                   >
                      <SettingsIcon className="w-5 h-5" />
                   </button>
                   <button 
                      onClick={() => isSpeaking ? stopSpeaking() : speak(result)}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-white rounded-full shadow-sm text-indigo-600 font-bold text-sm hover:bg-indigo-50 border border-indigo-100"
                      aria-label={isSpeaking ? "หยุดอ่าน" : "อ่านผลลัพธ์ให้ฟัง"}
                   >
                      {isSpeaking ? <StopIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
                      <span>{isSpeaking ? 'หยุดเสียง' : 'ฟังผล'}</span>
                   </button>
                </div>
              </div>
              
                {(() => {
                    const sections = parseAnalysisResult(result);
                    return (
                        <div className="space-y-4">
                            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                                <div className="flex items-center mb-3">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                                        <StethoscopeIcon className="w-6 h-6" />
                                    </div>
                                    <h5 className="font-bold text-blue-800 text-lg">อาการที่ตรวจพบ</h5>
                                </div>
                                <div className="text-slate-700 leading-relaxed pl-1">
                                    <MarkdownContent text={sections.symptoms} />
                                </div>
                            </div>

                            <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                                <div className="flex items-center mb-3">
                                    <div className="p-2 bg-green-100 rounded-lg text-green-600 mr-3">
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </div>
                                    <h5 className="font-bold text-green-800 text-lg">คำแนะนำเบื้องต้น</h5>
                                </div>
                                <div className="text-slate-700 leading-relaxed pl-1">
                                    <MarkdownContent text={sections.advice} />
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                                <div className="flex items-center mb-3">
                                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                                        <ExclamationIcon className="w-6 h-6" />
                                    </div>
                                    <h5 className="font-bold text-amber-800 text-lg">ข้อควรระวัง</h5>
                                </div>
                                <div className="text-slate-700 leading-relaxed pl-1">
                                    <MarkdownContent text={sections.precautions} />
                                </div>
                            </div>
                        </div>
                    );
                })()}

              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                <p className="text-slate-500 text-xs">
                    ระบบใช้ AI ในการวิเคราะห์ ข้อมูลอาจมีความคลาดเคลื่อน โปรดใช้วิจารณญาณ หากอาการไม่ดีขึ้นควรปรึกษาแพทย์
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} adSlot={<AdBanner />}>
        <div className="text-center p-2">
            <h3 className="text-2xl font-bold text-slate-800 mb-2">พร้อมให้หมอตรวจไหมคะ?</h3>
            <p className="text-slate-600 mb-8 text-lg">
                ข้อมูลนี้ไม่ใช่การรักษาจริงนะคะ
            </p>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="py-4 rounded-xl bg-slate-200 text-slate-700 font-bold text-lg hover:bg-slate-300"
                >
                    ยกเลิก
                </button>
                <button
                    onClick={performAnalysis}
                    className="py-4 rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg hover:bg-indigo-700"
                >
                    ตรวจเลย
                </button>
            </div>
        </div>
      </Modal>

       <Modal isOpen={isVoiceSettingsOpen} onClose={() => setIsVoiceSettingsOpen(false)}>
         <div className="p-2">
            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">ตั้งค่าเสียงพูด 🔊</h3>
            <div className="mb-6">
                <label htmlFor="speechRate" className="block text-sm font-bold text-slate-700 mb-2">
                    ความเร็วเสียงพูด ({speechRate})
                </label>
                <input 
                    type="range" 
                    id="speechRate"
                    min="0.5" 
                    max="1.5" 
                    step="0.05" 
                    value={speechRate}
                    onChange={(e) => handleRateChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>ช้า</span>
                    <span>ปกติ</span>
                    <span>เร็ว</span>
                </div>
            </div>
            {availableVoices.length > 0 && (
                <div className="mb-8">
                    <label htmlFor="voiceSelect" className="block text-sm font-bold text-slate-700 mb-2">
                        เลือกเสียง
                    </label>
                    <select
                        id="voiceSelect"
                        value={selectedVoiceURI}
                        onChange={(e) => handleVoiceChange(e.target.value)}
                        className="block w-full p-2.5 bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="">เลือกเสียงอัตโนมัติ</option>
                        {availableVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                                {voice.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div className="flex gap-3">
                <button
                    onClick={() => speak("สวัสดีค่ะ นี่คือเสียงตัวอย่างของหมอรักษ์ค่ะ")}
                    className="flex-1 py-2 bg-indigo-100 text-indigo-700 font-bold rounded-lg hover:bg-indigo-200 transition-colors"
                >
                    ทดสอบเสียง
                </button>
                <button
                    onClick={() => setIsVoiceSettingsOpen(false)}
                    className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    ตกลง
                </button>
            </div>
         </div>
       </Modal>
    </>
  );
};