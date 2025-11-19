import React, { useState } from 'react';
import { MapPinIcon, NhsoIcon, ChevronRightIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';

export const NearbyHospitals: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNhsoModalOpen, setIsNhsoModalOpen] = useState(false);
  const [isServiceFinderModalOpen, setIsServiceFinderModalOpen] = useState(false);

  const handleFindHospitals = () => {
    setIsLoading(true);
    setError(null);

    // 1. Open window immediately to bypass popup blockers
    const newWindow = window.open('', '_blank');

    if (!newWindow) {
        setIsLoading(false);
        setError('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
        return;
    }

    // Show loading state in the new window while fetching location
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>กำลังค้นหา...</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f8fafc;
            color: #334155;
          }
          .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #e2e8f0;
            border-top: 5px solid #4f46e5;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 { margin: 0 0 10px 0; font-size: 18px; }
          p { margin: 0; color: #64748b; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>กำลังระบุตำแหน่งของคุณ</h2>
        <p>เพื่อค้นหาสถานพยาบาลที่ใกล้ที่สุด...</p>
      </body>
      </html>
    `);
    newWindow.document.close();

    const fallbackToGeneralSearch = () => {
       const query = encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา ใกล้ฉัน");
       const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
       newWindow.location.href = url;
       setIsLoading(false);
    };

    if (!navigator.geolocation) {
      fallbackToGeneralSearch();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Use Google Maps Universal URL structure
        const query = encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา");
        const url = `https://www.google.com/maps/search/?api=1&query=${query}&center=${latitude},${longitude}`;
        
        // 2. Redirect the pre-opened window to Google Maps
        newWindow.location.href = url;
        
        setIsLoading(false);
      },
      (err) => {
        // 3. Fallback to general search instead of closing
        console.warn('Geolocation error, falling back to general search:', err);
        fallbackToGeneralSearch();
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000, // Reduced timeout
        maximumAge: 0 
      }
    );
  };

  const handleNhsoRightsCheck = () => {
    setIsNhsoModalOpen(false);
    window.open('https://srmcitizen.nhso.go.th/', '_blank');
  };

  const handleServiceFinderConfirm = () => {
    setIsServiceFinderModalOpen(false);
    window.open('https://mishos.nhso.go.th/nhso4/inno_nearby', '_blank');
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 overflow-hidden flex flex-col h-full">
        <div className="p-6 flex-grow flex flex-col">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mr-4 shrink-0">
              <MapPinIcon />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">ค้นหาสถานพยาบาลใกล้เคียง</h3>
              <p className="text-slate-600 mt-1 text-sm">
                ค้นหาโรงพยาบาล, คลินิก, และร้านขายยาใกล้คุณ
              </p>
            </div>
          </div>
          
          <div className="mb-4 space-y-3">
              <button
                onClick={() => setIsNhsoModalOpen(true)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-center justify-between hover:bg-slate-100 hover:border-slate-300 transition-colors group text-left"
              >
                <div className="flex items-center">
                  <NhsoIcon className="w-10 h-10 mr-4 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">ตรวจสอบสิทธิหลักประกันสุขภาพ</p>
                    <p className="text-xs text-slate-500">ที่เว็บไซต์ สปสช.</p>
                  </div>
                </div>
                <ChevronRightIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
              <button
                onClick={() => setIsServiceFinderModalOpen(true)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 flex items-center justify-between hover:bg-slate-100 hover:border-slate-300 transition-colors group text-left"
              >
                <div className="flex items-center">
                  <NhsoIcon className="w-10 h-10 mr-4 shrink-0" />
                  <div>
                    <p className="font-bold text-slate-800">ค้นหาหน่วยบริการในระบบฯ</p>
                    <p className="text-xs text-slate-500">ที่เว็บไซต์ สปสช.</p>
                  </div>
                </div>
                <ChevronRightIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </button>
          </div>
          
          <div className="mt-auto pt-4">
            <button
              onClick={handleFindHospitals}
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'กำลังค้นหา...' : 'เปิด Google Maps เพื่อค้นหา'}
            </button>
          </div>

          {error && (
            <div className="mt-4 text-center bg-red-50 text-red-700 p-3 rounded-lg text-sm">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isNhsoModalOpen}
        onClose={() => setIsNhsoModalOpen(false)}
        adSlot={<AdBanner />}
      >
        <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">ประโยชน์ของการตรวจสอบสิทธิ</h3>
            <p className="text-sm text-slate-600 mt-2 px-2">
              การตรวจสอบสิทธิประกันสุขภาพช่วยประหยัดค่าใช้จ่าย ลดความกังวล และทำให้แพทย์วางแผนการรักษาได้อย่างเหมาะสม ประโยชน์หลักคือการประเมินค่าใช้จ่ายก่อนเข้ารับการรักษา ทำให้ทราบถึงค่าใช้จ่ายส่วนเกินและเตรียมพร้อมทางการเงิน
            </p>
            <div className="mt-6 flex justify-center gap-4">
                <button
                    onClick={handleNhsoRightsCheck}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                >
                    เข้าใจและตกลง
                </button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={isServiceFinderModalOpen}
        onClose={() => setIsServiceFinderModalOpen(false)}
        adSlot={<AdBanner />}
      >
        <div className="text-center">
            <h3 className="text-lg font-bold text-slate-800">ประโยชน์ของหน่วยบริการ สปสช.</h3>
            <p className="text-sm text-slate-600 mt-2 px-2">
              หน่วยบริการ สปสช. มีประโยชน์หลักในการทำให้ประชาชนเข้าถึงการรักษาพยาบาลและการบริการสาธารณสุขรวมถึงการรักษาโรค การสร้างเสริมสุขภาพ การป้องกันโรค การดูแลผู้ป่วยโรคเรื้อรังและค่าใช้จ่ายสูง รวมถึงการให้ความช่วยเหลือค่าใช้จ่ายอื่น ๆ เช่น ยา ค่าห้อง ค่าพาหนะรับส่งผู้ป่วย
            </p>
            <div className="mt-6 flex justify-center gap-4">
                <button
                    onClick={handleServiceFinderConfirm}
                    className="px-6 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors"
                >
                    เข้าใจและตกลง
                </button>
            </div>
        </div>
      </Modal>
    </>
  );
};