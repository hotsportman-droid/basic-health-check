
import React, { useState, useMemo, useEffect } from 'react';
import { ScaleIcon, ChevronDownIcon, XIcon } from './icons';

interface BMICalculatorProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface BMIHistoryItem {
  date: string;
  timestamp: number;
  bmi: number;
  weight: number;
}

export const BMICalculator: React.FC<BMICalculatorProps> = ({ isOpen, onToggle }) => {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [bmi, setBmi] = useState<number | null>(null);
  const [history, setHistory] = useState<BMIHistoryItem[]>([]);

  // Load history and last inputs from local storage on mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('shc_bmi_history');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      const lastHeight = localStorage.getItem('shc_last_height');
      if (lastHeight) setHeight(lastHeight);

      const lastWeight = localStorage.getItem('shc_last_weight');
      if (lastWeight) setWeight(lastWeight);
    } catch (e) {
      console.error("Error loading BMI data", e);
    }
  }, []);

  const calculateBmi = () => {
    const h = parseFloat(height) / 100;
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const bmiValue = w / (h * h);
      setBmi(bmiValue);

      // Save inputs for convenience
      localStorage.setItem('shc_last_height', height);
      localStorage.setItem('shc_last_weight', weight);

      // Add to history
      const newItem: BMIHistoryItem = {
        date: new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
        timestamp: Date.now(),
        bmi: bmiValue,
        weight: w
      };

      setHistory(prev => {
        // Keep only last 10 entries and ensure no duplicates for same exact time
        const newHistory = [...prev, newItem].slice(-10); 
        localStorage.setItem('shc_bmi_history', JSON.stringify(newHistory));
        return newHistory;
      });

    } else {
        setBmi(null);
    }
  };

  const clearHistory = () => {
    if (window.confirm('คุณต้องการลบประวัติการคำนวณทั้งหมดหรือไม่?')) {
      setHistory([]);
      localStorage.removeItem('shc_bmi_history');
    }
  };

  const bmiResult = useMemo(() => {
    if (bmi === null) return null;

    let category = '';
    let color = '';
    let advice = '';

    if (bmi < 18.5) {
      category = 'น้ำหนักน้อย / ผอม';
      color = 'text-blue-500';
      advice = 'ควรรับประทานอาหารที่มีประโยชน์ให้มากขึ้นและออกกำลังกายเพื่อสร้างกล้ามเนื้อ';
    } else if (bmi >= 18.5 && bmi < 23) {
      category = 'ปกติ (สุขภาพดี)';
      color = 'text-green-500';
      advice = 'เยี่ยมมาก! รักษาน้ำหนักและวิถีชีวิตเพื่อสุขภาพที่ดีต่อไป';
    } else if (bmi >= 23 && bmi < 25) {
      category = 'ท้วม / โรคอ้วนระดับ 1';
      color = 'text-yellow-600';
      advice = 'ควรเริ่มควบคุมอาหารและเพิ่มการออกกำลังกายเพื่อลดความเสี่ยงต่อโรค';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'อ้วน / โรคอ้วนระดับ 2';
      color = 'text-orange-500';
      advice = 'มีความเสี่ยงต่อโรคที่มากับความอ้วน ควรปรึกษาผู้เชี่ยวชาญ';
    } else {
      category = 'อ้วนมาก / โรคอ้วนระดับ 3';
      color = 'text-red-500';
      advice = 'มีความเสี่ยงสูงต่อโรคอันตราย ควรปรึกษาแพทย์เพื่อรับการดูแลอย่างเหมาะสม';
    }

    return {
      value: bmi.toFixed(2),
      category,
      color,
      advice,
    };
  }, [bmi]);

  // Graph Calculation
  const graphData = useMemo(() => {
    if (history.length < 2) return null;

    const width = 300;
    const height = 120;
    const padding = 20;

    const bmis = history.map(h => h.bmi);
    const minBMI = Math.min(...bmis) - 1;
    const maxBMI = Math.max(...bmis) + 1;
    const range = maxBMI - minBMI || 1; // Avoid divide by zero

    const points = history.map((item, index) => {
      const x = padding + (index / (history.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((item.bmi - minBMI) / range) * (height - 2 * padding);
      return { x, y, ...item };
    });

    const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const fillD = `${pathD} L ${width - padding},${height} L ${padding},${height} Z`;

    return { points, pathD, fillD, width, height };
  }, [history]);

  return (
    <div
      className="bg-white rounded-xl shadow-md border border-slate-200/80 overflow-hidden transition-all duration-300 ease-in-out"
    >
      <button
        onClick={onToggle}
        className="w-full p-6 text-left flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl"
        aria-expanded={isOpen}
      >
        <div className="flex items-center">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0">
                <ScaleIcon />
            </div>
            <div>
                <h3 className="text-lg font-bold text-slate-800">คำนวณดัชนีมวลกาย (BMI)</h3>
            </div>
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-slate-500 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[1000px]' : 'max-h-0'
        }`}
      >
        <div className="px-6 pb-6 pt-0">
          <p className="text-slate-600 mb-5 text-sm">
            ประเมินภาวะอ้วนและผอมในผู้ใหญ่ เพื่อประเมินความเสี่ยงต่อการเกิดโรคต่างๆ
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                <label htmlFor="weight" className="block text-sm font-medium text-slate-700">
                    น้ำหนัก (กก.)
                </label>
                <input
                    type="number"
                    id="weight"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="เช่น 60"
                />
                </div>
                <div>
                <label htmlFor="height" className="block text-sm font-medium text-slate-700">
                    ส่วนสูง (ซม.)
                </label>
                <input
                    type="number"
                    id="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="เช่น 175"
                />
                </div>
            </div>
            <button
              onClick={calculateBmi}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              คำนวณ BMI
            </button>
          </div>

          {bmiResult && (
            <div className="mt-6 text-center bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fade-in">
              <p className="text-slate-600 text-sm">ค่า BMI ของคุณคือ</p>
              <p className={`text-4xl font-bold my-1 ${bmiResult.color}`}>{bmiResult.value}</p>
              <p className={`font-semibold ${bmiResult.color}`}>{bmiResult.category}</p>
              <p className="text-xs text-slate-500 mt-2 px-2">{bmiResult.advice}</p>
            </div>
          )}

          {/* Graph Section */}
          {graphData && history.length > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-end mb-2 px-1">
                    <h4 className="text-sm font-bold text-slate-700">แนวโน้มสุขภาพ (History)</h4>
                    <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600 flex items-center">
                        ลบประวัติ
                    </button>
                </div>
                
                <div className="bg-white p-2 rounded-lg border border-slate-100 relative">
                    <svg viewBox={`0 0 ${graphData.width} ${graphData.height}`} className="w-full h-32 overflow-visible">
                        <defs>
                            <linearGradient id="gradientFill" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Fill Area */}
                        <path d={graphData.fillD} fill="url(#gradientFill)" />
                        
                        {/* Line */}
                        <path 
                            d={graphData.pathD} 
                            fill="none" 
                            stroke="#6366f1" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                        />

                        {/* Dots */}
                        {graphData.points.map((p, i) => (
                            <g key={i}>
                                <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#4f46e5" strokeWidth="2" />
                                {/* Show label only for first and last to avoid clutter */}
                                {(i === 0 || i === graphData.points.length - 1) && (
                                    <text 
                                        x={p.x} 
                                        y={p.y - 8} 
                                        textAnchor="middle" 
                                        fontSize="10" 
                                        fill="#64748b"
                                        className="font-sans"
                                    >
                                        {p.bmi.toFixed(1)}
                                    </text>
                                )}
                            </g>
                        ))}
                    </svg>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-2">
                        <span>{history[0].date}</span>
                        <span>{history[history.length - 1].date}</span>
                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
