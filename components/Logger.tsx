
import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal, Copy, Trash2, X } from 'lucide-react';

interface LoggerProps {
  logs: LogEntry[];
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Logger: React.FC<LoggerProps> = ({ logs, onClear, isOpen, onClose }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('Logs copied to clipboard');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[500px] h-[400px] bg-slate-900 text-slate-100 shadow-2xl flex flex-col z-50 rounded-tl-xl overflow-hidden border-l border-t border-slate-700">
      <div className="p-3 bg-slate-800 flex justify-between items-center border-b border-slate-700">
        <div className="flex items-center gap-2 font-mono text-sm font-bold">
          <Terminal size={16} className="text-emerald-400" />
          SYSTEM LOGS
        </div>
        <div className="flex items-center gap-3">
          <button onClick={copyLogs} title="Copy Logs" className="hover:text-emerald-400 transition-colors">
            <Copy size={16} />
          </button>
          <button onClick={onClear} title="Clear Logs" className="hover:text-rose-400 transition-colors">
            <Trash2 size={16} />
          </button>
          <button onClick={onClose} title="Close" className="hover:text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
        {logs.length === 0 && <div className="text-slate-500 italic">No events logged yet...</div>}
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-slate-500 shrink-0">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
            <span className={`
              ${log.type === 'error' ? 'text-rose-400' : ''}
              ${log.type === 'success' ? 'text-emerald-400' : ''}
              ${log.type === 'warning' ? 'text-amber-400' : ''}
              ${log.type === 'info' ? 'text-sky-400' : ''}
            `}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Logger;
