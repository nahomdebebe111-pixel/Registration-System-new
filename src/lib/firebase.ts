import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  getDoc
} from 'firebase/firestore';
import { Registration, GradeSetting, ClassInfo } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

// Check if Firebase cloud credentials are real and loaded
export const isFirebaseConfigured = (): boolean => {
  return typeof firebaseConfig.projectId === 'string' && 
         firebaseConfig.projectId.trim().length > 0 &&
         typeof firebaseConfig.apiKey === 'string' &&
         firebaseConfig.apiKey.trim().length > 0;
};

// Initialize Firebase App conditionally to prevent "invalid-api-key" errors
export const app = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null;
export const firestoreDb = (isFirebaseConfigured() && app ? getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)") : null) as any;
export const auth = (isFirebaseConfigured() && app ? getAuth(app) : null) as any;

// Security error formatting enum & interface mandated by Firebase Integration skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Unified Active Online Database Instance
export const db = {
  // --- REGISTRATIONS ---
  async getRegistrations(): Promise<Registration[]> {
    if (isFirebaseConfigured()) {
      const path = 'registrations';
      try {
        const q = query(collection(firestoreDb, path), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        const registrations: Registration[] = [];
        querySnapshot.forEach((docSnap) => {
          registrations.push({
            ...(docSnap.data() as Omit<Registration, 'id'>),
            id: docSnap.id,
          });
        });
        return registrations;
      } catch (error) {
        console.error('Firestore getRegistrations failed. Proceeding with REST DB fallback:', error);
      }
    }
    
    // Server-side Online Database Fallback
    try {
      const res = await fetch('/api/db/registrations');
      if (!res.ok) throw new Error('Failed to fetch registrations from server');
      return await res.json();
    } catch (e) {
      console.error('Online REST DB registration fetch failed, empty array fallback:', e);
      return [];
    }
  },

  async addRegistration(registration: Omit<Registration, 'id' | 'created_at'>): Promise<Registration> {
    const registrationData = {
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
    };

    if (isFirebaseConfigured()) {
      const path = 'registrations';
      try {
        const docRef = await addDoc(collection(firestoreDb, path), {
          ...registrationData,
          created_at: new Date().toISOString(),
        });
        return {
          ...registrationData,
          id: docRef.id,
          created_at: new Date().toISOString(),
        };
      } catch (error) {
        console.error('Firestore addRegistration failed, trying REST fallback:', error);
      }
    }

    // Server-side Online Database Fallback
    const res = await fetch('/api/db/registrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });
    if (!res.ok) {
      let errMsg = 'Failed to save registration online';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  },

  async updateRegistration(id: string | number, updates: Partial<Registration>): Promise<Registration> {
    const updatedFields: any = {};
    if (updates.full_name !== undefined) updatedFields.full_name = updates.full_name;
    if (updates.age !== undefined) updatedFields.age = Number(updates.age);
    if (updates.sex !== undefined) updatedFields.sex = updates.sex;
    if (updates.promoted_grade !== undefined) updatedFields.promoted_grade = Number(updates.promoted_grade);
    if (updates.average !== undefined) updatedFields.average = Number(updates.average);
    if (updates.transcript_url !== undefined) updatedFields.transcript_url = updates.transcript_url;
    if (updates.receipt_url !== undefined) updatedFields.receipt_url = updates.receipt_url;
    if (updates.payment_method !== undefined) updatedFields.payment_method = updates.payment_method;
    if (updates.status !== undefined) updatedFields.status = updates.status;
    if (updates.class_assignment !== undefined) updatedFields.class_assignment = updates.class_assignment;
    if (updates.rejection_reason !== undefined) updatedFields.rejection_reason = updates.rejection_reason;

    if (isFirebaseConfigured()) {
      const docPath = `registrations/${id}`;
      try {
        const docRef = doc(firestoreDb, 'registrations', String(id));
        await updateDoc(docRef, updatedFields);
        const freshSnap = await getDoc(docRef);
        return {
          ...(freshSnap.data() as Omit<Registration, 'id'>),
          id: freshSnap.id,
        };
      } catch (error) {
        console.error(`Firestore updateDoc failed for ${id}, trying REST fallback:`, error);
      }
    }

    // Server-side Online Database Fallback
    const res = await fetch(`/api/db/registrations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedFields),
    });
    if (!res.ok) {
      let errMsg = `Failed to update registration ${id} online`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  },

  async deleteRegistration(id: string | number): Promise<void> {
    if (isFirebaseConfigured()) {
      const docPath = `registrations/${id}`;
      try {
        const docRef = doc(firestoreDb, 'registrations', String(id));
        await deleteDoc(docRef);
        return;
      } catch (error) {
        console.error(`Firestore deleteDoc failed for ${id}, trying REST fallback:`, error);
      }
    }

    // Server-side Online Database Fallback
    const res = await fetch(`/api/db/registrations/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      let errMsg = `Failed to delete registration ${id} online`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }
  },

  // --- GRADE SETTINGS ---
  async getGradeSettings(): Promise<GradeSetting[]> {
    if (isFirebaseConfigured()) {
      const path = 'grade_settings';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const settings: GradeSetting[] = [];
        querySnapshot.forEach((docSnap) => {
          settings.push(docSnap.data() as GradeSetting);
        });
        return settings.sort((a, b) => a.grade - b.grade);
      } catch (error) {
        console.error('Firestore getGradeSettings failed, trying REST fallback:', error);
      }
    }

    // Server-side Online Database Fallback
    try {
      const res = await fetch('/api/db/grade-settings');
      if (!res.ok) throw new Error('Failed to fetch grade settings from server');
      return await res.json();
    } catch (e) {
      console.error('Online REST DB grade settings fetch failed, returning default guidelines:', e);
      return [
        { grade: 10, students_per_class: 60 },
        { grade: 11, students_per_class: 50 },
        { grade: 12, students_per_class: 45 },
      ];
    }
  },

  async saveGradeSetting(grade: number, studentsPerClass: number): Promise<GradeSetting> {
    const payload: GradeSetting = {
      grade: Number(grade),
      students_per_class: Number(studentsPerClass),
    };

    if (isFirebaseConfigured()) {
      const docPath = `grade_settings/grade_${grade}`;
      try {
        const docRef = doc(firestoreDb, 'grade_settings', `grade_${grade}`);
        await setDoc(docRef, payload);
        return payload;
      } catch (error) {
        console.error(`Firestore setDoc failed for grade_${grade}, trying REST fallback:`, error);
      }
    }

    // Server-side Online Database Fallback
    const res = await fetch('/api/db/grade-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let errMsg = 'Failed to save grade setting online';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }
    return await res.json();
  },

  // --- CLASSES ---
  async getClasses(): Promise<ClassInfo[]> {
    if (isFirebaseConfigured()) {
      const path = 'classes';
      try {
        const querySnapshot = await getDocs(collection(firestoreDb, path));
        const classesList: ClassInfo[] = [];
        querySnapshot.forEach((docSnap) => {
          classesList.push(docSnap.data() as ClassInfo);
        });
        return classesList;
      } catch (error) {
        console.error('Firestore getClasses failed, trying REST fallback:', error);
      }
    }

    // Server-side Online Database Fallback
    try {
      const res = await fetch('/api/db/classes');
      if (!res.ok) throw new Error('Failed to fetch classes from server');
      return await res.json();
    } catch (e) {
      console.error('Online REST DB classes fetch failed, returning default rooms:', e);
      return [
        { grade: 10, class_name: '10A', class_type: 'Special', total_students: 0 },
        { grade: 10, class_name: '10B', class_type: 'Regular', total_students: 0 },
        { grade: 11, class_name: '11A', class_type: 'Special', total_students: 0 },
        { grade: 12, class_name: '12A', class_type: 'Regular', total_students: 0 },
      ];
    }
  },

  async saveClasses(classesList: ClassInfo[]): Promise<void> {
    if (isFirebaseConfigured()) {
      const path = 'classes';
      try {
        for (const cl of classesList) {
          const docId = `class_${cl.grade}_${cl.class_name}`.replace(/\s+/g, '_');
          const docRef = doc(firestoreDb, 'classes', docId);
          await setDoc(docRef, {
            grade: Number(cl.grade),
            class_name: cl.class_name,
            class_type: cl.class_type,
            total_students: Number(cl.total_students),
          });
        }
        return;
      } catch (error) {
        console.error('Firestore saveClasses failed, trying REST fallback:', error);
      }
    }

    // Server-side Online Database Fallback
    const res = await fetch('/api/db/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classesList),
    });
    if (!res.ok) {
      let errMsg = 'Failed to save classes online';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(errMsg);
    }
  }
};
