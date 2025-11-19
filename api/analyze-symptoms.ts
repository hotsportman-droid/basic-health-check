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

  // ดึง API Key จาก Environment Variable ของ Vercel เท่านั้น (วิธีที่ปลอดภัยและถูกต้อง)
  const apiKey = process.env.GROQ_API_KEY;

  // 1. เช็คว่ามี Key หรือไม่
  if (!apiKey) {
    return new Response(JSON.stringify({ 
      error: 'System Error: GROQ_API_KEY not found in Vercel Environment Variables. Please check your Vercel project settings.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. เช็ครูปแบบ Key เบื้องต้น (Groq Key มักขึ้นต้นด้วย gsk_)
  if (!apiKey.trim().startsWith('gsk_')) {
    return new Response(JSON.stringify({ 
      error: 'Configuration Error: Invalid API Key format. Groq keys should start with "gsk_". Please check for extra spaces.' 
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

    // เรียกใช้ Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`, // trim() เพื่อป้องกันปัญหาช่องว่างที่อาจติดมา
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // อัปเดตเป็นโมเดลรุ่นใหม่ล่าสุดที่รองรับ
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
      // ส่ง Error จริงๆ จาก Groq กลับไปให้ผู้ใช้เห็น เพื่อจะได้รู้ว่าผิดตรงไหน
      const realErrorMessage = data?.error?.message || 'Unknown error from Groq provider';
      console.error('Groq API Error:', data);
      throw new Error(`Groq API Error: ${realErrorMessage}`);
    }

    const analysis = data.choices[0]?.message?.content;

    return new Response(JSON.stringify({ analysis }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json'
      },
    });

  } catch (error: any) {
    console.error('Error in Vercel function:', error);
    // ส่งข้อความ Error ที่แท้จริงกลับไป
    return new Response(JSON.stringify({ error: error.message || 'An internal network error occurred.' }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json'
      },
    });
  }
};