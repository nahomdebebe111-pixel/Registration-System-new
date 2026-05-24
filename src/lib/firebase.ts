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
export const db = (isFirebaseConfigured() && app ? getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)") : null) as any;
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
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
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

// Local Storage Fallbacks (Matching original schema patterns)
const LOCAL_REGISTRATIONS_KEY = 'chercher_school_registrations';
const LOCAL_GRADE_SETTINGS_KEY = 'chercher_school_grade_settings';
const LOCAL_CLASSES_KEY = 'chercher_school_classes';

// Firestore database client services
export const firebaseDb = {
  // --- REGISTRATIONS ---
  async getRegistrations(): Promise<Registration[]> {
    if (isFirebaseConfigured()) {
      const path = 'registrations';
      try {
        const q = query(collection(db, path), orderBy('created_at', 'desc'));
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
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
    
    // Local backup fallback
    const data = localStorage.getItem(LOCAL_REGISTRATIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  async addRegistration(registration: Omit<Registration, 'id' | 'created_at'>): Promise<Registration> {
    const defaultId = `reg-${Math.random().toString(36).substring(2, 11)}`;
    const createdAtStr = new Date().toISOString();
    
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
      created_at: createdAtStr,
    };

    if (isFirebaseConfigured()) {
      const path = 'registrations';
      try {
        const docRef = await addDoc(collection(db, path), registrationData);
        return {
          ...registrationData,
          id: docRef.id,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
    }

    // Local backup fallback
    const fallbackReg: Registration = {
      ...registrationData,
      id: defaultId,
    };
    const current = JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY) || '[]');
    current.unshift(fallbackReg);
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(current));
    return fallbackReg;
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
        const docRef = doc(db, 'registrations', String(id));
        await updateDoc(docRef, updatedFields);
        const freshSnap = await getDoc(docRef);
        return {
          ...(freshSnap.data() as Omit<Registration, 'id'>),
          id: freshSnap.id,
        };
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    }

    // Local backup fallback
    const currentList = JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY) || '[]');
    let matchedItem: Registration | null = null;
    const newList = currentList.map((item: Registration) => {
      if (String(item.id) === String(id)) {
        matchedItem = { ...item, ...updates };
        return matchedItem;
      }
      return item;
    });
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(newList));
    if (!matchedItem) {
      throw new Error(`Record ID ${id} not found.`);
    }
    return matchedItem;
  },

  async deleteRegistration(id: string | number): Promise<void> {
    if (isFirebaseConfigured()) {
      const docPath = `registrations/${id}`;
      try {
        const docRef = doc(db, 'registrations', String(id));
        await deleteDoc(docRef);
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, docPath);
      }
    }

    // Local backup fallback
    const currentList = JSON.parse(localStorage.getItem(LOCAL_REGISTRATIONS_KEY) || '[]');
    const filteredList = currentList.filter((item: Registration) => String(item.id) !== String(id));
    localStorage.setItem(LOCAL_REGISTRATIONS_KEY, JSON.stringify(filteredList));
  },

  // --- GRADE SETTINGS ---
  async getGradeSettings(): Promise<GradeSetting[]> {
    if (isFirebaseConfigured()) {
      const path = 'grade_settings';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        const settings: GradeSetting[] = [];
        querySnapshot.forEach((docSnap) => {
          settings.push(docSnap.data() as GradeSetting);
        });
        
        // Ensure grade sorting ascending
        return settings.sort((a,b) => a.grade - b.grade);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    // Local backup fallback
    const data = localStorage.getItem(LOCAL_GRADE_SETTINGS_KEY);
    const defaultSettings: GradeSetting[] = [
      { grade: 10, students_per_class: 60 },
      { grade: 11, students_per_class: 50 },
      { grade: 12, students_per_class: 45 },
    ];
    return data ? JSON.parse(data) : defaultSettings;
  },

  async saveGradeSetting(grade: number, studentsPerClass: number): Promise<GradeSetting> {
    const payload: GradeSetting = {
      grade: Number(grade),
      students_per_class: Number(studentsPerClass),
    };

    if (isFirebaseConfigured()) {
      const docPath = `grade_settings/grade_${grade}`;
      try {
        const docRef = doc(db, 'grade_settings', `grade_${grade}`);
        await setDoc(docRef, payload);
        return payload;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, docPath);
      }
    }

    // Local backup fallback
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
    if (isFirebaseConfigured()) {
      const path = 'classes';
      try {
        const querySnapshot = await getDocs(collection(db, path));
        const classesList: ClassInfo[] = [];
        querySnapshot.forEach((docSnap) => {
          classesList.push(docSnap.data() as ClassInfo);
        });
        return classesList;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }

    // Local backup fallback
    const data = localStorage.getItem(LOCAL_CLASSES_KEY);
    const defaultClasses: ClassInfo[] = [
      { grade: 10, class_name: '10A', class_type: 'Special', total_students: 0 },
      { grade: 10, class_name: '10B', class_type: 'Regular', total_students: 0 },
      { grade: 11, class_name: '11A', class_type: 'Special', total_students: 0 },
      { grade: 12, class_name: '12A', class_type: 'Special', total_students: 0 },
    ];
    return data ? JSON.parse(data) : defaultClasses;
  },

  async saveClasses(classesList: ClassInfo[]): Promise<void> {
    if (isFirebaseConfigured()) {
      const path = 'classes';
      try {
        // Overwrite standard list of collections safely using single setDocs per entry
        for (const cl of classesList) {
          const docId = `class_${cl.grade}_${cl.class_name}`.replace(/\s+/g, '_');
          const docRef = doc(db, 'classes', docId);
          await setDoc(docRef, {
            grade: Number(cl.grade),
            class_name: cl.class_name,
            class_type: cl.class_type,
            total_students: Number(cl.total_students),
          });
        }
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    }

    // Local backup fallback
    localStorage.setItem(LOCAL_CLASSES_KEY, JSON.stringify(classesList));
  }
};
