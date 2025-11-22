
import React, { useState, useEffect, useRef } from 'react';
import { StethoscopeIcon, CheckCircleIcon, ExclamationIcon, SpeakerWaveIcon, MicIcon, StopIcon, VolumeOffIcon, MapPinIcon, HistoryIcon, ChevronDownIcon, UserIcon, PaperPlaneIcon } from './icons';
import { GoogleGenAI } from "@google/genai";
import { DrRakSvgAvatar } from './DrRakSvgAvatar';

// --- Types ---
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
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

export const DrRakAvatar: React.FC = () => {
  const [interactionState, setInteractionState] = useState<InteractionState>('idle');
  const [symptoms, setSymptoms] = useState('');
  const [analysisResult, setAnalysisResult] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState('พิมพ์อาการ หรือกดปุ่มไมค์เพื่อปรึกษา...');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  
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

    if (!SpeechRecognition) {
      setStatusText('พิมพ์อาการของคุณได้เลยค่ะ (เบราว์เซอร์นี้ไม่รองรับเสียง)');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      if (stateRef.current !== 'listening') return;

      if (silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);

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

      setStatusText(interimTranscript ? '... ' + interimTranscript : 'กำลังฟัง... (พูดจบแล้วหยุดสักครู่)');

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
        
        // If recognition stops unexpectedly while listening, check if we have input
        if (currentState === 'listening') {
            if (symptomsRef.current.trim().length > 0) {
                handleAnalysis();
            } else {
                updateStateAndStatus('idle', 'กดปุ่มไมค์เพื่อเริ่มบอกอาการ...');
            }
        }
    };

    recognition.onerror = (event: any) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') {
            if (stateRef.current === 'listening') {
                 updateStateAndStatus('idle', 'เกิดข้อผิดพลาดในการรับเสียง ลองพิมพ์แทนได้นะคะ');
            }
        }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if(silenceTimerRef.current) window.clearTimeout(silenceTimerRef.current);
    };
  }, []);

  const updateStateAndStatus = (state: InteractionState, text: string) => {
    stateRef.current = state;
    setInteractionState(state);
    setStatusText(text);
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
    
    utterance.rate = 0.95; // Natural pace
    utterance.pitch = 1.1; // Friendly professional tone

    utterance.onstart = () => {
         updateStateAndStatus('speaking', 'หมอรักษ์กำลังพูด... (กดปุ่มเพื่อหยุด)');
    };

    utterance.onend = () => {
         updateStateAndStatus('idle', 'หากมีอาการเพิ่มเติม พิมพ์หรือพูดบอกหมอได้เลยนะคะ');
    };

    utterance.onerror = (e) => {
        console.error("TTS Error:", e);
        // If TTS fails (often due to user interaction policy on mobile), reset to idle
        updateStateAndStatus('idle', 'กดที่ "ฟังเสียงอีกครั้ง" เพื่อฟังคำแนะนำค่ะ');
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
      if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
          updateStateAndStatus('idle', 'หยุดพูดแล้วค่ะ');
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
             updateStateAndStatus('listening', 'กำลังฟัง... เล่าอาการได้เลยค่ะ');
             setSymptoms('');
             setAnalysisResult(null);
             try {
                recognitionRef.current.start();
             } catch(e) {
                console.error("Error starting recognition:", e);
                updateStateAndStatus('idle', 'ไม่สามารถเริ่มไมโครโฟนได้');
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
            setStatusText('กรุณาอนุญาตให้ใช้ไมโครโฟนค่ะ');
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

  // Helper to clean Markdown for visual display
  const cleanDisplay = (text: string) => {
      return text.replace(/\*\*/g, '').replace(/[\#]/g, '').replace(/หนูก็/g, 'คนไข้ควร').replace(/หนู/g, 'คนไข้').trim();
  };

  // Helper to build natural speech that sounds like a human reading
  const constructResponseText = (result: Analysis) => {
      // 1. Clean up Markdown characters that shouldn't be spoken
      const clean = (t: string) => t.replace(/[\*_#]/g, '').replace(/หนูก็/g, 'คนไข้ควร').replace(/หนู/g, 'คนไข้').trim();
      
      // 2. Process recommendation list to sound natural
      // Split by newlines, remove bullets/numbers, and rejoin with natural pauses
      const recLines = clean(result.recommendation)
        .split('\n')
        .map(l => l.replace(/^[-*•\d\.]+\s*/, '').trim()) // Remove "- " or "1. "
        .filter(l => l.length > 0);
        
      let spokenRec = '';
      if (recLines.length > 1) {
          spokenRec = recLines.join('... แล้วก็... '); // Natural transition for lists
      } else {
          spokenRec = recLines[0] || '';
      }

      // 3. Construct the full sentence
      return `
        จากที่ฟังอาการนะคะ... ${clean(result.assessment)}... 
        
        สำหรับการดูแลตัวเองเบื้องต้นนะคะ... ${spokenRec}... 
        
        ส่วนข้อควรระวังคือ... ${clean(result.warning)}... 
        
        หากทำตามนี้แล้วอาการไม่ดีขึ้น แนะนำให้ไปพบแพทย์ที่โรงพยาบาลนะคะ
      `.trim();
  };

  const handleAnalysis = async () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    stopListening();

    if (!symptomsRef.current.trim()) {
        updateStateAndStatus('idle', 'หมอยังไม่ได้ยินเสียงคนไข้เลยค่ะ ลองใหม่อีกครั้งนะคะ');
        return;
    }
    
    updateStateAndStatus('analyzing', 'กำลังวิเคราะห์ข้อมูล... สักครู่นะคะ');
    setIsLoading(true);

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      updateStateAndStatus('idle', 'ระบบขัดข้อง (API Key)');
      setIsLoading(false);
      return;
    }
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Role: คุณคือ "หมอรักษ์" แพทย์หญิงผู้เชี่ยวชาญที่มีความเห็นอกเห็นใจ
      Task: วิเคราะห์อาการสุขภาพจากข้อความ
      Tone: สุภาพ, อ่อนโยน, ใช้ภาษาพูดที่เป็นธรรมชาติ (Spoken Language)

      Strict Instructions:
      - **ห้ามเรียกผู้ใช้งานว่า "หนู" เด็ดขาด** ให้เรียกว่า **"คนไข้"** หรือ **"คุณ"** เท่านั้น
      - **ห้ามใช้คำว่า "หนูก็"** ให้ใช้คำว่า **"คนไข้ควร"** แทน
      - แทนตัวเองว่า "หมอ"
      
      Input Symptoms: "${symptomsRef.current}"

      Requirement:
      1. Assessment: ประเมินแนวโน้มอาการ (ห้ามฟันธงโรค) พูดเหมือนคุยกับคนไข้
      2. Recommendation: แนะนำวิธีดูแลตัวเองที่บ้าน 3-4 ข้อ แบบละเอียด เข้าใจง่าย (ถ้าเป็นข้อๆ ให้ขึ้นบรรทัดใหม่)
      3. Warning: อาการที่ต้องรีบไปพบแพทย์ทันที

      Response Format (JSON Only):
      {
        "assessment": "ข้อความประเมินอาการ",
        "recommendation": "ข้อความแนะนำ",
        "warning": "ข้อควรระวัง"
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
      updateStateAndStatus('idle', 'ขออภัยค่ะ ระบบขัดข้องชั่วคราว');
    } finally {
      setIsLoading(false);
    }
  };

  const saveHistory = (newItem: HistoryItem) => {
      setHistory(prev => {
          const newHistory = [newItem, ...prev].slice(0, 20);
          localStorage.setItem('dr_rak_history', JSON.stringify(newHistory));
          return newHistory;
      });
  };

  const clearHistory = () => {
      if (window.confirm('ลบประวัติทั้งหมดไหมคะ?')) {
          setHistory([]);
          localStorage.removeItem('dr_rak_history');
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
            <button onClick={() => setIsMuted(m => !m)} className={`text-slate-400 hover:text-indigo-600 transition-colors ${isMuted ? 'text-red-400' : ''}`}>
                {isMuted ? <VolumeOffIcon className="w-6 h-6"/> : <SpeakerWaveIcon className="w-6 h-6"/>}
            </button>
        </div>

        <div className="relative flex flex-col md:flex-row items-center gap-8">
          
          {/* Avatar Section with Interactive Animations */}
          <div className="relative shrink-0 flex justify-center items-center">
            {/* Interaction Effects */}
            {interactionState === 'listening' && (
                <>
                    <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping"></div>
                    <div className="absolute -inset-2 rounded-full border-2 border-red-100 animate-pulse"></div>
                </>
            )}
            {interactionState === 'analyzing' && (
                 <div className="absolute -inset-2 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin"></div>
            )}
            
            <DrRakSvgAvatar className="w-32 h-32 md:w-40 md:h-40 shadow-lg relative z-10" />
            
            {/* Floating Status Badges */}
            {interactionState === 'speaking' && (
                 <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-lg border border-indigo-50 z-20 animate-bounce">
                    <SpeakerWaveIcon className="w-5 h-5 text-indigo-600" />
                 </div>
            )}
            {interactionState === 'listening' && (
                 <div className="absolute -bottom-2 -right-2 bg-red-500 p-2 rounded-full shadow-lg border-2 border-white z-20 animate-pulse">
                    <MicIcon className="w-5 h-5 text-white" />
                 </div>
            )}
          </div>

          {/* Input & Control Section */}
          <div className="w-full flex flex-col h-full justify-between">
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="พิมพ์อาการ หรือกดปุ่มไมค์แล้วเล่าให้หมอฟังได้เลยค่ะ..."
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
                            ${interactionState === 'listening' ? 'bg-red-500 hover:bg-red-600 shadow-red-200 animate-pulse' : ''}
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
                {showHospitalButton && (
                    <div className="pt-2 text-center">
                        <button 
                         onClick={() => {
                            const query = encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา ใกล้ฉัน");
                            window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                         }}
                         className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:scale-105 transition-transform">
                            <MapPinIcon className="w-5 h-5" />
                            ค้นหาสถานพยาบาลใกล้ฉัน
                        </button>
                    </div>
                )}
            </div>
          )}
        </div>
      )}
      
      {/* History Section */}
      <div className="bg-white border-t border-slate-200">
         <button
            onClick={() => setIsHistoryOpen(o => !o)}
            className="w-full p-4 text-left flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 hover:bg-slate-50 transition-colors"
            aria-expanded={isHistoryOpen}
          >
            <div className="flex items-center">
              <HistoryIcon className="w-5 h-5 text-slate-500 mr-3"/>
              <h4 className="font-bold text-slate-700 text-sm">ประวัติการปรึกษา ({history.length})</h4>
            </div>
            <ChevronDownIcon className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isHistoryOpen ? 'rotate-180' : ''}`} />
        </button>
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isHistoryOpen ? 'max-h-[500px] overflow-y-auto' : 'max-h-0'}`}>
            <div className="p-4 pt-0">
                {history.length > 0 ? (
                    <div className="space-y-4">
                        {history.map(item => (
                            <div key={item.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm hover:border-indigo-200 transition-colors">
                                <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-200">
                                    <span className="font-semibold text-slate-700 text-xs bg-white px-2 py-1 rounded border border-slate-200">{item.date}</span>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <h5 className="font-bold text-slate-800 flex items-center gap-2 mb-1 text-xs">
                                            <UserIcon className="w-4 h-4 text-gray-500"/> อาการคนไข้
                                        </h5>
                                        <p className="text-slate-600 pl-6 text-xs italic">"{item.symptoms}"</p>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-slate-800 flex items-center gap-2 mb-1 text-xs">
                                            <CheckCircleIcon className="w-4 h-4 text-green-500"/> ผลประเมิน
                                        </h5>
                                        <p className="text-slate-600 pl-6 text-xs line-clamp-2">{cleanDisplay(item.analysis.assessment)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="text-center pt-2 pb-2">
                           <button onClick={clearHistory} className="text-xs text-red-500 hover:text-red-700 font-medium underline decoration-red-200 hover:decoration-red-500">ล้างประวัติทั้งหมด</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-slate-400">
                        <p className="text-sm">ยังไม่มีประวัติการปรึกษา</p>
                    </div>
                )}
            </div>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};
