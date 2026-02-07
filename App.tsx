import React, { useState } from 'react';
import { IoTProvider, useIoT } from './context/IoTContext';
import Layout from './components/Layout';
import DeviceCard from './components/DeviceCard';
import AIChat from './components/AIChat';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Cell } from 'recharts';
import { Terminal, Save, Key, Server, Zap, Clock, Plus, Trash2, Play, Wifi, RefreshCw, Smartphone, ChevronRight, Droplets, Wind } from 'lucide-react';
import { View, DeviceType } from './types';
import { triggerDeviceWebhook } from './services/iotService';

// --- Dashboard View ---
const DashboardView: React.FC = () => {
  const { devices, toggleDevice, renameDevice, logs, schedules, cancelSchedule, saveConfiguration, refreshAllDevices, isRefreshing } = useIoT();
  const [activeTab, setActiveTab] = useState('All');
  
  const rooms = Array.from(new Set(devices.map(d => d.room)));
  const tabs = ['All', ...rooms];
  
  const filteredDevices = activeTab === 'All' 
    ? devices 
    : devices.filter(d => d.room === activeTab);

  const activeCount = devices.filter(d => d.isOn && d.type !== 'sensor').length;
  const sensorCount = devices.filter(d => d.type === 'sensor').length;

  return (
    <div className="space-y-8 pb-10">
      
      {/* Smart Header */}
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Hello, User <span className="animate-wave inline-block">👋</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
               Your home is <span className="text-green-500 font-bold">Online</span>. 
               <span className="ml-2 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded-md text-xs font-bold border border-brand-100 dark:border-brand-800">
                 {activeCount} Active
               </span>
            </p>
          </div>
          
          <div className="flex gap-3">
             <button 
               onClick={refreshAllDevices}
               disabled={isRefreshing}
               className={`
                  w-12 h-12 flex items-center justify-center rounded-2xl border transition-all duration-300
                  ${isRefreshing 
                    ? 'bg-brand-50 border-brand-200 text-brand-600' 
                    : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:scale-105 hover:shadow-lg'}
               `}
             >
                <RefreshCw size={22} className={isRefreshing ? "animate-spin" : ""} />
             </button>
          </div>
        </div>

        {/* Futuristic Tab Selector */}
        <div className="overflow-x-auto scrollbar-hide py-2 -mx-5 px-5 lg:mx-0 lg:px-0">
          <div className="flex gap-3 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  relative px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300
                  ${activeTab === tab 
                    ? 'text-white shadow-lg shadow-brand-500/25 scale-105' 
                    : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10'}
                `}
              >
                {activeTab === tab && (
                  <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-500 rounded-2xl -z-10 animate-fade-in" />
                )}
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredDevices.map(device => (
          <DeviceCard 
            key={device.id} 
            device={device} 
            onToggle={toggleDevice} 
            onRename={renameDevice}
          />
        ))}
        {filteredDevices.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 bg-white/50 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
             <Smartphone size={48} className="mb-4 opacity-50" strokeWidth={1.5} />
             <p className="font-semibold text-lg">No devices found in {activeTab}</p>
          </div>
        )}
      </div>

      {/* Modern Schedule List */}
      {schedules.length > 0 && (
         <div className="space-y-4">
           <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-xl">
             <Clock size={24} className="text-brand-500" />
             Queued Actions
           </h3>
           <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
             {schedules.map(sch => {
                const diff = new Date(sch.executeAt).getTime() - Date.now();
                if (diff < 0) return null;
                const minutes = Math.floor((diff % 3600000) / 60000);
                
                return (
                  <div key={sch.id} className="group flex items-center justify-between p-5 bg-white dark:bg-white/5 backdrop-blur-md rounded-3xl border border-gray-100 dark:border-white/10 hover:border-brand-200 dark:hover:border-brand-800 transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sch.action === 'ON' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-red-100 dark:bg-red-900/30 text-red-600'}`}>
                        <Clock size={22} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white">{sch.deviceName}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                           Action: <span className={sch.action === 'ON' ? 'text-green-500' : 'text-red-500'}>{sch.action}</span> in {minutes}m
                        </p>
                      </div>
                    </div>
                    <button onClick={() => cancelSchedule(sch.id)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                )
             })}
           </div>
         </div>
      )}

      {/* Minimal Log */}
      {logs.length > 0 && (
        <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-200 dark:border-white/10 overflow-hidden">
           <div className="p-5 border-b border-gray-100 dark:border-white/5 flex items-center gap-2">
              <Terminal size={18} className="text-gray-400" /> 
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">System Stream</span>
           </div>
           <div className="p-2 max-h-40 overflow-y-auto">
             {logs.slice(0, 10).map(log => (
               <div key={log.id} className="flex gap-3 px-3 py-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                  <span className="opacity-50">{log.timestamp}</span>
                  <span className={log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-500' : ''}>
                    {log.message}
                  </span>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};

// --- Analytics View ---
const AnalyticsView: React.FC = () => {
  const { devices } = useIoT();
  const usageData = [
    { name: 'Mon', usage: 12 }, { name: 'Tue', usage: 18 }, { name: 'Wed', usage: 11 }, 
    { name: 'Thu', usage: 15 }, { name: 'Fri', usage: 22 }, { name: 'Sat', usage: 28 }, { name: 'Sun', usage: 16 },
  ];

  return (
    <div className="space-y-6 pb-24">
       <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Energy Monitor</h1>
       
       {/* Featured Insights - Widget Scroll Snap */}
       <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:mx-0 lg:px-0 lg:overflow-visible scroll-snap-x">
          
          <div className="min-w-[85vw] lg:min-w-0 snap-center bg-gradient-to-br from-brand-500 to-indigo-600 p-6 rounded-[2rem] text-white shadow-2xl shadow-brand-500/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"><Zap size={24} fill="currentColor" /></div>
                  <span className="text-xs font-bold bg-black/20 px-3 py-1 rounded-full border border-white/10">+12% vs last week</span>
               </div>
               <h3 className="text-5xl font-black mb-1">142<span className="text-2xl opacity-60">kWh</span></h3>
               <p className="text-brand-100 text-sm font-medium">Total Consumption</p>
             </div>
          </div>
          
          <div className="min-w-[40vw] snap-center bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 flex flex-col justify-between">
             <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl w-fit mb-4"><Clock size={24} /></div>
             <div>
               <h3 className="text-2xl font-bold text-gray-900 dark:text-white">8h 42m</h3>
               <p className="text-gray-500 text-xs mt-1">Avg Daily Runtime</p>
             </div>
          </div>

          <div className="min-w-[40vw] snap-center bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/10 flex flex-col justify-between">
             <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl w-fit mb-4"><Droplets size={24} /></div>
             <div>
               <h3 className="text-2xl font-bold text-gray-900 dark:text-white">$-.--</h3>
               <p className="text-gray-500 text-xs mt-1">Cost Efficiency</p>
             </div>
          </div>
       </div>

       {/* Chart Section */}
       <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-gray-100 dark:border-white/10">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-gray-900 dark:text-white">Weekly Usage</h3>
             <select className="bg-gray-100 dark:bg-white/10 border-none rounded-lg text-xs p-2 outline-none dark:text-white">
               <option>This Week</option>
               <option>Last Week</option>
             </select>
          </div>
          <div className="h-64 w-full text-xs">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={usageData}>
                  <defs>
                    <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.1} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill: '#9CA3AF'}} dy={10} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', background: 'rgba(255,255,255,0.9)', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)' }} 
                    itemStyle={{ color: '#000' }}
                  />
                  <Area type="monotone" dataKey="usage" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
};

// --- Settings View ---
const SettingsView: React.FC = () => {
  const { devices, updateDevice, addDevice, deleteDevice, saveConfiguration, addLog } = useIoT();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({ name: '', room: '', type: 'light' as DeviceType, webhookUrl: '', statusUrl: '' });

  const handleAddDevice = () => {
    if (newDevice.name && newDevice.room) {
      addDevice(newDevice);
      setNewDevice({ name: '', room: '', type: 'light' as DeviceType, webhookUrl: '', statusUrl: '' });
      setShowAddForm(false);
    }
  };

  const handleTestWebhook = async (device: any) => {
    if (!device.webhookUrl) {
      alert("Please configure a Webhook URL first.");
      return;
    }
    addLog(`Testing ${device.name}...`, 'info');
    const result = await triggerDeviceWebhook(device, 'ON');
    alert(result.success ? "✅ Success!" : "❌ Failed: " + result.message);
  };

  return (
    <div className="space-y-6 pb-24">
       <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Configuration</h1>

       {/* Add Device Button (Hero) */}
       <button 
         onClick={() => setShowAddForm(!showAddForm)}
         className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-transform"
       >
          <Plus size={20} />
          {showAddForm ? 'Cancel Adding' : 'Add New Device'}
       </button>

       {/* Add Form (Animated Modal-ish) */}
       {showAddForm && (
         <div className="bg-white dark:bg-white/5 p-6 rounded-[2rem] border border-brand-200 dark:border-brand-500/30 shadow-2xl shadow-brand-500/10 animate-fade-in-up space-y-4">
            <h3 className="font-bold text-gray-900 dark:text-white">New Device Details</h3>
            <input 
              className="w-full p-4 rounded-xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
              placeholder="Device Name"
              value={newDevice.name}
              onChange={e => setNewDevice({...newDevice, name: e.target.value})}
            />
            <div className="flex gap-3">
              <input 
                className="flex-1 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
                placeholder="Room Name"
                value={newDevice.room}
                onChange={e => setNewDevice({...newDevice, room: e.target.value})}
              />
              <select 
                className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
                value={newDevice.type}
                onChange={e => setNewDevice({...newDevice, type: e.target.value as DeviceType})}
              >
                <option value="light">Light</option>
                <option value="fan">Fan</option>
                <option value="outlet">Outlet</option>
                <option value="sensor">Sensor</option>
              </select>
            </div>
            <input 
                className="w-full p-4 rounded-xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white font-mono text-xs"
                placeholder="Webhook URL (Make.com)"
                value={newDevice.webhookUrl}
                onChange={e => setNewDevice({...newDevice, webhookUrl: e.target.value})}
            />
             <input 
                className="w-full p-4 rounded-xl bg-gray-50 dark:bg-white/5 border-none focus:ring-2 focus:ring-brand-500 outline-none text-gray-900 dark:text-white font-mono text-xs"
                placeholder="Status URL (Optional)"
                value={newDevice.statusUrl}
                onChange={e => setNewDevice({...newDevice, statusUrl: e.target.value})}
            />
            <button onClick={handleAddDevice} className="w-full py-4 bg-brand-600 text-white font-bold rounded-xl shadow-lg">Save Device</button>
         </div>
       )}

       <div className="space-y-4">
         {devices.map((device) => (
           <div key={device.id} className="bg-white dark:bg-white/5 p-5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                       {device.type === 'light' ? <Zap size={18} /> : <Server size={18} />}
                    </div>
                    <div>
                       <h4 className="font-bold text-gray-900 dark:text-white">{device.name}</h4>
                       <p className="text-xs text-gray-500">{device.room} • {device.type}</p>
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button onClick={() => handleTestWebhook(device)} className="p-2 text-brand-500 bg-brand-50 dark:bg-brand-900/20 rounded-lg hover:bg-brand-100"><Play size={18} /></button>
                    <button onClick={() => deleteDevice(device.id)} className="p-2 text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100"><Trash2 size={18} /></button>
                 </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-black/20 p-3 rounded-xl space-y-2">
                 <div className="flex items-center gap-2">
                    <Wifi size={14} className="text-gray-400" />
                    <input 
                      className="bg-transparent w-full text-xs font-mono outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400"
                      placeholder="Webhook URL..."
                      value={device.webhookUrl}
                      onChange={(e) => updateDevice(device.id, { webhookUrl: e.target.value })}
                    />
                 </div>
                 <div className="w-full h-[1px] bg-gray-200 dark:bg-white/10"></div>
                 <div className="flex items-center gap-2">
                    <RefreshCw size={14} className="text-gray-400" />
                    <input 
                      className="bg-transparent w-full text-xs font-mono outline-none text-gray-600 dark:text-gray-400 placeholder-gray-400"
                      placeholder="Status URL..."
                      value={device.statusUrl}
                      onChange={(e) => updateDevice(device.id, { statusUrl: e.target.value })}
                    />
                 </div>
              </div>
           </div>
         ))}
       </div>

       <div className="h-20"></div> {/* Spacer for bottom nav */}
    </div>
  );
};

// --- Main App Component ---
const AppContent: React.FC = () => {
  const { isLoading } = useIoT();
  const [currentView, setCurrentView] = useState<View>('dashboard');

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F2F4F8] dark:bg-black">
        <div className="relative">
           <div className="w-20 h-20 border-4 border-brand-200 dark:border-white/10 rounded-full"></div>
           <div className="absolute top-0 left-0 w-20 h-20 border-4 border-t-brand-500 rounded-full animate-spin"></div>
        </div>
        <h2 className="mt-6 text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Nexus</h2>
      </div>
    );
  }

  return (
    <Layout currentView={currentView} onNavigate={setCurrentView}>
      {currentView === 'dashboard' && <DashboardView />}
      {currentView === 'analytics' && <AnalyticsView />}
      {currentView === 'settings' && <SettingsView />}
      <AIChat />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <IoTProvider>
      <AppContent />
    </IoTProvider>
  );
};

export default App;