import { Context } from "@netlify/functions";
import { GoogleGenAI } from "@google/genai";

const initGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not configured. AI-powered diagnostics will fall back to local rule-based evaluations.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const ai = initGemini();

export default async (request: Request, context: Context) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { student } = await request.json();

    if (!student) {
      return new Response(JSON.stringify({ success: false, error: 'Student data is required.' }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Offline mode template fallback if Gemini API is not configured
    if (!ai) {
      const isHonorsEligible = student.average >= 90;
      const warningText = student.average < 70 ? "Warning: Student has a lower average. They may require primary foundation guidance." : "Student meets secondary class criteria.";
      
      const analysis = `### [AI Review Assistant (Offline Mode)]

**Evaluation for ${student.full_name} (Grade ${student.promoted_grade})**:
- **Academic Merit**: ${student.average}% average. ${isHonorsEligible ? 'Eligible for special honors/A-stream grouping.' : 'Eligible for regular stream grouping.'}
- **Grade Transition**: Promoted to Grade ${student.promoted_grade}. Age ${student.age} is appropriate for this cohort.
- **Verification Status**: Payment method is via **${student.payment_method}**. 
- **Guidance Remark**: ${warningText} Recommended for general alignment.

*Configure the GEMINI_API_KEY environment variable to activate real-time intelligence.*`;

      return new Response(JSON.stringify({ success: true, analysis }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = `You are Chercher Secondary School's Admissions Officer AI. Review the following student registration details and provide a professional, concise, structured 4-sentence evaluation with sections. Decide if they are fit for regular or honors streams or need academic support.

Student Profile:
- Name: ${student.full_name}
- Age: ${student.age}
- Gender: ${student.sex}
- Promoted to Grade: ${student.promoted_grade}
- Previous Year Average: ${student.average}%
- Payment: ${student.payment_method}
- Status: ${student.status}

Format your output in professional Markdown. Use simple human descriptions and do not cite ports or server telemetry info. Keep it structured.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const analysis = response.text || "Could not generate analysis.";
    return new Response(JSON.stringify({ success: true, analysis }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error('Gemini call failed in registration review Netlify function:', error);
    return new Response(JSON.stringify({ success: false, error: 'Gemini Analysis Failed. ' + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
