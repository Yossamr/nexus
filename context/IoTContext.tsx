import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Device, LogEntry, DeviceType, ScheduledAction } from '../types';
import { triggerDeviceWebhook, checkDeviceStatus } from '../services/iotService';

interface IoTContextType {
  devices: Device[];
  logs: LogEntry[];
  schedules: ScheduledAction[];
  toggleDevice: (id: string, forceState?: boolean) => Promise<void>;
  renameDevice: (id: string, newName: string) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  addDevice: (device: Partial<Device>) => void;
  deleteDevice: (id: string) => void;
  saveConfiguration: () => void;
  refreshAllDevices: () => Promise<void>;
  addSchedule: (deviceId: string, action: 'ON' | 'OFF', delaySeconds: number) => void;
  cancelSchedule: (scheduleId: string) => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  isLoading: boolean;
  isRefreshing: boolean;
  lastSyncTime: Date | null;
}

const IoTContext = createContext<IoTContextType | undefined>(undefined);

// Initial Mock Data
const INITIAL_DEVICES: Device[] = [
  { id: 'd1', name: 'Ceiling Light', type: 'light', room: 'Living Room', isOn: true, lastUpdated: new Date().toISOString(), isOnline: true, webhookUrl: '', statusUrl: '' },
  { id: 'd2', name: 'Standing Lamp', type: 'light', room: 'Living Room', isOn: false, lastUpdated: new Date().toISOString(), isOnline: true, webhookUrl: '' },
];

// Helper to safely load devices from localStorage
const getSavedDevices = (): Device[] => {
  try {
    const saved = localStorage.getItem('nexus_iot_devices');
    return saved ? JSON.parse(saved) : INITIAL_DEVICES;
  } catch (error) {
    console.error("Failed to load devices from storage", error);
    return INITIAL_DEVICES;
  }
};

