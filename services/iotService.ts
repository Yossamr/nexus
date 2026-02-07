import { Device } from '../types';

/**
 * Trigger the device's webhook (Make.com, n8n, etc.)
 */
export const triggerDeviceWebhook = async (device: Device, action: 'ON' | 'OFF' | 'SET_VALUE'): Promise<{ success: boolean; message: string }> => {
  const targetUrl = device.webhookUrl;
  
  // STRICT JSON BODY PAYLOAD FOR MAKE.COM
  const statusValue = action === 'ON' ? 1 : 0;
  
  const payload = {
    name: device.name,        
    status: statusValue,      
    device: device.type       
  };

  console.log(`[IoT Service] 🚀 Preparing to send to ${device.name}:`, payload);

  // MOCK MODE (No URL Configured)
  if (!targetUrl || targetUrl.trim() === '') {
    return { success: true, message: "Simulated (No URL)" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const cleanUrl = targetUrl.trim();

    // Strategy 1: Direct POST
    // Most robust if CORS is allowed by the server (Make.com usually allows it)
    try {
      console.log(`[IoT Service] 1️⃣ Trying Direct POST to: ${cleanUrl}`);
      
      const response = await fetch(cleanUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (response.ok) {
        clearTimeout(timeoutId);
        console.log(`[IoT Service] ✅ Direct POST Successful.`);
        return { success: true, message: "Sent via Direct Connection" };
      } 
      
      console.warn(`[IoT Service] Direct POST failed with status: ${response.status}`);
      // If 4xx/5xx, it reached server but failed. Don't try proxy, it's a logic error.
      if (response.status >= 400 && response.status < 600) {
         return { success: false, message: `Server Error: ${response.status} ${response.statusText}` };
      }
      
    } catch (directError) {
      console.warn(`[IoT Service] Direct POST Network Error (likely CORS). Switching to Proxy...`, directError);
    }

    // Strategy 2: Proxy POST via corsproxy.io
    // This bypasses local browser CORS blocks
    // Note: corsproxy.io supports POST and forwards the body
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(cleanUrl)}`;
    console.log(`[IoT Service] 2️⃣ Trying Proxy POST to: ${proxyUrl}`);

    const proxyResponse = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (proxyResponse.ok) {
      console.log(`[IoT Service] ✅ Proxy POST Successful.`);
      return { success: true, message: "Sent via Secure Proxy" };
    } else {
      const errText = await proxyResponse.text();
      console.error(`[IoT Service] Proxy POST failed: ${proxyResponse.status}`, errText);
      return { success: false, message: `Proxy Error: ${proxyResponse.status}` };
    }

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`[IoT Service] ❌ Fatal Error:`, error);
    return { success: false, message: error.message || "Network Failed" };
  }
};

/**
 * Polls the device's status URL to get the real-time state from hardware
 * Returns: true (ON), false (OFF), or null (Failed/No Change)
 */
export const checkDeviceStatus = async (device: Device): Promise<{ isOn: boolean; isOnline: boolean } | null> => {
  if (!device.statusUrl) return null;

  try {
    const controller = new AbortController();
    // INCREASED TIMEOUT: 20 seconds for slow Google Sheets / Proxies
    const timeoutId = setTimeout(() => controller.abort(), 20000); 

    let urlToFetch = device.statusUrl.trim();

    // --- GOOGLE SHEETS & CORS FIX ---
    // Browsers block direct requests to Google Sheets (CORS). We need to:
    // 1. Use the CSV export URL specifically for the Range/GID
    // 2. Use a robust CORS proxy
    if (urlToFetch.includes('docs.google.com/spreadsheets')) {
       try {
         // Regex to get Spreadsheet ID
         const idMatch = urlToFetch.match(/\/d\/([a-zA-Z0-9-_]+)/);
         const sheetId = idMatch ? idMatch[1] : null;

         if (sheetId) {
            // Helper to extract param from Query (?) or Hash (#)
            const getParam = (name: string) => {
               const reg = new RegExp(`[?&#]${name}=([^&#]+)`);
               const match = urlToFetch.match(reg);
               return match ? match[1] : null;
            };

            const gid = getParam('gid') || '0';
            const range = getParam('range');

            // Construct highly optimized CSV export URL
            // This downloads ONLY the specific cell(s), making it much faster
            let csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
            if (range) {
              csvUrl += `&range=${range}`;
            }

            console.log(`[Sync Debug] Converting Sheet URL to CSV export: ${csvUrl}`);

            // Use corsproxy.io
            urlToFetch = `https://corsproxy.io/?${encodeURIComponent(csvUrl)}`;
         }
       } catch (e) {
         console.warn("[Sync] Failed to parse Google Sheet URL, using fallback.");
       }
    }

    // Cache Busting
    const separator = urlToFetch.includes('?') ? '&' : '?';
    const finalUrl = `${urlToFetch}${separator}_t=${Date.now()}`;

    // console.log(`[Sync] Fetching ${device.name}...`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: { 
        'Accept': 'text/plain, application/json, */*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      
      // Check for Google Login page (Private Sheet Error)
      if (text.includes('<!DOCTYPE html>') && (text.includes('accounts.google.com') || text.includes('Google Sheets'))) {
          console.warn(`[Sync Warning] ${device.name} URL returned a login page. Is the sheet public?`);
          throw new Error("Private Sheet - Make Public");
      }

      // Clean up text: remove HTML tags, quotes (common in CSV), trim, uppercase
      const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/["']/g, '').trim().toUpperCase();
      
      if (cleanText.length < 50) {
        console.log(`[Sync Debug] ${device.name} received: "${cleanText}"`);
      }

      // 1. Exact Match Shortcuts
      if (cleanText === 'TRUE') return { isOn: true, isOnline: true };
      if (cleanText === 'FALSE') return { isOn: false, isOnline: true };
      if (cleanText === 'ON') return { isOn: true, isOnline: true };
      if (cleanText === 'OFF') return { isOn: false, isOnline: true };
      if (cleanText === 'IN') return { isOn: true, isOnline: true }; 

      let isOn = device.isOn;

      // 2. Try JSON Parsing
      try {
        const data = JSON.parse(text);
        if (typeof data.isOn === 'boolean') isOn = data.isOn;
        else if (data.value === 'ON' || data.value === 'IN') isOn = true;
        else if (data.value === 'OFF') isOn = false;
        else if (data.state === 'ON' || data.state === 'IN') isOn = true;
        else if (data.state === 'OFF') isOn = false;
        
        return { isOn, isOnline: true };
      } catch (e) {
        // Not JSON
      }

      // 3. Robust Text/CSV Parsing
      const tokens = cleanText.split(/[\s,;\n]+/);
      
      const foundOn = tokens.includes('ON') || tokens.includes('TRUE') || tokens.includes('IN');
      const foundOff = tokens.includes('OFF') || tokens.includes('FALSE');

      if (foundOn && !foundOff) {
        isOn = true;
      } else if (foundOff && !foundOn) {
        isOn = false;
      } else if (foundOn && foundOff) {
          if (cleanText === 'ON' || cleanText === 'IN') isOn = true;
          else if (cleanText === 'OFF') isOn = false;
      }

      return { isOn, isOnline: true };
    }
    
    return { isOn: device.isOn, isOnline: true }; 
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // Don't throw for timeouts, just return null so we try again later
      // console.warn(`[Sync Info] Timeout fetching status for ${device.name}`);
      return null;
    }
    throw error;
  }
};

// Mock data generator for sensors
export const fetchSensorHistory = async (deviceId: string): Promise<{time: string, value: number}[]> => {
  return [];
};