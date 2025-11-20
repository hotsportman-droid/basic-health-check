import { GoogleGenAI } from '@google/genai';

// IMPORTANT: Set the API_KEY in your Vercel project's environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

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

export async function POST(request: Request) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
    });

    const responseText = response.text;

    return new Response(JSON.stringify({ text: responseText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to communicate with the AI model.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
