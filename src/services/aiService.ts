import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeClaim(description: string, images: string[], firCopy?: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an AI insurance claim assessor. Analyze the following vehicle insurance claim:
    
    User Description: ${description}
    ${firCopy ? "An FIR document image has been provided for verification." : ""}
    
    Analyze the provided images (vehicle damage and FIR if available) and text for:
    1. Consistency between the description, the FIR details, and the damage shown.
    2. Detection of potential fraud or manipulation.
    3. Estimation of repair costs.
    
    Provide a structured analysis in JSON format.
  `;

  const imageParts = images.map(img => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: img.split(',')[1]
    }
  }));

  if (firCopy) {
    imageParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: firCopy.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: prompt },
        ...imageParts
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          consistencyScore: { type: Type.NUMBER, description: "Score from 0 to 100" },
          fraudRisk: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          estimatedAmount: { type: Type.NUMBER },
          analysisSummary: { type: Type.STRING },
          detectedDamages: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING } 
          }
        },
        required: ["consistencyScore", "fraudRisk", "estimatedAmount", "analysisSummary"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}
