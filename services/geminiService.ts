import { GoogleGenAI, Type } from "@google/genai";
import { Device } from "../types";

const API_KEY = process.env.API_KEY || ''; // Ensure this is set in your environment

/**
 * Parses a natural language command using Gemini to determine which devices to control.
 */
export const parseNaturalLanguageCommand = async (
  command: string, 
  currentDevices: Device[]
): Promise<{ 
  success: boolean; 
  actions?: { deviceId: string; turnOn: boolean }[];
  responseMessage: string;
}> => {
  
  if (!API_KEY) {
    return {
      success: false,
      responseMessage: "API Key is missing. Please configure the Google Gemini API Key."
    };
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    // We feed the current device state to the model so it knows what IDs map to what names/rooms
    const devicesContext = currentDevices.map(d => 
      `ID: "${d.id}", Name: "${d.name}", Room: "${d.room}", Current State: ${d.isOn ? 'ON' : 'OFF'}`
    ).join('\n');

    const prompt = `
      You are an IoT Home Assistant.
      
      Available Devices:
      ${devicesContext}

      User Command: "${command}"

      Your task:
      1. Identify which devices matches the user's intent.
      2. Determine if they should be turned ON or OFF.
      3. Return a JSON response with the list of actions and a friendly text confirmation.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  deviceId: { type: Type.STRING },
                  turnOn: { type: Type.BOOLEAN }
                }
              }
            },
            message: {
              type: Type.STRING,
              description: "A short, friendly confirmation message like 'Turning on the living room lights'."
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");

    const result = JSON.parse(resultText);

    return {
      success: true,
      actions: result.actions,
      responseMessage: result.message
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      success: false,
      responseMessage: "I'm sorry, I couldn't process that request right now."
    };
  }
};
