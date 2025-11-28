import { Question } from "../types";

// Service disabled for static hosting
export const generateQuizQuestions = async (topic: string, count: number = 5): Promise<Question[]> => {
  console.warn("AI Generation is disabled in this version.");
  return [];
};