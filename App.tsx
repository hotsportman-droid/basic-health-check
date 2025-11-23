
import React, { useState, useEffect, useRef } from 'react';
import { HealthCheckCard } from './components/HealthCheckCard';
import { BMICalculator } from './components/BMICalculator';
import { NearbyHospitals } from './components/NearbyHospitals';
import { HEALTH_CHECKS } from './constants';
import { StethoscopeIcon, ShareIcon, QrCodeIcon, UserIcon } from './components/icons';
import { ShareModal } from './components/ShareModal';
import { DrRakAvatar } from './components/DrRakAvatar';
import { QRCodeModal } from './components/QRCodeModal';
import { InAppBrowserOverlay } from './components/InAppBrowserOverlay';
import { MedicationGuide } from './components/MedicationGuide';

// --- Final, Vercel-Native Unique Visitor Counter ---
const BASE_FRIEND_COUNT = 450;
const COUNTER_API_ENDPOINT = '/api/counter';

const App: React.FC = () => {
  const [openAccordion, setOpenAccordion] = useState<string | null>('pulse-check');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  const [totalFriends, setTotalFriends] = useState<number | string>('...');
  const effectRan = useRef(false);
  
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    const syncUniqueVisitorCount = async () => {
      if (effectRan.current) return;
      effectRan.current = true;
      
      // Use a final, clean storage key to ensure everyone is recounted on this version
      const storageKey = `dr_rak_visited_vercel_upstash_final`;
      let hasVisited = null;
      try {
        hasVisited = localStorage.getItem(storageKey);
      } catch(e) { console.error("LocalStorage Access Denied"); }

      try {
        let response;
        if (!hasVisited) {
          // New Visitor: Increment (POST request)
          console.log("[Counter] New visitor detected. Incrementing count...");
          response = await fetch(COUNTER_API_ENDPOINT, { method: 'POST' });
        } else {
          // Returning Visitor: Read (GET request)
          console.log("[Counter] Returning visitor. Reading latest count...");
          response = await fetch(COUNTER_API_ENDPOINT, { method: 'GET' });
        }
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (typeof data.count === 'number') {
          const realTotal = BASE_FRIEND_COUNT + data.count;
          setTotalFriends(realTotal);
          
          // Only mark as visited AFTER a successful increment.
          if (!hasVisited) {
            try {
                localStorage.setItem(storageKey, 'true');
                console.log("[Counter] Successfully incremented and marked as visited.");
            } catch(e) { console.error("LocalStorage Write Denied"); }
          }
        } else {
            throw new Error('Invalid count format from server');
        }

      } catch (error) {
        console.error("[Counter] API call failed.", error);
        // Per user request, do not fallback. UI will remain in loading state.
      }
    };

    syncUniqueVisitorCount();
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

  return (
    <>
      <InAppBrowserOverlay />
      <div className="min-h-screen min-h-[100dvh] bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100 selection:text-indigo-700">
        <header className="bg-slate-50/80 backdrop-blur-lg shadow-sm sticky top-0 z-30 transition-all duration-300 border-b border-slate-200/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center space-x-3 group cursor-default">
                <div className="bg-indigo-100 p-2 rounded-xl group-hover:scale-105 transition-transform duration-300">
                    <StethoscopeIcon className="h-7 w-7 text-indigo-600" />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight group-hover:text-indigo-700 transition-colors">
                  สุขภาพดีกับหมอรักษ์
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:space-x-2 md:px-4 md:py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 hover:border-indigo-200 hover:text-indigo-600 focus:outline-none transition-all duration-200"
                  aria-label="แชร์แอปพลิเคชัน"
                >
                  <ShareIcon className="w-5 h-5" />
                  <span className="hidden md:inline">แชร์</span>
                </button>
                
                <button
                  onClick={() => setIsQRCodeModalOpen(true)}
                  className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:space-x-2 md:px-4 md:py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5 focus:outline-none transition-all duration-200"
                  aria-label="QR Code สำหรับเข้าใช้งาน"
                >
                  <QrCodeIcon className="w-5 h-5" />
                  <span className="hidden md:inline">QR Code</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 sm:p-6 lg:p-8 pb-24">
          
          {/* Beautiful Banner Section */}
          <section className="relative overflow-hidden isolate rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white shadow-2xl mb-10 sm:mb-14 ring-1 ring-white/10">
             {/* Abstract Background Shapes */}
             <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
             <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
             
             <div className="relative z-10 px-6 py-12 md:py-16 md:px-12 flex flex-col md:flex-row items-center justify-between gap-8">
                 <div className="max-w-2xl text-center md:text-left">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-xs font-bold text-indigo-100 mb-6">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        Health Assistant
                     </div>
                     <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight tracking-tight">
                        ปรึกษาปัญหาสุขภาพกับ <br/>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                            "หมอรักษ์" อัจฉริยะ
                        </span>
                     </h2>
                     <p className="text-indigo-100 text-lg md:text-xl mb-8 leading-relaxed max-w-xl mx-auto md:mx-0">
                        เพื่อนคู่คิดเรื่องสุขภาพ พูดคุยได้เหมือนคนจริง ให้คำแนะนำเบื้องต้นตลอด 24 ชม. 
                        <span className="block mt-2 text-base opacity-80 font-medium">
                            * ข้อมูลของคุณจะถูกเก็บเป็นความลับในเครื่องเท่านั้น
                        </span>
                     </p>
                     <button 
                        onClick={() => document.getElementById('ai-consult')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-white text-indigo-700 px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-indigo-900/20 hover:bg-indigo-50 hover:scale-105 hover:shadow-xl transition-all duration-300 active:scale-95"
                     >
                        เริ่มปรึกษาหมอรักษ์เลย
                     </button>
                 </div>
                 <div className="hidden md:block relative">
                    {/* Decorative element for desktop */}
                    <div className="w-64 h-64 bg-gradient-to-tr from-white/20 to-transparent rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center animate-subtle-bounce">
                        <StethoscopeIcon className="w-32 h-32 text-white/80" />
                    </div>
                 </div>
             </div>
          </section>

           {/* Dr Rak Avatar Section */}
           <section className="mb-16 scroll-mt-28" id="ai-consult">
             <DrRakAvatar />
           </section>

           {/* Health Checks Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             
             {/* Left Column: Health Checks List */}
             <div className="lg:col-span-8 space-y-6">
               <div className="flex items-center space-x-3 mb-6 px-2">
                  <div className="h-8 w-1 bg-indigo-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold text-slate-800">เช็คสุขภาพด้วยตัวเอง</h2>
               </div>
               
               {/* BMI Calculator */}
               <BMICalculator 
                  isOpen={openAccordion === 'bmi-calc'} 
                  onToggle={() => handleToggle('bmi-calc')} 
               />

               {/* Health Check Cards */}
               {HEALTH_CHECKS.map((check, index) => (
                 <HealthCheckCard
                   key={index}
                   {...check}
                   isOpen={openAccordion === `check-${index}`}
                   onToggle={() => handleToggle(`check-${index}`)}
                 />
               ))}

               {/* New Medication Guide Section */}
               <div className="pt-8">
                 <MedicationGuide />
               </div>
             </div>

             {/* Right Column: Hospitals & Info (Sticky) */}
             <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
               <NearbyHospitals />
               
               {/* Friend Counter Card */}
               <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex items-center justify-between relative z-10">
                      <div>
                          <p className="text-indigo-100 text-sm font-medium mb-1">เพื่อนรักสุขภาพ</p>
                          <p className="text-4xl font-bold tracking-tight">{totalFriends}</p>
                          <p className="text-xs text-indigo-200 mt-2">คนใช้งานแอปฯ ทั้งหมดตอนนี้</p>
                      </div>
                      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                          <UserIcon className="w-8 h-8 text-white" />
                      </div>
                  </div>
               </div>

               {/* Install Prompt for iOS (Conditional) */}
               {isIOS && (
                   <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 text-center">
                       <p className="font-bold text-slate-800 mb-2">เคล็ดลับสำหรับ iPhone</p>
                       <p className="text-sm text-slate-600 mb-3">
                           ติดตั้งแอปฯ ไว้บนหน้าจอหลักเพื่อการใช้งานที่เต็มจอและสะดวกยิ่งขึ้น
                       </p>
                       <div className="flex items-center justify-center gap-2 text-xs text-slate-500 bg-white p-2 rounded-lg border border-slate-200 mx-auto w-fit">
                           <span>แตะปุ่มแชร์</span>
                           <ShareIcon className="w-4 h-4" />
                           <span>แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"</span>
                       </div>
                   </div>
               )}
             </div>
           </div>
        </main>

        <footer className="bg-slate-800 text-slate-400 py-12 mt-12">
            <div className="container mx-auto px-4 text-center space-y-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <StethoscopeIcon className="w-6 h-6 text-indigo-400" />
                    <span className="font-bold text-slate-200 text-lg">สุขภาพดีกับหมอรักษ์</span>
                </div>
                <p className="text-sm max-w-md mx-auto leading-relaxed opacity-80">
                    แอปพลิเคชันนี้จัดทำขึ้นเพื่อให้ข้อมูลเบื้องต้นเท่านั้น 
                    ไม่สามารถทดแทนคำแนะนำ การวินิจฉัย หรือการรักษาจากแพทย์ผู้เชี่ยวชาญได้ 
                    หากมีอาการเจ็บป่วยรุนแรง โปรดไปพบแพทย์ทันที
                </p>
                <div className="w-16 h-1 bg-slate-700 mx-auto rounded-full"></div>
                <p className="text-xs">
                    © {new Date().getFullYear()} บริษัท ดู กรุ๊ป (ไทยแลนด์) จำกัด. สงวนลิขสิทธิ์.
                </p>
            </div>
        </footer>

        <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
        <QRCodeModal isOpen={isQRCodeModalOpen} onClose={() => setIsQRCodeModalOpen(false)} />
      </div>
    </>
  );
};

export default App;
