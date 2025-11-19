export const config = {
  runtime: 'edge',
};

export default async (req: Request) => {
  // ---------------------------------------------------------
  // เลือกวิธีใส่ API KEY ของคุณตรงนี้
  // ---------------------------------------------------------
  
  // วิธีที่ 1 (ปลอดภัย - แนะนำ): ไปตั้งค่าใน Vercel Settings -> Environment Variables ชื่อ GROQ_API_KEY
  // const apiKey = process.env.GROQ_API_KEY;

  // วิธีที่ 2 (ง่าย - ฝังในโค้ด): นำ Key จาก console.groq.com มาใส่ในเครื่องหมายคำพูดแทนข้อความด้านล่าง
  const apiKey = "YOUR_GROQ_API_KEY_HERE"; 

  // ---------------------------------------------------------

  // ตรวจสอบว่ามีการใส่ Key หรือยัง (และไม่ใช่ค่าเริ่มต้น)
  const isKeyConfigured = apiKey && apiKey !== "YOUR_GROQ_API_KEY_HERE";
  
  // ลองพยายามอ่านจาก Env อีกครั้งเผื่อผู้ใช้ตั้งค่าแบบ Env ไว้
  const finalApiKey = isKeyConfigured ? apiKey : process.env.GROQ_API_KEY;

  if (!finalApiKey) {
    return new Response(JSON.stringify({ error: 'API Key is missing or not configured.' }), {
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

    // เรียกใช้ Groq API โดยตรง
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192', // โมเดล Llama 3 ภาษาไทยดี
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