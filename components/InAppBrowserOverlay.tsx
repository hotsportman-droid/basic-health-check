
import React, { useEffect, useState } from 'react';

export const InAppBrowserOverlay: React.FC = () => {
  const [isInApp, setIsInApp] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const ua = userAgent.toLowerCase();

    // Detect In-App Browsers (Line, Facebook, Instagram, Twitter, LinkedIn, etc.)
    const isLine = ua.indexOf('line/') > -1;
    const isFb = ua.indexOf('fban') > -1 || ua.indexOf('fbav') > -1;
    const isIg = ua.indexOf('instagram') > -1;
    const isTwitter = ua.indexOf('twitter') > -1;
    const isLinkedIn = ua.indexOf('linkedin') > -1;
    
    if (isLine || isFb || isIg || isTwitter || isLinkedIn) {
        setIsInApp(true);
    }
  }, []);

  if (!isInApp) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">กรุณาเปิดในเบราว์เซอร์หลัก</h2>
        <p className="text-slate-600 mb-6 text-sm leading-relaxed">
            แอปพลิเคชันนี้ต้องการการเข้าถึงไมโครโฟนเพื่อคุยกับหมอรักษ์ ซึ่งเบราว์เซอร์ของแอป (เช่น Line/Facebook) ไม่รองรับ
        </p>
        
        <div className="bg-slate-50 rounded-xl p-5 text-left border border-slate-200 shadow-sm">
            <h3 className="font-bold text-indigo-600 mb-3 text-sm flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-2"></span>
                วิธีแก้ไข:
            </h3>
            <ol className="text-sm text-slate-700 space-y-3">
                <li className="flex items-start">
                    <span className="font-bold mr-2">1.</span>
                    <span>แตะที่เมนู <strong>จุดสามจุด (⋮)</strong> ที่มุมขวาบน</span>
                </li>
                <li className="flex items-start">
                    <span className="font-bold mr-2">2.</span>
                    <span>เลือก <strong>"เปิดในเบราว์เซอร์"</strong> <br/><span className="text-xs text-slate-500">(Open in Browser / Safari / Chrome)</span></span>
                </li>
            </ol>
        </div>
        
        <div className="mt-6">
             <button 
                onClick={() => setIsInApp(false)} 
                className="text-xs text-slate-400 hover:text-slate-600 underline decoration-slate-300 hover:decoration-slate-500 transition-all"
            >
                ฉันเข้าใจความเสี่ยง และต้องการใช้งานต่อ
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};
