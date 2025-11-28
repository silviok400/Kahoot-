import { Shape } from './types';

export const COLORS = {
  [Shape.TRIANGLE]: 'bg-red-600 hover:bg-red-500',
  [Shape.DIAMOND]: 'bg-blue-600 hover:bg-blue-500',
  [Shape.CIRCLE]: 'bg-yellow-500 hover:bg-yellow-400',
  [Shape.SQUARE]: 'bg-green-600 hover:bg-green-500',
};

export const SHAPE_ICONS = {
  [Shape.TRIANGLE]: '▲',
  [Shape.DIAMOND]: '◆',
  [Shape.CIRCLE]: '●',
  [Shape.SQUARE]: '■',
};

export const MOCK_QUIZ_IMAGE = "https://picsum.photos/800/400";

// Short, lightweight sound effects
export const AUDIO = {
  LOBBY_MUSIC: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b80a18413.mp3', // Funky groove
  COUNTDOWN: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2738a08711.mp3', // Ticking
  CORRECT: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c153e2.mp3', // Success chime
  WRONG: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3', // Negative buzzer
  TIME_UP: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3', // Whoosh
};