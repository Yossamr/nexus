import React from 'react';
import { Home, Settings, Activity, Sun, Moon, Zap } from 'lucide-react';
import { View } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  onNavigate: (view: View) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isDark, setIsDark] = React.useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const navItems: { id: View; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <Home size={22} strokeWidth={2.5} />, label: "Home" },
    { id: 'analytics', icon: <Activity size={22} strokeWidth={2.5} />, label: "Stats" },
    { id: 'settings', icon: <Settings size={22} strokeWidth={2.5} />, label: "Setup" },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F2F4F8] dark:bg-[#09090b] transition-colors duration-500 pb-28 lg:pb-0 overflow-x-hidden selection:bg-brand-500 selection:text-white">
      
      {/* DESKTOP SIDEBAR (Futuristic Glass) */}
      <aside className={`
        hidden lg:flex flex-col w-72 h-screen sticky top-0
        bg-white/80 dark:bg-black/40 backdrop-blur-2xl border-r border-white/20 dark:border-white/10
      `}>
        <div className="p-8 flex items-center gap-4">
           <div className="relative">
             <div className="absolute inset-0 bg-brand-500 blur-lg opacity-40 rounded-full"></div>
             <div className="relative w-12 h-12 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
               <Zap size={24} fill="currentColor" />
             </div>
           </div>
           <div>
             <h1 className="font-bold text-2xl tracking-tight text-gray-900 dark:text-white">Nexus</h1>
             <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Smart Home</p>
           </div>
        </div>

        <nav className="flex-1 px-6 space-y-3 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group
                ${currentView === item.id
                  ? 'bg-gradient-to-r from-brand-500 to-indigo-600 text-white shadow-lg shadow-brand-500/25 scale-[1.02]' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}
              `}
            >
              <span className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                {item.icon}
              </span>
              <span className="font-semibold tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
           <button 
             onClick={toggleTheme}
             className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-gray-100/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:scale-[1.02] active:scale-95 transition-all"
           >
             {isDark ? <Sun size={20} /> : <Moon size={20} />}
             <span className="font-medium text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
           </button>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="lg:hidden h-20 flex items-center justify-between px-6 sticky top-0 z-30 bg-[#F2F4F8]/80 dark:bg-[#09090b]/80 backdrop-blur-xl transition-all">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
             <span className="font-bold">N</span>
           </div>
           <div>
             <span className="block text-lg font-bold text-gray-900 dark:text-white leading-none">Nexus</span>
             <span className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Control</span>
           </div>
        </div>
        
        <button 
           onClick={toggleTheme}
           className="w-10 h-10 rounded-full bg-white dark:bg-white/10 shadow-sm flex items-center justify-center text-gray-600 dark:text-gray-300 active:scale-90 transition-all"
         >
           {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full min-h-screen relative z-0">
        <div className="flex-1 p-5 lg:p-10 max-w-7xl mx-auto w-full animate-fade-in">
           {children}
        </div>
      </main>

      {/* MOBILE FLOATING DOCK (2026 Style) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 lg:hidden z-40 w-auto">
        <nav className="flex items-center gap-1 p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-full shadow-2xl shadow-black/10">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  relative px-6 py-3.5 rounded-full transition-all duration-300 flex items-center justify-center
                  ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}
                `}
              >
                {/* Active Background Pill with Glow */}
                {isActive && (
                  <span className="absolute inset-0 bg-gray-900 dark:bg-brand-600 rounded-full shadow-lg shadow-brand-500/20 animate-scale-in"></span>
                )}
                
                {/* Icon */}
                <span className="relative z-10 transition-transform duration-200 active:scale-90">
                  {item.icon}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

    </div>
  );
};

export default Layout;