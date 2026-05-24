import React, { useState, useEffect } from 'react';
import { 
  Users, CheckCircle, XCircle, Clock, Search, Filter, Settings, 
  Download, Sparkles, Brain, LogOut, ArrowLeft, ArrowRight, Eye, X, BookOpen, UserCheck, Trash, RefreshCw
} from 'lucide-react';
import { db } from '../lib/supabase';
import { Registration, GradeSetting, ClassInfo, AdminStats, GradeAnalytics } from '../types';

interface AdminPanelProps {
  onLogout: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function AdminPanel({ onLogout, showToast }: AdminPanelProps) {
  // DB States
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [gradeSettings, setGradeSettings] = useState<GradeSetting[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  // UI Navigation
  // Menu items: 'applications' | 'dashboard' | 'classes' | 'settings'
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'applications' | 'classes' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Pagination Table
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected details for view models/lightboxes
  const [previewMediaUrl, setPreviewMediaUrl] = useState<'transcript' | 'receipt' | null>(null);
  const [previewStudent, setPreviewStudent] = useState<Registration | null>(null);

  // Reject reason modal state
  const [rejectingStudent, setRejectingStudent] = useState<Registration | null>(null);
  const [rejectionText, setRejectionText] = useState('');

  // AI Reviewing modal & text
  const [aiReviewStudent, setAiReviewStudent] = useState<Registration | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // General Advisor Guidance AI text
  const [schoolAdvisorInsights, setSchoolAdvisorInsights] = useState('');
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);

  // Current selected class in classroom inspector view
  const [selectedClassInspect, setSelectedClassInspect] = useState<string | null>(null);
  const [classInspectSearch, setClassInspectSearch] = useState('');
  const [classInspectSort, setClassInspectSort] = useState<'asc' | 'desc'>('asc');
  const [inspectPage, setInspectPage] = useState(1);

  // Stats summary calculations
  const [stats, setStats] = useState<AdminStats>({
    totalStudents: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });

  const [gradeAnalytics, setGradeAnalytics] = useState<GradeAnalytics[]>([]);

  // Configure grade limits directly in UI
  const [g10Cap, setG10Cap] = useState(60);
  const [g11Cap, setG11Cap] = useState(50);
  const [g12Cap, setG12Cap] = useState(45);

  // Load all foundational data
  const loadData = async () => {
    try {
      setLoading(true);
      const [regsList, settingsList, classesList] = await Promise.all([
        db.getRegistrations(),
        db.getGradeSettings(),
        db.getClasses()
      ]);

      setRegistrations(regsList);
      setGradeSettings(settingsList);
      setClasses(classesList);

      // Bind local grade cap input values
      const s10 = settingsList.find(s => s.grade === 10);
      if (s10) setG10Cap(s10.students_per_class);
      const s11 = settingsList.find(s => s.grade === 11);
      if (s11) setG11Cap(s11.students_per_class);
      const s12 = settingsList.find(s => s.grade === 12);
      if (s12) setG12Cap(s12.students_per_class);

      calculateSummaries(regsList, classesList);

    } catch (e) {
      showToast('Error loading administrative lists.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateSummaries = (regs: Registration[], currentClasses: ClassInfo[]) => {
    const total = regs.length;
    const pending = regs.filter(r => r.status === 'Pending Review').length;
    const approved = regs.filter(r => r.status === 'Approved').length;
    const rejected = regs.filter(r => r.status === 'Rejected').length;

    setStats({
      totalStudents: total,
      pendingCount: pending,
      approvedCount: approved,
      rejectedCount: rejected
    });

    // Calculate Grade Analytics 10, 11, 12
    const grades = [10, 11, 12];
    const analytics = grades.map(g => {
      const gradeRegs = regs.filter(r => r.promoted_grade === g);
      const approvedGrade = gradeRegs.filter(r => r.status === 'Approved');
      const maleCount = approvedGrade.filter(r => r.sex === 'Male').length;
      const femaleCount = approvedGrade.filter(r => r.sex === 'Female').length;
      const classesForGrade = currentClasses.filter(c => c.grade === g).length;

      return {
        grade: g,
        totalStudents: gradeRegs.length,
        totalApproved: approvedGrade.length,
        maleCount,
        femaleCount,
        classesCount: classesForGrade
      };
    });

    setGradeAnalytics(analytics);
  };

  // Trigger server-side AI balancing advice
  const generateDemographicInsights = async () => {
    setIsInsightsLoading(true);
    try {
      const response = await fetch('/api/ai/school-balancing-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolStats: {
            stats,
            gradeAnalytics,
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        setSchoolAdvisorInsights(data.insights);
      } else {
        setSchoolAdvisorInsights('Unable to load AI balancing insights.');
      }
    } catch (e) {
      setSchoolAdvisorInsights('Offline Evaluator suggestion: Group highest performance students into Class A for advanced stream prep.');
    } finally {
      setIsInsightsLoading(false);
    }
  };

  // Run AI assess on single student
  const runAiReview = async (student: Registration) => {
    setAiReviewStudent(student);
    setAiAnalysis('');
    setIsAiLoading(true);
    try {
      const response = await fetch('/api/ai/registration-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student })
      });
      const data = await response.json();
      if (data.success) {
        setAiAnalysis(data.analysis);
      } else {
        setAiAnalysis('AI failed to construct analysis. Please search manually.');
      }
    } catch (e) {
      setAiAnalysis('Gemini client offline. Standard criteria suggest: Verify math results.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Actions
  const handleApprove = async (student: Registration) => {
    try {
      const updated = await db.updateRegistration(student.id, { status: 'Approved', rejection_reason: null });
      setRegistrations(prev => prev.map(r => r.id === student.id ? updated : r));
      // Re-trigger calculation
      const nextRegs = registrations.map(r => r.id === student.id ? { ...r, status: 'Approved', rejection_reason: null } : r);
      calculateSummaries(nextRegs, classes);
      showToast(`Student ${student.full_name} is successfully Approved!`, 'success');
    } catch (e) {
      showToast('Db approval save failed.', 'error');
    }
  };

  const handleRejectClick = (student: Registration) => {
    setRejectingStudent(student);
    setRejectionText('');
  };

  const saveRejectAction = async () => {
    if (!rejectingStudent) return;
    if (!rejectionText.trim()) {
      showToast('Please state a reason for rejection.', 'error');
      return;
    }

    try {
      const updated = await db.updateRegistration(rejectingStudent.id, {
        status: 'Rejected',
        rejection_reason: rejectionText.trim(),
        class_assignment: null
      });

      setRegistrations(prev => prev.map(r => r.id === rejectingStudent.id ? updated : r));
      const nextRegs = registrations.map(r => r.id === rejectingStudent.id ? { ...r, status: 'Rejected', rejection_reason: rejectionText.trim(), class_assignment: null } : r);
      calculateSummaries(nextRegs, classes);

      showToast(`Student ${rejectingStudent.full_name} is rejected.`, 'info');
      setRejectingStudent(null);
    } catch (e) {
      showToast('Db rejection save failed.', 'error');
    }
  };

  const handleDelete = async (studentId: string | number) => {
    if (!window.confirm('Are you absolutely sure you want to delete this student record from Chercher registrar?')) return;
    try {
      await db.deleteRegistration(studentId);
      setRegistrations(prev => prev.filter(r => r.id !== studentId));
      const nextRegs = registrations.filter(r => r.id !== studentId);
      calculateSummaries(nextRegs, classes);
      showToast('Student record deleted permanently.', 'success');
    } catch (e) {
      showToast('Db deletion failed.', 'error');
    }
  };

  const handleSaveCaps = async () => {
    try {
      await Promise.all([
        db.saveGradeSetting(10, g10Cap),
        db.saveGradeSetting(11, g11Cap),
        db.saveGradeSetting(12, g12Cap)
      ]);
      showToast('Students per class limits updated for all grades!', 'success');
      loadData();
    } catch (e) {
      showToast('Failed to save settings.', 'error');
    }
  };

  // SMART CLASS ASSIGNMENT ALGORITHM
  // Group, sort, top honors stream A, balance gender fairly regular round-robin!
  const triggerAutoClassAllocation = async () => {
    const approvedStudents = registrations.filter(r => r.status === 'Approved');
    if (approvedStudents.length === 0) {
      showToast('No approved students available to run assignment. Approved students are required.', 'error');
      return;
    }

    // Load active settings caps
    const s10 = g10Cap;
    const s11 = g11Cap;
    const s12 = g12Cap;

    const capMapByGrade: { [key: number]: number } = {
      10: s10,
      11: s11,
      12: s12
    };

    const nextClasses: ClassInfo[] = [];
    const updatedRegistrantsList: Registration[] = [...registrations];

    // Distribute for each grade
    const gradesInput = [10, 11, 12];
    
    // Step-by-step allocations
    for (const g of gradesInput) {
      const gradeApproved = approvedStudents.filter(r => r.promoted_grade === g);
      if (gradeApproved.length === 0) continue;

      const classSize = capMapByGrade[g] || 60;
      // Sort averages descending
      const sortedByAvg = [...gradeApproved].sort((a, b) => b.average - a.average);

      const N = sortedByAvg.length;
      const totalGroupsCount = Math.ceil(N / classSize);

      if (totalGroupsCount === 0) continue;

      // Class A: top classSize students
      const honorsClassCount = Math.min(classSize, N);
      const classAStudents = sortedByAvg.slice(0, honorsClassCount);
      const remainingStudents = sortedByAvg.slice(honorsClassCount);

      // Create class A info
      nextClasses.push({
        grade: g,
        class_name: `${g}A`,
        class_type: 'Special',
        total_students: honorsClassCount
      });

      // Update actual honors students class parameter matching A
      classAStudents.forEach(item => {
        const foundIndex = updatedRegistrantsList.findIndex(r => r.id === item.id);
        if (foundIndex !== -1) {
          updatedRegistrantsList[foundIndex] = { ...updatedRegistrantsList[foundIndex], class_assignment: `${g}A` };
        }
      });

      if (remainingStudents.length > 0) {
        // Generate regular classrooms letters
        const codesList = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].slice(0, totalGroupsCount - 1);
        
        // Group remaining into Male & Female
        const males = remainingStudents.filter(s => s.sex === 'Male');
        const females = remainingStudents.filter(s => s.sex === 'Female');

        // Initialized classes
        const classBuckets: { [key: string]: Registration[] } = {};
        codesList.forEach(letter => {
          classBuckets[`${g}${letter}`] = [];
        });

        // Alternate round robin to maintain perfect male/female ratio!
        let roundIdx = 0;
        males.forEach(m => {
          const letter = codesList[roundIdx];
          classBuckets[`${g}${letter}`].push(m);
          roundIdx = (roundIdx + 1) % codesList.length;
        });

        // Pick up where it left off to stagger or keep balancing
        females.forEach(f => {
          const letter = codesList[roundIdx];
          classBuckets[`${g}${letter}`].push(f);
          roundIdx = (roundIdx + 1) % codesList.length;
        });

        // Write allocations
        codesList.forEach(letter => {
          const fullLabel = `${g}${letter}`;
          const listInBucket = classBuckets[fullLabel] || [];
          
          nextClasses.push({
            grade: g,
            class_name: fullLabel,
            class_type: 'Regular',
            total_students: listInBucket.length
          });

          listInBucket.forEach(st => {
            const foundIndex = updatedRegistrantsList.findIndex(r => r.id === st.id);
            if (foundIndex !== -1) {
              updatedRegistrantsList[foundIndex] = { ...updatedRegistrantsList[foundIndex], class_assignment: fullLabel };
            }
          });
        });
      }
    }

    try {
      // Save all updated students & new classes
      showToast('Running Smart merit ranking and round-robin gender balancing...', 'info');
      
      // Update DB batch logic
      // We loop sequential updates in fallback / restore
      await Promise.all([
        db.saveClasses(nextClasses),
        ...updatedRegistrantsList.map(item => {
          return db.updateRegistration(item.id, { class_assignment: item.class_assignment });
        })
      ]);

      setClasses(nextClasses);
      setRegistrations(updatedRegistrantsList);
      calculateSummaries(updatedRegistrantsList, nextClasses);

      showToast('Smart class assignments successfully completed and balanced by gender!', 'success');
    } catch (e) {
      showToast('Failed to save allocation results to database.', 'error');
    }
  };

  // CSV EXPORT logic
  const handleExportData = (mode: 'class' | 'grade' | 'school', targetClass?: string, targetGrade?: number) => {
    let listToExport: Registration[] = [];
    let filePrefix = 'chercher_school_data';

    if (mode === 'class' && targetClass) {
      listToExport = registrations.filter(r => r.class_assignment === targetClass);
      filePrefix = `class_${targetClass}_demographics`;
    } else if (mode === 'grade' && targetGrade) {
      listToExport = registrations.filter(r => r.promoted_grade === targetGrade);
      filePrefix = `grade_${targetGrade}_enrollment`;
    } else {
      listToExport = registrations;
      filePrefix = 'entire_chercher_school_enrollment';
    }

    if (listToExport.length === 0) {
      showToast('No record found to export based on selected parameters.', 'error');
      return;
    }

    // Format content as clean CSV
    const headers = ['ID', 'Full Name', 'Age', 'Sex', 'Promoted Grade', 'Average (%)', 'Status', 'Class Assignment', 'Payment Method'];
    const rows = listToExport.map(r => [
      r.id,
      `"${r.full_name}"`,
      r.age,
      r.sex,
      r.promoted_grade,
      r.average,
      r.status,
      r.class_assignment || 'Unassigned',
      r.payment_method
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filePrefix}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Successfully exported ${listToExport.length} lines as excel-ready CSV!`, 'success');
  };

  // Search & Filtered matching
  const filteredApplications = registrations.filter(item => {
    const matchesSearch = item.full_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    const matchesGrade = filterGrade === 'All' ? true : String(item.promoted_grade) === filterGrade;
    const matchesStatus = filterStatus === 'All' ? true : item.status === filterStatus;
    return matchesSearch && matchesGrade && matchesStatus;
  });

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Inspector sorting and filtering
  const inspectStudents = registrations.filter(r => r.class_assignment === selectedClassInspect && r.full_name.toLowerCase().includes(classInspectSearch.toLowerCase().trim()));
  const sortedInspectStudents = [...inspectStudents].sort((a, b) => {
    if (classInspectSort === 'asc') return a.full_name.localeCompare(b.full_name);
    return b.full_name.localeCompare(a.full_name);
  });
  const inspectPerPage = 6;
  const inspectTotalPages = Math.ceil(sortedInspectStudents.length / inspectPerPage);
  const paginatedInspect = sortedInspectStudents.slice((inspectPage - 1) * inspectPerPage, inspectPage * inspectPerPage);

  const viewMediaLightbox = (student: Registration, mode: 'transcript' | 'receipt') => {
    setPreviewStudent(student);
    setPreviewMediaUrl(mode);
  };

  return (
    <div id="admin-panel-wrapper" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top navbar */}
      <header className="bg-blue-900 text-white h-16 px-6 flex items-center justify-between shadow-sm border-b border-blue-950">
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 text-blue-900 p-2 rounded">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-widest text-white">Chercher Admissions Portal</h1>
            <p className="text-[10px] text-blue-200 uppercase tracking-wider font-semibold">Administrative Control Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="admin-logout-btn"
            onClick={onLogout}
            className="text-[10px] bg-blue-950 hover:bg-slate-900 font-bold uppercase tracking-wider px-4 py-2 rounded border border-blue-850 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            Exit Dashboard
          </button>
        </div>
      </header>

      {/* Main Container structure with sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 space-y-2 flex-shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">Navigation Menu</p>
          
          <button
            id="nav-tab-dashboard"
            onClick={() => { setCurrentTab('dashboard'); setSelectedClassInspect(null); }}
            className={`w-full text-left text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded transition-colors flex items-center gap-2 cursor-pointer ${
              currentTab === 'dashboard' ? 'bg-blue-900 text-white shadow-sm border-l-4 border-l-amber-400' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Brain className="w-4 h-4 text-amber-500" />
            Overview & AI Balancing
          </button>

          <button
            id="nav-tab-applications"
            onClick={() => { setCurrentTab('applications'); setSelectedClassInspect(null); }}
            className={`w-full text-left text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded transition-colors flex items-center gap-2 cursor-pointer ${
              currentTab === 'applications' ? 'bg-blue-900 text-white shadow-sm border-l-4 border-l-amber-400' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4 text-sky-500" />
            Applications ({registrations.length})
          </button>

          <button
            id="nav-tab-classes"
            onClick={() => { setCurrentTab('classes'); setSelectedClassInspect(null); }}
            className={`w-full text-left text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded transition-colors flex items-center gap-2 cursor-pointer ${
              currentTab === 'classes' ? 'bg-blue-900 text-white shadow-sm border-l-4 border-l-amber-400' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Eye className="w-4 h-4 text-purple-500" />
            Classroom Inspector
          </button>

          <button
            id="nav-tab-settings"
            onClick={() => { setCurrentTab('settings'); setSelectedClassInspect(null); }}
            className={`w-full text-left text-xs font-bold uppercase tracking-wider px-3 py-2.5 rounded transition-colors flex items-center gap-2 cursor-pointer ${
              currentTab === 'settings' ? 'bg-blue-900 text-white shadow-sm border-l-4 border-l-amber-400' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Grade Range Caps
          </button>

          <div className="pt-6 border-t border-slate-100 mt-4 px-3 space-y-2">
            <h5 className="text-[9px] font-bold uppercase tracking-wider text-slate-400 font-sans">Database Connection</h5>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
              <span className={`w-2 h-2 rounded-full ${db ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
              <span>Online Rest Protocol</span>
            </div>
          </div>
        </aside>

        {/* Content Panel Area */}
        <main className="flex-1 p-6 space-y-6 overflow-x-hidden">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
              <p className="text-xs text-slate-500 font-medium font-mono">Syncing school databases...</p>
            </div>
          ) : (
            <>
              {/* --- TAB 1: OVERVIEW DASHBOARD --- */}
              {currentTab === 'dashboard' && (
                <div id="tab-dashboard-view" className="space-y-6">
                  
                  {/* Stats Bento Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Applicants</p>
                      <p className="text-2xl font-extrabold text-blue-900 font-mono">{stats.totalStudents}</p>
                      <p className="text-[10px] uppercase text-slate-400 tracking-wider">Enrollment base</p>
                    </div>

                    <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Review</p>
                      <p className="text-2xl font-extrabold text-amber-600 font-mono">{stats.pendingCount}</p>
                      <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold uppercase border border-amber-250 tracking-wider">Awaiting audit</span>
                    </div>

                    <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Approved</p>
                      <p className="text-2xl font-extrabold text-emerald-600 font-mono">{stats.approvedCount}</p>
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-250 tracking-wider">Confirmed seats</span>
                    </div>

                    <div className="bg-white p-5 rounded-md border border-slate-200 shadow-sm space-y-2 text-left">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rejected</p>
                      <p className="text-2xl font-extrabold text-rose-600 font-mono">{stats.rejectedCount}</p>
                      <span className="text-[9px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold uppercase border border-rose-200 tracking-wider">Withheld</span>
                    </div>

                  </div>

                  {/* AI Balancing Advisor Widget */}
                  <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4 shadow-md relative overflow-hidden">
                    <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-amber-400/5 rounded-full blur-2xl"></div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        <div>
                          <h4 className="text-sm font-bold font-display tracking-tight text-white">AI Curriculum Balancing Consultant</h4>
                          <p className="text-[10px] text-slate-400">Generates instant streaming advisory optimization metrics</p>
                        </div>
                      </div>

                      <button
                        id="ai-insights-btn"
                        onClick={generateDemographicInsights}
                        disabled={isInsightsLoading}
                        className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-semibold text-xs px-4 py-2 rounded-xl cursor-pointer disabled:bg-slate-650 flex items-center gap-1.5 transition-colors"
                      >
                        {isInsightsLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                        Generate Consultation
                      </button>
                    </div>

                    {schoolAdvisorInsights ? (
                      <div className="text-xs bg-slate-800/40 p-4 rounded-xl border border-slate-800/80 leading-relaxed text-slate-300 space-y-2">
                        {schoolAdvisorInsights.split('\n').map((line, idx) => (
                          <p key={idx}>{line}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Click the Generate button above to fetch AI balances suggestions for your classrooms.</p>
                    )}
                  </div>

                  {/* Allocation Controls Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                      <div>
                        <h4 className="text-md font-bold text-slate-900 flex items-center gap-2">
                          <UserCheck className="w-5 h-5 text-indigo-600" />
                          Smart Streams Auto-Allocator
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">Loads all approved students, extracts top metrics for Special Room A, and balance other regular sections by gender ratio round-robin.</p>
                      </div>

                      <button
                        id="smart-assign-engine-btn"
                        onClick={triggerAutoClassAllocation}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow cursor-pointer transition-all flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Run Smart Allocations
                      </button>
                    </div>

                    {/* Grade Analytics summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {gradeAnalytics.map(g => (
                        <div key={g.grade} className="p-4 rounded-xl border border-slate-200 text-left bg-slate-50/50 space-y-3">
                          <div className="flex justify-between items-center">
                            <h5 className="text-xs font-extrabold text-slate-800 font-display">Grade {g.grade}</h5>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-semibold">{g.classesCount} Classes</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 text-[9px] uppercase font-bold">Approved</span>
                              <p className="font-bold text-slate-800">{g.totalApproved} / {g.totalStudents}</p>
                            </div>
                            <div>
                              <span className="text-slate-400 text-[9px] uppercase font-bold">Male / Female Ratio</span>
                              <p className="font-bold text-slate-800">{g.maleCount}M : {g.femaleCount}F</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick export entire databases block */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">Need immediate backups? Export entire registers instantly:</span>
                      <div className="flex items-center gap-2">
                        <button
                          id="export-csv-btn-school"
                          onClick={() => handleExportData('school')}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-4 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          Entire Registry (CSV)
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* --- TAB 2: APPLICATION LIST --- */}
              {currentTab === 'applications' && (
                <div id="tab-applications-view" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                  
                  {/* Title & Filters */}
                  <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold font-display tracking-tight text-slate-900">Student Applications Registry</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Process transcripts, billing receipt copies, and execute approvals.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        id="bulk-export-applications"
                        onClick={() => handleExportData('school')}
                        className="bg-slate-900 text-white text-xs font-semibold px-4 py-2 hover:bg-slate-850 rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Export All Registers
                      </button>
                    </div>
                  </div>

                  {/* Filter controls row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        id="query-applications-search"
                        type="text"
                        placeholder="Search student name..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <select
                        id="query-grade-filter"
                        value={filterGrade}
                        onChange={(e) => { setFilterGrade(e.target.value); setCurrentPage(1); }}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="All">All Grades</option>
                        <option value="10">Grade 10</option>
                        <option value="11">Grade 11</option>
                        <option value="12">Grade 12</option>
                      </select>
                    </div>

                    <div>
                      <select
                        id="query-status-filter"
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-250 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="text-right text-xs text-slate-450 self-center">
                      Showing <strong>{filteredApplications.length}</strong> applicants
                    </div>

                  </div>

                  {/* Responsive table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-900 border-collapse table-auto md:table-fixed">
                      <thead>
                        <tr className="bg-slate-50 border-y border-slate-100 font-semibold text-slate-500">
                          <th className="py-3 px-4 w-[130px]">Name</th>
                          <th className="py-3 px-3 w-[60px]">Age/Sex</th>
                          <th className="py-3 px-3 w-[60px]">Grade</th>
                          <th className="py-3 px-3 w-[65px]">Average</th>
                          <th className="py-3 px-3 w-[150px]">Documents Auditing</th>
                          <th className="py-3 px-3 w-[90px]">Status</th>
                          <th className="py-3 px-3 w-[80px]">Assigned Class</th>
                          <th className="py-3 px-3 w-[150px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedApplications.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12 text-slate-450">No applications match the search/filter criteria.</td>
                          </tr>
                        ) : (
                          paginatedApplications.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="py-3.5 px-4 font-bold text-slate-905 max-w-[130px] truncate">{item.full_name}</td>
                              <td className="py-3.5 px-3 whitespace-nowrap">{item.age} / {item.sex}</td>
                              <td className="py-3.5 px-3">G {item.promoted_grade}</td>
                              <td className="py-3.5 px-3 font-semibold text-indigo-750">{item.average}%</td>
                              <td className="py-3.5 px-3 space-x-2">
                                <button
                                  onClick={() => viewMediaLightbox(item, 'transcript')}
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  Transcript
                                </button>
                                <button
                                  onClick={() => viewMediaLightbox(item, 'receipt')}
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded cursor-pointer"
                                >
                                  <Eye className="w-3 h-3 text-slate-500" />
                                  Receipt ({item.payment_method})
                                </button>
                              </td>
                              <td className="py-3.5 px-3 text-left">
                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold text-center ${
                                  item.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                                  item.status === 'Rejected' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 font-mono text-xs font-bold text-slate-700">{item.class_assignment || '--'}</td>
                              <td className="py-3.5 px-3 text-right space-x-1 whitespace-nowrap">
                                <button
                                  onClick={() => runAiReview(item)}
                                  className="text-[10px] border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 p-1 rounded.5 cursor-pointer font-bold inline-flex items-center gap-0.5"
                                  title="AI Diagnostics Check"
                                >
                                  <Brain className="w-3 h-3 text-amber-600 animate-pulse" />
                                  Audit
                                </button>

                                {item.status !== 'Approved' && (
                                  <button
                                    onClick={() => handleApprove(item)}
                                    className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                )}
                                {item.status !== 'Rejected' && (
                                  <button
                                    onClick={() => handleRejectClick(item)}
                                    className="p-1 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  className="p-1 hover:bg-slate-100 text-slate-400 hover:text-rose-600 rounded text-[10px] cursor-pointer"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                      <span>Page {currentPage} of {totalPages}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* --- TAB 3: CLASSES COMPORTMENT --- */}
              {currentTab === 'classes' && (
                <div id="tab-classes-view" className="space-y-6">
                  
                  {/* Select class visual inspect or list blocks */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                    <div>
                      <h4 className="text-lg font-bold font-display text-slate-900">Classroom Inspector & Layouts</h4>
                      <p className="text-xs text-slate-500">Visual list of generated Smart streams. Click on any room to drill down into the list of assigned students.</p>
                    </div>

                    {classes.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-500 font-medium">No classrooms assigned yet.</p>
                        <button
                          onClick={() => setCurrentTab('dashboard')}
                          className="text-xs text-indigo-600 hover:underline font-semibold mt-1 block mx-auto"
                        >
                          Run Smart Allocations inside Overview first →
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {classes.map(c => (
                          <div
                            key={c.class_name}
                            onClick={() => { setSelectedClassInspect(c.class_name); setInspectPage(1); }}
                            className={`p-4 rounded-xl border-2 text-left cursor-pointer transition-all ${
                              selectedClassInspect === c.class_name 
                                ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-1 ring-indigo-500' 
                                : 'border-slate-150 bg-slate-50/20 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold font-mono text-indigo-700">{c.class_name}</span>
                              <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                                c.class_type === 'Special' ? 'bg-amber-100 text-amber-800' : 'bg-slate-150 text-slate-700'
                              }`}>
                                {c.class_type} Stream
                              </span>
                            </div>
                            <p className="text-xl font-extrabold text-slate-900">{c.total_students} Students</p>
                            <p className="text-[10px] text-slate-500 mt-1">Grade {c.grade} room</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Inspector block detailed lists */}
                  {selectedClassInspect && (
                    <div id="class-inspect-drilldown" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                      
                      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-md font-bold text-slate-900 font-display">Section {selectedClassInspect} Inspector View</h4>
                          <p className="text-xs text-slate-500">Reviewing students assigned to room {selectedClassInspect}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            id="export-csv-btn-class"
                            onClick={() => handleExportData('class', selectedClassInspect)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-600" />
                            Export Section ({selectedClassInspect})
                          </button>
                        </div>
                      </div>

                      {/* Sorting, query features within lists */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search className="w-4 h-4" />
                          </span>
                          <input
                            id="inspect-search-input"
                            type="text"
                            placeholder="Find inside classroom..."
                            value={classInspectSearch}
                            onChange={(e) => { setClassInspectSearch(e.target.value); setInspectPage(1); }}
                            className="w-full text-xs pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none"
                          />
                        </div>

                        <div>
                          <select
                            id="inspect-sort-select"
                            value={classInspectSort}
                            onChange={(e) => setClassInspectSort(e.target.value as 'asc' | 'desc')}
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none"
                          >
                            <option value="asc">Sort Alphabetical (A-Z)</option>
                            <option value="desc">Sort Alphabetical (Z-A)</option>
                          </select>
                        </div>

                        <div className="text-right text-xs text-slate-450 self-center">
                          Viewing <strong>{inspectStudents.length}</strong> matching students
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-left border-y border-slate-100 font-semibold">
                              <th className="py-2.5 px-4">Student Name</th>
                              <th className="py-2.5 px-4">Sex</th>
                              <th className="py-2.5 px-4">Age</th>
                              <th className="py-2.5 px-4">Average Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paginatedInspect.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="text-center py-6 text-slate-400">No students found matching this criteria.</td>
                              </tr>
                            ) : (
                              paginatedInspect.map(st => (
                                <tr key={st.id} className="hover:bg-slate-50/50">
                                  <td className="py-3 px-4 font-bold text-slate-800">{st.full_name}</td>
                                  <td className="py-3 px-4">{st.sex}</td>
                                  <td className="py-3 px-4">{st.age}</td>
                                  <td className="py-3 px-4 font-semibold text-indigo-700">{st.average}%</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Inspector Pagination */}
                      {inspectTotalPages > 1 && (
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
                          <span>Page {inspectPage} of {inspectTotalPages}</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setInspectPage(prev => Math.max(prev - 1, 1))}
                              disabled={inspectPage === 1}
                              className="p-1 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                              Prev
                            </button>
                            <button
                              onClick={() => setInspectPage(prev => Math.min(prev + 1, inspectTotalPages))}
                              disabled={inspectPage === inspectTotalPages}
                              className="p-1 px-3 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                </div>
              )}

              {/* --- TAB 4: LIMITS CONFIG --- */}
              {currentTab === 'settings' && (
                <div id="tab-settings-view" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h4 className="text-lg font-bold font-display text-slate-900">Grade Capacities & Parameters Config</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Control the structural student constraints before triggering the balancing algorithm.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <div className="space-y-2 text-left">
                      <label htmlFor="cap-input-g10" className="block text-xs font-semibold text-slate-700">Grade 10 Class Cap size</label>
                      <input
                        id="cap-input-g10"
                        type="number"
                        min="20"
                        max="100"
                        value={g10Cap}
                        onChange={(e) => setG10Cap(parseInt(e.target.value) || 0)}
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-450">Standard Chercher transition limit. Typical cap is 60 students per class room.</p>
                    </div>

                    <div className="space-y-2 text-left">
                      <label htmlFor="cap-input-g11" className="block text-xs font-semibold text-slate-700">Grade 11 Class Cap size</label>
                      <input
                        id="cap-input-g11"
                        type="number"
                        min="20"
                        max="100"
                        value={g11Cap}
                        onChange={(e) => setG11Cap(parseInt(e.target.value) || 0)}
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-450">Typical cap is 50 students per class room.</p>
                    </div>

                    <div className="space-y-2 text-left">
                      <label htmlFor="cap-input-g12" className="block text-xs font-semibold text-slate-700">Grade 12 Class Cap size</label>
                      <input
                        id="cap-input-g12"
                        type="number"
                        min="20"
                        max="100"
                        value={g12Cap}
                        onChange={(e) => setG12Cap(parseInt(e.target.value) || 0)}
                        className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none"
                      />
                      <p className="text-[10px] text-slate-450">Preparatory classes cap. Typical is 45 students per class room.</p>
                    </div>

                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      id="save-grade-cap-btn"
                      onClick={handleSaveCaps}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow transition-all"
                    >
                      Save Grade Capacities
                    </button>
                  </div>
                </div>
              )}

            </>
          )}

        </main>
      </div>

      {/* --- REJECTION MODAL --- */}
      {rejectingStudent && (
        <div id="rejection-modal-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-xl max-w-md w-full p-6 space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h5 className="font-bold font-display text-slate-900">Provide Rejection Reason</h5>
              <button onClick={() => setRejectingStudent(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-500">State why this student application is rejected. Student will see this instantly on their live tracker.</p>
              <textarea
                id="rejection-reason-textarea"
                rows={4}
                value={rejectionText}
                onChange={(e) => setRejectionText(e.target.value)}
                placeholder="e.g. Average percentage below transition criteria, or CBE transaction receipt audit failed."
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 text-xs">
              <button 
                onClick={() => setRejectingStudent(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button 
                id="rejection-save-btn"
                onClick={saveRejectAction}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg cursor-pointer shadow"
              >
                Confirm Rejection Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- AI DIAGNOSTICS LIGHTBOX --- */}
      {aiReviewStudent && (
        <div id="ai-diagnostics-overlay" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-150 shadow-xl max-w-lg w-full p-6 space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-900">
                <Brain className="w-5 h-5 text-amber-500 animate-pulse" />
                <h5 className="font-bold font-display text-xs">AI Admissions Auditor check</h5>
              </div>
              <button onClick={() => setAiReviewStudent(null)} className="text-slate-450 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-800">{aiReviewStudent.full_name}</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <span>Grade: {aiReviewStudent.promoted_grade}</span>
                  <span>Previous Semester Average: {aiReviewStudent.average}%</span>
                </div>
              </div>

              <div id="ai-results-markdown" className="min-h-[160px] max-h-[250px] overflow-y-auto text-xs bg-indigo-50/20 p-4 border border-indigo-150 rounded-xl whitespace-pre-line text-slate-700">
                {isAiLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                    <span className="text-[10px] text-indigo-600 font-medium">Analyzing registration transcript and CBE parameters...</span>
                  </div>
                ) : (
                  aiAnalysis
                )}
              </div>
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setAiReviewStudent(null)}
                className="bg-slate-900 text-white font-semibold text-xs px-4 py-2 hover:bg-slate-850 rounded-lg cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MEDIA DOCUMENT LIGHTBOX OVERLAY --- */}
      {previewStudent && previewMediaUrl && (
        <div id="document-lightbox-overlay" className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full flex flex-col gap-3">
            <div className="flex justify-between items-center text-white">
              <div>
                <p className="text-sm font-bold font-display">{previewStudent.full_name}</p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {previewMediaUrl === 'transcript' ? 'Academic Transcript File' : `Deposit Transaction copy (${previewStudent.payment_method})`}
                </p>
              </div>

              <button
                onClick={() => { setPreviewStudent(null); setPreviewMediaUrl(null); }}
                className="p-1 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-white rounded-2xl overflow-hidden min-h-[300px] flex items-center justify-center p-2">
              {/* Check if is PDF versus web image */}
              {previewMediaUrl === 'transcript' && previewStudent.transcript_url.endsWith('.pdf') ? (
                <div className="text-center p-8 text-slate-500">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Transcript Submitted as PDF Document</p>
                  <a
                    href={previewStudent.transcript_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline inline-block mt-2 font-semibold"
                  >
                    Open PDF in New Browser Tab ↗
                  </a>
                </div>
              ) : previewMediaUrl === 'receipt' && previewStudent.receipt_url.endsWith('.pdf') ? (
                <div className="text-center p-8 text-slate-500">
                  <Eye className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Receipt Submitted as PDF Document</p>
                  <a
                    href={previewStudent.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline inline-block mt-2 font-semibold"
                  >
                    Open PDF in New Browser Tab ↗
                  </a>
                </div>
              ) : (
                <img
                  src={previewMediaUrl === 'transcript' ? previewStudent.transcript_url : previewStudent.receipt_url}
                  alt={`${previewStudent.full_name} document image preview`}
                  className="max-h-[75vh] object-contain rounded-xl w-full"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
