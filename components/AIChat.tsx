import React, { useState } from 'react';
import { Send, Sparkles, Loader2, Bot, X } from 'lucide-react';
import { useIoT } from '../context/IoTContext';
import { parseNaturalLanguageCommand } from '../services/geminiService';

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { devices, toggleDevice, addLog } = useIoT();

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);
    addLog(`AI Processing: "${query}"`, 'info');

    const result = await parseNaturalLanguageCommand(query, devices);

    if (result.success && result.actions) {
      addLog(`AI: ${result.responseMessage}`, 'success');
      for (const action of result.actions) {
        const device = devices.find(d => d.id === action.deviceId);
        if (device && device.isOn !== action.turnOn) {
          await toggleDevice(action.deviceId);
        }
      }
      setQuery('');
      // Optional: Close on success after delay? No, let user see feedback.
    } else {
      addLog(`AI Error: ${result.responseMessage}`, 'error');
    }

    setIsProcessing(false);
  };

  return (
    <>
      {/* Floating Action Button - Positioned higher for mobile bottom nav */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-24 lg:bottom-10 right-5 lg:right-10 z-50 
          w-14 h-14 rounded-full shadow-xl shadow-brand-500/30 
          flex items-center justify-center transition-all duration-300
          ${isOpen ? 'bg-white text-gray-800 scale-90 rotate-90 ring-2 ring-gray-200' : 'bg-brand-600 hover:bg-brand-700 text-white hover:scale-110'}
        `}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window Overlay */}
      {isOpen && (
        <>
          {/* Backdrop for mobile focus */}
          <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
          
          <div className={`
            fixed bottom-40 lg:bottom-28 right-4 lg:right-10 
            w-[calc(100%-2rem)] sm:w-96 
            bg-white dark:bg-dark-card rounded-2xl shadow-2xl z-50 
            border border-gray-100 dark:border-gray-700 
            flex flex-col overflow-hidden animate-fade-in-up
          `}>
            <div className="bg-brand-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-1.5 bg-white/20 rounded-lg">
                    <Bot size={20} className="text-white" />
                 </div>
                 <div>
                    <h3 className="text-white font-bold text-sm">Nexus Assistant</h3>
                    <p className="text-brand-100 text-xs">Powered by Gemini</p>
                 </div>
              </div>
            </div>

            <div className="p-4 flex-1 bg-gray-50 dark:bg-gray-900 min-h-[200px] max-h-[50vh] overflow-y-auto text-sm">
               <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none mb-4 shadow-sm border border-gray-100 dark:border-gray-700 inline-block max-w-[90%]">
                 <p className="text-gray-700 dark:text-gray-200">
                   Hi! Control your {devices.length} devices naturally. Try saying:
                 </p>
               </div>

               {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={() => setQuery("Turn on everything")} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full text-xs text-gray-600 dark:text-gray-300 hover:border-brand-500 transition-colors">
                  💡 Turn on everything
                </button>
                <button onClick={() => setQuery("Movie mode")} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full text-xs text-gray-600 dark:text-gray-300 hover:border-brand-500 transition-colors">
                  🎬 Movie mode
                </button>
                <button onClick={() => setQuery("Good night")} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-full text-xs text-gray-600 dark:text-gray-300 hover:border-brand-500 transition-colors">
                  🌙 Good night
                </button>
              </div>

              {isProcessing && (
                <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 animate-pulse mt-4 bg-brand-50 dark:bg-brand-900/20 p-2 rounded-lg w-fit">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs font-medium">Processing...</span>
                </div>
              )}
            </div>

            <form onSubmit={handleCommand} className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-dark-card flex items-center gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command..."
                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                disabled={isProcessing}
                autoFocus
              />
              <button 
                type="submit" 
                disabled={isProcessing || !query.trim()}
                className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
};

export default AIChat;