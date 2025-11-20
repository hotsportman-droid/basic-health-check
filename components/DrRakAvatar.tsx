
import React, { useState, useEffect } from 'react';
import { StethoscopeIcon, CheckCircleIcon, ExclamationIcon, SpeakerWaveIcon } from './icons';
import { GoogleGenAI } from "@google/genai";

// --- UI HELPERS ---
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
      {/* Mouth animation */}
      {isSpeaking && (
        <ellipse cx="200" cy="250" rx="10" ry="5" fill="#D84315" opacity="0.6" className="animate-pulse" />
      )}
    </g>
  </svg>
);

const MarkdownContent = ({ text }: { text: string }) => {
    if (!text || text === '-') return <p className="text-slate-400 italic">ไม่มีข้อมูล</p>;
    return (
      <div className="space-y-2">
        {text.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('-')) return <div key={i} className="flex items-start"><span className="mr-2 text-indigo-500 mt-1.5">•</span><p className="flex-1 leading-relaxed">{trimmed.substring(1)}</p></div>;
            if (trimmed) return <p key={i} className="leading-relaxed">{trimmed}</p>;
            return null;
        })}
      </div>
    );
};

interface AnalysisResult {
    symptoms: string;
    advice: string;
    precautions: string;
    speechText: string;
}

