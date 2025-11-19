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
    if (!navigator.geolocation) {
      setError('เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่ง');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    // 1. Open window immediately (bypass popup blocker)
    const newWindow = window.open('', '_blank');

    if (!newWindow) {
        setIsLoading(false);
        setError('Pop-up ถูกบล็อก กรุณาอนุญาตให้เปิดหน้าต่างใหม่');
        return;
    }

    // Optional: Show loading text in new window
    newWindow.document.write('<html><body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">กำลังค้นหาตำแหน่งและเปิดแผนที่...</body></html>');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Construct the Google Maps search URL directly with "ใกล้ฉัน" (near me) for better accuracy
        const query = encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา ใกล้ฉัน");
        const url = `https://www.google.com/maps/search/${query}/@${latitude},${longitude},11z`;
        
        // 2. Redirect the pre-opened window to Google Maps
        newWindow.location.href = url;
        
        setIsLoading(false);
      },
      (err) => {
        // 3. Close window if failed
        newWindow.close();

        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('คุณปฏิเสธการเข้าถึงตำแหน่ง');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('ข้อมูลตำแหน่งไม่พร้อมใช้งาน');
            break;
          case err.TIMEOUT:
            setError('หมดเวลาในการค้นหาตำแหน่ง');
            break;
          default:
            setError('เกิดข้อผิดพลาดในการระบุตำแหน่ง');
            break;
        }
        setIsLoading(false);
      },
      { timeout: 10000 }
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