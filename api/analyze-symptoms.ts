import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async (req: Request) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API Key is not configured in the environment.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
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
        systemInstruction: 'คุณคือผู้ช่วยทางการแพทย์ SHC ที่ให้ข้อมูลเบื้องต้น คำตอบของคุณต้องไม่ใช่การวินิจฉัยทางการแพทย์เด็ดขาด ให้จัดโครงสร้างคำตอบโดยใช้ Markdown headings เป็น 3 ส่วนชัดเจน: ### สาเหตุที่เป็นไปได้ (เพื่อเป็นข้อมูลเท่านั้น), ### การดูแลตนเองเบื้องต้น, และ ### **ควรไปพบแพทย์เมื่อใด**. ต้องใช้ภาษาที่ระมัดระวังและเน้นย้ำเสมอว่าข้อมูลนี้เป็นเพียงแนวทางเบื้องต้น และต้องสรุปจบด้วยคำแนะนำที่หนักแน่นว่า "ข้อมูลนี้เป็นเพียงการวิเคราะห์เบื้องต้น ควรปรึกษาแพทย์หรือผู้เชี่ยวชาญเพื่อการวินิจฉัยและการรักษาที่ถูกต้องเสมอ"',
      },
    });

    const analysis = response.text;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error('Error in Vercel function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred.' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      },
    });
  }
};
