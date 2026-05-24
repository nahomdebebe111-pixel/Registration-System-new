import { Registration, GradeSetting, ClassInfo } from '../types';

// Supabase configuration
const SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://lrxvhkyvhxiqyfkmakbc.supabase.co/rest/v1';
const SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || '';

// Check if we can/should use Supabase (has key)
export const isSupabaseConfigured = (): boolean => {
  return typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.trim().length > 0;
};

// Local storage backup values if Supabase is offline/not configured
const MOCK_REGISTRATIONS_KEY = 'chercher_school_registrations';
const MOCK_GRADE_SETTINGS_KEY = 'chercher_school_grade_settings';
const MOCK_CLASSES_KEY = 'chercher_school_classes';

const defaultGradeSettings: GradeSetting[] = [
  { id: 10, grade: 10, students_per_class: 60 },
  { id: 11, grade: 11, students_per_class: 50 },
  { id: 12, grade: 12, students_per_class: 45 },
];

const defaultClasses: ClassInfo[] = [
  { id: 1, grade: 10, class_name: '10A', class_type: 'Special', total_students: 0 },
  { id: 2, grade: 10, class_name: '10B', class_type: 'Regular', total_students: 0 },
  { id: 3, grade: 11, class_name: '11A', class_type: 'Special', total_students: 0 },
  { id: 4, grade: 12, class_name: '12A', class_type: 'Special', total_students: 0 },
];

const defaultRegistrations: Registration[] = [
  {
    id: 'reg-001',
    full_name: 'Abdi Tolosa',
    age: 16,
    sex: 'Male',
    promoted_grade: 10,
    average: 88.5,
    transcript_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    payment_method: 'CBE',
    status: 'Approved',
    class_assignment: '10A',
    created_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'reg-002',
    full_name: 'Chaltu Kebede',
    age: 15,
    sex: 'Female',
    promoted_grade: 10,
    average: 94.2,
    transcript_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    payment_method: 'TELEBIRR',
    status: 'Approved',
    class_assignment: '10A',
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'reg-003',
    full_name: 'Bekele Shiferaw',
    age: 17,
    sex: 'Male',
    promoted_grade: 11,
    average: 75.8,
    transcript_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    payment_method: 'SINQEE BANK',
    status: 'Pending Review',
    class_assignment: null,
    created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'reg-004',
    full_name: 'Sifan Abera',
    age: 16,
    sex: 'Female',
    promoted_grade: 11,
    average: 82.3,
    transcript_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    payment_method: 'CBE',
    status: 'Pending Review',
    class_assignment: null,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: 'reg-005',
    full_name: 'Meron Tesfaye',
    age: 17,
    sex: 'Female',
    promoted_grade: 12,
    average: 92.1,
    transcript_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    payment_method: 'TELEBIRR',
    status: 'Approved',
    class_assignment: '12A',
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
  },
  {
    id: 'reg-006',
    full_name: 'Lensa Takele',
    age: 15,
    sex: 'Female',
    promoted_grade: 10,
    average: 64.5,
    transcript_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500',
    receipt_url: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?w=500',
    payment_method: 'CBE',
    status: 'Rejected',
    rejection_reason: 'Average is below admission guidelines for Grade 10 secondary transition.',
    class_assignment: null,
    created_at: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
  }
];

// Helper to initialize LocalStorage if needed
const initLocalStorage = () => {
  if (!localStorage.getItem(MOCK_REGISTRATIONS_KEY)) {
    localStorage.setItem(MOCK_REGISTRATIONS_KEY, JSON.stringify(defaultRegistrations));
  }
  if (!localStorage.getItem(MOCK_GRADE_SETTINGS_KEY)) {
    localStorage.setItem(MOCK_GRADE_SETTINGS_KEY, JSON.stringify(defaultGradeSettings));
  }
  if (!localStorage.getItem(MOCK_CLASSES_KEY)) {
    localStorage.setItem(MOCK_CLASSES_KEY, JSON.stringify(defaultClasses));
  }
};

// Initialize if client-side
if (typeof window !== 'undefined') {
  initLocalStorage();
}

