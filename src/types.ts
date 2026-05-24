export interface Registration {
  id: string | number;
  full_name: string;
  age: number;
  sex: 'Male' | 'Female' | string;
  promoted_grade: number;
  average: number;
  transcript_url: string;
  receipt_url: string;
  payment_method: string;
  status: 'Pending Review' | 'Approved' | 'Rejected' | string;
  class_assignment?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
}

export interface GradeSetting {
  id?: number;
  grade: number;
  students_per_class: number;
}

export interface ClassInfo {
  id?: number;
  grade: number;
  class_name: string;
  class_type: 'Special' | 'Regular' | string;
  total_students: number;
}

export interface GradeAnalytics {
  grade: number;
  totalApproved: number;
  totalStudents: number;
  maleCount: number;
  femaleCount: number;
  classesCount: number;
}

export interface AdminStats {
  totalStudents: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}
