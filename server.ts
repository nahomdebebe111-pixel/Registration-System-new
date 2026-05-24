import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with custom User-Agent for tracking
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

// 1. Secure Admin Verification API
app.post('/api/verify-admin', (req, res) => {
  const { password } = req.body;
  const expectedPassword = process.env.ADMIN_PASSWORD || 'Nahom@110108';

  if (!password) {
    return res.status(400).json({ success: false, error: 'Password is required' });
  }

  if (password === expectedPassword) {
    return res.json({ success: true, token: 'chercher_authenticated_admin_session' });
  } else {
    return res.status(401).json({ success: false, error: 'Incorrect Password' });
  }
});

// 2. AI-powered Registrant Assessment API
app.post('/api/ai/registration-review', async (req, res) => {
  const { student } = req.body;
  
  if (!student) {
    return res.status(400).json({ success: false, error: 'Student data is required.' });
  }

  // If Gemini is not configured, send a high-fidelity local feedback simulation
  if (!ai) {
    const isHonorsEligible = student.average >= 90;
    const warningText = student.average < 70 ? "Warning: Student has a lower average. They may require primary foundation guidance." : "Student meets secondary class criteria.";
    
    return res.json({
      success: true,
      analysis: `### [AI Review Assistant (Offline Mode)]

**Evaluation for ${student.full_name} (Grade ${student.promoted_grade})**:
- **Academic Merit**: ${student.average}% average. ${isHonorsEligible ? 'Eligible for special honors/A-stream grouping.' : 'Eligible for regular stream grouping.'}
- **Grade Transition**: Promoted to Grade ${student.promoted_grade}. Age ${student.age} is appropriate for this cohort.
- **Verification Status**: Payment method is via **${student.payment_method}**. 
- **Guidance Remark**: ${warningText} Recommended for general alignment.

*Configure the GEMINI_API_KEY environment variable to activate real-time intelligence.*`
    });
  }

  try {
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
    return res.json({ success: true, analysis });

  } catch (error: any) {
    console.error('Gemini call failed in registration review:', error);
    return res.status(500).json({ success: false, error: 'Gemini Analysis Failed. ' + error.message });
  }
});

// 3. AI-powered School Balancing & Stats Advice API
app.post('/api/ai/school-balancing-insights', async (req, res) => {
  const { schoolStats } = req.body;

  if (!ai) {
    return res.json({
      success: true,
      insights: `### [AI Balancing Insights (Offline Mode)]
- **Balance Guide**: Maintain optimal 60, 50, and 45 student-per-class caps respectively for grades 10, 11, and 12.
- **Special Placement Focus**: Top-performing students must be placed into specialized A-streams to focus elite study resources efficiently, while maintaining a perfectly balanced male/female ratio across cohorts.
- **Support Cohort**: Ensure any students with lower metrics receive general regular grouping.
- *Turn on GEMINI_API_KEY to retrieve live demographic analytics instructions.*`
    });
  }

  try {
    const prompt = `You are Chercher Secondary School's Senior Curriculum Consultant AI. Analyze the overall registration stats and class settings and write 3-4 bullet points suggesting class assignments optimization, ways to foster balanced gender parity, and stream alignments. Use professional academic terminology.

Context Details:
${JSON.stringify(schoolStats, null, 2)}

Provide the bullet points directly. Do not include unrequested system coordinates or server headers.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    return res.json({ success: true, insights: response.text });
  } catch (error: any) {
    console.error('Gemini balancing stats call failed:', error);
    return res.status(500).json({ success: false, error: 'Balancing Insights generation failed.' });
  }
});

// Integration with Vite
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chercher School Server running on port ${PORT}`);
  });
}

startServer();
