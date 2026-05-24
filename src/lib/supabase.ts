import { createClient } from '@supabase/supabase-js';
import { Registration, GradeSetting, ClassInfo } from '../types';
import { firebaseDb, isFirebaseConfigured } from './firebase';

// Read variables from Vite environment
const rawSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://lrxvhkyvhxiqyfkmakbc.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

// Clean Supabase URL by stripping /rest/v1 suffix if present to prevent PostgREST errors
const cleanSupabaseUrl = ((): string => {
  let url = rawSupabaseUrl.trim();
  if (url.endsWith('/rest/v1')) {
    url = url.slice(0, -8);
  } else if (url.endsWith('/rest/v1/')) {
    url = url.slice(0, -9);
  }
  return url;
})();

// Initialize Supabase Client if keys are configured
export const isSupabaseConfigured = (): boolean => {
  return typeof supabaseAnonKey === 'string' && supabaseAnonKey.trim().length > 0;
};

export const supabase = isSupabaseConfigured()
  ? createClient(cleanSupabaseUrl, supabaseAnonKey)
  : null;

// Local Storage Fallbacks keys
const LOCAL_REGISTRATIONS_KEY = 'chercher_school_registrations';
const LOCAL_GRADE_SETTINGS_KEY = 'chercher_school_grade_settings';
const LOCAL_CLASSES_KEY = 'chercher_school_classes';

// Seed initial default local values if empty
const seedDefaultLocalDataIfNeeded = () => {
  if (typeof window !== 'undefined') {
    if (!localStorage.getItem(LOCAL_REGISTRATIONS_KEY)) {
      const defaultRegistrations: Registration[] = [
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
      localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(defaultRegistrations));
    }

    if (!localStorage.getItem(LOCAL_GRADE_SETTINGS_KEY)) {
      const defaultGradeSettings: GradeSetting[] = [
        { grade: 10, students_per_class: 60 },
        { grade: 11, students_per_class: 50 },
        { grade: 12, students_per_class: 45 },
      ];
      localStorage.setItem(LOCAL_GRADE_SETTINGS_KEY, JSON.stringify(defaultGradeSettings));
    }

    if (!localStorage.getItem(LOCAL_CLASSES_KEY)) {
      const defaultClasses: ClassInfo[] = [
        { grade: 10, class_name: '10A', class_type: 'Special', total_students: 0 },
        { grade: 10, class_name: '10B', class_type: 'Regular', total_students: 0 },
        { grade: 11, class_name: '11A', class_type: 'Special', total_students: 0 },
        { grade: 12, class_name: '12A', class_type: 'Regular', total_students: 0 },
      ];
      localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(defaultClasses));
    }
  }
};

seedDefaultLocalDataIfNeeded();

