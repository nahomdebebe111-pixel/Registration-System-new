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

// Persistent JSON Database Manager for Online Enrollment Sync
const DB_FILE_PATH = path.join(process.cwd(), 'database.json');

interface LocalDB {
  registrations: any[];
  gradeSettings: any[];
  classes: any[];
}

const defaultRegistrations = [
  {
    id: 'reg-example-1',
    full_name: 'Almaz Tolosa',
    age: 16,
    sex: 'Female',
    promoted_grade: 11,
    average: 94.6,
    transcript_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600',
    payment_method: 'Commercial Bank of Ethiopia (CBE)',
    status: 'Approved',
    class_assignment: '11A',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'reg-example-2',
    full_name: 'Kenean Kebede',
    age: 15,
    sex: 'Male',
    promoted_grade: 10,
    average: 81.2,
    transcript_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600',
    payment_method: 'Awash Bank',
    status: 'Pending Review',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'reg-example-3',
    full_name: 'Marta Assefa',
    age: 17,
    sex: 'Female',
    promoted_grade: 12,
    average: 88.5,
    transcript_url: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&q=80&w=600',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=600',
    payment_method: 'Telebirr',
    status: 'Pending Review',
    created_at: new Date().toISOString()
  }
];

const defaultGradeSettings = [
  { grade: 10, students_per_class: 60 },
  { grade: 11, students_per_class: 50 },
  { grade: 12, students_per_class: 45 },
];

const defaultClasses = [
  { grade: 10, class_name: '10A', class_type: 'Special', total_students: 0 },
  { grade: 10, class_name: '10B', class_type: 'Regular', total_students: 0 },
  { grade: 11, class_name: '11A', class_type: 'Special', total_students: 0 },
  { grade: 12, class_name: '12A', class_type: 'Regular', total_students: 0 },
];

function getDB(): LocalDB {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Error reading database file, reinitializing', e);
  }
  const initDb: LocalDB = {
    registrations: defaultRegistrations,
    gradeSettings: defaultGradeSettings,
    classes: defaultClasses
  };
  saveDB(initDb);
  return initDb;
}

function saveDB(dbData: LocalDB) {
  try {
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(dbData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing database file', e);
  }
}

// REST database routing APIs for true online multi-user persistence
app.get('/api/db/registrations', (req, res) => {
  try {
    const dbData = getDB();
    res.json(dbData.registrations);
  } catch (error: any) {
    console.error('GET /api/db/registrations error:', error);
    res.status(500).json({ error: error.message || 'Failed to read registrations' });
  }
});

app.post('/api/db/registrations', (req, res) => {
  try {
    const body = req.body;
    if (!body) {
      return res.status(400).json({ error: 'Request body is empty' });
    }
    const dbData = getDB();
    const id = `reg-${Math.random().toString(36).substring(2, 11)}`;
    const newRegistration = {
      ...body,
      id,
      age: Number(body.age),
      promoted_grade: Number(body.promoted_grade),
      average: Number(body.average),
      status: body.status || 'Pending Review',
      class_assignment: body.class_assignment || null,
      rejection_reason: body.rejection_reason || null,
      created_at: new Date().toISOString()
    };
    dbData.registrations.unshift(newRegistration);
    saveDB(dbData);
    res.status(201).json(newRegistration);
  } catch (error: any) {
    console.error('POST /api/db/registrations error:', error);
    res.status(500).json({ error: error.message || 'Failed to save registration' });
  }
});

app.put('/api/db/registrations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const dbData = getDB();
    const index = dbData.registrations.findIndex(r => String(r.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ error: 'Registration not found' });
    }
    
    dbData.registrations[index] = {
      ...dbData.registrations[index],
      ...updates,
      id: dbData.registrations[index].id, // Ensure immutable ID
      created_at: dbData.registrations[index].created_at // Ensure immutable timestamp
    };
    saveDB(dbData);
    res.json(dbData.registrations[index]);
  } catch (error: any) {
    console.error('PUT /api/db/registrations error:', error);
    res.status(500).json({ error: error.message || 'Failed to update registration' });
  }
});

app.delete('/api/db/registrations/:id', (req, res) => {
  try {
    const { id } = req.params;
    const dbData = getDB();
    dbData.registrations = dbData.registrations.filter(r => String(r.id) !== String(id));
    saveDB(dbData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/db/registrations error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete registration' });
  }
});

app.get('/api/db/grade-settings', (req, res) => {
  try {
    const dbData = getDB();
    res.json(dbData.gradeSettings);
  } catch (error: any) {
    console.error('GET /api/db/grade-settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to read grade settings' });
  }
});

app.post('/api/db/grade-settings', (req, res) => {
  try {
    const { grade, students_per_class } = req.body;
    const dbData = getDB();
    const index = dbData.gradeSettings.findIndex(g => Number(g.grade) === Number(grade));
    const payload = { grade: Number(grade), students_per_class: Number(students_per_class) };
    if (index !== -1) {
      dbData.gradeSettings[index] = payload;
    } else {
      dbData.gradeSettings.push(payload);
    }
    saveDB(dbData);
    res.json(payload);
  } catch (error: any) {
    console.error('POST /api/db/grade-settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to save grade setting' });
  }
});

app.get('/api/db/classes', (req, res) => {
  try {
    const dbData = getDB();
    res.json(dbData.classes);
  } catch (error: any) {
    console.error('GET /api/db/classes error:', error);
    res.status(500).json({ error: error.message || 'Failed to read classes' });
  }
});

app.post('/api/db/classes', (req, res) => {
  try {
    const classesList = req.body;
    const dbData = getDB();
    dbData.classes = classesList;
    saveDB(dbData);
    res.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/db/classes error:', error);
    res.status(500).json({ error: error.message || 'Failed to save classes' });
  }
});

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
