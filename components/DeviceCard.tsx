import React, { useState, useEffect } from 'react';
import { Device } from '../types';
import { Power, Fan, Lightbulb, Plug, Thermometer, WifiOff, Edit2, Check, X, Clock, Timer, MoreVertical } from 'lucide-react';
import { useIoT } from '../context/IoTContext';
import ScheduleModal from './ScheduleModal';

interface DeviceCardProps {
  device: Device;
  onToggle: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onToggle, onRename }) => {
  const { schedules, addSchedule, cancelSchedule, toggleDevice } = useIoT();
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(device.name);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const activeSchedule = schedules.find(s => s.deviceId === device.id);

  // Timer logic for countdown
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (activeSchedule) {
      const updateTimer = () => {
        const diff = new Date(activeSchedule.executeAt).getTime() - Date.now();
        if (diff <= 0) {
          setTimeLeft("00:00:00");
          return;
        }
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSchedule]);

  const handleRename = () => {
    if (tempName.trim()) onRename(device.id, tempName);
    setIsEditing(false);
  };

  const handleScheduleConfirm = (mode: 'delay' | 'duration', action: 'ON' | 'OFF', seconds: number) => {
    if (mode === 'duration') {
      if (!device.isOn) toggleDevice(device.id, true);
      addSchedule(device.id, 'OFF', seconds);
    } else {
      addSchedule(device.id, action, seconds);
    }
  };

  // --- STYLING LOGIC ---
  const isSensor = device.type === 'sensor';
  const isOn = device.isOn;

  // Dynamic Styles based on Type & State
  const getCardStyles = () => {
    if (isSensor) return "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10";
    if (isOn) {
      switch (device.type) {
        case 'light': return "bg-amber-400 dark:bg-amber-500 border-amber-400 text-white shadow-xl shadow-amber-500/30";
        case 'fan': return "bg-sky-400 dark:bg-sky-500 border-sky-400 text-white shadow-xl shadow-sky-500/30";
        case 'outlet': return "bg-emerald-500 dark:bg-emerald-600 border-emerald-500 text-white shadow-xl shadow-emerald-500/30";
        default: return "bg-brand-500 border-brand-500 text-white shadow-xl shadow-brand-500/30";
      }
    }
    return "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20";
  };

  const getIcon = () => {
    const iconClass = `transition-all duration-500 ${isOn && device.type === 'fan' ? 'animate-spin-slow' : ''}`;
    switch (device.type) {
      case 'fan': return <Fan size={24} className={iconClass} />;
      case 'outlet': return <Plug size={24} className={iconClass} />;
      case 'sensor': return <Thermometer size={24} className={iconClass} />;
      default: return <Lightbulb size={24} className={iconClass} />;
    }
  };

  return (
    <>
      <div 
        className={`
          relative group overflow-hidden rounded-[2rem] border transition-all duration-300 ease-out
          ${getCardStyles()}
          ${isSensor ? '' : 'cursor-pointer active:scale-95'}
          h-44 flex flex-col justify-between p-5
        `}
        onClick={() => !isSensor && !isEditing && onToggle(device.id)}
      >
        {/* Background Gradient Effect for Depth */}
        {!isOn && !isSensor && (
           <div className="absolute inset-0 bg-gradient-to-br from-transparent to-gray-50/50 dark:to-white/5 pointer-events-none" />
        )}

        {/* Top Row: Icon & Context Menu */}
        <div className="flex justify-between items-start z-10">
          <div className={`
            p-3 rounded-full transition-all duration-300
            ${isOn && !isSensor ? 'bg-white/20 backdrop-blur-sm text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300'}
          `}>
            {getIcon()}
          </div>
          
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
             {activeSchedule && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/20 text-white text-[10px] font-mono backdrop-blur-md border border-white/10">
                   <Clock size={10} />
                   {timeLeft}
                   <button onClick={() => cancelSchedule(activeSchedule.id)} className="ml-1 hover:text-red-300"><X size={10} /></button>
                </div>
             )}
             
             {!isSensor && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowScheduleModal(true); }}
                className={`p-2 rounded-full transition-colors ${isOn ? 'text-white/70 hover:bg-white/20 hover:text-white' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10'}`}
              >
                <MoreVertical size={18} />
              </button>
             )}
          </div>
        </div>

        {/* Bottom Row: Name & State */}
        <div className="z-10 relative">
          {isEditing ? (
             <div className="flex items-center bg-white/90 rounded-xl p-1 mb-2 shadow-lg" onClick={(e) => e.stopPropagation()}>
               <input 
                 autoFocus
                 className="w-full bg-transparent border-none text-gray-900 text-sm font-semibold px-2 focus:ring-0"
                 value={tempName}
                 onChange={(e) => setTempName(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleRename()}
               />
               <button onClick={handleRename} className="p-1 text-green-600"><Check size={16} /></button>
             </div>
          ) : (
            <div className="flex justify-between items-end">
               <div className="flex-1 pr-2">
                 <h3 
                   className={`text-lg font-bold leading-tight truncate ${isOn && !isSensor ? 'text-white' : 'text-gray-800 dark:text-white'}`}
                   onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                 >
                   {device.name}
                 </h3>
                 <p className={`text-xs font-medium mt-1 truncate ${isOn && !isSensor ? 'text-white/80' : 'text-gray-400'}`}>
                   {device.room}
                 </p>
               </div>
               
               {/* State Indicator / Sensor Value */}
               {isSensor ? (
                 <div className="text-right">
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">{device.value}</span>
                    <span className="text-xs text-gray-400 block">{device.unit}</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-end gap-1">
                   <span className={`text-xs font-bold tracking-wider uppercase ${isOn ? 'text-white/90' : 'text-gray-400'}`}>
                      {isOn ? 'On' : 'Off'}
                   </span>
                   {/* Custom Toggle Switch Visual */}
                   <div className={`
                      w-10 h-6 rounded-full p-1 transition-colors duration-300
                      ${isOn ? 'bg-white/30' : 'bg-gray-200 dark:bg-white/10'}
                   `}>
                      <div className={`
                        w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300
                        ${isOn ? 'translate-x-4' : 'translate-x-0'}
                      `} />
                   </div>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>

      <ScheduleModal 
        isOpen={showScheduleModal} 
        onClose={() => setShowScheduleModal(false)}
        device={device}
        onSchedule={handleScheduleConfirm}
      />
    </>
  );
};

export default DeviceCard;