// Export the single consolidated database adapter interface
export const db = {
  // --- REGISTRATIONS ---
  async getRegistrations(): Promise<Registration[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch registrations failed:', error.message);
        throw error;
      }
      return data || [];
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.getRegistrations();
    }

    // Local Storage back-up fallback
    const localData = localStorage.getItem(LOCAL_REGISTRATIONS_KEY);
    return localData ? JSON.parse(localData) : [];
  },

  async addRegistration(registration: Omit<Registration, 'id' | 'created_at'>): Promise<Registration> {
    const createdAt = new Date().toISOString();
    const payload = {
      full_name: registration.full_name,
      age: Number(registration.age),
      sex: registration.sex,
      promoted_grade: Number(registration.promoted_grade),
      average: Number(registration.average),
      transcript_url: registration.transcript_url,
      receipt_url: registration.receipt_url,
      payment_method: registration.payment_method,
      status: registration.status || 'Pending Review',
      class_assignment: registration.class_assignment || null,
      rejection_reason: registration.rejection_reason || null,
      created_at: createdAt,
    };

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Supabase add registration failed:', error.message);
        throw error;
      }
      return data;
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.addRegistration(registration);
    }

    // Local Storage back-up fallback
    const id = `reg-${Math.random().toString(36).substring(2, 11)}`;
    const newReg: Registration = { ...payload, id };
    const current = JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY) || '[]');
    current.unshift(newReg);
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(current));
    return newReg;
  },

  async updateRegistration(id: string | number, updates: Partial<Registration>): Promise<Registration> {
    // Typecast variables correctly
    const typedUpdates: any = {};
    if (updates.full_name !== undefined) typedUpdates.full_name = updates.full_name;
    if (updates.age !== undefined) typedUpdates.age = Number(updates.age);
    if (updates.sex !== undefined) typedUpdates.sex = updates.sex;
    if (updates.promoted_grade !== undefined) typedUpdates.promoted_grade = Number(updates.promoted_grade);
    if (updates.average !== undefined) typedUpdates.average = Number(updates.average);
    if (updates.transcript_url !== undefined) typedUpdates.transcript_url = updates.transcript_url;
    if (updates.receipt_url !== undefined) typedUpdates.receipt_url = updates.receipt_url;
    if (updates.payment_method !== undefined) typedUpdates.payment_method = updates.payment_method;
    if (updates.status !== undefined) typedUpdates.status = updates.status;
    if (updates.class_assignment !== undefined) typedUpdates.class_assignment = updates.class_assignment;
    if (updates.rejection_reason !== undefined) typedUpdates.rejection_reason = updates.rejection_reason;

    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('registrations')
        .update(typedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update registration failed:', error.message);
        throw error;
      }
      return data;
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.updateRegistration(id, updates);
    }

    // Local Storage back-up fallback
    const current = JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY) || '[]');
    let updatedItem: Registration | null = null;
    const newList = current.map((item: Registration) => {
      if (String(item.id) === String(id)) {
        updatedItem = { ...item, ...updates };
        return updatedItem;
      }
      return item;
    });
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(newList));
    if (!updatedItem) {
      throw new Error(`Registration record with ID ${id} not found.`);
    }
    return updatedItem;
  },

  async deleteRegistration(id: string | number): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase delete registration failed:', error.message);
        throw error;
      }
      return;
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.deleteRegistration(id);
    }

    // Local Storage back-up fallback
    const current = JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY) || '[]');
    const filtered = current.filter((item: Registration) => String(item.id) !== String(id));
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(filtered));
  },

  // --- GRADE SETTINGS ---
  async getGradeSettings(): Promise<GradeSetting[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('grade_settings')
        .select('*')
        .order('grade', { ascending: true });

      if (error) {
        console.error('Supabase fetch grade settings failed:', error.message);
        throw error;
      }
      return data || [];
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.getGradeSettings();
    }

    // Local Storage back-up fallback
    const localData = localStorage.getItem(LOCAL_GRADE_SETTINGS_KEY);
    return localData ? JSON.parse(localData) : [];
  },

  async saveGradeSetting(grade: number, studentsPerClass: number): Promise<GradeSetting> {
    const payload = {
      grade: Number(grade),
      students_per_class: Number(studentsPerClass),
    };

    if (isSupabaseConfigured() && supabase) {
      // First try to check if it exists so we can choose update or insert
      const { data: existing, error: checkError } = await supabase
        .from('grade_settings')
        .select('*')
        .eq('grade', grade);

      if (checkError) {
        console.error('Supabase query grade setting failed:', checkError.message);
        throw checkError;
      }

      let queryResult;
      if (existing && existing.length > 0) {
        queryResult = await supabase
          .from('grade_settings')
          .update({ students_per_class: Number(studentsPerClass) })
          .eq('grade', grade)
          .select()
          .single();
      } else {
        queryResult = await supabase
          .from('grade_settings')
          .insert([payload])
          .select()
          .single();
      }

      if (queryResult.error) {
        console.error('Supabase save grade setting failed:', queryResult.error.message);
        throw queryResult.error;
      }
      return queryResult.data;
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.saveGradeSetting(grade, studentsPerClass);
    }

    // Local Storage back-up fallback
    const current = await this.getGradeSettings();
    let found = false;
    const updated = current.map((item) => {
      if (Number(item.grade) === Number(grade)) {
        found = true;
        return { ...item, students_per_class: Number(studentsPerClass) };
      }
      return item;
    });

    if (!found) {
      updated.push(payload);
    }

    localStorage.setItem(LOCAL_GRADE_SETTINGS_KEY, JSON.stringify(updated));
    return payload;
  },

  // --- CLASSES ---
  async getClasses(): Promise<ClassInfo[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('grade', { ascending: true })
        .order('class_name', { ascending: true });

      if (error) {
        console.error('Supabase fetch classes failed:', error.message);
        throw error;
      }
      return data || [];
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.getClasses();
    }

    // Local Storage back-up fallback
    const localData = localStorage.getItem(LOCAL_CLASSES_KEY);
    return localData ? JSON.parse(localData) : [];
  },

  async saveClasses(classesList: ClassInfo[]): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      // Upsert classes sequentially or delete first
      for (const cl of classesList) {
        // Find existing class
        const { data: existing } = await supabase
          .from('classes')
          .select('*')
          .eq('grade', cl.grade)
          .eq('class_name', cl.class_name);

        const payload = {
          grade: Number(cl.grade),
          class_name: cl.class_name,
          class_type: cl.class_type,
          total_students: Number(cl.total_students),
        };

        if (existing && existing.length > 0) {
          const { error: updErr } = await supabase
            .from('classes')
            .update(payload)
            .eq('grade', cl.grade)
            .eq('class_name', cl.class_name);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await supabase
            .from('classes')
            .insert([payload]);
          if (insErr) throw insErr;
        }
      }
      return;
    }

    if (isFirebaseConfigured()) {
      return firebaseDb.saveClasses(classesList);
    }

    // Local Storage back-up fallback
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classesList));
  }
};
