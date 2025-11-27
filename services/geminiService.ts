import { GoogleGenAI, Type } from "@google/genai";
import { Question, Shape } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateQuizQuestions = async (topic: string, count: number = 5): Promise<Question[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate ${count} multiple choice quiz questions about "${topic}".`,
      config: {
        systemInstruction: "You are a quiz generator for a Kahoot-like game. Create fun, engaging questions. Ensure one answer is correct.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              timeLimit: { type: Type.INTEGER, description: "Time in seconds, typically 20" },
              answers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    text: { type: Type.STRING },
                    isCorrect: { type: Type.BOOLEAN },
                  },
                  required: ["text", "isCorrect"],
                },
              },
            },
            required: ["text", "timeLimit", "answers"],
          },
        },
      },
    });

    const data = JSON.parse(response.text || "[]");

    // Transform to our internal Question format with IDs and Shapes
    return data.map((q: any, index: number) => ({
      id: `q-${Date.now()}-${index}`,
      text: q.text,
      timeLimit: q.timeLimit || 20,
      imageUrl: `https://picsum.photos/seed/${index}/800/400`,
      answers: q.answers.map((a: any, i: number) => ({
        id: `a-${index}-${i}`,
        text: a.text,
        isCorrect: a.isCorrect,
        shape: Object.values(Shape)[i % 4],
      })),
    }));

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    return [];
  }
};
