import { GoogleGenAI, Type } from "@google/genai";
import { Question, Shape } from "../types";

export const generateQuizQuestions = async (topic: string, count: number = 5): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate a quiz with ${count} questions about "${topic}". Each question should have 4 answers. One answer must be correct. Assign a shape (triangle, diamond, circle, square) to each answer uniquely if possible, or just distribute them.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            timeLimit: { type: Type.INTEGER },
            answers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  isCorrect: { type: Type.BOOLEAN },
                  shape: { type: Type.STRING, enum: ['triangle', 'diamond', 'circle', 'square'] }
                },
                required: ["text", "isCorrect", "shape"]
              }
            }
          },
          required: ["text", "timeLimit", "answers"]
        }
      }
    }
  });

  // FIX: Safely trim whitespace from the response before parsing JSON.
  const rawQuestions = JSON.parse(response.text?.trim() || "[]");

  return rawQuestions.map((q: any, index: number) => ({
    id: `q-${Date.now()}-${index}`,
    text: q.text,
    timeLimit: q.timeLimit || 20,
    answers: q.answers.map((a: any, aIndex: number) => ({
      id: `a-${Date.now()}-${index}-${aIndex}`,
      text: a.text,
      isCorrect: a.isCorrect,
      shape: a.shape as Shape
    }))
  }));
};