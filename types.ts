export enum GameState {
  MENU = 'MENU',
  CREATE = 'CREATE',
  LOBBY = 'LOBBY',
  COUNTDOWN = 'COUNTDOWN',
  QUESTION = 'QUESTION',
  LEADERBOARD = 'LEADERBOARD',
  PODIUM = 'PODIUM',
}

export enum Shape {
  TRIANGLE = 'triangle', // Red
  DIAMOND = 'diamond',   // Blue
  CIRCLE = 'circle',     // Yellow
  SQUARE = 'square'      // Green
}

export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  shape: Shape;
}

export interface Question {
  id: string;
  text: string;
  timeLimit: number; // seconds
  imageUrl?: string;
  answers: Answer[];
}

export interface Quiz {
  title: string;
  questions: Question[];
}

export interface Player {
  id: string;
  nickname: string;
  score: number;
  streak: number;
  lastAnswerCorrect?: boolean;
}

export type BroadcastMessage = 
  | { type: 'JOIN'; payload: { nickname: string; id: string } }
  | { type: 'SYNC_STATE'; payload: { state: GameState; currentQuestionIndex: number; totalQuestions: number; pin: string } }
  | { type: 'START_GAME'; payload: { totalQuestions: number } }
  | { type: 'QUESTION_START'; payload: { questionIndex: number; timeLimit: number } }
  | { type: 'SUBMIT_ANSWER'; payload: { playerId: string; answerId: string; timeLeft: number } }
  | { type: 'TIME_UP' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'GAME_OVER' };
