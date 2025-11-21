import React, { useState, useEffect, useRef } from 'react';
import { StethoscopeIcon, CheckCircleIcon, ExclamationIcon, SpeakerWaveIcon, MicIcon, StopIcon, VolumeOffIcon, MapPinIcon, HistoryIcon, ChevronDownIcon } from './icons';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";

// --- Types ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
type InteractionState = 'idle' | 'waitingForWakeWord' | 'listeningPrimary' | 'askingConfirmation' | 'listeningConfirmation' | 'analyzing' | 'speaking';

interface Analysis {
  assessment: string;
  recommendation: string;
  warning: string;
}

interface HistoryItem {
    id: number;
    date: string;
    symptoms: string;
    analysis: Analysis;
}


// --- UI HELPERS ---
const MarkdownContent = ({ text }: { text: string }) => {
    // Render rich text content, handling lists and paragraphs.
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

const DrRakImage = ({ onMicClick, interactionState }: { onMicClick: () => void, interactionState: InteractionState }) => (
  <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 group">
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl filter transition-transform duration-500 transform group-hover:scale-105">
      <circle cx="100" cy="100" r="90" fill={interactionState === 'waitingForWakeWord' ? '#E0E7FF' : '#FCE7F3'} className={`opacity-70 transition-colors duration-500 ${['listeningPrimary', 'listeningConfirmation', 'speaking', 'waitingForWakeWord'].includes(interactionState) ? 'animate-pulse' : ''}`} />
      <circle cx="100" cy="100" r="82" fill="#FFFFFF" stroke="#F1F5F9" strokeWidth="2" />
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
        {interactionState === 'speaking' ? <ellipse cx="100" cy="115" rx="10" ry="3" fill="#DB2777" /> : <path d="M90,115 Q100,120 110,115" fill="none" stroke="#DB2777" strokeWidth="2" strokeLinecap="round" />}
        <path d="M138,165 Q150,165 150,130 Q150,110 135,110" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <path d="M62,165 Q50,165 50,130 Q50,110 65,110" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <circle cx="138" cy="170" r="7" fill="#CBD5E1" stroke="#475569" strokeWidth="2" />
      </g>
    </svg>
    <button onClick={onMicClick} className={`absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center justify-center rounded-full p-2.5 shadow-md transition-all duration-300 z-20 ${['listeningPrimary', 'listeningConfirmation'].includes(interactionState) ? 'bg-red-500 hover:bg-red-600 animate-pulse scale-110' : interactionState === 'waitingForWakeWord' ? 'bg-blue-500 hover:bg-blue-600 scale-105 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`} aria-label={['listeningPrimary', 'listeningConfirmation'].includes(interactionState) ? "หยุดพูด" : "เริ่มพูด"}>
        {['listeningPrimary', 'listeningConfirmation'].includes(interactionState) ? <StopIcon className="w-6 h-6 text-white" /> : <MicIcon className="w-6 h-6 text-white" />}
    </button>
  </div>
);

// --- MAIN COMPONENT ---
export const DrRakAvatar: React.FC = () => {
    const [symptoms, setSymptoms] = useState('');
    const [analysisResult, setAnalysisResult] = useState<Analysis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFindHospitalButton, setShowFindHospitalButton] = useState(false);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    const [_interactionState, _setInteractionState] = useState<InteractionState>('idle');
    const interactionStateRef = useRef(_interactionState);
    const setInteractionState = (state: InteractionState) => {
      interactionStateRef.current = state;
      _setInteractionState(state);
    };

    const symptomsRef = useRef(symptoms);
    useEffect(() => {
        symptomsRef.current = symptoms;
    }, [symptoms]);

    const [isMuted, setIsMuted] = useState(false);
    const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
    const recognitionRef = useRef<any>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const wakeWordDetectedRef = useRef(false);
    const silenceTimerRef = useRef<number | null>(null);
    
    // --- Load History & Voice Synthesis Setup ---
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('dr_rak_conversation_history');
            if (savedHistory) setHistory(JSON.parse(savedHistory));
        } catch (e) { console.error("Error loading history", e); }
        
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                const thaiVoice = voices.find(v => v.lang === 'th-TH' && v.name.includes('Kanya')) || voices.find(v => v.lang === 'th-TH');
                if (thaiVoice) setSelectedVoice(thaiVoice);
            }
        };
        window.speechSynthesis.onvoiceschanged = loadVoices;
        loadVoices();

        return () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (recognitionRef.current) recognitionRef.current.stop();
            window.speechSynthesis.cancel();
            window.speechSynthesis.onvoiceschanged = null;
        };
    }, []);

    const speak = (text: string, onEndCallback?: () => void) => {
        if ('speechSynthesis' in window && !isMuted) {
            setInteractionState('speaking');
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'th-TH';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            if (selectedVoice) utterance.voice = selectedVoice;

            utterance.onend = () => {
                if (onEndCallback) {
                    onEndCallback();
                } else {
                    setInteractionState('idle');
                }
            };
            utteranceRef.current = utterance;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        } else {
            if (onEndCallback) onEndCallback();
        }
    };
    
    const handleAnalyze = React.useCallback(async () => {
        const currentSymptoms = symptomsRef.current;
        if (!currentSymptoms.trim()) {
            setError("กรุณาบอกอาการเบื้องต้นก่อนค่ะ");
            return;
        }
        setAnalysisResult(null);
        setError(null);
        setIsAnalyzing(true);
        setShowFindHospitalButton(false);
        setInteractionState('analyzing');
        
        try {
            if (!process.env.API_KEY) throw new Error("API key is not configured.");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const instruction = `คุณคือ "หมอรักษ์" AI ผู้ช่วยสุขภาพวิเคราะห์อาการเบื้องต้นจากข้อมูลที่ได้รับอย่างละเอียดถี่ถ้วน ตอบกลับเป็นภาษาไทยโดยใช้โครงสร้างดังนี้เท่านั้น:
[ASSESSMENT]
(ประเมินอาการที่เป็นไปได้ 2-3 ข้อ โดยอิงจากข้อมูลที่ผู้ใช้ให้มาอย่างสมเหตุสมผล)
[RECOMMENDATION]
(ให้คำแนะนำในการดูแลตัวเองเบื้องต้นที่ทำได้จริงและปลอดภัย)
[WARNING]
(ระบุสัญญาณอันตรายที่ควรรีบไปพบแพทย์ทันที หากมี)

อาการของผู้ใช้: "${currentSymptoms}"`;
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: "user", parts: [{ text: instruction }] }], safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }, { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }] });

            const resultText = response.text || '';
            const parsedResult = parseAnalysis(resultText);
            setAnalysisResult(parsedResult);
            
            const newHistoryItem: HistoryItem = { id: Date.now(), date: new Date().toLocaleString('th-TH'), symptoms: currentSymptoms, analysis: parsedResult };
            setHistory(prev => {
                const newHistory = [newHistoryItem, ...prev].slice(0, 20); // Keep last 20
                localStorage.setItem('dr_rak_conversation_history', JSON.stringify(newHistory));
                return newHistory;
            });

            if (resultText.includes('โรงพยาบาล') || resultText.includes('คลินิก')) setShowFindHospitalButton(true);
            const toSpeak = parsedResult.assessment ? `จากการประเมินเบื้องต้นนะคะ ${parsedResult.assessment}` : "การวิเคราะห์เสร็จสิ้นแล้วค่ะ";
            speak(toSpeak);

        } catch (err: any) {
            const errorMsg = "ขออภัยค่ะ เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล";
            setError(errorMsg);
            speak(errorMsg);
        } finally {
            setIsAnalyzing(false);
            if (interactionStateRef.current !== 'speaking') setInteractionState('idle');
        }
    }, [isMuted, selectedVoice]);

    const handleError = (errorMessage: string, speakMessage?: string) => {
        setError(errorMessage);
        speak(speakMessage || errorMessage);
    };

    const startListening = (mode: 'wakeWord' | 'primary' | 'confirmation') => {
        if (!SpeechRecognition) {
            setError("ขออภัยค่ะ เบราว์เซอร์ของคุณไม่รองรับการสั่งการด้วยเสียง");
            return;
        }
        if (recognitionRef.current) recognitionRef.current.stop();
        
        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.interimResults = true;
        recognition.continuous = true;

        recognition.onresult = (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
            }
            finalTranscript = finalTranscript.trim();

            if (mode === 'wakeWord' && !wakeWordDetectedRef.current) {
                if (finalTranscript.includes("หมอ")) {
                    wakeWordDetectedRef.current = true;
                    recognition.stop();
                    const greeting = "สวัสดีค่ะ ได้ยินแล้วค่ะ เล่าอาการให้หมอฟังได้เลยนะคะ";
                    speak(greeting, () => startListening('primary'));
                }
            } else if (mode === 'primary' || mode === 'confirmation') {
                if(finalTranscript) setSymptoms(prev => (prev.trim() + ' ' + finalTranscript).trim());
                silenceTimerRef.current = window.setTimeout(() => recognition.stop(), 3000); // 3 sec silence
            }
        };

        recognition.onerror = (event: any) => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                handleError(
                    `เกิดข้อผิดพลาดในการรับเสียง: ${event.error}`, 
                    "ขออภัยค่ะ มีปัญหาในการรับสัญญาณเสียง กรุณาลองอีกครั้งนะคะ"
                );
            }
        };

        recognition.onend = () => {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            const currentState = interactionStateRef.current;
            
            if (currentState === 'listeningPrimary') {
                if (symptomsRef.current.trim().length > 0) {
                    speak("มีอาการอื่นเพิ่มเติมอีกไหมคะ", () => startListening('confirmation'));
                } else {
                    setInteractionState('idle');
                }
            } else if (currentState === 'listeningConfirmation') {
                speak("รับทราบข้อมูลค่ะ กำลังวิเคราะห์อาการสักครู่นะคะ", () => handleAnalyze());
            } else if (currentState === 'waitingForWakeWord' && !wakeWordDetectedRef.current) {
                startListening('wakeWord'); // Keep listening for wake word
            } else {
                setInteractionState('idle');
            }
        };

        recognitionRef.current = recognition;
        recognition.start();

        if (mode === 'wakeWord') setInteractionState('waitingForWakeWord');
        else if (mode === 'primary') setInteractionState('listeningPrimary');
        else if (mode === 'confirmation') setInteractionState('listeningConfirmation');
    };

    const stopListening = () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; 
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setInteractionState('idle');
    };

    const handleMicClick = async () => {
        if (['listeningPrimary', 'listeningConfirmation', 'waitingForWakeWord'].includes(interactionStateRef.current)) {
            stopListening();
        } else {
             try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                wakeWordDetectedRef.current = false;
                startListening('wakeWord');
            } catch (err) {
                setError("กรุณาอนุญาตให้ใช้ไมโครโฟนเพื่อคุยกับหมอค่ะ");
            }
        }
    };
    
    const parseAnalysis = (text: string): Analysis => {
        const assessment = text.split('[ASSESSMENT]')[1]?.split('[RECOMMENDATION]')[0]?.trim() || '-';
        const recommendation = text.split('[RECOMMENDATION]')[1]?.split('[WARNING]')[0]?.trim() || '-';
        const warning = text.split('[WARNING]')[1]?.trim() || '-';
        return { assessment, recommendation, warning };
    };
    
    const getStatusText = () => {
        switch (_interactionState) {
            case 'idle': return "กดปุ่มไมค์เพื่อเริ่มปรึกษาค่ะ";
            case 'waitingForWakeWord': return 'พร้อมรับฟัง... กรุณาเรียก "หมอ" เพื่อเริ่มสนทนาค่ะ';
            case 'listeningPrimary': return 'กำลังฟังอาการ...';
            case 'askingConfirmation':
            case 'listeningConfirmation': return 'มีอาการอื่นเพิ่มเติมอีกไหมคะ...';
            case 'analyzing': return 'กำลังวิเคราะห์อาการ...';
            case 'speaking': return 'หมอรักษ์กำลังพูด...';
            default: return '';
        }
    };


  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6 md:p-8">
      
      <div className="text-center">
        <DrRakImage onMicClick={handleMicClick} interactionState={_interactionState} />
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">ปรึกษาหมอรักษ์</h2>
        <p className="text-slate-500 mt-2 text-sm md:text-base max-w-lg mx-auto">
          เพื่อนคู่คิดข้างเตียง พร้อมรับฟังและให้คำแนะนำเบื้องต้น
        </p>
         <p className="text-xs text-slate-400 mt-3 min-h-[16px]">
            {getStatusText()}
        </p>
      </div>

      <div className="mt-6 max-w-xl mx-auto">
        <div className="relative">
             <textarea id="symptoms-textarea" rows={4} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="อาการของคุณจะปรากฏที่นี่..." className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition" disabled={_interactionState !== 'idle'}/>
            <button onClick={() => setIsMuted(p => !p)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600">
                {isMuted ? <VolumeOffIcon className="w-6 h-6"/> : <SpeakerWaveIcon className="w-6 h-6"/>}
            </button>
        </div>
       
        <button onClick={handleAnalyze} disabled={isAnalyzing || _interactionState !== 'idle' || !symptoms.trim()} className="w-full mt-4 bg-pink-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed">
          {isAnalyzing ? ( <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> กำลังวิเคราะห์... </> ) : ( <> <StethoscopeIcon className="w-5 h-5 mr-2" /> วิเคราะห์อาการ </> )}
        </button>
      </div>
      
      {error && ( <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-center text-sm animate-fade-in"> {error} </div> )}
      {analysisResult && (
        <div className="mt-8 animate-fade-in">
            <AnalysisResult result={analysisResult} />
             {showFindHospitalButton && (
                <div className="mt-6 animate-fade-in">
                    <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา ใกล้ฉัน")}`, '_blank')} className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                        <MapPinIcon className="w-5 h-5" />
                        ค้นหาสถานพยาบาลใกล้เคียง
                    </button>
                </div>
            )}
        </div>
      )}
      <ConversationHistory history={history} setHistory={setHistory} />
    </div>
  );
};

const AnalysisResult = ({ result }: { result: Analysis }) => (
    <div className="space-y-6">
        <div>
            <div className="flex items-center mb-3"> <CheckCircleIcon className="w-7 h-7 text-blue-500 mr-3" /> <h3 className="text-lg font-bold text-slate-800">การประเมินเบื้องต้น</h3> </div>
            <div className="pl-10 text-slate-600 text-sm leading-relaxed border-l-2 border-blue-200 ml-3.5"> <MarkdownContent text={result.assessment} /> </div>
        </div>
        <div>
            <div className="flex items-center mb-3"> <StethoscopeIcon className="w-7 h-7 text-green-500 mr-3" /> <h3 className="text-lg font-bold text-slate-800">คำแนะนำในการดูแลตัวเอง</h3> </div>
            <div className="pl-10 text-slate-600 text-sm leading-relaxed border-l-2 border-green-200 ml-3.5"> <MarkdownContent text={result.recommendation} /> </div>
        </div>
        <div>
            <div className="flex items-center mb-3"> <ExclamationIcon className="w-7 h-7 text-red-500 mr-3" /> <h3 className="text-lg font-bold text-slate-800">ข้อควรระวังและสัญญาณอันตราย</h3> </div>
            <div className="pl-10 text-slate-600 text-sm leading-relaxed border-l-2 border-red-200 ml-3.5"> <MarkdownContent text={result.warning} /> </div>
        </div>
    </div>
);

const ConversationHistory: React.FC<{ history: HistoryItem[], setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>> }> = ({ history, setHistory }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [expandedItem, setExpandedItem] = useState<number | null>(null);

    const clearHistory = () => {
        if (window.confirm('คุณต้องการลบประวัติการปรึกษาทั้งหมดหรือไม่?')) {
            setHistory([]);
            localStorage.removeItem('dr_rak_conversation_history');
        }
    };
    if (history.length === 0) return null;

    return (
        <div className="mt-8 pt-6 border-t border-slate-200">
             <button onClick={() => setIsOpen(p => !p)} className="w-full flex justify-between items-center text-left p-2 rounded-lg hover:bg-slate-50">
                <div className="flex items-center">
                    <HistoryIcon className="w-6 h-6 text-indigo-500 mr-3" />
                    <h3 className="font-bold text-slate-700">ประวัติการปรึกษา ({history.length})</h3>
                </div>
                <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="mt-4 pl-4 space-y-4 animate-fade-in">
                    {history.map(item => (
                        <div key={item.id} className="border-l-2 border-slate-200 pl-4">
                            <button onClick={() => setExpandedItem(p => p === item.id ? null : item.id)} className="w-full text-left">
                                <p className="font-semibold text-sm text-slate-800">{item.date}</p>
                                <p className="text-sm text-slate-500 truncate">อาการ: {item.symptoms}</p>
                            </button>
                            {expandedItem === item.id && (
                                <div className="mt-4 p-4 bg-slate-50 rounded-lg animate-fade-in">
                                    <h4 className="font-bold text-sm mb-2 text-slate-700">อาการที่แจ้ง:</h4>
                                    <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{item.symptoms}</p>
                                    <AnalysisResult result={item.analysis} />
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="pt-2 text-center">
                        <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700">ล้างประวัติทั้งหมด</button>
                    </div>
                </div>
            )}
        </div>
    );
};