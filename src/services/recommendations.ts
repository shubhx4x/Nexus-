import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getRecommendations(userProfile: string) {
  try {
    const prompt = `Based on this user profile: "${userProfile}", suggest 3 short interests or activities they might like in a social messaging app. Return a JSON array of strings only.`;
    
    const response = await genAI.models.generateContent({
      model: "gemini-flash-latest",
      contents: prompt,
    });
    
    const text = response.text || "";
    // Simple parsing for demo
    const matches = text.match(/\[.*\]/s);
    if (matches) {
       return JSON.parse(matches[0]);
    }
    return ["Tech Chat", "Gaming", "Photography"];
  } catch (error) {
    console.error("Gemini Error:", error);
    return ["Networking", "Daily News", "Music Sharing"];
  }
}
