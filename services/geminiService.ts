// Google GenAI service - Optional dependency
// If you want to use AI features, install: npm install @google/generative-ai
// Then uncomment and configure the actual implementation below

// Analyze inspection notes using Gemini 3 Flash
export const analyzeInspectionNotes = async (
  notes: string,
  checks: Record<string, boolean | null>
): Promise<{ analysis: string; severity: 'Low' | 'Medium' | 'High'; actionItems: string[] }> => {
  // AI Service not available - returning fallback response
  return {
    analysis: "AI Service not available. Please rely on manual judgment.",
    severity: "Medium",
    actionItems: ["Manual review required"]
  };
  
  /* 
  // Uncomment below and install @google/generative-ai to enable AI features
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = import.meta.env.VITE_API_KEY || '';
    if (!apiKey) {
      return {
        analysis: "AI Service configuration missing. Please rely on manual judgment.",
        severity: "Medium",
        actionItems: ["Manual review required"]
      };
    }

    const ai = new GoogleGenerativeAI(apiKey);
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

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch {
      return {
        analysis: text || "AI Service temporarily unavailable.",
        severity: "Medium",
        actionItems: ["Manual review required"]
      };
    }
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return {
      analysis: "AI Service temporarily unavailable. Please rely on manual judgment.",
      severity: "Medium",
      actionItems: ["Manual review required"]
    };
  }
  */
};

// Analyze Extinguisher Image using Gemini Vision
export const analyzeExtinguisherImage = async (
  base64Image: string
): Promise<{ 
  pressureOk: boolean; 
  pinPresent: boolean; 
  noDamage: boolean; 
  summary: string 
} | null> => {
  // AI Service not available - returning null
  return null;
  
  /*
  // Uncomment below and install @google/generative-ai to enable AI vision features
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = import.meta.env.VITE_API_KEY || '';
    if (!apiKey) return null;

    const ai = new GoogleGenerativeAI(apiKey);
    const prompt = `
      Act as an expert Fire Extinguisher Technician. Analyze this photo carefully.
      Detect the following:
      - pressureOk: true if the needle is in the green zone, false otherwise.
      - pinPresent: true if the safety pin and tamper seal are visible, false otherwise.
      - noDamage: true if no dents, heavy corrosion, or hose cracks are seen, false otherwise.
      - summary: A brief 1-sentence technical observation.
    `;

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const parts = [
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Image,
        },
      },
      { text: prompt },
    ];

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();
    
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch (error) {
    console.error("Gemini Vision Analysis Failed:", error);
    return null;
  }
  */
};

// Chat with safety expert using Gemini 3 Flash
export const chatWithSafetyExpert = async (
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  newMessage: string,
  systemInstruction: string = "You are a helpful, professional Fire Safety Expert. Answer questions about fire extinguisher codes (NFPA 10), safety procedures, and maintenance concisely."
): Promise<string> => {
  // AI Service not available - returning fallback message
  return "Sorry, the AI service is not available. Please consult NFPA 10 standards or contact your supervisor for assistance.";
  
  /*
  // Uncomment below and install @google/generative-ai to enable AI chat features
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const apiKey = import.meta.env.VITE_API_KEY || '';
    if (!apiKey) {
      return "Sorry, the AI service is not configured. Please consult NFPA 10 standards or contact your supervisor for assistance.";
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

    // Convert history format
    const chatHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: msg.parts.map(p => p.text),
    }));

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(newMessage);
    const response = result.response;
    return response.text() || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Sorry, I'm having trouble connecting to the safety database right now. Please try again later or consult NFPA 10 standards.";
  }
  */
};