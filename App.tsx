
import React, { useState, useEffect, useRef } from 'react';
import { HealthCheckCard } from './components/HealthCheckCard';
import { BMICalculator } from './components/BMICalculator';
import { NearbyHospitals } from './components/NearbyHospitals';
import { HEALTH_CHECKS } from './constants';
import { StethoscopeIcon, ShareIcon, QrCodeIcon } from './components/icons';
import { ShareModal } from './components/ShareModal';
import { Modal } from './components/Modal';
import { DrRakAvatar } from './components/DrRakAvatar';
import { QRCodeModal } from './components/QRCodeModal';

// Base friend count
const BASE_FRIEND_COUNT = 450;
// Namespace for the counter service (v6)
const COUNTER_NAMESPACE = 'dr-rak-health-v6';
const COUNTER_KEY = 'visits';

const App: React.FC = () => {
  const [openAccordion, setOpenAccordion] = React.useState<string | null>('pulse-check');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isInstallInstructionOpen, setIsInstallInstructionOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  // Start with a loading state placeholder (Base + 1)
  const [totalFriends, setTotalFriends] = useState(BASE_FRIEND_COUNT + 1); 
  
  // Prevent double-firing in React Strict Mode
  const effectRan = useRef(false);

  useEffect(() => {
    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // --- ROBUST COUNTER LOGIC ---
    const updateFriendCount = async () => {
      if (effectRan.current) return;
      effectRan.current = true;

      const storageKey = `dr_rak_reg_${COUNTER_NAMESPACE}`;
      // Removed local cache reading logic to ensure we ALWAYS show the server's latest count

      const timestamp = Date.now(); // Force bypass browser cache

      try {
        const isRegistered = localStorage.getItem(storageKey);
        let countValue = 0;
        let response;
        let url = '';

        if (!isRegistered) {
          // CASE: New Device -> Hit /up (Increment)
          url = `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}/up?t=${timestamp}`;
        } else {
          // CASE: Existing Device -> Hit / (Read Current)
          url = `https://api.counterapi.dev/v1/${COUNTER_NAMESPACE}/${COUNTER_KEY}?t=${timestamp}`;
        }

        response = await fetch(url, {
            method: 'GET',
            cache: 'no-store', // Critical: Do not use browser cache
            headers: {
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data && typeof data.count === 'number') {
                countValue = data.count;
                
                // Update State with FRESH data from server
                setTotalFriends(BASE_FRIEND_COUNT + countValue);
                
                // Mark as registered if new
                if (!isRegistered) {
                    localStorage.setItem(storageKey, 'true');
                    console.log("New Friend Registered! Count:", countValue);
                } else {
                    console.log("Welcome back! Latest Count:", countValue);
                }
            }
        } else {
            console.warn("Counter API returned non-OK status");
        }
      } catch (error) {
        console.error("Counter API Error:", error);
        // Fallback: The state remains at default (Base+1) or whatever was last rendered
      }
    };

    updateFriendCount();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);


  const handleShare = async () => {
    const shareData = {
      title: 'คู่มือตรวจสุขภาพด้วยตนเอง',
      text: 'คู่มือตรวจสุขภาพด้วยตนเอง ลองเข้าไปดูสิ มีประโยชน์มากๆ เลย!',
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback for desktop browsers
      setIsShareModalOpen(true);
    }
  };

  const handleToggle = (key: string) => {
    setOpenAccordion(prevKey => (prevKey === key ? null : key));
  };

  const pulseCheck = HEALTH_CHECKS.find(
    (check) => check.title === 'การวัดชีพจร'
  );
  const respirationCheck = HEALTH_CHECKS.find(
    (check) => check.title === 'การสังเกตการหายใจ'
  );

  const otherChecks = HEALTH_CHECKS.filter(
    (check) =>
      check.title !== 'การวัดชีพจร' &&
      check.title !== 'การสังเกตการหายใจ'
  );

  return (
    <>
      <div className="min-h-screen min-h-[100dvh] bg-slate-50 text-slate-800">
        <header className="bg-slate-50/80 backdrop-blur-lg shadow-sm sticky top-0 z-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-3">
                <StethoscopeIcon className="h-8 w-8 text-indigo-500" />
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
                  สุขภาพดีกับหมอรักษ์
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:space-x-2 md:px-4 md:py-2 bg-slate-200 text-slate-800 text-sm font-semibold rounded-lg shadow-sm hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                  aria-label="แชร์แอปพลิเคชัน"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span className="hidden md:inline">แชร์</span>
                </button>
                
                <button
                  onClick={() => setIsQRCodeModalOpen(true)}
                  className="flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:space-x-2 md:px-4 md:py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                  aria-label="QR Code สำหรับเข้าใช้งาน"
                >
                  <QrCodeIcon className="w-5 h-5" />
                  <span className="hidden md:inline">QR Code</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 sm:p-6 lg:p-8">
          
          {/* Beautiful Banner Section */}
          <section className="relative overflow-hidden isolate rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-teal-500 text-white shadow-xl shadow-indigo-200 mb-10 p-8 md:p-16 text-center transition-transform hover:scale-[1.01] duration-500 transform-gpu">
              {/* Decorative Background Elements */}
              <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/4 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 w-96 h-96 bg-teal-400 opacity-20 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] [mask-image:radial-gradient(black,transparent_70%)] pointer-events-none"></div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="inline-flex items-center justify-center px-4 py-1.5 mb-6 text-sm font-bold text-indigo-50 bg-white/10 backdrop-blur-md rounded-full border border-white/20 shadow-sm">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-pink-400 mr-2 animate-pulse shadow-[0_0_8px_rgba(244,114,182,0.6)]"></span>
                    เพื่อนหมอรักษ์ {totalFriends.toLocaleString()} คน
                </div>
                
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-md leading-tight">
                    สุขภาพดีเริ่มต้นที่<br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-200 to-white">การดูแลตัวเอง</span>
                </h2>
                
                <p className="text-indigo-100 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium opacity-90">
                    คู่มือตรวจเช็คสุขภาพอัจฉริยะ เพื่อความอุ่นใจของคุณและครอบครัว
                </p>
              </div>
          </section>

          {/* Dr.Rak Avatar Chat Section - The Highlight */}
          <section className="mb-10">
            <DrRakAvatar />
          </section>

          {/* Primary Tools Section */}
          <section className="mb-12">
              <div className="grid grid-cols-1 gap-6 md:gap-8 items-start max-w-xl mx-auto">
                  <NearbyHospitals />
              </div>
          </section>

          {/* Self-Check Guides Section */}
          <section>
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-slate-700">คู่มือการตรวจเช็คเบื้องต้น</h3>
              <p className="text-slate-500 mt-1">ขั้นตอนการสังเกตสุขภาพด้านต่างๆ ด้วยตนเอง</p>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {pulseCheck && (
                <HealthCheckCard
                  key="pulse-check"
                  icon={<StethoscopeIcon />}
                  title={pulseCheck.title}
                  description={pulseCheck.description}
                  steps={pulseCheck.steps}
                  isOpen={openAccordion === 'pulse-check'}
                  onToggle={() => handleToggle('pulse-check')}
                />
              )}
              {respirationCheck && (
                <HealthCheckCard
                  key="respiration-check"
                  icon={<StethoscopeIcon />}
                  title={respirationCheck.title}
                  description={respirationCheck.description}
                  steps={respirationCheck.steps}
                  isOpen={openAccordion === 'respiration-check'}
                  onToggle={() => handleToggle('respiration-check')}
                />
              )}
              {otherChecks.map((check) => (
                <HealthCheckCard
                  key={check.title}
                  icon={check.icon}
                  title={check.title}
                  description={check.description}
                  steps={check.steps}
                  isOpen={openAccordion === check.title}
                  onToggle={() => handleToggle(check.title)}
                />
              ))}
              <BMICalculator 
                isOpen={openAccordion === 'bmi-calculator'}
                onToggle={() => handleToggle('bmi-calculator')}
              />
            </div>
          </section>

        </main>

        <footer className="bg-white mt-16 py-8 border-t border-slate-200">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500 text-sm">
            <p className="font-semibold text-red-600 mb-2">ข้อควรระวัง</p>
            <p className="max-w-2xl mx-auto">
              ข้อมูลในแอปพลิเคชันนี้เป็นเพียงคำแนะนำเบื้องต้น
              ไม่สามารถใช้แทนการวินิจฉัยหรือการรักษาจากแพทย์ผู้เชี่ยวชาญได้
              หากมีความกังวลเกี่ยวกับสุขภาพ ควรปรึกษาแพทย์เสมอ
            </p>
          </div>
        </footer>
      </div>
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
      <QRCodeModal isOpen={isQRCodeModalOpen} onClose={() => setIsQRCodeModalOpen(false)} />
      
      {/* Install Instruction Modal - Kept for manual trigger fallback if needed, though currently unused via button */}
      <Modal isOpen={isInstallInstructionOpen} onClose={() => setIsInstallInstructionOpen(false)}>
         <div className="text-center p-2">
             <h3 className="text-xl font-bold text-slate-800 mb-4">
                 {isIOS ? 'วิธีติดตั้งบน iOS' : 'วิธีติดตั้งแอป'}
             </h3>
             
             {isIOS ? (
                 <div className="space-y-4 text-left text-slate-600 text-sm">
                     <p>1. แตะที่ปุ่ม <strong>แชร์</strong> <span className="inline-block"><ShareIcon className="w-4 h-4 inline text-blue-500"/></span> ที่แถบด้านล่างของ Safari</p>
                     <p>2. เลื่อนลงมาและเลือก <strong>"เพิ่มไปยังหน้าจอโฮม" (Add to Home Screen)</strong></p>
                     <p>3. กดปุ่ม <strong>"เพิ่ม" (Add)</strong> ที่มุมขวาบน</p>
                 </div>
             ) : (
                 <div className="space-y-4 text-center text-slate-600 text-sm">
                     <p>กรุณากดที่เมนูของเบราว์เซอร์ (สัญลักษณ์จุดสามจุด หรือ ขีดสามขีด)</p>
                     <p>แล้วเลือกเมนู <strong>"ติดตั้งแอป"</strong> หรือ <strong>"เพิ่มลงในหน้าจอหลัก"</strong></p>
                 </div>
             )}
             
             <button
                onClick={() => setIsInstallInstructionOpen(false)}
                className="mt-6 w-full bg-slate-200 text-slate-800 font-bold py-2 rounded-lg hover:bg-slate-300 transition-colors"
             >
                 เข้าใจแล้ว
             </button>
         </div>
      </Modal>
    </>
  );
};

export default App;
