
import React, { useState, useEffect, useRef } from 'react';
import { StethoscopeIcon, CheckCircleIcon, ExclamationIcon, SpeakerWaveIcon, MicIcon, StopIcon, VolumeOffIcon, MapPinIcon, HistoryIcon, ChevronDownIcon, UserIcon, PaperPlaneIcon, ShareIcon, ShieldCheckIcon, TrashIcon } from './icons';
import { GoogleGenAI } from "@google/genai";
import { DrRakSvgAvatar } from './DrRakSvgAvatar';
import { Modal } from './Modal';

// --- Types ---
type InteractionState = 'idle' | 'listening' | 'analyzing' | 'speaking';

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

const model = 'gemini-2.5-flash';
const safetySettings = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

// Helper to clean Markdown for visual display
const cleanDisplay = (text: string) => {
    return text.replace(/\*\*/g, '').replace(/[\#]/g, '').replace(/หนูก็/g, 'คนไข้ควร').replace(/หนู/g, 'คนไข้').trim();
};

// Sub-component for individual history items
const HistoryItemCard: React.FC<{ item: HistoryItem }> = ({ item }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className={`bg-white rounded-xl border transition-all duration-300 ${isExpanded ? 'border-indigo-200 shadow-md ring-1 ring-indigo-50' : 'border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-md'}`}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 text-left flex flex-col gap-3 focus:outline-none"
            >
                <div className="flex justify-between items-center w-full">
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 tracking-wide uppercase">
                        {item.date}
                    </span>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isExpanded ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-400'}`}>
                        <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </div>

                <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-1.5 bg-slate-100 rounded-full text-slate-500 shrink-0">
                        <UserIcon className="w-4 h-4" />
                    </div>
                    <p className={`text-sm text-slate-700 font-medium leading-relaxed ${isExpanded ? '' : 'line-clamp-1 text-slate-600'}`}>
                        {item.symptoms}
                    </p>
                </div>
            </button>

            <div 
                className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-5 pt-0 space-y-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent mb-2"></div>
                    
                    {/* Assessment */}
                    <div>
                         <h6 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-2 uppercase tracking-wider opacity-80">
                            <CheckCircleIcon className="w-4 h-4 text-teal-500"/> ผลการประเมิน
                        </h6>
                        <p className="text-sm text-slate-600 leading-relaxed pl-6 whitespace-pre-line">
                            {cleanDisplay(item.analysis.assessment)}
                        </p>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-indigo-50/60 p-4 rounded-xl border border-indigo-100/50">
                        <h6 className="text-xs font-bold text-indigo-700 flex items-center gap-2 mb-2 uppercase tracking-wider">
                            <StethoscopeIcon className="w-4 h-4"/> คำแนะนำ
                        </h6>
                        <p className="text-sm text-indigo-900/80 leading-relaxed whitespace-pre-line pl-1">
                            {cleanDisplay(item.analysis.recommendation)}
                        </p>
                    </div>

                    {/* Warning */}
                    {(item.analysis.warning && item.analysis.warning !== '-') && (
                         <div className="bg-red-50/60 p-4 rounded-xl border border-red-100/50">
                             <h6 className="text-xs font-bold text-red-600 flex items-center gap-2 mb-2 uppercase tracking-wider">
                                <ExclamationIcon className="w-4 h-4"/> ข้อควรระวัง
                            </h6>
                            <p className="text-sm text-red-800/80 leading-relaxed pl-1 whitespace-pre-line">
                                {cleanDisplay(item.analysis.warning)}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const DrRakAvatar: React.FC = () => {
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [symptoms, setSymptoms] = useState('');
  const [analysisResult, setAnalysisResult] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState('พิมพ์บอกอาการ หรือกดปุ่มไมค์เล่าให้หมอฟังได้เลยนะคะ');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const speakingVisualTimerRef = useRef<number | null>(null);
  
  // Use ref to track state synchronously for event handlers
  const stateRef = useRef(interactionState);
  const symptomsRef = useRef(symptoms);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    stateRef.current = interactionState;
    symptomsRef.current = symptoms;
    isMutedRef.current = isMuted;
  }, [interactionState, symptoms, isMuted]);

  // Initialize Speech Synthesis Voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };
    
    if (window.speechSynthesis) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
         if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = null;
         }
    };
  }, []);

  useEffect(() => {
    try {
        const savedHistory = localStorage.getItem('dr_rak_history');
        if (savedHistory) {
            setHistory(JSON.parse(savedHistory));
        }
    } catch (e) { console.error("Failed to load history:", e)}

    // Initialize SpeechRecognition SAFELY inside useEffect
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusText('พิมพ์บอกอาการได้เลยนะคะ (เบราว์เซอร์นี้ไม่รองรับเสียง)');
      return;
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = 'th-TH';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognitionRef.current = recognition;

        recognition.onresult = (event: any) => {
        if (stateRef.current !== 'listening') return;

        if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);

        // --- Responsive Animation Logic ---
        setIsUserSpeaking(true);
        if (speakingVisualTimerRef.current) window.clearTimeout(speakingVisualTimerRef.current);
        speakingVisualTimerRef.current = window.setTimeout(() => {
            setIsUserSpeaking(false);
        }, 600); // Reset visual speaking state after silence
        // ----------------------------------

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            } else {
            interimTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            setSymptoms(prev => (prev + ' ' + finalTranscript).trim());
        }

        setStatusText(interimTranscript ? '... ' + interimTranscript : 'หมอฟังอยู่นะคะ... (พูดจบแล้วหยุดสักครู่)');

        // Auto-submit after silence (slightly longer duration for better usability)
        silenceTimerRef.current = window.setTimeout(() => {
            if (symptomsRef.current.trim().length > 0) {
                handleAnalysis();
            }
        }, 2500);
        };
        
        recognition.onend = () => {
            if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
            const currentState = stateRef.current;
            
            setIsUserSpeaking(false);

            // If recognition stops unexpectedly while listening, check if we have input
            if (currentState === 'listening') {
                if (symptomsRef.current.trim().length > 0) {
                    handleAnalysis();
                } else {
                    updateStateAndStatus('idle', 'กดปุ่มไมค์เพื่อเริ่มเล่าอาการใหม่นะคะ...');
                }
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error !== 'aborted' && event.error !== 'no-speech') {
                if (stateRef.current === 'listening') {
                    updateStateAndStatus('idle', 'ระบบรับเสียงมีปัญหา ลองพิมพ์บอกหมอแทนได้นะคะ');
                }
            }
        };
    } catch (err) {
        console.error("Speech Recognition Initialization Failed:", err);
        setStatusText('พิมพ์บอกอาการได้เลยนะคะ (เสียงไม่พร้อมใช้งาน)');
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch(e) {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if(silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
      if(speakingVisualTimerRef.current) window.clearTimeout(speakingVisualTimerRef.current);
    };
  }, []);

  const updateStateAndStatus = (state: InteractionState, text: string) => {
    stateRef.current = state;
    setInteractionState(state);
    setStatusText(text);
    if (state !== 'listening') setIsUserSpeaking(false);
  };
  
  const speak = (text: string) => {
    if (isMutedRef.current) {
      updateStateAndStatus('idle', 'ปิดเสียงอยู่ค่ะ (เปิดเสียงที่มุมขวาบน)');
      return;
    }

    if (!window.speechSynthesis) {
        updateStateAndStatus('idle', 'อุปกรณ์นี้ไม่รองรับการอ่านเสียงค่ะ');
        return;
    }
    
    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    
    // Robust voice selection: Try Thai voices, fallback to any.
    const thaiVoice = voices.find(v => v.lang === 'th-TH') || 
                      voices.find(v => v.lang.includes('th'));
    
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }
    
    utterance.rate = 1.0; // Slightly faster for natural conversation
    utterance.pitch = 1.1; // Friendly tone

    utterance.onstart = () => {
         updateStateAndStatus('speaking', 'หมอกำลังอธิบาย... (กดปุ่มเพื่อหยุด)');
    };

    utterance.onend = () => {
         updateStateAndStatus('idle', 'ถ้ามีอาการตรงไหนอีก บอกหมอได้เสมอเลยนะคะ');
    };

    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        // If TTS fails (often due to user interaction policy on mobile), reset to idle
        updateStateAndStatus('idle', 'ลองกด "ฟังเสียงอีกครั้ง" ดูนะคะ');
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
      if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          updateStateAndStatus('idle', 'หยุดพูดแล้วค่ะ ถ้าพร้อมแล้วคุยกันต่อได้เลยนะคะ');
      }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      // Stop TTS if playing
      if (window.speechSynthesis) window.speechSynthesis.cancel();

      try {
        recognitionRef.current.stop();
        // Short delay to ensure clean restart
        setTimeout(() => {
             updateStateAndStatus('listening', 'หมอกำลังตั้งใจฟังอยู่นะคะ... เล่าได้เลยค่ะ');
             setSymptoms('');
             setAnalysisResult(null);
             try {
                recognitionRef.current.start();
             } catch(e) {
                console.error("Error starting recognition:", e);
                updateStateAndStatus('idle', 'ไม่สามารถเปิดไมโครโฟนได้ค่ะ');
             }
        }, 100);
      } catch(e) {
        console.error("Could not restart recognition:", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  };

  const handleMainButtonClick = async () => {
    // Logic based on current state
    if (interactionState === 'idle') {
        // NEW: If user has typed something, send it directly (Text Mode)
        if (symptoms.trim().length > 0) {
            handleAnalysis();
            return;
        }

        // Otherwise, start Microphone (Voice Mode)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop()); // Close immediately, just need permission
            startListening();
        } catch (err) {
            console.error('Microphone permission denied:', err);
            setStatusText('ช่วยเปิดไมโครโฟนให้หมอหน่อยนะคะ หมอจะได้ยินเสียงคนไข้ค่ะ');
        }
    } else if (interactionState === 'listening') {
        // Stop listening and analyze immediately
        handleAnalysis();
    } else if (interactionState === 'speaking') {
        // Stop speaking
        stopSpeaking();
    } else if (interactionState === 'analyzing') {
        // Do nothing while analyzing
    }
  };

  // Helper to build natural speech that sounds like a human reading
  const constructResponseText = (result: Analysis) => {
      // 1. Clean up Markdown characters that shouldn't be spoken
      const clean = (t: string) => t
        .replace(/\*\*/g, '') // Bold formatting
        .replace(/[\*#]/g, '') // Other markdown
        .replace(/หนูก็/g, 'คนไข้ควร')
        .replace(/หนู/g, 'คนไข้')
        .trim();
      
      // 2. Process recommendation list to sound natural
      // Split by newlines, remove bullets/numbers, and rejoin with structured numbering
      const recLines = result.recommendation
        .split('\n')
        .map(l => clean(l).replace(/^[-*•\d\.]+\s*/, '').trim()) // Strict removal of bullets/numbers
        .filter(l => l.length > 0);
        
      let spokenRec = '';
      if (recLines.length > 1) {
          // Use Numbered list structure "Item 1... Item 2..."
          spokenRec = recLines.map((line, i) => `ข้อที่ ${i + 1}... ${line}`).join('... ');
      } else {
          spokenRec = recLines[0] || '';
      }

      const spokenAssessment = clean(result.assessment);
      const spokenWarning = clean(result.warning);

      // 3. Construct the full sentence with warm tone
      return `
        ${spokenAssessment}
        
        หมอแนะนำให้ลองทำแบบนี้นะคะ... ${spokenRec}
        
        และที่สำคัญ... ${spokenWarning}
        
        ขอให้หายไวๆ นะคะคนไข้ เป็นกำลังใจให้ค่ะ
      `.trim();
  };

  const handleAnalysis = async () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopListening();

    if (!symptomsRef.current.trim()) {
        updateStateAndStatus('idle', 'หมอยังไม่ได้ยินเสียงเลยค่ะ... ไม่เป็นไรนะคะ ลองใหม่อีกครั้งนะ');
        return;
    }
    
    updateStateAndStatus('analyzing', 'หมอขอเวลาวิเคราะห์สักครู่นะคะ... เป็นกำลังใจให้นะคะ');
    setIsLoading(true);

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      updateStateAndStatus('idle', 'ระบบขัดข้อง (API Key)');
      setIsLoading(false);
      return;
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Role: คุณคือ "หมอรักษ์" (พี่หมอ) แพทย์หญิงที่มีความเชี่ยวชาญแต่ใจดี อบอุ่น เหมือนพี่สาวดูแลน้อง
      Task: วิเคราะห์อาการทางสุขภาพอย่างละเอียดและแม่นยำ พร้อมให้คำแนะนำการดูแลตนเองเบื้องต้น
      Tone: ภาษาพูด 100% (Spoken Thai), นุ่มนวล, อ่อนโยน, ใช้คำง่ายๆ, ห้ามใช้ศัพท์แพทย์ยากๆ (ถ้ามีให้อธิบายขยายความ), ห้ามใช้คำว่า "รับประทาน" ให้ใช้ "ทาน" หรือ "กิน", ห้ามใช้ "ศีรษะ" ให้ใช้ "หัว"

      Strict Rules:
      - **ห้ามเรียกผู้ใช้ว่า "หนู" เด็ดขาด** ให้ใช้คำว่า **"คนไข้"** หรือ **"คุณ"**
      - **ห้ามใช้คำว่า "หนูก็"** ให้ใช้คำว่า **"คนไข้ควร"** หรือ **"คุณควร"**
      - เริ่มต้นประโยคด้วยความเห็นอกเห็นใจเสมอ
      - **การวิเคราะห์ต้องมีเหตุผลรองรับ** เช่น "อาการปวดท้องข้างขวา อาจเกิดจาก... หรือ..."

      Input Symptoms: "${symptomsRef.current}"

      Requirement:
      1. Assessment (การประเมิน):
         - วิเคราะห์สาเหตุที่เป็นไปได้จากอาการที่บอก (ระบุ 2-3 สาเหตุที่พบบ่อย)
         - อธิบายความเชื่อมโยงของอาการให้คนไข้เข้าใจง่ายๆ
         - ปลอบโยนให้คลายกังวล
      2. Recommendation (คำแนะนำ):
         - แนะนำวิธีดูแลตัวเองที่ทำได้จริงที่บ้าน 3-4 ข้อ
         - ระบุปริมาณหรือวิธีการให้ชัดเจน (เช่น ดื่มน้ำวันละ 8-10 แก้ว, ประคบเย็น 15 นาที)
         - อธิบายสั้นๆ ว่าทำแล้วจะช่วยอย่างไร
      3. Warning (ข้อควรระวัง/สัญญาณอันตราย):
         - ระบุอาการแทรกซ้อนที่ถ้าเป็นแล้วต้องรีบไปโรงพยาบาลทันที (Red Flags)
         - พูดด้วยความเป็นห่วง

      Response Format (JSON Only):
      {
        "assessment": "ข้อความประเมินอาการ (ละเอียด เข้าใจง่าย ภาษาพูด)",
        "recommendation": "ข้อความแนะนำ (ละเอียด เป็นข้อๆ ภาษาพูด)",
        "warning": "ข้อควรระวัง (ชัดเจน ภาษาพูด)"
      }
    `;

    try {
      const result = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: 'application/json', safetySettings },
      });
      
      const cleanedJsonString = result.text?.replace(/```json|```/g, '').trim() || '{}';
      const parsedResult: Analysis = JSON.parse(cleanedJsonString);
      setAnalysisResult(parsedResult);
      
      const newHistoryItem: HistoryItem = {
          id: Date.now(),
          date: new Date().toLocaleString('th-TH'),
          symptoms: symptomsRef.current,
          analysis: parsedResult,
      };
      saveHistory(newHistoryItem);

      const responseToSpeak = constructResponseText(parsedResult);
      
      // Attempt to speak automatically
      speak(responseToSpeak);

    } catch (error) {
      console.error('Error analyzing symptoms:', error);
      updateStateAndStatus('idle', 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว ลองใหม่นะคะ');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleShareResult = async () => {
    if (!analysisResult) return;

    const shareText = `
📋 สรุปผลการปรึกษาหมอรักษ์

👤 อาการเบื้องต้น:
"${symptoms}"

🩺 ผลการประเมิน:
${cleanDisplay(analysisResult.assessment)}

💊 คำแนะนำ:
${cleanDisplay(analysisResult.recommendation)}

⚠️ ข้อควรระวัง:
${cleanDisplay(analysisResult.warning)}

ลองปรึกษาหมอรักษ์ได้ที่: ${window.location.href}
    `.trim();

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'ผลการปรึกษาสุขภาพกับหมอรักษ์',
                text: shareText,
            });
        } catch (err) {
            console.error('Error sharing:', err);
        }
    } else {
        // Fallback
        try {
            await navigator.clipboard.writeText(shareText);
            alert('คัดลอกผลการปรึกษาเรียบร้อยแล้ว คุณสามารถนำไปวางเพื่อส่งต่อได้เลยค่ะ');
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }
  };

  const saveHistory = (newItem: HistoryItem) => {
      setHistory(prev => {
          const newHistory = [newItem, ...prev].slice(0, 20);
          try {
            localStorage.setItem('dr_rak_history', JSON.stringify(newHistory));
          } catch(e) { console.error("Local Storage Error", e); }
          return newHistory;
      });
  };

  const clearHistory = () => {
      if (window.confirm('ลบประวัติทั้งหมดไหมคะ?')) {
          setHistory([]);
          try {
            localStorage.removeItem('dr_rak_history');
          } catch(e) {}
      }
  }

  const showHospitalButton = analysisResult?.recommendation.includes('โรงพยาบาล') || analysisResult?.recommendation.includes('คลินิก') || analysisResult?.warning.includes('แพทย์');

  // Get styling for status text
  const getStatusColor = () => {
      switch(interactionState) {
          case 'listening': return 'text-red-500 font-semibold animate-pulse';
          case 'analyzing': return 'text-indigo-500 font-semibold';
          case 'speaking': return 'text-amber-500 font-semibold';
          default: return 'text-slate-500';
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden w-full max-w-2xl mx-auto flex flex-col">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0">
                    <StethoscopeIcon />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">ปรึกษาหมอรักษ์</h3>
                    <p className={`text-sm ${getStatusColor()} transition-colors`}>{statusText}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsPrivacyModalOpen(true)}
                    className="text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50"
                    title="ความเป็นส่วนตัว"
                >
                    <ShieldCheckIcon className="w-6 h-6" />
                </button>
                <button onClick={() => setIsMuted(m => !m)} className={`text-slate-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-indigo-50 ${isMuted ? 'text-red-400' : ''}`}>
                    {isMuted ? <VolumeOffIcon className="w-6 h-6"/> : <SpeakerWaveIcon className="w-6 h-6"/>}
                </button>
            </div>
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          
          {/* Avatar Section with Interactive Animations */}
          <div className="relative shrink-0 flex justify-center items-center w-40 h-40">
            
            {/* LISTENING ANIMATION (Refined Fluid Ripples) */}
            {interactionState === 'listening' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    {/* Core Glow - Reacts strongly to speech */}
                    <div className={`absolute w-24 h-24 rounded-full bg-red-500 blur-xl transition-all duration-150 ease-out ${isUserSpeaking ? 'opacity-50 scale-150' : 'opacity-10 scale-100'}`}></div>
                    
                    {/* Ambient Ripples (Always running gently to avoid resets) */}
                    <div className={`absolute inset-0 rounded-full border border-red-300/30 opacity-0 animate-ripple-slow transition-opacity duration-500 ${isUserSpeaking ? 'opacity-0' : 'opacity-100'}`}></div>
                    <div className={`absolute inset-0 rounded-full border border-red-300/20 opacity-0 animate-ripple-slow transition-opacity duration-500 delay-700 ${isUserSpeaking ? 'opacity-0' : 'opacity-100'}`} style={{ animationDelay: '1s' }}></div>

                    {/* Active Speech Ripples (Fade in over ambient when speaking - Multi-layered) */}
                    {[0, 1, 2].map(i => (
                        <div 
                            key={`fast-${i}`}
                            className={`absolute inset-0 rounded-full border-2 border-red-500/60 opacity-0 animate-ripple-fast transition-opacity duration-200 ${isUserSpeaking ? 'opacity-100' : 'opacity-0'}`}
                            style={{ animationDelay: `${i * 0.2}s` }}
                        ></div>
                    ))}
                </div>
            )}

            {/* ANALYZING ANIMATION (Spinning Ring) - Handled inside DrRakSvgAvatar but kept here as overlay fallback/enhancement if needed. Removing duplication. */}
            {/* Avatar with Speaking Animation State Passed Down */}
            <div className={`relative z-10 transition-transform duration-300 ${isUserSpeaking ? 'scale-110' : 'scale-100'} ${interactionState === 'speaking' ? 'animate-subtle-bounce' : ''}`}>
                 <DrRakSvgAvatar 
                    className="w-32 h-32 shadow-lg" 
                    isSpeaking={interactionState === 'speaking'}
                    isAnalyzing={interactionState === 'analyzing'}
                 />
            </div>
            
            {/* Floating Status Badges */}
            {interactionState === 'speaking' && (
                 <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-indigo-50 z-20 animate-bounce">
                    <SpeakerWaveIcon className="w-5 h-5 text-indigo-600" />
                 </div>
            )}
            {interactionState === 'listening' && (
                 <div className={`absolute -bottom-2 -right-2 p-2 rounded-full shadow-lg border-2 border-white z-20 transition-all duration-300 ${isUserSpeaking ? 'bg-red-600 scale-125 shadow-red-200' : 'bg-red-400'}`}>
                    <MicIcon className="w-5 h-5 text-white" />
                 </div>
            )}
          </div>

          {/* Input & Control Section */}
          <div className="w-full flex flex-col h-full justify-between">
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="พิมพ์บอกอาการ หรือกดปุ่มไมค์เล่าให้หมอฟังได้เลยนะคะ..."
              className="w-full h-28 p-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none shadow-inner"
              readOnly={interactionState !== 'idle' && interactionState !== 'listening'}
            />
            
            <div className="flex items-center justify-between mt-4">
                 <p className="text-xs text-slate-400 hidden md:block">
                    *หมอรับฟังทุกอาการอย่างตั้งใจนะคะ
                 </p>
                 
                 {/* Main Action Button - Enhanced Visibility */}
                 <div className="flex-1 md:flex-none flex justify-end">
                    <button
                        onClick={handleMainButtonClick}
                        disabled={isLoading || interactionState === 'analyzing'}
                        className={`
                            relative overflow-hidden group w-full md:w-auto px-8 py-3 rounded-full font-bold text-white transition-all 
                            flex items-center justify-center gap-3 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                            ${interactionState === 'idle' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300' : ''}
                            ${interactionState === 'listening' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : ''}
                            ${interactionState === 'speaking' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : ''}
                            ${interactionState === 'analyzing' ? 'bg-slate-400 cursor-wait' : ''}
                        `}
                    >
                        {interactionState === 'idle' && (
                            <>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                {symptoms.trim().length > 0 ? (
                                    <>
                                        <PaperPlaneIcon className="w-5 h-5 relative z-10"/>
                                        <span className="relative z-10">ส่งอาการ</span>
                                    </>
                                ) : (
                                    <>
                                        <MicIcon className="w-5 h-5 relative z-10"/> 
                                        <span className="relative z-10">พูดอาการ</span>
                                    </>
                                )}
                            </>
                        )}
                        {interactionState === 'listening' && <><StopIcon className="w-5 h-5"/> หยุด / ส่ง</>}
                        {interactionState === 'analyzing' && <span>กำลังวิเคราะห์...</span>}
                        {interactionState === 'speaking' && <><VolumeOffIcon className="w-5 h-5"/> หยุดพูด</>}
                    </button>
                 </div>
            </div>
          </div>
        </div>
      </div>

      {(isLoading || analysisResult) && (
        <div className="bg-slate-50/70 p-6 border-t border-slate-200 animate-fade-in">
          {isLoading && (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-indigo-600 text-sm font-medium animate-pulse">หมอกำลังวิเคราะห์อาการ...</p>
              </div>
          )}
          {analysisResult && !isLoading && (
            <div className="space-y-5 text-sm animate-fade-in-up">
                 <div className="flex justify-end">
                    <button 
                        onClick={() => speak(constructResponseText(analysisResult))}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors"
                    >
                        <SpeakerWaveIcon className="w-4 h-4" /> ฟังเสียงอีกครั้ง
                    </button>
                 </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-base">
                        <CheckCircleIcon className="w-6 h-6 text-teal-500"/> ผลการประเมิน
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-base whitespace-pre-line">
                        {cleanDisplay(analysisResult.assessment)}
                    </p>
                </div>
                 <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-3 text-base">
                        <StethoscopeIcon className="w-6 h-6 text-blue-500"/> คำแนะนำจากหมอ
                    </h4>
                    <p className="text-slate-600 leading-relaxed text-base whitespace-pre-line">
                        {cleanDisplay(analysisResult.recommendation)}
                    </p>
                </div>
                 <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
                    <h4 className="font-bold text-red-700 flex items-center gap-2 mb-3 text-base">
                        <ExclamationIcon className="w-6 h-6 text-red-500"/> ข้อควรระวัง
                    </h4>
                    <p className="text-red-600 leading-relaxed text-base whitespace-pre-line">
                        {cleanDisplay(analysisResult.warning)}
                    </p>
                </div>
                
                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    {showHospitalButton && (
                        <button 
                         onClick={() => {
                            const query = encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา ใกล้ฉัน");
                            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                         }}
                         className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-transform">
                            <MapPinIcon className="w-5 h-5" />
                            ค้นหาสถานพยาบาล
                        </button>
                    )}
                    <button
                        onClick={handleShareResult}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-indigo-600 font-bold rounded-xl border border-indigo-200 shadow-sm hover:bg-indigo-50 transition-all"
                    >
                        <ShareIcon className="w-5 h-5" />
                        ส่งต่อ/บันทึกผล
                    </button>
                </div>
            </div>
          )}
        </div>
      )}
      
      {/* History Section */}
      <div className="bg-white border-t border-slate-200">
         <div className="flex items-center justify-between p-4 bg-white z-10 relative">
             <button
                onClick={() => setIsHistoryOpen(o => !o)}
                className="flex-1 text-left flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group"
                aria-expanded={isHistoryOpen}
              >
                <HistoryIcon className="w-5 h-5 text-slate-500 mr-3 group-hover:text-indigo-600 transition-colors"/>
                <h4 className="font-bold text-slate-700 text-sm group-hover:text-indigo-700 transition-colors mr-3">ประวัติการปรึกษา ({history.length})</h4>
                <div className={`w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center transition-all duration-300 ${isHistoryOpen ? 'bg-indigo-100 rotate-180' : 'group-hover:bg-indigo-50'}`}>
                    <ChevronDownIcon className={`w-4 h-4 transition-colors ${isHistoryOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
            </button>
            
            {/* Clear History Button - Visible in Header when items exist */}
            {history.length > 0 && isHistoryOpen && (
                 <button 
                    onClick={clearHistory} 
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-bold px-3 py-1.5 bg-red-50 hover:bg-red-100 rounded-lg transition-colors ml-2 shrink-0"
                >
                    <TrashIcon className="w-3.5 h-3.5" />
                    ล้างประวัติ
               </button>
            )}
         </div>
        
        <div className={`transition-all duration-500 ease-in-out ${isHistoryOpen ? 'max-h-[60vh] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="overflow-y-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="p-4 pt-0 bg-slate-50/30 border-t border-slate-100">
                    {history.length > 0 ? (
                        <div className="space-y-4 py-4">
                            {history.map(item => (
                                <HistoryItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <HistoryIcon className="w-6 h-6 text-slate-300" />
                            </div>
                            <p className="text-sm font-medium">ยังไม่มีประวัติการปรึกษา</p>
                            <p className="text-xs mt-1 opacity-70">ประวัติจะแสดงที่นี่หลังจากคุณคุยกับหมอรักษ์</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {/* Privacy Settings Modal */}
      <Modal isOpen={isPrivacyModalOpen} onClose={() => setIsPrivacyModalOpen(false)}>
        <div className="text-center">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-4">ข้อมูลและความเป็นส่วนตัว</h3>
            
            <div className="text-left text-sm text-slate-600 space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                <div>
                    <p className="font-bold text-slate-800 mb-1 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></span>1. การประมวลผลข้อมูล</p>
                    <p className="pl-4 text-slate-500 text-xs">เสียงและข้อความจะถูกส่งไปประมวลผลที่ระบบ (Google Gemini) เพื่อวิเคราะห์อาการ และจะ <strong className="text-slate-700">ไม่ถูกจัดเก็บถาวร</strong> บนเซิร์ฟเวอร์</p>
                </div>
                <div>
                    <p className="font-bold text-slate-800 mb-1 flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></span>2. การจัดเก็บข้อมูล</p>
                    <p className="pl-4 text-slate-500 text-xs">ประวัติการสนทนาบันทึกใน <strong className="text-slate-700">อุปกรณ์นี้เท่านั้น</strong></p>
                </div>
                <div className="pt-2 border-t border-slate-200/50">
                     <p className="text-[10px] text-red-500">*ข้อมูลสุขภาพเป็นเรื่องละเอียดอ่อน โปรดระมัดระวังในการใช้งานในที่สาธารณะ</p>
                </div>
            </div>

            <button
                onClick={() => {
                    clearHistory();
                    setIsPrivacyModalOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-red-600 font-bold rounded-xl border border-red-100 hover:bg-red-50 transition-colors shadow-sm"
            >
                <TrashIcon className="w-5 h-5" />
                ลบประวัติการสนทนาทั้งหมด
            </button>
        </div>
      </Modal>

       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }

        /* Refined Fluid Ripple Animations */
        @keyframes ripple-slow {
          0% { transform: scale(0.9); opacity: 0; border-width: 1px; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.4); opacity: 0; border-width: 0px; }
        }
        .animate-ripple-slow { animation: ripple-slow 3s ease-in-out infinite; }

        @keyframes ripple-fast {
          0% { transform: scale(0.9); opacity: 0.8; border-width: 3px; }
          100% { transform: scale(1.6); opacity: 0; border-width: 0px; }
        }
        .animate-ripple-fast { animation: ripple-fast 1.2s cubic-bezier(0, 0, 0.2, 1) infinite; }

        /* Subtle Speaking Bounce */
        @keyframes subtle-bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .animate-subtle-bounce { animation: subtle-bounce 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
