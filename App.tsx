
import React, { useState, useCallback, useMemo } from 'react';
import { Tournament, LogEntry, AppTab } from './types';
import { 
  FileText, Table, Map as MapIcon, Globe, Info, Terminal, 
  ChevronRight, Mail, MapPin, Navigation, ExternalLink, Filter, Users, Shield, Zap, GraduationCap, X
} from 'lucide-react';
import { extractTextFromPdf } from './services/pdfService';
import { parseTournamentsProgrammatically } from './services/parserService';
import Logger from './components/Logger';
import { CLUB_NAME, MOCK_VENUES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.WELCOME);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  
  // Filtering States
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedGender, setSelectedGender] = useState<string>('All');
  const [selectedGrade, setSelectedGrade] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toISOString(), message, type }]);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addLog(`File selected: ${file.name}`, 'info');
    setIsProcessing(true);
    
    try {
      addLog("Extracting text from PDF...", "info");
      const pdfText = await extractTextFromPdf(file);
      addLog(`Extracted ${pdfText.length} characters. Running programmatic parser...`, "info");

      const results = parseTournamentsProgrammatically(pdfText);
      setTournaments(results);
      addLog(`Successfully parsed ${results.length} Sussex (SUS) tournaments.`, "success");
      
      if (results.length > 0) {
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

  // Ensure filteredTournaments updates whenever any state changes
  const filteredTournaments = useMemo(() => {
    return tournaments.filter(t => {
      const matchMonth = selectedMonth === 'All' || t.month === selectedMonth;
      const matchGender = selectedGender === 'All' || t.gender === selectedGender;
      const matchGrade = selectedGrade === 'All' || t.grade === selectedGrade;
      const matchType = selectedType === 'All' || t.eventType === selectedType;
      const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchMonth && matchGender && matchGrade && matchType && matchCategory;
    });
  }, [tournaments, selectedMonth, selectedGender, selectedGrade, selectedType, selectedCategory]);

  // Fix: Updated LTA link with detailed grading ID list parameters
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
    // Add grading ID list as requested by the user for better filtering on LTA site
    for (let i = 0; i < 8; i++) {
      const isCurrentGrade = (i + 1) === gradeNum;
      link += `&GradingIDList%5B${i}%5D=${isCurrentGrade ? gradeNum : 'false'}`;
    }
    return link;
  };

  const stAnnsTournaments = useMemo(() => {
    const isStAnns = (v: string) => 
      v.toLowerCase().includes("st ann") || 
      v.toLowerCase().includes("stann");
      
    const base = tournaments.filter(t => isStAnns(t.venue));
    return base.filter(t => {
      const matchMonth = selectedMonth === 'All' || t.month === selectedMonth;
      const matchGender = selectedGender === 'All' || t.gender === selectedGender;
      const matchGrade = selectedGrade === 'All' || t.grade === selectedGrade;
      const matchType = selectedType === 'All' || t.eventType === selectedType;
      const matchCategory = selectedCategory === 'All' || t.category === selectedCategory;
      return matchMonth && matchGender && matchGrade && matchType && matchCategory;
    });
  }, [tournaments, selectedMonth, selectedGender, selectedGrade, selectedType, selectedCategory]);

  // Sussex Map View Logic
  const mapData = useMemo(() => {
    const venuePins = new Map<string, { lat: number; lng: number; tournaments: Tournament[] }>();
    filteredTournaments.forEach(t => {
      const coords = MOCK_VENUES[t.venue] || { lat: 50.85 + (Math.random() - 0.5) * 0.2, lng: -0.15 + (Math.random() - 0.5) * 0.5 };
      const existing = venuePins.get(t.venue) || { ...coords, tournaments: [] };
      venuePins.set(t.venue, { ...existing, tournaments: [...existing.tournaments, t] });
    });
    return Array.from(venuePins.entries());
  }, [filteredTournaments]);

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
          <button onClick={() => setIsLogOpen(!isLogOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors text-xs font-semibold uppercase tracking-wider">
            <Terminal size={14} className={logs.some(l => l.type === 'error') ? 'text-rose-300' : 'text-emerald-300'} />
            System logs ({logs.length})
          </button>
        </div>
        
        {/* Navigation */}
        <div className="bg-emerald-800/50 backdrop-blur-md border-t border-emerald-600/30 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto flex">
            <TabButton active={activeTab === AppTab.WELCOME} onClick={() => setActiveTab(AppTab.WELCOME)} icon={<FileText size={16} />} label="1. Upload" />
            <TabButton active={activeTab === AppTab.TOURNAMENTS} onClick={() => setActiveTab(AppTab.TOURNAMENTS)} icon={<Table size={16} />} label="2. All Events" disabled={tournaments.length === 0} />
            <TabButton active={activeTab === AppTab.MAP} onClick={() => setActiveTab(AppTab.MAP)} icon={<MapIcon size={16} />} label="3. Sussex Map" disabled={tournaments.length === 0} />
            <TabButton active={activeTab === AppTab.VISUALIZATION} onClick={() => setActiveTab(AppTab.VISUALIZATION)} icon={<Globe size={16} />} label="4. Club Export" disabled={tournaments.length === 0} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {activeTab === AppTab.WELCOME && (
          <div className="max-w-3xl mx-auto mt-8 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="p-10 md:p-16 text-center">
                <h2 className="text-4xl font-black mb-4 text-slate-800 tracking-tight">Hi Conrad!</h2>
                <p className="text-lg text-slate-600 mb-10 max-w-lg mx-auto leading-relaxed">Please upload a pdf of LTA tournaments to populate the Sussex portal.</p>
                <div className="relative group">
                  <input type="file" accept=".pdf" onChange={handleFileUpload} disabled={isProcessing} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`p-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-6 ${isProcessing ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-slate-200 group-hover:border-emerald-500 shadow-sm'}`}>
                    <div className={`p-6 rounded-full ${isProcessing ? 'bg-emerald-500 text-white animate-bounce' : 'bg-emerald-100 text-emerald-600 transition-colors'}`}><FileText size={48} /></div>
                    <p className="text-xl font-bold text-slate-700">{isProcessing ? 'Processing PDF...' : 'Click to Upload PDF'}</p>
                    {isProcessing && <div className="w-full max-w-xs bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2"><div className="h-full bg-emerald-500 animate-progress"></div></div>}
                  </div>
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
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                    <th className="px-6 py-4">Name / Category</th>
                    <th className="px-6 py-4">Gender</th>
                    <th className="px-6 py-4 text-center">Type</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-center">Grade</th>
                    <th className="px-6 py-4">Venue</th>
                    <th className="px-6 py-4 text-center">Entry</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTournaments.map(t => (
                    <tr key={t.id} className="hover:bg-emerald-50/30 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800">{t.title}</div>
                        <div className="text-[10px] text-emerald-600 font-mono mt-0.5">{t.ltaCode} • {t.category}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${t.gender === 'Mixed' ? 'bg-amber-100 text-amber-700' : t.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'}`}>{t.gender}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded text-[9px] font-black text-slate-500 uppercase">{t.eventType}</span>
                      </td>
                      <td className="px-6 py-5 font-semibold text-slate-700 whitespace-nowrap">{t.date}</td>
                      <td className="px-6 py-5 text-center font-black text-slate-400">{t.grade}</td>
                      <td className="px-6 py-5">
                        {/* Fix: Postcode removed from venue column as requested */}
                        <div className="font-semibold text-slate-700">{t.venue}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <a 
                          href={getLTALink(t)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-emerald-600 transition-all inline-block shadow-lg shadow-slate-200"
                        >
                          <ExternalLink size={16} />
                        </a>
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

        {activeTab === AppTab.MAP && (
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[700px] animate-in fade-in">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Sussex Venue Pins</h3>
                <p className="text-xs text-slate-500 font-medium">Interactive visualization of all {filteredTournaments.length} events</p>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="text-[10px] font-bold text-slate-500">Club Venues</span>
                 </div>
              </div>
            </div>
            
            <div className="flex-1 relative bg-slate-100 overflow-hidden flex items-center justify-center p-10">
              {/* Stylized Sussex Map SVG Background */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"></div>
              
              <div className="relative w-full h-full max-w-4xl max-h-[500px] border-4 border-white shadow-2xl rounded-3xl bg-white overflow-hidden group">
                {/* Simulated Sussex Shape */}
                <div className="absolute inset-0 bg-emerald-50/50">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[70%] bg-emerald-100/40 rounded-[100px_60px_140px_40px] rotate-2 blur-3xl"></div>
                </div>
                
                {/* Rendered Pins */}
                {mapData.map(([name, data], idx) => {
                  // Project Lat/Lng to X/Y within the stylized box
                  // Approx Sussex Bounds: Lat 50.7 to 51.1, Lng -1.0 to 0.6
                  const normX = ((data.lng + 0.8) / 1.5) * 100;
                  const normY = (1 - (data.lat - 50.7) / 0.4) * 100;
                  
                  return (
                    <div 
                      key={name} 
                      className="absolute group/pin cursor-pointer transition-all hover:z-50"
                      style={{ left: `${normX}%`, top: `${normY}%`, transform: 'translate(-50%, -100%)' }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="bg-slate-900 text-white text-[8px] font-bold px-2 py-0.5 rounded-full mb-1 opacity-0 group-hover/pin:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                          {name} ({data.tournaments.length})
                        </div>
                        <div className="relative">
                          <MapPin size={24} className="text-emerald-600 drop-shadow-md group-hover/pin:scale-125 transition-transform" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[70%] w-5 h-5 bg-emerald-200 rounded-full animate-ping opacity-20"></div>
                        </div>
                      </div>
                      
                      {/* Tooltip Popup */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 opacity-0 pointer-events-none group-hover/pin:opacity-100 group-hover/pin:pointer-events-auto transition-all p-4 z-50">
                        <h5 className="font-black text-slate-800 text-xs mb-3 border-b border-slate-100 pb-2">{name}</h5>
                        <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                          {data.tournaments.slice(0, 5).map(t => (
                            <div key={t.id} className="flex justify-between items-center gap-2">
                              <div className="min-w-0">
                                <div className="text-[10px] font-bold text-slate-700 truncate">{t.title}</div>
                                <div className="text-[8px] text-slate-400">{t.date}</div>
                              </div>
                              <a href={getLTALink(t)} target="_blank" className="text-emerald-600 hover:text-emerald-800 transition-colors"><ExternalLink size={12}/></a>
                            </div>
                          ))}
                          {data.tournaments.length > 5 && <div className="text-[8px] text-center text-slate-400 font-bold">+{data.tournaments.length - 5} more events</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend/Hint */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-6 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-4">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <Info size={14} className="text-emerald-500" />
                   Hover over pins to see events for each venue
                 </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === AppTab.VISUALIZATION && (
          <div className="max-w-4xl mx-auto mb-24 animate-in fade-in">
             <div className="bg-white shadow-2xl rounded-sm border border-slate-200 overflow-hidden font-serif">
                <div className="h-[350px] relative bg-slate-900">
                  <img src="https://images.unsplash.com/photo-1595435066311-6652496a7ca2?auto=format&fit=crop&q=80&w=1600" className="w-full h-full object-cover opacity-60 mix-blend-overlay" alt="Tennis" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                    <div className="bg-emerald-500 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] mb-4 shadow-xl">Sussex Fixtures</div>
                    <h1 className="text-white text-5xl md:text-6xl font-bold leading-tight mb-4 drop-shadow-2xl">St Ann’s Tournament Feed</h1>
                    <div className="w-20 h-1 bg-white"></div>
                  </div>
                </div>

                <div className="p-10 md:p-20 space-y-12">
                  <div className="space-y-0 divide-y divide-slate-100">
                    {stAnnsTournaments.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 font-sans border-2 border-dashed border-slate-100 rounded-3xl">
                        <Info className="mx-auto mb-3 opacity-30" size={40} />
                        <p className="text-lg italic">No St Ann's fixtures matching filters.</p>
                      </div>
                    ) : (
                      stAnnsTournaments.map(t => (
                        <div key={t.id} className="group py-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:translate-x-2">
                           <div className="space-y-1.5 font-sans">
                             <div className="flex items-center gap-2">
                               <span className="text-emerald-600 font-bold text-[10px] tracking-widest uppercase">{t.date}</span>
                               <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                               <span className="text-slate-400 text-[10px] font-bold uppercase">{t.grade}</span>
                               <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded font-bold uppercase">{t.gender}</span>
                               <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] rounded font-bold uppercase">{t.eventType}</span>
                             </div>
                             <h3 className="text-3xl font-serif text-slate-800 group-hover:text-emerald-700 transition-colors">{t.title}</h3>
                             <p className="text-slate-400 text-xs flex items-center gap-1.5"><MapPin size={12} className="text-emerald-500" /> St Ann's Wells Tennis Club • {t.category}</p>
                           </div>
                           <div className="flex items-center gap-3 font-sans shrink-0">
                             {t.organiserEmail && (
                               <a href={`mailto:${t.organiserEmail}`} className="bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 p-3.5 rounded-xl border border-slate-100 transition-all"><Mail size={18} /></a>
                             )}
                             <a 
                               href={getLTALink(t)}
                               target="_blank"
                               rel="noopener noreferrer"
                               className="bg-slate-900 text-white px-7 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                             >
                               ENTER <ChevronRight size={14} />
                             </a>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
             </div>
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

export default App;
