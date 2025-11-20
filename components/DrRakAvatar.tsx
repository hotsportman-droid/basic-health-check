import React, { useState, useEffect, useRef } from 'react';
import { MicIcon, StopIcon, StethoscopeIcon, CheckCircleIcon, ExclamationIcon } from './icons';

// Fix: Add missing type definitions for the Web Speech API to resolve compilation errors.
interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// --- PARSING & RENDERING HELPERS ---
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


// --- SUB COMPONENTS ---
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
    </g>
  </svg>
);

// --- MAIN COMPONENT ---
export const DrRakAvatar: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [statusText, setStatusText] = useState('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
    const [transcript, setTranscript] = useState({ input: '', output: '' });
    const [analysisResult, setAnalysisResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const finalTranscriptRef = useRef('');

    const processRequest = async (text: string) => {
        if (!text.trim()) {
            setStatusText('ไม่ได้ยินเสียงพูดค่ะ ลองใหม่อีกครั้ง');
            return;
        };

        setStatusText('กำลังประมวลผล...');

        try {
            const apiResponse = await fetch('/api/gemini', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt: text }),
            });

            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(errorData.error || `API call failed with status: ${apiResponse.status}`);
            }
            
            const data = await apiResponse.json();
            const responseText = data.text;

            if (!responseText) throw new Error("Empty response from AI");

            if (responseText.includes('<analysis>')) {
                const match = responseText.match(/<analysis>([\s\S]*)<\/analysis>/);
                if (match && match[1]) {
                    setAnalysisResult(match[1].trim());
                    speakText('ผลการวิเคราะห์แสดงอยู่ด้านล่างแล้วนะคะ');
                }
            } else {
                setAnalysisResult(null);
                speakText(responseText);
            }
        } catch (err) {
            console.error("API Request Error:", err);
            setError('ขออภัยค่ะ เกิดข้อผิดพลาดในการสื่อสารกับหมอรักษ์');
            setStatusText('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
        }
    };

    const speakText = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        
        utterance.onstart = () => {
            setIsSpeaking(true);
            setTranscript(prev => ({ ...prev, output: text }));
        };
        utterance.onend = () => {
            setIsSpeaking(false);
            setStatusText('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
        };
        utterance.onerror = (event) => {
            console.error('Speech Synthesis Error:', event.error);
            setError('ขออภัยค่ะ เกิดข้อผิดพลาดในการพูด');
            setIsSpeaking(false);
            setStatusText('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
        };
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            setError('เบราว์เซอร์ของคุณไม่รองรับการแปลงเสียงเป็นข้อความค่ะ');
            return;
        }

        const recognition = new SpeechRecognitionAPI();
        recognition.lang = 'th-TH';
        recognition.interimResults = true;
        recognition.continuous = false;
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    final += event.results[i][0].transcript;
                } else {
                    interim += event.results[i][0].transcript;
                }
            }
            finalTranscriptRef.current = final.trim();
            setTranscript({ input: final || interim, output: '' });
        };

        recognition.onend = () => {
            setIsListening(false);
            if(finalTranscriptRef.current) {
                processRequest(finalTranscriptRef.current);
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
            setError(`เกิดข้อผิดพลาดในการรับเสียง: ${event.error}`);
            setIsListening(false);
        };

        return () => {
            window.speechSynthesis.cancel();
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const handleToggleSystem = () => {
        setError(null);
        if (isListening) {
            recognitionRef.current?.stop();
        } else if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            setStatusText('แตะปุ่มไมค์เพื่อเริ่มคุยค่ะ');
        } else {
            if (recognitionRef.current) {
                setTranscript({ input: '', output: '' });
                setAnalysisResult(null);
                finalTranscriptRef.current = '';
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                    setStatusText('กำลังฟังอยู่ค่ะ...');
                } catch (e) {
                    console.error("Error starting recognition:", e);
                    setError("ไม่สามารถเริ่มการรับเสียงได้ค่ะ");
                }
            } else {
                setError('ระบบรู้จำเสียงยังไม่พร้อมใช้งานค่ะ');
            }
        }
    };

    const displayStatus = () => {
        if (error) return <span className="text-red-600 font-semibold">{error}</span>;
        if (isSpeaking) return `หมอรักษ์: ${transcript.output}`;
        if (isListening || transcript.input) return `คุณ: ${transcript.input || '...'}`;
        return statusText;
    };
    
    return (
        <div className="bg-white rounded-2xl shadow-lg border-2 border-indigo-50 p-6 flex flex-col items-center text-center max-w-lg mx-auto">
            <div className="relative mb-4 w-32 h-32">
                <DrRakImage isSpeaking={isSpeaking} />
                {isListening && (
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin"></div>
                )}
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">หมอรักษ์ชวนคุย</h3>
            <p className="text-slate-600 text-sm min-h-[40px] flex items-center justify-center px-4 break-words">
                {displayStatus()}
            </p>

            <button
                onClick={handleToggleSystem}
                className={`mt-4 rounded-full flex items-center justify-center w-16 h-16 transition-all duration-300 shadow-lg ${
                    isListening || isSpeaking ? 'bg-red-500 text-white' : 'bg-indigo-600 text-white'
                }`}
                aria-label={isListening || isSpeaking ? "หยุด" : "เริ่มการสนทนา"}
            >
                {isListening || isSpeaking ? <StopIcon className="w-8 h-8"/> : <MicIcon className="w-8 h-8" />}
            </button>
            {analysisResult && (
                <div className="mt-6 w-full text-left animate-fade-in space-y-4" role="region" aria-label="ผลการวิเคราะห์">
                    <h4 className="text-lg font-bold text-slate-800 flex items-center text-center justify-center">
                        👩‍⚕️ ผลการวิเคราะห์จากหมอรักษ์
                    </h4>
                    <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                        <div className="flex items-center mb-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                                <StethoscopeIcon className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-blue-800 text-lg">อาการที่ตรวจพบ</h5>
                        </div>
                        <div className="text-slate-700 leading-relaxed pl-1 text-sm">
                            <MarkdownContent text={parseAnalysisResult(analysisResult).symptoms} />
                        </div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-5 border border-green-100">
                        <div className="flex items-center mb-3">
                            <div className="p-2 bg-green-100 rounded-lg text-green-600 mr-3">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-green-800 text-lg">คำแนะนำเบื้องต้น</h5>
                        </div>
                        <div className="text-slate-700 leading-relaxed pl-1 text-sm">
                            <MarkdownContent text={parseAnalysisResult(analysisResult).advice} />
                        </div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
                        <div className="flex items-center mb-3">
                            <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                                <ExclamationIcon className="w-6 h-6" />
                            </div>
                            <h5 className="font-bold text-amber-800 text-lg">ข้อควรระวัง</h5>
                        </div>
                        <div className="text-slate-700 leading-relaxed pl-1 text-sm">
                            <MarkdownContent text={parseAnalysisResult(analysisResult).precautions} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
