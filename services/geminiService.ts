import { GoogleGenAI, Type } from "@google/genai";

// Analyze inspection notes using Gemini 3 Flash
export const analyzeInspectionNotes = async (
  notes: string,
  checks: Record<string, boolean | null>
): Promise<{ analysis: string; severity: 'Low' | 'Medium' | 'High'; actionItems: string[] }> => {
  // Always use a new instance to ensure up-to-date API key is used from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const failedChecks = Object.entries(checks)
    .filter(([_, passed]) => passed === false)
    .map(([key]) => key)
    .join(", ");

  const prompt = `
    You are a Certified Fire Safety Inspector Assistant.
    Analyze the following inspection data for a fire extinguisher:
    
    Failed Physical Checks: ${failedChecks || "None"}
    Inspector Notes: "${notes}"
    
    Provide a JSON response with:
    1. A short analysis summary.
    2. Severity rating (Low, Medium, High).
    3. A list of recommended immediate actions (max 3).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // Adhere to guidelines: using parts structure for content
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
            actionItems: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["analysis", "severity", "actionItems"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text);

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      analysis: "AI Service temporarily unavailable. Please rely on manual judgment.",
      severity: "Medium",
      actionItems: ["Manual review required"]
    };
  }
};

// New: Analyze Extinguisher Image using Gemini Vision
export const analyzeExtinguisherImage = async (
  base64Image: string
): Promise<{ 
  pressureOk: boolean; 
  pinPresent: boolean; 
  noDamage: boolean; 
  summary: string 
} | null> => {
  // Always use a new instance right before the call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    Act as an expert Fire Extinguisher Technician. Analyze this photo carefully.
    Detect the following:
    - pressureOk: true if the needle is in the green zone, false otherwise.
    - pinPresent: true if the safety pin and tamper seal are visible, false otherwise.
    - noDamage: true if no dents, heavy corrosion, or hose cracks are seen, false otherwise.
    - summary: A brief 1-sentence technical observation.
  `;

  try {
    // Adhere to guidelines: use gemini-3-flash-preview for vision tasks and wrap parts correctly.
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pressureOk: { type: Type.BOOLEAN },
            pinPresent: { type: Type.BOOLEAN },
            noDamage: { type: Type.BOOLEAN },
            summary: { type: Type.STRING }
          },
          required: ["pressureOk", "pinPresent", "noDamage", "summary"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Vision Analysis Failed:", error);
    return null;
  }
};

// Chat with safety expert using Gemini 3 Flash
export const chatWithSafetyExpert = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string,
  systemInstruction: string = "You are a helpful, professional Fire Safety Expert. Answer questions about fire extinguisher codes (NFPA 10), safety procedures, and maintenance concisely."
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: systemInstruction,
      },
      history: history
    });

    const result = await chat.sendMessage({ message: newMessage });
    return result.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the safety database right now.";
  }
};
