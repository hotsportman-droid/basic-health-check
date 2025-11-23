
import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, HistoryIcon, TrashIcon } from './icons';

interface HealthCheckCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: string[];
  isOpen: boolean;
  onToggle: () => void;
}

interface CheckHistoryItem {
    id: number;
    date: string;
    result: string;
}

export const HealthCheckCard: React.FC<HealthCheckCardProps> = ({ icon, title, description, steps, isOpen, onToggle }) => {
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<CheckHistoryItem[]>([]);

  // Load history from local storage on mount or title change
  useEffect(() => {
    try {
        const key = `shc_history_${title}`;
        const saved = localStorage.getItem(key);
        if (saved) setHistory(JSON.parse(saved));
    } catch(e) {
        console.error("Error loading history", e);
    }
  }, [title]);

  const handleSave = () => {
      if (!note.trim()) return;
      
      const newItem: CheckHistoryItem = {
          id: Date.now(),
          date: new Date().toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }),
          result: note.trim()
      };

      const newHistory = [newItem, ...history];
      setHistory(newHistory);
      try {
        localStorage.setItem(`shc_history_${title}`, JSON.stringify(newHistory));
      } catch(e) {}
      setNote('');
  };

  const handleDelete = (id: number) => {
      const newHistory = history.filter(h => h.id !== id);
      setHistory(newHistory);
      try {
        localStorage.setItem(`shc_history_${title}`, JSON.stringify(newHistory));
      } catch(e) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSave();
      }
  };

  return (
    <div
      className={`bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden transition-all duration-300 ease-in-out ${
        isOpen ? 'ring-1 ring-indigo-500/30 border-indigo-200 shadow-lg' : 'hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1'
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl group select-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm ${
            isOpen ? 'bg-indigo-600 text-white rotate-3 scale-110' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 group-hover:scale-105'
          }`}>
            {React.cloneElement(icon as React.ReactElement, { className: "w-7 h-7" })}
          </div>
          <div>
            <h3 className={`text-lg font-bold transition-colors duration-300 ${
              isOpen ? 'text-indigo-700' : 'text-slate-800 group-hover:text-indigo-700'
            }`}>
              {title}
            </h3>
            <p className={`text-xs font-medium mt-1 transition-colors duration-300 ${isOpen ? 'text-indigo-400' : 'text-slate-400'}`}>
                {isOpen ? 'กำลังดูรายละเอียด' : 'แตะเพื่อดูวิธีตรวจ'}
            </p>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border ${
          isOpen ? 'bg-indigo-100 border-indigo-200 rotate-180' : 'bg-white border-slate-100 group-hover:border-indigo-200'
        }`}>
             <ChevronDownIcon className={`w-5 h-5 transition-colors ${
               isOpen ? 'text-indigo-600' : 'text-slate-400 group-hover:text-indigo-500'
             }`} />
        </div>
      </button>

      <div
        className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-8 pt-2">
          <div className="relative">
             <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 to-transparent rounded-full hidden sm:block"></div>
             <div className="sm:pl-6">
                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 mb-6 text-sm text-slate-600 leading-relaxed">
                    <span className="font-bold text-indigo-900 block mb-1">💡 คำแนะนำเบื้องต้น</span>
                    {description}
                 </div>
                 
                 <div>
                    <h4 className="font-bold text-slate-800 mb-4 text-sm flex items-center uppercase tracking-wider">
                        <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse"></span>
                        ขั้นตอนการตรวจเช็ค
                    </h4>
                    <ul className="space-y-4">
                    {steps.map((step, index) => (
                        <li key={index} className="flex items-start group/step p-3 rounded-xl hover:bg-indigo-50/50 transition-colors duration-200 border border-transparent hover:border-indigo-100">
                            <div className="w-8 h-8 rounded-xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold mr-4 shrink-0 shadow-sm group-hover/step:bg-indigo-600 group-hover/step:text-white group-hover/step:border-indigo-600 transition-all duration-300">
                                {index + 1}
                            </div>
                            <span className="text-slate-600 text-sm leading-relaxed mt-1.5 group-hover/step:text-slate-900 transition-colors">{step}</span>
                        </li>
                    ))}
                    </ul>
                 </div>

                 {/* History Section */}
                 <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="font-bold text-slate-800 mb-3 text-sm flex items-center">
                        <HistoryIcon className="w-4 h-4 mr-2 text-indigo-500" />
                        บันทึกผลการตรวจ (History)
                    </h4>
                    
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="ระบุผล (เช่น 80, ปกติ, ไม่พบความผิดปกติ)"
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                        />
                        <button 
                            onClick={handleSave}
                            className="bg-indigo-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            บันทึก
                        </button>
                    </div>

                    {history.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                            {history.map(item => (
                                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm hover:border-indigo-100 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-indigo-500 font-bold mb-0.5">{item.date}</span>
                                        <span className="text-slate-700 font-medium">{item.result}</span>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(item.id)} 
                                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                        title="ลบรายการ"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            ยังไม่มีประวัติการบันทึก
                        </p>
                    )}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