// Helper to safely load schedules from localStorage
const getSavedSchedules = (): ScheduledAction[] => {
  try {
    const saved = localStorage.getItem('nexus_iot_schedules');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
};

export const IoTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from localStorage
  const [devices, setDevices] = useState<Device[]>(getSavedDevices);
  const [schedules, setSchedules] = useState<ScheduledAction[]>(getSavedSchedules);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  // Refs to store timer IDs so we can clear them
  const timerRefs = useRef<{[key: string]: ReturnType<typeof setTimeout>}>({});
  
  // Track last error time to prevent log spamming (one error per device per 30s)
  const lastErrorLogRef = useRef<{[key: string]: number}>({});

  // Debounce Control: Track when a device was last manually controlled
  const lastControlTimeRef = useRef<{[key: string]: number}>({});

  // Ref to hold the latest toggleDevice function
  const toggleDeviceRef = useRef<(id: string, forceState?: boolean) => Promise<void>>(async () => {});

  // Simulate initial connect
  useEffect(() => {
    setTimeout(() => {
      setIsLoading(false);
      addLog('System initialized. Data loaded from storage.', 'info');
    }, 1000);
  }, []);

  // --- Real-time Sync Loop ---
  // This periodically checks statusUrls to see if state changed externally
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      // 1. Identify devices to check
      const devicesWithStatus = devices.filter(d => d.statusUrl && d.statusUrl.length > 5);
      
      if (devicesWithStatus.length === 0) return;

      // 2. Fetch statuses in parallel
      const statusUpdates = new Map<string, boolean>();
      const now = Date.now();
      
      await Promise.all(devicesWithStatus.map(async (device) => {
        // Cool-down check: If user controlled this device < 10 seconds ago, SKIP sync
        const lastControl = lastControlTimeRef.current[device.id] || 0;
        if (now - lastControl < 10000) {
           // console.log(`[Sync] Skipping ${device.name} due to recent user interaction.`);
           return;
        }

        try {
          const result = await checkDeviceStatus(device);
          if (result) {
            statusUpdates.set(device.id, result.isOn);
          }
        } catch (e: any) {
          // Logic to throttle error logs
          // IGNORE AbortError (Timeouts) to prevent log spam
          if (e.name === 'AbortError') return;

          const lastLog = lastErrorLogRef.current[device.id] || 0;
          if (now - lastLog > 30000) { // Only log every 30 seconds
             console.warn(`[Auto-Sync] Error for ${device.name}:`, e.message || e);
             lastErrorLogRef.current[device.id] = now;
          }
        }
      }));

      // 3. Update state SAFELY using functional update
      if (statusUpdates.size > 0) {
        setDevices(currentDevices => {
          let hasChanges = false;
          const newDevices = currentDevices.map(d => {
            // Re-check cool-down inside setter to be extra safe
            const lastControl = lastControlTimeRef.current[d.id] || 0;
            if (Date.now() - lastControl < 10000) return d;

            if (statusUpdates.has(d.id)) {
              const newIsOn = statusUpdates.get(d.id)!;
              if (d.isOn !== newIsOn) {
                hasChanges = true;
                return { ...d, isOn: newIsOn, isOnline: true, lastUpdated: new Date().toISOString() };
              }
            }
            return d;
          });
          
          if (hasChanges) {
             setLastSyncTime(new Date());
             return newDevices;
          }
          return currentDevices;
        });
      }
    }, 3000); // Check every 3 seconds

    return () => clearInterval(syncInterval);
  }, [devices]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [entry, ...prev].slice(0, 50)); // Keep last 50
  };

  const saveConfiguration = () => {
    try {
      // Use the current state 'devices'
      localStorage.setItem('nexus_iot_devices', JSON.stringify(devices));
      localStorage.setItem('nexus_iot_schedules', JSON.stringify(schedules));
      addLog('System configuration saved successfully.', 'success');
      
      // Force visual confirmation for user
      window.alert("Settings & Devices Saved Successfully!");
    } catch (error) {
      addLog('Failed to save configuration.', 'error');
      window.alert("Failed to save configuration. Check console.");
    }
  };

  const toggleDevice = useCallback(async (id: string, forceState?: boolean) => {
    // Timestamp this action to pause sync
    lastControlTimeRef.current[id] = Date.now();

    // Find device in current state
    setDevices(prev => {
        const device = prev.find(d => d.id === id);
        if (!device) return prev;
        
        const targetState = forceState !== undefined ? forceState : !device.isOn;
        
        // Optimistic update
        return prev.map(d => d.id === id ? { ...d, isOn: targetState, lastUpdated: new Date().toISOString() } : d);
    });

    // We need to get the device object to send the webhook
    const device = devices.find(d => d.id === id);
    if (!device) return;

    const targetState = forceState !== undefined ? forceState : !device.isOn;
    
    // Call Backend
    const result = await triggerDeviceWebhook(device, targetState ? 'ON' : 'OFF');

    if (result.success) {
      addLog(`Turned ${targetState ? 'ON' : 'OFF'} ${device.name}`, 'success');
    } else {
      // Revert on failure
      setDevices(prev => prev.map(d => d.id === id ? { ...d, isOn: !targetState } : d));
      addLog(`Failed: ${result.message}`, 'error');
    }
  }, [devices]);

  // Keep ref updated
  useEffect(() => {
    toggleDeviceRef.current = toggleDevice;
  }, [toggleDevice]);

  // Restore active timers on mount
  useEffect(() => {
    const restoredSchedules = getSavedSchedules();
    const validSchedules: ScheduledAction[] = [];

    restoredSchedules.forEach(sch => {
      const delay = new Date(sch.executeAt).getTime() - Date.now();
      
      if (delay > 0) {
        validSchedules.push(sch);
        console.log(`[Scheduler] Restoring timer for ${sch.deviceName} in ${Math.round(delay/1000)}s`);
        
        const timeoutId = setTimeout(() => {
          toggleDeviceRef.current(sch.deviceId, sch.action === 'ON');
          setSchedules(prev => prev.filter(s => s.id !== sch.id));
          addLog(`Executed scheduled task for ${sch.deviceName}`, 'success');
        }, delay);
        
        timerRefs.current[sch.id] = timeoutId;
      } else {
        console.log(`[Scheduler] Skipping expired schedule for ${sch.deviceName}`);
      }
    });

    // Update state to only include valid future schedules
    setSchedules(validSchedules);
  }, []); // Run once on mount

  const updateDevice = (id: string, updates: Partial<Device>) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const renameDevice = (id: string, newName: string) => {
    updateDevice(id, { name: newName });
    addLog(`Renamed device to ${newName}`, 'info');
  };

  const addDevice = (deviceData: Partial<Device>) => {
    const newDevice: Device = {
      id: Math.random().toString(36).substr(2, 9),
      name: deviceData.name || 'New Device',
      type: (deviceData.type as DeviceType) || 'light',
      room: deviceData.room || 'Living Room',
      isOn: false,
      isOnline: true,
      lastUpdated: new Date().toISOString(),
      webhookUrl: deviceData.webhookUrl || '',
      statusUrl: deviceData.statusUrl || '',
      ...deviceData
    };
    setDevices(prev => [...prev, newDevice]);
    addLog(`Added new device: ${newDevice.name}`, 'success');
  };

  const deleteDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    addLog('Device deleted', 'warning');
  };

  const refreshAllDevices = async () => {
    setIsRefreshing(true);
    addLog('Starting manual device sync...', 'info');
    
    const devicesWithStatus = devices.filter(d => d.statusUrl && d.statusUrl.length > 5);
    
    if (devicesWithStatus.length === 0) {
      addLog('No devices have a Status URL configured.', 'warning');
      setIsRefreshing(false);
      return;
    }

    const updates = new Map();
    let errorCount = 0;

    await Promise.all(devicesWithStatus.map(async (device) => {
      try {
        const result = await checkDeviceStatus(device);
        if (result) {
          updates.set(device.id, result);
        }
      } catch (e) {
        errorCount++;
        // Don't log expected AbortErrors in manual refresh if possible, or make it friendly
        if ((e as Error).name !== 'AbortError') {
             addLog(`Sync failed for ${device.name}: ${(e as Error).message || 'Network Error'}`, 'error');
        }
      }
    }));

    if (updates.size > 0) {
      setDevices(prev => prev.map(d => {
        const update = updates.get(d.id);
        if (update && d.isOn !== update.isOn) {
           return { ...d, isOn: update.isOn, isOnline: true, lastUpdated: new Date().toISOString() };
        }
        return d;
      }));
      setLastSyncTime(new Date());
    }

    setIsRefreshing(false);
    
    if (errorCount === 0) {
        addLog('Sync complete.', 'success');
    } else {
        addLog(`Sync complete with ${errorCount} errors (Check Console).`, 'warning');
    }
  };

  const addSchedule = (deviceId: string, action: 'ON' | 'OFF', delaySeconds: number) => {
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    const scheduleId = Math.random().toString(36).substr(2, 9);
    const executeAt = new Date(Date.now() + delaySeconds * 1000);

    const newSchedule: ScheduledAction = {
      id: scheduleId,
      deviceId,
      deviceName: device.name,
      action,
      executeAt: executeAt.toISOString(),
      originalDelaySeconds: delaySeconds
    };

    setSchedules(prev => [...prev, newSchedule]);
    
    // Format friendly time string
    const hrs = Math.floor(delaySeconds / 3600);
    const mins = Math.floor((delaySeconds % 3600) / 60);
    const secs = Math.floor(delaySeconds % 60);
    const timeStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins > 0 ? mins + 'm ' : ''}${secs}s`;
    
    addLog(`Scheduled ${device.name} to turn ${action} in ${timeStr}`, 'info');

    // Set Timeout
    const timeoutId = setTimeout(() => {
      toggleDevice(deviceId, action === 'ON');
      // Remove schedule after execution
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      addLog(`Executed scheduled task for ${device.name}`, 'success');
    }, delaySeconds * 1000);

    timerRefs.current[scheduleId] = timeoutId;
  };

  const cancelSchedule = (scheduleId: string) => {
    if (timerRefs.current[scheduleId]) {
      clearTimeout(timerRefs.current[scheduleId]);
      delete timerRefs.current[scheduleId];
    }
    setSchedules(prev => prev.filter(s => s.id !== scheduleId));
    addLog('Schedule cancelled', 'warning');
  };

  return (
    <IoTContext.Provider value={{ 
      devices, logs, schedules, 
      toggleDevice, renameDevice, updateDevice, addDevice, deleteDevice, 
      saveConfiguration, refreshAllDevices,
      addSchedule, cancelSchedule, 
      addLog, isLoading, isRefreshing, lastSyncTime 
    }}>
      {children}
    </IoTContext.Provider>
  );
};

export const useIoT = () => {
  const context = useContext(IoTContext);
  if (!context) throw new Error("useIoT must be used within IoTProvider");
  return context;
};