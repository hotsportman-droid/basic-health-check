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

  // ดึง API Key จาก Vercel Environment Variables (ปลอดภัยและฟรี)
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("Error: GROQ_API_KEY is missing in Environment Variables.");
    return new Response(JSON.stringify({ 
      error: 'Server Configuration Error: API Key is missing. Please set GROQ_API_KEY in Vercel Settings.' 
    }), {
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

    // เรียกใช้ Groq API (Llama 3 Model)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          {
            role: 'system',
            content: 'คุณคือผู้ช่วยทางการแพทย์ SHC (Self Health Check) หน้าที่คือวิเคราะห์อาการป่วยเบื้องต้นจากข้อมูลที่ได้รับ และให้คำแนะนำ คำตอบของคุณต้องไม่ใช่การวินิจฉัยทางการแพทย์เด็ดขาด ให้จัดโครงสร้างคำตอบโดยใช้ Markdown headings เป็น 3 ส่วนชัดเจน: ### สาเหตุที่เป็นไปได้ (เพื่อเป็นข้อมูลเท่านั้น), ### การดูแลตนเองเบื้องต้น, และ ### **ควรไปพบแพทย์เมื่อใด**. ต้องใช้ภาษาที่สุภาพ ระมัดระวัง และเน้นย้ำเสมอว่าข้อมูลนี้เป็นเพียงแนวทางเบื้องต้น และต้องสรุปจบด้วยคำแนะนำที่หนักแน่นว่า "ข้อมูลนี้เป็นเพียงการวิเคราะห์เบื้องต้น ควรปรึกษาแพทย์หรือผู้เชี่ยวชาญเพื่อการวินิจฉัยและการรักษาที่ถูกต้องเสมอ" ตอบเป็นภาษาไทย'
          },
          {
            role: 'user',
            content: `วิเคราะห์อาการป่วยเบื้องต้นจากข้อมูลต่อไปนี้: "${symptoms}"`
          }
        ],
        temperature: 0.5,
        max_tokens: 1024,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Groq API Error:', data);
      throw new Error(data?.error?.message || 'Groq API Error');
    }

    const analysis = data.choices[0]?.message?.content;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      },
    });

  } catch (error) {
    console.error('Error in Vercel function:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred while contacting AI.' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      },
    });
  }
};