export const DrRakAvatar: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Cancel speech when component unmounts
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const speak = (text: string) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0;
        
        // Try to find a Thai voice
        const voices = window.speechSynthesis.getVoices();
        const thaiVoice = voices.find(v => v.lang.includes('th'));
        if (thaiVoice) utterance.voice = thaiVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    const handleAnalyze = async () => {
        if (!inputText.trim()) return;

        setIsProcessing(true);
        setAnalysis(null);
        setError(null);
        window.speechSynthesis.cancel(); // Stop any existing speech
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: inputText,
                config: {
                    systemInstruction: `คุณคือ "หมอรักษ์" แพทย์ผู้ช่วย AI ที่มีความเชี่ยวชาญสูง
                    - บุคลิก: สุภาพ อบอุ่น มีความเห็นอกเห็นใจ และให้ข้อมูลที่ละเอียดชัดเจน
                    - หน้าที่: ให้คำแนะนำสุขภาพเบื้องต้นจากอาการที่ผู้ใช้ระบุ (ห้ามวินิจฉัยโรค/จ่ายยา)
                    - สำคัญ: การวิเคราะห์ต้อง "ละเอียด" และ "ครอบคลุม" ไม่ตอบสั้นห้วนๆ
                    
                    ให้ตอบกลับในรูปแบบ XML ดังนี้:
                      <response>
                        <speech>ข้อความสำหรับพูดตอบกลับสั้นๆ เพื่อให้กำลังใจ (ความยาว 1-2 ประโยค)</speech>
                        <analysis>
                           <symptoms>
                             สรุปอาการที่จับใจความได้ พร้อมอธิบายสั้นๆ ว่าอาจเกิดจากสาเหตุใดได้บ้าง (ในภาษาชาวบ้านที่เข้าใจง่าย) ใช้ bullet point (-) ในการแยกประเด็น
                           </symptoms>
                           <advice>
                             คำแนะนำการดูแลตัวเองที่ "ละเอียดและปฏิบัติได้จริง" อย่างน้อย 5-6 ข้อ (ครอบคลุมเรื่องอาหารการกิน, การพักผ่อน, ท่าทาง, หรือการประคบเย็น/ร้อน ถ้าจำเป็น) ใช้ bullet point (-)
                           </advice>
                           <precautions>
                             ระบุสัญญาณอันตราย (Red Flags) ที่บ่งบอกว่าต้องไปพบแพทย์ทันที หรืออาการแทรกซ้อนที่ต้องระวัง
                           </precautions>
                        </analysis>
                      </response>`
                }
            });

            const text = response.text || "";
            
            // Parse XML-like response
            const speechMatch = text.match(/<speech>([\s\S]*?)<\/speech>/);
            const symptomsMatch = text.match(/<symptoms>([\s\S]*?)<\/symptoms>/);
            const adviceMatch = text.match(/<advice>([\s\S]*?)<\/advice>/);
            const precautionsMatch = text.match(/<precautions>([\s\S]*?)<\/precautions>/);

            const speechText = speechMatch ? speechMatch[1].trim() : text.replace(/<[^>]*>/g, '').trim();
            
            if (symptomsMatch || adviceMatch) {
                setAnalysis({
                    symptoms: symptomsMatch ? symptomsMatch[1].trim() : '-',
                    advice: adviceMatch ? adviceMatch[1].trim() : '-',
                    precautions: precautionsMatch ? precautionsMatch[1].trim() : '-',
                    speechText
                });
            } else {
                 // Fallback logic if XML parsing fails but we have text
                 setAnalysis({
                     symptoms: '-',
                     advice: text,
                     precautions: '-',
                     speechText: text
                 });
            }

            // Auto-speak the summary
            speak(speechText);

        } catch (err) {
            console.error("AI Error:", err);
            setError("เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6 flex flex-col items-center text-center max-w-2xl mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-400 via-blue-500 to-teal-400"></div>
            
            <div className="flex flex-col md:flex-row items-start w-full gap-6">
                {/* Left: Avatar */}
                <div className="w-full md:w-1/3 flex flex-col items-center">
                     <div className="relative w-32 h-32 mb-4">
                        <DrRakImage isSpeaking={isSpeaking} />
                        {isProcessing && (
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-400 border-t-transparent animate-spin opacity-50"></div>
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">ปรึกษาหมอรักษ์</h3>
                    <p className="text-xs text-slate-500 mt-1">AI ผู้ช่วยดูแลสุขภาพเบื้องต้น</p>
                </div>

                {/* Right: Input & Action */}
                <div className="w-full md:w-2/3 text-left space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            อาการของคุณเป็นอย่างไรบ้าง?
                        </label>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="เช่น ปวดหัวข้างเดียว ตุ้บๆ แพ้แสง มา 2 วันแล้ว หรือ มีผื่นคันขึ้นตามตัว..."
                            className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 text-slate-700 resize-none transition-colors h-32 text-sm"
                            disabled={isProcessing}
                        />
                    </div>
                    
                    <button
                        onClick={handleAnalyze}
                        disabled={isProcessing || !inputText.trim()}
                        className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center shadow-md
                            ${isProcessing || !inputText.trim() 
                                ? 'bg-slate-300 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 hover:shadow-lg'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                กำลังวิเคราะห์ข้อมูล...
                            </>
                        ) : (
                            <>
                                <StethoscopeIcon className="w-5 h-5 mr-2" />
                                วิเคราะห์อาการละเอียด
                            </>
                        )}
                    </button>
                    
                    {error && <p className="text-red-500 text-sm mt-2 bg-red-50 p-2 rounded-lg border border-red-100">{error}</p>}
                </div>
            </div>

            {/* Analysis Results - Expandable Section */}
            {analysis && (
                <div className="mt-8 w-full text-left animate-fade-in border-t border-slate-100 pt-6">
                    
                    {/* Speech Bubble */}
                    <div className="bg-indigo-50 p-4 rounded-2xl rounded-tl-none relative ml-8 mb-6 shadow-sm border border-indigo-100">
                         <div className="absolute -left-2 top-0 w-4 h-4 bg-indigo-50 border-l border-t border-indigo-100 transform -rotate-45"></div>
                         <div className="flex items-start">
                            <div className="shrink-0 mr-3 mt-1">
                                {isSpeaking ? <SpeakerWaveIcon className="w-5 h-5 text-indigo-500 animate-pulse"/> : <div className="w-5 h-5 text-indigo-300">💬</div>}
                            </div>
                            <p className="text-indigo-900 text-sm leading-relaxed font-medium">
                                {analysis.speechText}
                            </p>
                         </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-1">
                        {/* Symptoms Card */}
                        <div className="bg-white rounded-xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-3 pb-2 border-b border-blue-50">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                                    <StethoscopeIcon className="w-5 h-5" />
                                </div>
                                <h5 className="font-bold text-slate-800">สรุปและวิเคราะห์อาการเบื้องต้น</h5>
                            </div>
                            <div className="text-slate-600 text-sm pl-1">
                                <MarkdownContent text={analysis.symptoms} />
                            </div>
                        </div>

                        {/* Advice Card */}
                        <div className="bg-gradient-to-br from-green-50 to-white rounded-xl p-5 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-3 pb-2 border-b border-green-100">
                                <div className="p-2 bg-green-100 rounded-lg text-green-600 mr-3">
                                    <CheckCircleIcon className="w-5 h-5" />
                                </div>
                                <h5 className="font-bold text-green-800">คำแนะนำการดูแลตัวเอง (อย่างละเอียด)</h5>
                            </div>
                            <div className="text-slate-700 text-sm pl-1">
                                <MarkdownContent text={analysis.advice} />
                            </div>
                        </div>

                        {/* Precautions Card */}
                        <div className="bg-gradient-to-br from-amber-50 to-white rounded-xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-3 pb-2 border-b border-amber-100">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600 mr-3">
                                    <ExclamationIcon className="w-5 h-5" />
                                </div>
                                <h5 className="font-bold text-amber-800">ข้อควรระวัง / สัญญาณอันตราย</h5>
                            </div>
                            <div className="text-slate-700 text-sm pl-1">
                                <MarkdownContent text={analysis.precautions} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
