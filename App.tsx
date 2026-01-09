
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Tournament, LogEntry, AppTab } from './types';
import {
  FileText, Table, Globe, Info, Terminal, RefreshCw, Trash2,
  Mail, MapPin, ExternalLink, Filter, Users, Shield, Zap, GraduationCap,
  ArrowUpDown, ArrowUp, ArrowDown, Image, Loader2, Download, X
} from 'lucide-react';
import {
  fetchTournaments,
  uploadPdf,
  deleteAllTournaments,
  fetchInfographics,
  generateInfographic,
  deleteInfographic as deleteInfographicApi,
  getInfographicImageUrl,
  InfographicMetadata
} from './services/apiService';
import Logger from './components/Logger';

// Extend AppTab to include INFOGRAPHICS
const INFOGRAPHICS_TAB = 'infographics' as AppTab;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.WELCOME);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Infographic States
  const [infographics, setInfographics] = useState<InfographicMetadata[]>([]);
  const [isGeneratingInfographic, setIsGeneratingInfographic] = useState(false);

  // Filtering States
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Sorting States
  type SortColumn = 'ltaCode' | 'title' | 'category' | 'gender' | 'eventType' | 'date' | 'grade' | 'venue';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
  }, []);

  // Load tournaments from API on mount
  const loadTournaments = useCallback(async () => {
    try {
      const data = await fetchTournaments();
      setTournaments(data);
      if (data.length > 0) {
        addLog(`Loaded ${data.length} tournaments from database`, 'success');
        setActiveTab(AppTab.TOURNAMENTS);
      }
    } catch (err: any) {
      addLog(`Failed to load tournaments: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addLog(`File selected: ${file.name}`, 'info');
    setIsProcessing(true);

    try {
      addLog("Uploading PDF to server for parsing...", "info");
      const result = await uploadPdf(file);

      setTournaments(result.tournaments);
      addLog(`Parsed ${result.parsed} Sussex tournaments. Added ${result.added} new, skipped ${result.skipped} existing.`, "success");
      addLog(`Total tournaments in database: ${result.total}`, "info");

      if (result.tournaments.length > 0) {
        setSelectedMonth('All');
        setSelectedGender('All');
        setSelectedGrade('All');
        setSelectedType('All');
        setSelectedCategory('All');
        setActiveTab(AppTab.TOURNAMENTS);
      } else {
        addLog("No Sussex (SUS) tournaments detected. Check PDF layout.", "warning");
      }
    } catch (err: any) {
      addLog(`Error processing file: ${err.message}`, "error");
    } finally {
      setIsProcessing(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete all tournaments from the database?')) return;

    try {
      await deleteAllTournaments();
      setTournaments([]);
      addLog('All tournaments deleted from database', 'success');
      setActiveTab(AppTab.WELCOME);
    } catch (err: any) {
      addLog(`Failed to delete tournaments: ${err.message}`, 'error');
    }
  };

  // Load infographics from API
  const loadInfographics = useCallback(async () => {
    try {
      const data = await fetchInfographics();
      setInfographics(data);
    } catch (err: any) {
      addLog(`Failed to load infographics: ${err.message}`, 'error');
    }
  }, [addLog]);

  // Load infographics when tab changes to infographics
  useEffect(() => {
    if (activeTab === INFOGRAPHICS_TAB) {
      loadInfographics();
    }
  }, [activeTab, loadInfographics]);

  // Handle creating infographic
  const handleCreateInfographic = async () => {
    if (filteredTournaments.length === 0) {
      addLog('No tournaments to create infographic from', 'warning');
      return;
    }

    setIsGeneratingInfographic(true);
    addLog(`Creating infographic for ${filteredTournaments.length} tournaments...`, 'info');

    try {
      const filters = {
        month: selectedMonth !== 'All' ? selectedMonth : undefined,
        gender: selectedGender !== 'All' ? selectedGender : undefined,
        grade: selectedGrade !== 'All' ? selectedGrade : undefined,
        eventType: selectedType !== 'All' ? selectedType : undefined,
        ageGroup: selectedCategory !== 'All' ? selectedCategory : undefined,
      };

      const result = await generateInfographic(filteredTournaments, filters);
      addLog(`Infographic created successfully!`, 'success');
      setInfographics(prev => [result.infographic, ...prev]);
      setActiveTab(INFOGRAPHICS_TAB);
    } catch (err: any) {
      addLog(`Failed to create infographic: ${err.message}`, 'error');
    } finally {
      setIsGeneratingInfographic(false);
    }
  };

  // Handle deleting infographic
  const handleDeleteInfographic = async (id: string) => {
    if (!confirm('Are you sure you want to delete this infographic?')) return;

    try {
      await deleteInfographicApi(id);
      setInfographics(prev => prev.filter(i => i.id !== id));
      addLog('Infographic deleted', 'success');
    } catch (err: any) {
      addLog(`Failed to delete infographic: ${err.message}`, 'error');
    }
  };

  const months = useMemo(() => {
    const m = Array.from(new Set(tournaments.map(t => t.month)));
    return ['All', ...m.sort((a: any, b: any) => new Date(a).getTime() - new Date(b).getTime())];
  }, [tournaments]);

  const genders = useMemo(() => ['All', ...Array.from(new Set(tournaments.map(t => t.gender)))], [tournaments]);
  const grades = useMemo(() => ['All', ...Array.from(new Set(tournaments.map(t => t.grade)))].sort(), [tournaments]);
  const eventTypes = useMemo(() => ['All', ...Array.from(new Set(tournaments.map(t => t.eventType)))], [tournaments]);
  const categories = useMemo(() => ['All', ...Array.from(new Set(tournaments.map(t => t.category)))].sort(), [tournaments]);

  // Parse date string like "Sat 06 Sep" to sortable value
  const parseDateForSort = useCallback((dateStr: string, month: string): number => {
    const monthMap: Record<string, number> = {
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
      'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
    };
    const parts = dateStr.split(' ');
    const day = parseInt(parts[1]) || 1;
    const monthAbbr = parts[2]?.toUpperCase() || '';
    const monthNum = monthMap[monthAbbr] ?? 0;
    const yearMatch = month.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 2025;
    return new Date(year, monthNum, day).getTime();
  }, []);

  // Handle column sort click
  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn]);

  // Sort function for tournaments
  const sortTournaments = useCallback((items: Tournament[]): Tournament[] => {
    return [...items].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'date':
          comparison = parseDateForSort(a.date, a.month) - parseDateForSort(b.date, b.month);
          break;
        case 'grade':
          const gradeA = parseInt(a.grade.replace(/[^0-9]/g, '')) || 0;
          const gradeB = parseInt(b.grade.replace(/[^0-9]/g, '')) || 0;
          comparison = gradeA - gradeB;
          break;
        case 'ltaCode':
        case 'title':
        case 'category':
        case 'gender':
        case 'eventType':
        case 'venue':
          comparison = (a[sortColumn] || '').localeCompare(b[sortColumn] || '');
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [sortColumn, sortDirection, parseDateForSort]);

  // Ensure filteredTournaments updates whenever any state changes, then apply sorting
  const filteredTournaments = useMemo(() => {
    const filtered = tournaments.filter(t => {
      const matchMonth = selectedMonth === 'All' || t.month === selectedMonth;
      const matchGender = selectedGender === 'All' || t.gender === selectedGender;
      const matchGrade = selectedGrade === 'All' || t.grade === selectedGrade;
      const matchType = selectedType === 'All' || t.eventType === selectedType;
      const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchMonth && matchGender && matchGrade && matchType && matchCategory;
    });
    return sortTournaments(filtered);
  }, [tournaments, selectedMonth, selectedGender, selectedGrade, selectedType, selectedCategory, sortTournaments]);

  // Helper to strip UK postcodes from venue text
  const stripPostcode = (text: string): string => {
    return text.replace(/\s*[A-Z]{1,2}\d{1,2}\s*\d[A-Z]{2}\s*/gi, '').trim();
  };

  // Build LTA competition link with all required filters
  const getLTALink = (t: Tournament) => {
    const monthMap: Record<string, string> = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
      'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    const parts = t.date.split(' ');
    const day = parts[1]?.padStart(2, '0');
    const month = monthMap[parts[2]?.toUpperCase()] || '01';
    const year = t.month.split(' ')[1];
    const formattedDate = `${year}-${month}-${day}`;
    const gradeNum = parseInt(t.grade.replace(/[^0-9]/g, '')) || 5;

    let link = `https://competitions.lta.org.uk/find?DateFilterType=0&StartDate=${formattedDate}&EndDate=${formattedDate}&GradeFilter=${gradeNum}&page=1`;
    // Add grading ID list for precise grade filtering
    for (let i = 0; i < 8; i++) {
      const isCurrentGrade = (i + 1) === gradeNum;
      link += `&GradingIDList%5B${i}%5D=${isCurrentGrade ? gradeNum : 'false'}`;
    }
    // Add Sussex location filter
    link += '&LocationFilterType=1&LocationCode=E9A2B2A9-37C5-45A5-BD94-861561E9620A';
    return link;
  };

  const stAnnsTournaments = useMemo(() => {
    const isStAnns = (v: string) =>
      v.toLowerCase().includes("st ann") ||
      v.toLowerCase().includes("stann");

    const base = tournaments.filter(t => isStAnns(t.venue));
    const filtered = base.filter(t => {
      const matchMonth = selectedMonth === 'All' || t.month === selectedMonth;
      const matchGender = selectedGender === 'All' || t.gender === selectedGender;
      const matchGrade = selectedGrade === 'All' || t.grade === selectedGrade;
      const matchType = selectedType === 'All' || t.eventType === selectedType;
      const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchMonth && matchGender && matchGrade && matchType && matchCategory;
    });
    return sortTournaments(filtered);
  }, [tournaments, selectedMonth, selectedGender, selectedGrade, selectedType, selectedCategory, sortTournaments]);

  // Helper to generate Google Maps link from venue name
  const getGoogleMapsLink = (venue: string) => {
    const query = encodeURIComponent(stripPostcode(venue) + ', Sussex, UK');
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900 font-sans bg-slate-50">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-full shadow-inner"><Globe className="text-emerald-700" size={20} /></div>
            <div>
              <h1 className="text-lg font-bold leading-none">StAnn's Tennis</h1>
              <p className="text-[10px] opacity-70 uppercase tracking-widest mt-0.5">Sussex Tournament Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tournaments.length > 0 && (
              <>
                <button
                  onClick={loadTournaments}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors text-xs font-semibold"
                  title="Refresh tournaments"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors text-xs font-semibold"
                  title="Clear all tournaments"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
            <button onClick={() => setIsLogOpen(!isLogOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors text-xs font-semibold uppercase tracking-wider">
              <Terminal size={14} className={logs.some(l => l.type === 'error') ? 'text-rose-300' : 'text-emerald-300'} />
              System logs ({logs.length})
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <div className="bg-emerald-800/50 backdrop-blur-md border-t border-emerald-600/30 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto flex">
            <TabButton active={activeTab === AppTab.WELCOME} onClick={() => setActiveTab(AppTab.WELCOME)} icon={<FileText size={16} />} label="1. Upload" />
            <TabButton active={activeTab === AppTab.TOURNAMENTS} onClick={() => setActiveTab(AppTab.TOURNAMENTS)} icon={<Table size={16} />} label="2. All Events" disabled={tournaments.length === 0} />
            <TabButton active={activeTab === AppTab.VISUALIZATION} onClick={() => setActiveTab(AppTab.VISUALIZATION)} icon={<Globe size={16} />} label="3. Club Export" disabled={tournaments.length === 0} />
            <TabButton active={activeTab === INFOGRAPHICS_TAB} onClick={() => setActiveTab(INFOGRAPHICS_TAB)} icon={<Image size={16} />} label="4. Infographics" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {activeTab === AppTab.WELCOME && (
          <div className="max-w-3xl mx-auto mt-8 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-10 md:p-16 text-center">
                <h2 className="text-4xl font-black mb-4 text-slate-800 tracking-tight">Hi Conrad!</h2>
                <p className="text-lg text-slate-600 mb-4 max-w-lg mx-auto leading-relaxed">
                  {isLoading
                    ? 'Loading tournaments from database...'
                    : tournaments.length > 0
                    ? `You have ${tournaments.length} tournaments in the database. Upload another PDF to add more.`
                    : 'Please upload a PDF of LTA tournaments to populate the Sussex portal.'}
                </p>
                {tournaments.length > 0 && (
                  <p className="text-sm text-emerald-600 mb-6">
                    New tournaments will be added automatically. Duplicates are skipped.
                  </p>
                )}
                <div className="mt-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={isProcessing || isLoading}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing || isLoading}
                    className={`w-full p-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-6 cursor-pointer ${isProcessing || isLoading ? 'bg-emerald-50 border-emerald-400 cursor-wait' : 'bg-white border-slate-200 hover:border-emerald-500 shadow-sm'}`}
                  >
                    <div className={`p-6 rounded-full ${isProcessing || isLoading ? 'bg-emerald-500 text-white animate-bounce' : 'bg-emerald-100 text-emerald-600 transition-colors'}`}><FileText size={48} /></div>
                    <p className="text-xl font-bold text-slate-700">
                      {isLoading ? 'Loading...' : isProcessing ? 'Processing PDF...' : 'Click to Upload PDF'}
                    </p>
                    {(isProcessing || isLoading) && <div className="w-full max-w-xs bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2"><div className="h-full bg-emerald-500 animate-progress"></div></div>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Row */}
        {activeTab !== AppTab.WELCOME && tournaments.length > 0 && (
          <div className="mb-8 space-y-4 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500">
                <Filter size={18} />
                <span className="text-sm font-bold uppercase tracking-widest">Select Month</span>
              </div>
              <div className="flex flex-wrap justify-center gap-1 p-1 bg-slate-50 rounded-xl">
                {months.map(m => (
                  <button key={m} onClick={() => setSelectedMonth(m)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedMonth === m ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>
                    {m.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <FilterSelect label="Gender" icon={<Users size={14}/>} value={selectedGender} onChange={setSelectedGender} options={genders} />
              <FilterSelect label="Grade" icon={<Shield size={14}/>} value={selectedGrade} onChange={setSelectedGrade} options={grades} />
              <FilterSelect label="Event Type" icon={<Zap size={14}/>} value={selectedType} onChange={setSelectedType} options={eventTypes} />
              <FilterSelect label="Age Group" icon={<GraduationCap size={14}/>} value={selectedCategory} onChange={setSelectedCategory} options={categories} />
            </div>

            <div className="flex items-center gap-3 px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Showing {filteredTournaments.length} results</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>
          </div>
        )}

        {activeTab === AppTab.TOURNAMENTS && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in">
            {/* Create Infographic Button */}
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">All Events</h3>
                <p className="text-sm text-slate-500">{filteredTournaments.length} tournaments displayed</p>
              </div>
              <button
                onClick={handleCreateInfographic}
                disabled={isGeneratingInfographic || filteredTournaments.length === 0}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isGeneratingInfographic
                    ? 'bg-emerald-100 text-emerald-600 cursor-wait'
                    : filteredTournaments.length === 0
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {isGeneratingInfographic ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Image size={16} />
                    Create Infographic
                  </>
                )}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <SortableHeader label="Code" column="ltaCode" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Name" column="title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Age Group" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Gender" column="gender" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Type" column="eventType" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} center />
                    <SortableHeader label="Date" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Grade" column="grade" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} center />
                    <SortableHeader label="Venue" column="venue" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <th className="px-4 py-4 text-center">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTournaments.map((t, idx) => (
                    <tr key={`${t.id}-${idx}`} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-4 py-4">
                        <span className="text-[11px] text-emerald-600 font-mono font-bold">{t.ltaCode}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{t.title}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">{t.category}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${t.gender === 'Mixed' ? 'bg-amber-100 text-amber-700' : t.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{t.gender}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{t.eventType}</span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-4 text-center font-black text-slate-400">{t.grade}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-700">{stripPostcode(t.venue)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {t.organiserEmail && (
                            <a
                              href={`mailto:${t.organiserEmail}`}
                              title={`Email: ${t.organiserEmail}`}
                              className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                            >
                              <Mail size={14} />
                            </a>
                          )}
                          <a
                            href={getGoogleMapsLink(t.venue)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Google Maps"
                            className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-all"
                          >
                            <MapPin size={14} />
                          </a>
                          <a
                            href={getLTALink(t)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enter on LTA"
                            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTournaments.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-medium italic">No matches found.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === AppTab.VISUALIZATION && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="p-6 bg-emerald-50 border-b border-emerald-100">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">St Ann's Tennis Tournaments</h3>
              <p className="text-sm text-slate-500">Showing {stAnnsTournaments.length} tournaments at St Ann's Tennis Club</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <SortableHeader label="Code" column="ltaCode" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Name" column="title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Age Group" column="category" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Gender" column="gender" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Type" column="eventType" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} center />
                    <SortableHeader label="Date" column="date" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <SortableHeader label="Grade" column="grade" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} center />
                    <SortableHeader label="Venue" column="venue" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                    <th className="px-4 py-4 text-center">Links</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {stAnnsTournaments.map((t, idx) => (
                    <tr key={`${t.id}-${idx}`} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-4 py-4">
                        <span className="text-[11px] text-emerald-600 font-mono font-bold">{t.ltaCode}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{t.title}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-[10px] font-bold">{t.category}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${t.gender === 'Mixed' ? 'bg-amber-100 text-amber-700' : t.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{t.gender}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{t.eventType}</span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-slate-700 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-4 text-center font-black text-slate-400">{t.grade}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-700">{stripPostcode(t.venue)}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {t.organiserEmail && (
                            <a
                              href={`mailto:${t.organiserEmail}`}
                              title={`Email: ${t.organiserEmail}`}
                              className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                            >
                              <Mail size={14} />
                            </a>
                          )}
                          <a
                            href={getGoogleMapsLink(t.venue)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on Google Maps"
                            className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition-all"
                          >
                            <MapPin size={14} />
                          </a>
                          <a
                            href={getLTALink(t)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Enter on LTA"
                            className="p-2 bg-slate-900 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-md"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stAnnsTournaments.length === 0 && (
                <div className="p-20 text-center text-slate-400 font-medium italic">
                  <Info className="mx-auto mb-3 opacity-30" size={40} />
                  No St Ann's fixtures matching filters.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === INFOGRAPHICS_TAB && (
          <div className="animate-in fade-in">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Generated Infographics</h2>
              <p className="text-slate-500">Professional tournament flyers generated with AI</p>
            </div>

            {infographics.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-20 text-center">
                <Image className="mx-auto mb-4 text-slate-300" size={64} />
                <h3 className="text-xl font-bold text-slate-700 mb-2">No Infographics Yet</h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Create your first infographic by filtering tournaments in the "All Events" tab and clicking "Create Infographic".
                </p>
                <button
                  onClick={() => setActiveTab(AppTab.TOURNAMENTS)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all"
                >
                  Go to All Events
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {infographics.map((info) => (
                  <div key={info.id} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden group">
                    {/* Image Preview */}
                    <div className="relative aspect-[4/3] bg-slate-100">
                      <img
                        src={getInfographicImageUrl(info.filename)}
                        alt={`Infographic for ${info.tournamentCount} tournaments`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <a
                          href={getInfographicImageUrl(info.filename)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-3 bg-white text-slate-700 rounded-xl hover:bg-emerald-100 hover:text-emerald-600 transition-all"
                          title="View full size"
                        >
                          <ExternalLink size={20} />
                        </a>
                        <a
                          href={getInfographicImageUrl(info.filename)}
                          download={info.filename}
                          className="p-3 bg-white text-slate-700 rounded-xl hover:bg-blue-100 hover:text-blue-600 transition-all"
                          title="Download"
                        >
                          <Download size={20} />
                        </a>
                        <button
                          onClick={() => handleDeleteInfographic(info.id)}
                          className="p-3 bg-white text-slate-700 rounded-xl hover:bg-rose-100 hover:text-rose-600 transition-all"
                          title="Delete"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-slate-700">
                          {info.tournamentCount} tournaments
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(info.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {info.filters.ageGroup && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                            {info.filters.ageGroup}
                          </span>
                        )}
                        {info.filters.gender && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                            {info.filters.gender}
                          </span>
                        )}
                        {info.filters.eventType && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">
                            {info.filters.eventType}
                          </span>
                        )}
                        {info.filters.month && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
                            {info.filters.month}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Logger logs={logs} onClear={() => setLogs([])} isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} />
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, disabled, onClick, icon, label }) => (
  <button disabled={disabled} onClick={onClick} className={`flex items-center gap-2.5 px-8 py-5 font-bold text-xs uppercase tracking-[0.15em] whitespace-nowrap border-b-2 transition-all ${disabled ? 'opacity-30 cursor-not-allowed text-emerald-900 border-transparent' : active ? 'text-white border-white bg-emerald-600/20 shadow-[inset_0_-2px_0_white]' : 'text-emerald-200 border-transparent hover:text-white hover:bg-emerald-700/50'}`}>
    {icon} {label}
  </button>
);

const FilterSelect: React.FC<{ label: string; icon: React.ReactNode; value: string; onChange: (v: string) => void; options: string[] }> = ({ label, icon, value, onChange, options }) => (
  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg">{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 truncate">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer focus:text-emerald-700 truncate"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  </div>
);

const SortableHeader: React.FC<{
  label: string;
  column: string;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: any) => void;
  center?: boolean;
}> = ({ label, column, sortColumn, sortDirection, onSort, center }) => (
  <th
    className={`px-4 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none ${center ? 'text-center' : ''}`}
    onClick={() => onSort(column)}
  >
    <div className={`flex items-center gap-1.5 ${center ? 'justify-center' : ''}`}>
      <span>{label}</span>
      {sortColumn === column ? (
        sortDirection === 'asc' ? (
          <ArrowUp size={12} className="text-emerald-600" />
        ) : (
          <ArrowDown size={12} className="text-emerald-600" />
        )
      ) : (
        <ArrowUpDown size={12} className="opacity-30" />
      )}
    </div>
  </th>
);

export default App;