// REST helper
async function supabaseFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${SUPABASE_URL}/${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Supabase REST Error (${response.status}): ${errorText || response.statusText}`);
  }

  // Handle No Content response
  if (response.status === 204) {
    return [] as unknown as T;
  }

  return response.json();
}

// Database Actions Wrapper
export const db = {
  // --- REGISTRATIONS ---
  async getRegistrations(): Promise<Registration[]> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseFetch<Registration[]>('registrations?order=created_at.desc');
      } catch (error) {
        console.warn('Supabase fetch registrations failed, falling back to LocalStorage:', error);
      }
    }
    const data = localStorage.getItem(MOCK_REGISTRATIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async addRegistration(registration: Omit<Registration, 'id' | 'created_at'>): Promise<Registration> {
    const newReg: Registration = {
      ...registration,
      id: `reg-${Math.random().toString(36).substr(2, 9)}`,
      status: registration.status || 'Pending Review',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const results = await supabaseFetch<Registration[]>('registrations', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            full_name: registration.full_name,
            age: registration.age,
            sex: registration.sex,
            promoted_grade: registration.promoted_grade,
            average: registration.average,
            transcript_url: registration.transcript_url,
            receipt_url: registration.receipt_url,
            payment_method: registration.payment_method,
            status: registration.status || 'Pending Review',
            class_assignment: registration.class_assignment || null,
            rejection_reason: registration.rejection_reason || null,
          }),
        });
        if (results && results.length > 0) return results[0];
        return newReg;
      } catch (error) {
        console.warn('Supabase add registration failed, falling back to LocalStorage:', error);
      }
    }

    const current = await this.getRegistrations();
    current.unshift(newReg);
    localStorage.setItem(MOCK_REGISTRATIONS_KEY, JSON.stringify(current));
    return newReg;
  },

  async updateRegistration(id: string | number, updates: Partial<Registration>): Promise<Registration> {
    if (isSupabaseConfigured()) {
      try {
        const results = await supabaseFetch<Registration[]>(`registrations?id=eq.${id}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(updates),
        });
        if (results && results.length > 0) return results[0];
      } catch (error) {
        console.warn(`Supabase update registration ${id} failed, falling back to LocalStorage:`, error);
      }
    }

    const current = await this.getRegistrations();
    let updatedObj: Registration | null = null;
    const updated = current.map((item) => {
      if (item.id === id || String(item.id) === String(id)) {
        updatedObj = { ...item, ...updates };
        return updatedObj;
      }
      return item;
    });
    localStorage.setItem(MOCK_REGISTRATIONS_KEY, JSON.stringify(updated));
    if (!updatedObj) {
      throw new Error(`Registration with id ${id} not found in LocalStorage.`);
    }
    return updatedObj;
  },

  async deleteRegistration(id: string | number): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabaseFetch(`registrations?id=eq.${id}`, {
          method: 'DELETE',
        });
        return;
      } catch (error) {
        console.warn(`Supabase delete registration ${id} failed, falling back to LocalStorage:`, error);
      }
    }

    const current = await this.getRegistrations();
    const filtered = current.filter((item) => item.id !== id && String(item.id) !== String(id));
    localStorage.setItem(MOCK_REGISTRATIONS_KEY, JSON.stringify(filtered));
  },

  // --- GRADE SETTINGS ---
  async getGradeSettings(): Promise<GradeSetting[]> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseFetch<GradeSetting[]>('grade_settings?order=grade.asc');
      } catch (error) {
        console.warn('Supabase fetch grade settings failed, falling back to LocalStorage:', error);
      }
    }
    const data = localStorage.getItem(MOCK_GRADE_SETTINGS_KEY);
    return data ? JSON.parse(data) : defaultGradeSettings;
  },

  async saveGradeSetting(grade: number, studentsPerClass: number): Promise<GradeSetting> {
    if (isSupabaseConfigured()) {
      try {
        // Upsert style REST behavior or normal POST/PATCH
        // Check if exists first
        const existing = await supabaseFetch<GradeSetting[]>(`grade_settings?grade=eq.${grade}`);
        if (existing && existing.length > 0) {
          const updated = await supabaseFetch<GradeSetting[]>(`grade_settings?grade=eq.${grade}`, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({ students_per_class: studentsPerClass }),
          });
          return updated[0];
        } else {
          const created = await supabaseFetch<GradeSetting[]>('grade_settings', {
            method: 'POST',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify({ grade, students_per_class: studentsPerClass }),
          });
          return created[0];
        }
      } catch (error) {
        console.warn(`Supabase saveGradeSetting for grade ${grade} failed:`, error);
      }
    }

    const current = await this.getGradeSettings();
    let found = false;
    const updated = current.map((item) => {
      if (item.grade === grade) {
        found = true;
        return { ...item, students_per_class: studentsPerClass };
      }
      return item;
    });

    if (!found) {
      updated.push({ grade, students_per_class: studentsPerClass });
    }

    localStorage.setItem(MOCK_GRADE_SETTINGS_KEY, JSON.stringify(updated));
    return { grade, students_per_class: studentsPerClass };
  },

  // --- CLASSES ---
  async getClasses(): Promise<ClassInfo[]> {
    if (isSupabaseConfigured()) {
      try {
        return await supabaseFetch<ClassInfo[]>('classes');
      } catch (error) {
        console.warn('Supabase fetch classes failed, falling back to LocalStorage:', error);
      }
    }
    const data = localStorage.getItem(MOCK_CLASSES_KEY);
    return data ? JSON.parse(data) : defaultClasses;
  },

  async saveClasses(classesList: ClassInfo[]): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        // Delete all classes first & recreate OR match rewrite
        // Doing standard DELETE for rewrite is common, but let's do a bulk delete for simplicity
        try {
          await supabaseFetch('classes', { method: 'DELETE' }); // deletes all
        } catch(e) {}
        
        await supabaseFetch('classes', {
          method: 'POST',
          body: JSON.stringify(classesList.map(c => ({
            grade: c.grade,
            class_name: c.class_name,
            class_type: c.class_type,
            total_students: c.total_students
          })))
        });
        return;
      } catch (error) {
        console.warn('Supabase bulk classes save or replace failed, falling back to LocalStorage:', error);
      }
    }
    localStorage.setItem(MOCK_CLASSES_KEY, JSON.stringify(classesList));
  }
};
