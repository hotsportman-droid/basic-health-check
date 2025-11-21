import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// ใช้ Key ที่ไม่ซ้ำกันสำหรับ Vercel KV
const COUNTER_KEY = 'dr-rak-visitor-count-prod-kv';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // --- CORS Headers ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // จัดการ Preflight requests สำหรับ CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Library @vercel/kv จะตรวจสอบ Environment Variables ให้โดยอัตโนมัติ
  // หากตั้งค่าไม่ถูกต้อง จะเกิด Error และถูกดักจับใน catch block

  try {
    if (req.method === 'POST') {
      // --- INCREMENT ---
      // สำหรับผู้ใช้ใหม่ จะบวกค่า counter เพิ่ม 1
      // incr จะสร้าง key ที่ค่า 0 ถ้ายังไม่มี แล้วค่อยบวก 1
      const newCount = await kv.incr(COUNTER_KEY);
      return res.status(200).json({ count: newCount });

    } else if (req.method === 'GET') {
      // --- READ ---
      // สำหรับผู้ใช้เก่า จะอ่านค่าล่าสุด
      // ถ้า key ไม่มีอยู่ จะ trả về null. เราจะให้ค่าเริ่มต้นเป็น 0
      const count = await kv.get<number>(COUNTER_KEY) ?? 0;
      return res.status(200).json({ count });

    } else {
      // จัดการ Method อื่นๆ ที่ไม่รองรับ
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    // ดักจับ Error ทั้งหมด รวมถึง Error จากการตั้งค่า @vercel/kv ที่ไม่ถูกต้อง
    console.error('API Counter Runtime Error:', error);
    return res.status(500).json({ error: 'Internal Server Error. Please check Vercel KV configuration and function logs.' });
  }
}
