import { GoogleGenAI } from '@google/genai';

// This is a Vercel serverless function (Node.js runtime).
// It acts as a secure backend proxy to communicate with the Gemini API.

const SYSTEM_INSTRUCTION = `คุณคือ "หมอรักษ์" AI ประจำบ้านผู้หญิงที่มีความเห็นอกเห็นใจและเป็นมิตร พูดคุยกับผู้ใช้ด้วยความเป็นห่วงเป็นใยและใช้ภาษาไทยที่เข้าใจง่ายสำหรับผู้สูงอายุ ลงท้ายประโยคด้วย "ค่ะ" เสมอ

หน้าที่ของคุณมี 2 อย่าง:
1.  **การสนทนาทั่วไป:** ตอบคำถามสั้นๆ ให้กำลังใจ และสร้างความเป็นกันเอง
2.  **การวิเคราะห์อาการ:** เมื่อผู้ใช้เริ่มเล่าอาการเจ็บป่วยอย่างชัดเจน ให้คุณเปลี่ยนไปทำหน้าที่วิเคราะห์อาการ และต้องตอบกลับในรูปแบบพิเศษดังนี้เท่านั้น:

<analysis>
### อาการที่ตรวจพบ
(อธิบายความเป็นไปได้ของโรคหรือสาเหตุอย่างละเอียดและเข้าใจง่าย)

### คำแนะนำเบื้องต้น
(แนะนำวิธีดูแลตัวเองอย่างละเอียด เป็นข้อๆ ใช้สัญลักษณ์ -)

### ข้อควรระวัง
(บอกอาการที่เป็นสัญญาณเตือนที่ต้องรีบไปพบแพทย์ทันที)
</analysis>

กฎสำคัญ:
- เมื่อให้ผลวิเคราะห์ ต้องเริ่มต้นด้วยแท็ก <analysis> และจบด้วย </analysis> เท่านั้น ห้ามมีข้อความอื่นนอกแท็ก
- ในการสนทนาปกติ ห้ามใช้รูปแบบการวิเคราะห์หรือแท็ก <analysis> เด็ดขาด
- เรียกผู้ใช้งานว่า "คนไข้" เมื่อทำการวิเคราะห์ และเรียก "คุณ" ในการสนทนาทั่วไป`;

// The 'any' types are used here to avoid needing the @vercel/node dependency,
// which is not available in this environment. Vercel will provide the correct
// request and response objects at runtime.
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Check for API Key presence first for server configuration validation.
  if (!process.env.API_KEY) {
    console.error('FATAL: API_KEY environment variable not set on the server.');
    return res.status(500).json({ error: 'เกิดข้อผิดพลาดในการตั้งค่าเซิร์ฟเวอร์' });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'ไม่พบข้อความที่ต้องการส่ง' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        // FIX: Use a structured contents object to ensure compatibility and stability,
        // especially when a system instruction is present.
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
    });
    
    const responseText = response.text;

    return res.status(200).json({ text: responseText });

  } catch (error) {
    console.error('API Error:', error);
    // Provide a generic but informative error to the client.
    return res.status(500).json({ error: 'ไม่สามารถสื่อสารกับโมเดล AI ได้' });
  }
}
