
import React from 'react';
import { Modal } from './Modal';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const currentUrl = window.location.href;
  // Using a robust public API for QR generation
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center flex flex-col items-center pb-2">
        <h3 className="text-xl font-bold text-slate-800 mb-2">สแกนเพื่อใช้งานทันที</h3>
        <p className="text-slate-500 text-sm mb-6 px-4">
            เปิดกล้องมือถือแล้วสแกน QR Code นี้<br/>เพื่อใช้งาน "สุขภาพดีกับหมอรักษ์" ในเบราว์เซอร์
        </p>
        
        <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-200 mb-4">
          <img 
            src={qrUrl} 
            alt="QR Code" 
            className="w-48 h-48 md:w-56 md:h-56 object-contain"
            loading="lazy"
          />
        </div>
        
        <div className="bg-slate-50 rounded-lg p-3 w-full">
             <p className="text-xs text-slate-500 text-center">
                แนะนำให้เปิดผ่าน <strong>Chrome (Android)</strong> หรือ <strong>Safari (iOS)</strong><br/>เพื่อประสิทธิภาพการทำงานที่ดีที่สุด
             </p>
        </div>
      </div>
    </Modal>
  );
};
