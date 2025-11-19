
import React, { useState } from 'react';
import { MapPinIcon, NhsoIcon, ChevronRightIcon } from './icons';
import { Modal } from './Modal';
import { AdBanner } from './AdBanner';

export const NearbyHospitals: React.FC = () => {
  const [isNhsoModalOpen, setIsNhsoModalOpen] = useState(false);
  const [isServiceFinderModalOpen, setIsServiceFinderModalOpen] = useState(false);

  const handleFindHospitals = () => {
    const query = encodeURIComponent("โรงพยาบาล คลินิก และร้านขายยา ใกล้ฉัน");
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(url, '_blank');
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
              className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              เปิด Google Maps เพื่อค้นหา
            </button>
          </div>
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
