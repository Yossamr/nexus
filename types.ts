export type DeviceType = 'light' | 'fan' | 'outlet' | 'sensor' | 'lock' | 'thermostat';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  room: string;
  isOn: boolean;
  value?: number; // For dimmers or sensors
  unit?: string; // e.g., '°C', '%'
  lastUpdated: string;
  isOnline: boolean;
  webhookUrl?: string; // URL to SEND commands (Control)
  statusUrl?: string; // URL to GET current state (Sync)
}

export interface Room {
  id: string;
  name: string;
  icon: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface SensorDataPoint {
  time: string;
  value: number;
}

export interface ScheduledAction {
  id: string;
  deviceId: string;
  deviceName: string;
  action: 'ON' | 'OFF';
  executeAt: string; // ISO Date string
  originalDelaySeconds: number;
}

export type View = 'dashboard' | 'analytics' | 'settings';