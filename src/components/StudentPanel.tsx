import { useState, useEffect, FormEvent } from 'react';
import { Search, Loader2, Award, Clock, CheckCircle2, XCircle, ChevronRight, School, Sparkles, UserCheck } from 'lucide-react';
import { db } from '../lib/supabase';
import { Registration } from '../types';
import RegistrationForm from './RegistrationForm';

interface StudentPanelProps {
  onAdminAccessClick: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function StudentPanel({ onAdminAccessClick, showToast }: StudentPanelProps) {
  const [searchName, setSearchName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Registration | null>(null);
  const [searched, setSearched] = useState(false);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recentRegistrations, setRecentRegistrations] = useState<Registration[]>([]);
  const [isLoadingRecents, setIsLoadingRecents] = useState(true);

  // Fetch recent approved or pending registrations to display on the dashboard banner for a busy live feeling
  const fetchRecentApplicants = async () => {
    try {
      setIsLoadingRecents(true);
      const all = await db.getRegistrations();
      // Show first 4
      setRecentRegistrations(all.slice(0, 4));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRecents(false);
    }
  };

  useEffect(() => {
    fetchRecentApplicants();
  }, [isFormOpen]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) {
      showToast('Please enter your full name to start tracking.', 'error');
      return;
    }

    setIsSearching(true);
    setSearched(true);
    try {
      const all = await db.getRegistrations();
      // Find case-insensitive match
      const found = all.find(
        (reg) => reg.full_name.toLowerCase().trim() === searchName.toLowerCase().trim()
      );
      setSearchResult(found || null);
      if (found) {
        showToast(`Found registration details for ${found.full_name}!`, 'success');
      } else {
        showToast('No record matching that full name was found.', 'info');
      }
    } catch (error) {
      showToast('Failed to check database records.', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div id="student-panel-wrapper" className="min-h-screen bg-slate-50/50 text-slate-900 pb-16">
      {/* Dynamic Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-35">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold leading-tight tracking-tight uppercase text-slate-900">Chercher Secondary School</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-[0.2em] uppercase">Student Registration & Management System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="admin-login-button"
              onClick={onAdminAccessClick}
              className="px-4 py-2 bg-slate-905 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Admin Access
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white overflow-hidden py-16 sm:py-20 border-b border-slate-200">
        <div className="absolute inset-0 bg-cover bg-center opacity-10 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1600')]"></div>
        <div className="max-w-4xl mx-auto text-center px-4 relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 bg-blue-900/40 border border-blue-500/30 px-3.5 py-1 rounded text-blue-300 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>2026/2027 Academic Stream Admissions Open</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
            Chercher Secondary School <br />
            <span className="font-bold text-blue-400">Class & Stream Assignment</span>
          </h2>
          
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Register for stream placement, review your CBE/Sinqee bank transaction statuses, and check your smart class allocations instantly online.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-2">
            <button
              id="hero-register-toggle-btn"
              onClick={() => setIsFormOpen(true)}
              className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-bold uppercase tracking-wider px-8 py-3.5 rounded-lg shadow-lg shadow-blue-900/20 hover:scale-[1.01] transition-all text-sm cursor-pointer"
            >
              Start Registration Portal
            </button>
            <a
              href="#portal-status-tracker"
              className="w-full sm:w-auto text-center bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase tracking-wider px-8 py-3.5 rounded-lg border border-slate-700 transition-all text-sm"
            >
              Track Application Status
            </a>
          </div>
        </div>
      </section>

      {/* Main Container Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (Main Portal Tools & Tracking) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Registration Modal View */}
          {isFormOpen ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Application Entry</h3>
                <button
                  id="close-registration-form-btn"
                  onClick={() => setIsFormOpen(false)}
                  className="text-xs text-blue-900 font-semibold hover:underline cursor-pointer"
                >
                  ← Go Back to Student Dashboard
                </button>
              </div>
              <RegistrationForm
                onSuccess={(newReg) => {
                  setIsFormOpen(false);
                  setSearchName(newReg.full_name);
                  // Auto-submit search to pull status
                  setSearchResult(newReg);
                  setSearched(true);
                  const statusElement = document.getElementById('portal-status-tracker');
                  if (statusElement) statusElement.scrollIntoView({ behavior: 'smooth' });
                }}
                showToast={showToast}
              />
            </div>
          ) : (
            /* Student Tracker Status Module */
            <div id="portal-status-tracker" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-200 pb-4">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-900" />
                  Live Enrollment Tracker
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Type your registered full name case-sensitive to track your review process.</p>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    id="student-search-input"
                    type="text"
                    placeholder="Enter your registered Full Name..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full text-sm pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent rounded-md transition-all"
                  />
                </div>
                <button
                  type="submit"
                  id="student-search-submit-btn"
                  disabled={isSearching}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold uppercase tracking-wider text-xs px-6 py-3 rounded-md cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Look Up Profile'}
                </button>
              </form>              {/* Display Result Widget */}
              {searched && (
                <div id="search-result-display" className="p-5 rounded-md border border-slate-200 bg-slate-50">
                  {searchResult ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                        <div>
                          <h4 className="text-md font-bold text-slate-900 uppercase tracking-tight">{searchResult.full_name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Date Submitted: {searchResult.created_at ? new Date(searchResult.created_at).toLocaleDateString() : 'Recent'}</span>
                        </div>
                        
                        {/* Status Label mapping */}
                        {searchResult.status === 'Approved' && (
                          <span id="status-chip-approved" className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {searchResult.status === 'Rejected' && (
                          <span id="status-chip-rejected" className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                        {searchResult.status !== 'Approved' && searchResult.status !== 'Rejected' && (
                          <span id="status-chip-pending" className="inline-flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Pending Review
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Grade</p>
                          <p className="font-bold text-slate-800 mt-0.5">Grade {searchResult.promoted_grade}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Academic Avg</p>
                          <p className="font-bold text-slate-800 mt-0.5">{searchResult.average}%</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Age / Sex</p>
                          <p className="font-bold text-slate-800 mt-0.5">{searchResult.age} / {searchResult.sex}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Class Assignment</p>
                          <p className={`font-bold mt-0.5 ${searchResult.class_assignment ? 'text-blue-900 font-mono text-sm' : 'text-slate-400 font-normal italic'}`}>
                            {searchResult.class_assignment || 'Awaiting assignment'}
                          </p>
                        </div>
                      </div>

                      {/* Display Rejection Reason details if rejected */}
                      {searchResult.status === 'Rejected' && searchResult.rejection_reason && (
                        <div id="status-reject-reason-card" className="bg-rose-50 border border-rose-200 p-4 rounded text-xs text-rose-900">
                          <p className="font-bold mb-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-rose-800">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            Admission Rejection Notice
                          </p>
                          <p className="leading-relaxed mt-1">{searchResult.rejection_reason}</p>
                        </div>
                      )}

                      {/* Display Congratulations details if approved */}
                      {searchResult.status === 'Approved' && (
                        <div id="status-approval-card" className="bg-emerald-50 border border-emerald-200 p-4 rounded text-xs text-emerald-900">
                          <p className="font-bold mb-1 flex items-center gap-1.5 uppercase tracking-wider text-[10px] text-emerald-800">
                            <Award className="w-4 h-4 text-emerald-600" />
                            Congratulations!
                          </p>
                          <p className="leading-relaxed mt-1">
                            Your CBE/Sinqee receipt has been audited and your enrollment is confirmed. You are placed in{' '}
                            <strong>Class {searchResult.class_assignment || 'Pending Section'}</strong>.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-500 font-medium font-display">No results found.</p>
                      <p className="text-xs text-slate-400 mt-1">Make sure spelling matches your submitted full name.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}          {/* Guidelines info card block */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Important Admission Checklist</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 border-l-2 border-l-blue-900 rounded space-y-1">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Step 1: Banking</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">Pay the 150 ETB administration and portal processing fee using CBE or Sinqee Bank listed accounts.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 border-l-2 border-l-blue-900 rounded space-y-1">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Step 2: Submit</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">Upload clean photographs of your last-year transcript sheet along with the bank transaction confirmation slide.</p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 border-l-2 border-l-blue-900 rounded space-y-1">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">Step 3: Streaming</p>
                <p className="text-slate-600 leading-relaxed text-[11px]">Once approved, Chercher Secondary's smart sorting assigns you matching classrooms based on merit averages.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column (Recent admissions feeds, details, stats) */}
        <div className="space-y-6">
          {/* Main informational widget */}
          <div className="bg-slate-900 text-white rounded-lg p-6 relative overflow-hidden border border-slate-800">
            <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl"></div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-blue-400 flex items-center gap-1.5 mb-2">
              <Award className="w-5 h-5 text-blue-450" />
              Chercher Merit Streams
            </h4>
            <p className="text-xs text-slate-350 leading-relaxed">
              Grade 10, 11, and 12 top performers with maximum previous semester averages are automatically routed to specialized smart Class sections (A-streams) with focused preparatory modules.
            </p>
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono tracking-tight">
              <span>Class Cap sizes:</span>
              <span className="text-blue-400">G10: 60 | G11: 50 | G12: 45</span>
            </div>
          </div>

          {/* Live Recent Updates Feed */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recent Registrations</h4>
              <p className="text-[10px] text-slate-450">Real-time enrollment requests on the stream</p>
            </div>

            <div className="space-y-3">
              {isLoadingRecents ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : recentRegistrations.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No recent applications submitted.</p>
              ) : (
                recentRegistrations.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="space-y-0.5 text-xs truncate max-w-[130px]">
                      <p className="font-semibold text-slate-800 truncate">{item.full_name}</p>
                      <p className="text-[10px] text-slate-500">Last Year Avg: {item.average}%</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-150 bg-slate-100 rounded text-slate-700 block">Grade {item.promoted_grade}</span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        item.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-150' :
                        item.status === 'Rejected' ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-150' :
                        'bg-amber-50 text-amber-700 font-medium border border-amber-150'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chercher Contacts Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-xs text-slate-500 space-y-2">
            <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Support & Inquiries</p>
            <p className="leading-relaxed">For document discrepancies or physical CBE book alignment, contact the Chercher Principal's building office during standard study hours.</p>
            <p className="pt-2 font-mono text-slate-400 tracking-tight">Chercher, West Hararghe, Ethiopia</p>
          </div>
        </div>
      </main>
    </div>
  );
}
