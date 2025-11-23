
import React, { useState } from 'react';
import { PillIcon, ChevronDownIcon, SearchIcon, ExclamationIcon, CheckCircleIcon } from './icons';

interface Medication {
  id: string;
  name: string;
  genericName?: string;
  indication: string;
  usage: string;
  warning: string;
  sideEffect: string;
}

const MEDICATIONS: Medication[] = [
  {
    id: 'paracetamol',
    name: 'พาราเซตามอล (Paracetamol)',
    genericName: 'Paracetamol / Acetaminophen',
    indication: 'บรรเทาอาการปวดเล็กน้อยถึงปานกลาง และลดไข้',
    usage: 'ทานครั้งละ 1 เม็ด (500 มก.) ทุก 4-6 ชั่วโมง เวลามีอาการ',
    warning: 'ห้ามทานเกิน 8 เม็ด (4,000 มก.) ต่อวัน, ผู้ป่วยโรคตับควรปรึกษาแพทย์',
    sideEffect: 'ผื่นแพ้ (หายาก), ตับอักเสบหากใช้เกินขนาด'
  },
  {
    id: 'ibuprofen',
    name: 'ไอบูโพรเฟน (Ibuprofen)',
    genericName: 'Ibuprofen',
    indication: 'ลดการอักเสบ ปวด บวม แดง และลดไข้สูง',
    usage: 'ทานครั้งละ 1 เม็ด (400 มก.) วันละ 3 ครั้ง หลังอาหารทันที',
    warning: 'ระคายเคืองกระเพาะอาหาร, ห้ามใช้ในผู้สงสัยเป็นไข้เลือดออก',
    sideEffect: 'ปวดท้อง, คลื่นไส้, เลือดออกในกระเพาะอาหาร'
  },
  {
    id: 'antihistamine',
    name: 'ยาแก้แพ้ (CPM / Cetirizine)',
    genericName: 'Chlorpheniramine / Cetirizine',
    indication: 'บรรเทาอาการแพ้ จาม น้ำมูกไหล ลมพิษ',
    usage: 'CPM: ทาน 1 เม็ด ทุก 6 ชม., Cetirizine: ทาน 1 เม็ด วันละ 1 ครั้ง',
    warning: 'ยา CPM อาจทำให้ง่วงซึม ควรหลีกเลี่ยงการขับรถหรือทำงานกับเครื่องจักร',
    sideEffect: 'ง่วงนอน, ปากแห้ง, ตาพร่ามัว'
  },
  {
    id: 'simethicone',
    name: 'ยาแก้ท้องอืด (Simethicone)',
    genericName: 'Simethicone',
    indication: 'ขับลม แก้ท้องอืด ท้องเฟ้อ แน่นท้อง',
    usage: 'เคี้ยวให้ละเอียดก่อนกลืน ครั้งละ 1-2 เม็ด หลังอาหาร',
    warning: 'หากอาการไม่ดีขึ้นใน 3 วัน ควรปรึกษาแพทย์',
    sideEffect: 'ไม่ค่อยพบผลข้างเคียงร้ายแรง'
  },
  {
    id: 'ors',
    name: 'ผงเกลือแร่ (ORS)',
    genericName: 'Oral Rehydration Salts',
    indication: 'ทดแทนน้ำและเกลือแร่ที่สูญเสียไปจากอาการท้องเสีย',
    usage: 'ละลายผง 1 ซอง ในน้ำต้มสุกที่เย็นแล้ว จิบเรื่อยๆ แทนน้ำ',
    warning: 'ผู้ป่วยโรคไตหรือโรคหัวใจ ควรปรึกษาแพทย์ก่อนใช้',
    sideEffect: 'บวมน้ำ, ความดันโลหิตสูง (หากทานมากเกินไปในผู้ป่วยเฉพาะกลุ่ม)'
  },
  {
    id: 'antacid',
    name: 'ยาลดกรด (Antacid)',
    genericName: 'Aluminum Hydroxide / Magnesium Hydroxide',
    indication: 'บรรเทาอาการแสบร้อนกลางอก อาหารไม่ย่อย กรดเกิน',
    usage: 'เคี้ยวให้ละเอียดก่อนกลืน หรือเขย่าขวดก่อนดื่ม ทานก่อนหรือหลังอาหาร 1 ชม.',
    warning: 'ระวังในผู้ป่วยโรคไต',
    sideEffect: 'อาจทำให้ท้องผูก (Aluminum) หรือท้องเสีย (Magnesium)'
  }
];

