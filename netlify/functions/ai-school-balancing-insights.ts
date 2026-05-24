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
    const { schoolStats } = await request.json();

    if (!ai) {
      const insights = `### [AI Balancing Insights (Offline Mode)]
- **Balance Guide**: Maintain optimal 60, 50, and 45 student-per-class caps respectively for grades 10, 11, and 12.
- **Special Placement Focus**: Top-performing students must be placed into specialized A-streams to focus elite study resources efficiently, while maintaining a perfectly balanced male/female ratio across cohorts.
- **Support Cohort**: Ensure any students with lower metrics receive general regular grouping.
- *Turn on GEMINI_API_KEY to retrieve live demographic analytics instructions.*`;

      return new Response(JSON.stringify({ success: true, insights }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = `You are Chercher Secondary School's Senior Curriculum Consultant AI. Analyze the overall registration stats and class settings and write 3-4 bullet points suggesting class assignments optimization, ways to foster balanced gender parity, and stream alignments. Use professional academic terminology.

Context Details:
${JSON.stringify(schoolStats, null, 2)}

Provide the bullet points directly. Do not include unrequested system coordinates or server headers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    return new Response(JSON.stringify({ success: true, insights: response.text || "Could not generate insights." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error('Gemini balancing stats call failed in Netlify function:', error);
    return new Response(JSON.stringify({ success: false, error: 'Balancing Insights generation failed. ' + error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
