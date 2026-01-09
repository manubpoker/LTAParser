
import { GoogleGenAI, Type } from "@google/genai";
import { Tournament } from "../types";

// Initialize the Google GenAI client using the environment variable API_KEY.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini AI to extract structured tournament data from raw LTA calendar text.
 * Optimized for Sussex (SUS) tournament extraction.
 */
export async function parseTournamentsWithGemini(text: string): Promise<Tournament[]> {
  // Use gemini-3-flash-preview for efficient and accurate text extraction tasks.
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Extract all LTA tennis tournament details from the provided LTA Competition Calendar text. 
    Focus specifically on Sussex tournaments where the tournament code starts with "SUS-".
    
    The text is structured in tables with columns usually like: Tournament Code, Tournament Name, Gender, Event Type, Grade, Date, Venue, Closing & Withdrawal Deadline, and Tournament Organiser.
    
    For each tournament entry, extract:
    1. title: The category/event name (e.g., "8U Mixed Singles"). 
    2. gender: "Mixed", "Male", or "Female".
    3. eventType: "Singles" or "Doubles".
    4. grade: e.g., "Grade 4" or "Grade 5".
    5. venue: The name of the tennis club.
    6. postcode: The UK postcode of the venue (e.g., BN3 1RP).
    7. ltaCode: The tournament code (e.g., SUS-25-0455).
    8. date: The specific date (e.g., Sat 06 Sep).
    9. month: The full month and year (e.g., "September 2025").
    10. category: The age group (e.g., "9U", "11U", "Open").
    11. organiserEmail: The contact email address.
    12. deadlineCD: The Closing Deadline date and time.
    13. deadlineWD: The Withdrawal Deadline date and time.

    Text to parse:
    ${text}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            gender: { type: Type.STRING },
            eventType: { type: Type.STRING },
            grade: { type: Type.STRING },
            venue: { type: Type.STRING },
            postcode: { type: Type.STRING },
            ltaCode: { type: Type.STRING },
            date: { type: Type.STRING },
            month: { type: Type.STRING },
            category: { type: Type.STRING },
            organiserEmail: { type: Type.STRING },
            deadlineCD: { type: Type.STRING },
            deadlineWD: { type: Type.STRING }
          },
          required: [
            "title", "gender", "eventType", "grade", "venue", 
            "ltaCode", "date", "month", "organiserEmail", 
            "deadlineCD", "deadlineWD"
          ]
        }
      }
    }
  });

  try {
    // Extract text directly from the response property.
    const jsonStr = response.text || "[]";
    const data = JSON.parse(jsonStr.trim());
    
    return data.map((t: any) => ({
      ...t,
      // Use substring instead of the deprecated substr method.
      id: t.ltaCode || Math.random().toString(36).substring(2, 9),
      // Clean up common prefix if present.
      title: t.title.replace(/South\s*&\s*South\s*West\s*Tour\s*-\s*/gi, ""),
      postcode: t.postcode || "BN1"
    }));
  } catch (err) {
    console.error("Failed to parse Gemini response as JSON", err);
    throw new Error("Could not parse tournament data from AI response.");
  }
}