export const MedicationGuide: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredMeds = MEDICATIONS.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.indication.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.genericName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
        <div className="p-6 pb-4 border-b border-slate-100">
             <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center shrink-0">
                     <PillIcon className="w-7 h-7" />
                 </div>
                 <div>
                     <h3 className="text-xl font-bold text-slate-800">ตู้ยาสามัญประจำบ้าน</h3>
                     <p className="text-sm text-slate-500">ข้อมูลยาพื้นฐานและการใช้งานเบื้องต้น</p>
                 </div>
             </div>

             {/* Search Bar */}
             <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <SearchIcon className="h-5 w-5 text-slate-400" />
                 </div>
                 <input
                     type="text"
                     className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-all shadow-sm"
                     placeholder="ค้นหาชื่อยา หรืออาการ (เช่น ปวดหัว, ท้องอืด)"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                 />
             </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 px-6 py-3 border-b border-amber-100 flex items-start gap-3">
             <ExclamationIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
             <p className="text-xs text-amber-800 font-medium leading-relaxed">
                 ข้อมูลนี้เพื่อการศึกษาเบื้องต้นเท่านั้น ไม่สามารถทดแทนคำแนะนำจากแพทย์หรือเภสัชกรได้ โปรดอ่านฉลากยาอย่างละเอียดก่อนใช้งานทุกครั้ง
             </p>
        </div>

        {/* List */}
        <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {filteredMeds.length > 0 ? (
                filteredMeds.map((med) => (
                    <div key={med.id} className="group">
                        <button
                            onClick={() => toggleExpand(med.id)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors focus:outline-none"
                        >
                            <div className="text-left">
                                <h4 className={`font-bold text-base transition-colors ${expandedId === med.id ? 'text-teal-600' : 'text-slate-800'}`}>
                                    {med.name}
                                </h4>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                    {med.indication}
                                </p>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${expandedId === med.id ? 'bg-teal-100 rotate-180' : 'group-hover:bg-slate-200'}`}>
                                <ChevronDownIcon className={`w-5 h-5 ${expandedId === med.id ? 'text-teal-600' : 'text-slate-400'}`} />
                            </div>
                        </button>
                        
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-slate-50/50 ${expandedId === med.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            <div className="px-6 pb-6 pt-2 space-y-4 text-sm">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <h5 className="font-bold text-teal-600 mb-2 flex items-center gap-2">
                                            <CheckCircleIcon className="w-4 h-4" /> สรรพคุณ
                                        </h5>
                                        <p className="text-slate-600 leading-relaxed">{med.indication}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                        <h5 className="font-bold text-indigo-600 mb-2 flex items-center gap-2">
                                            <PillIcon className="w-4 h-4" /> วิธีใช้เบื้องต้น
                                        </h5>
                                        <p className="text-slate-600 leading-relaxed">{med.usage}</p>
                                    </div>
                                </div>
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                                     <h5 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                                         <ExclamationIcon className="w-4 h-4" /> ข้อควรระวัง & ผลข้างเคียง
                                     </h5>
                                     <ul className="list-disc list-inside text-slate-700 space-y-1 ml-1">
                                         <li><span className="font-medium text-slate-900">คำเตือน:</span> {med.warning}</li>
                                         <li><span className="font-medium text-slate-900">ผลข้างเคียง:</span> {med.sideEffect}</li>
                                     </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="p-8 text-center text-slate-500">
                    <p>ไม่พบข้อมูลยาที่ค้นหา</p>
                </div>
            )}
        </div>
    </div>
  );
};
