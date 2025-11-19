import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key is missing or not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { symptoms } = await req.json();

    if (!symptoms || typeof symptoms !== 'string' || !symptoms.trim()) {
      return new Response(JSON.stringify({ error: 'Symptoms are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `วิเคราะห์อาการป่วยเบื้องต้นจากข้อมูลต่อไปนี้: "${symptoms}"`,
      config: {
        systemInstruction: 'คุณคือผู้ช่วยทางการแพทย์ SHC (Self Health Check) หน้าที่คือวิเคราะห์อาการป่วยเบื้องต้นจากข้อมูลที่ได้รับ และให้คำแนะนำ คำตอบของคุณต้องไม่ใช่การวินิจฉัยทางการแพทย์เด็ดขาด ให้จัดโครงสร้างคำตอบโดยใช้ Markdown headings เป็น 3 ส่วนชัดเจน: ### สาเหตุที่เป็นไปได้ (เพื่อเป็นข้อมูลเท่านั้น), ### การดูแลตนเองเบื้องต้น, และ ### **ควรไปพบแพทย์เมื่อใด**. ต้องใช้ภาษาที่สุภาพ ระมัดระวัง และเน้นย้ำเสมอว่าข้อมูลนี้เป็นเพียงแนวทางเบื้องต้น และต้องสรุปจบด้วยคำแนะนำที่หนักแน่นว่า "ข้อมูลนี้เป็นเพียงการวิเคราะห์เบื้องต้น ควรปรึกษาแพทย์หรือผู้เชี่ยวชาญเพื่อการวินิจฉัยและการรักษาที่ถูกต้องเสมอ" ตอบเป็นภาษาไทย',
      }
    });

    const analysis = response.text;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error('Error in API function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal error occurred while contacting AI.';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      },
    });
  }
};