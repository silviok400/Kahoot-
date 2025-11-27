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
