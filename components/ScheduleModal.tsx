import React, { useState } from 'react';
import { Device } from '../types';
import { Clock, Check, X, Timer } from 'lucide-react';

interface ScheduleModalProps {
  device: Device;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (mode: 'delay' | 'duration', action: 'ON' | 'OFF', seconds: number) => void;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({ device, isOpen, onClose, onSchedule }) => {
  const [activeTab, setActiveTab] = useState<'delay' | 'duration'>('delay');
  
  // Digital time state
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(1); // Default 1 min
  const [seconds, setSeconds] = useState(0);

  const [targetAction, setTargetAction] = useState<'ON' | 'OFF'>('OFF');

  if (!isOpen) return null;

  const handleConfirm = () => {
    const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;
    if (totalSeconds > 0) {
      onSchedule(activeTab, targetAction, totalSeconds);
      onClose();
    }
  };

  // Helper to handle input change securely
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string, max: number) => {
    let num = parseInt(value) || 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    setter(num);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Header */}
        <div className="bg-brand-600 p-4 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Timer size={20} />
            <h3 className="font-bold">Schedule: {device.name}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-brand-700 p-1 rounded-full"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
           <button 
             onClick={() => { setActiveTab('duration'); setTargetAction('OFF'); }}
             className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'duration' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 border-b-2 border-brand-500' : 'text-gray-500 dark:text-gray-400'}`}
           >
             Run For...
           </button>
           <button 
             onClick={() => { setActiveTab('delay'); setTargetAction(device.isOn ? 'OFF' : 'ON'); }}
             className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'delay' ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 border-b-2 border-brand-500' : 'text-gray-500 dark:text-gray-400'}`}
           >
             Start/Stop Later
           </button>
        </div>

        <div className="p-6 space-y-6">
          
          {/* Explanation */}
          <div className="text-center">
             {activeTab === 'duration' ? (
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                   Device will turn <strong className="text-green-500">ON</strong> now, and turn <strong className="text-red-500">OFF</strong> automatically after:
                </p>
             ) : (
                <div className="flex items-center justify-center gap-2 mb-2">
                   <span className="text-sm text-gray-500">Action:</span>
                   <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                      <button 
                        onClick={() => setTargetAction('ON')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetAction === 'ON' ? 'bg-white dark:bg-gray-600 text-green-500 shadow' : 'text-gray-400'}`}
                      >
                        TURN ON
                      </button>
                      <button 
                        onClick={() => setTargetAction('OFF')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${targetAction === 'OFF' ? 'bg-white dark:bg-gray-600 text-red-500 shadow' : 'text-gray-400'}`}
                      >
                        TURN OFF
                      </button>
                   </div>
                   <span className="text-sm text-gray-500">in:</span>
                </div>
             )}
          </div>

          {/* Digital Time Inputs */}
          <div className="flex items-center justify-center gap-2">
             {/* Hours */}
             <div className="flex flex-col items-center">
               <input 
                 type="number" 
                 value={hours}
                 onChange={(e) => handleInputChange(setHours, e.target.value, 23)}
                 className="w-16 h-16 text-center text-3xl font-bold bg-gray-100 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                 placeholder="00"
               />
               <span className="text-xs text-gray-500 mt-1 uppercase">Hours</span>
             </div>
             
             <span className="text-2xl font-bold text-gray-400 -mt-5">:</span>

             {/* Minutes */}
             <div className="flex flex-col items-center">
               <input 
                 type="number" 
                 value={minutes}
                 onChange={(e) => handleInputChange(setMinutes, e.target.value, 59)}
                 className="w-16 h-16 text-center text-3xl font-bold bg-gray-100 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                 placeholder="00"
               />
               <span className="text-xs text-gray-500 mt-1 uppercase">Mins</span>
             </div>

             <span className="text-2xl font-bold text-gray-400 -mt-5">:</span>

             {/* Seconds */}
             <div className="flex flex-col items-center">
               <input 
                 type="number" 
                 value={seconds}
                 onChange={(e) => handleInputChange(setSeconds, e.target.value, 59)}
                 className="w-16 h-16 text-center text-3xl font-bold bg-gray-100 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                 placeholder="00"
               />
               <span className="text-xs text-gray-500 mt-1 uppercase">Secs</span>
             </div>
          </div>
          
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-lg shadow-brand-500/30 transition-all transform hover:scale-105"
          >
            Start Timer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;