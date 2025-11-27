import React, { useState, useEffect } from 'react';
import { COLORS, SHAPE_ICONS } from '../../constants';
import { Shape, GameState } from '../../types';

interface PlayerViewProps {
  onJoin: (nickname: string) => void;
  onSubmit: (shape: Shape) => void;
  gameState: GameState;
  hasAnswered: boolean;
  score: number;
  place: number;
  nickname: string;
}

const PlayerView: React.FC<PlayerViewProps> = ({ onJoin, onSubmit, gameState, hasAnswered, score, place, nickname }) => {
  const [inputName, setInputName] = useState("");
  const [pin, setPin] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (nickname) setJoined(true);
  }, [nickname]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim() && pin) {
      onJoin(inputName);
    }
  };

  if (!joined) {
    return (
      <div className="z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white text-black p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h1 className="text-4xl font-black mb-6 text-indigo-900">Kahoot!</h1>
            <input 
                type="text" 
                placeholder="Game PIN" 
                className="w-full p-3 border-2 border-gray-300 rounded mb-4 text-center font-bold text-xl uppercase"
                value={pin}
                onChange={e => setPin(e.target.value)}
            />
            <input 
                type="text" 
                placeholder="Nickname" 
                className="w-full p-3 border-2 border-gray-300 rounded mb-6 text-center font-bold text-xl"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
            />
            <button 
                onClick={handleJoin}
                className="w-full bg-black text-white py-3 rounded font-black text-xl hover:bg-gray-800"
            >
                Enter
            </button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.LOBBY) {
      return (
        <div className="z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
            <h2 className="text-3xl font-bold mb-4">You're in!</h2>
            <p className="text-xl">See your nickname on screen?</p>
            <div className="mt-8 text-2xl font-black bg-white/20 px-6 py-2 rounded-full animate-pulse">{inputName}</div>
        </div>
      )
  }

  if (gameState === GameState.COUNTDOWN) {
      return (
        <div className="z-10 flex flex-col items-center justify-center min-h-screen text-center p-8 bg-purple-700">
             <h2 className="text-4xl font-black">Get Ready!</h2>
             <div className="mt-8 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"/>
        </div>
      )
  }

  if (gameState === GameState.QUESTION) {
      if (hasAnswered) {
          return (
            <div className="z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
                <h2 className="text-3xl font-bold mb-4">Answer Sent!</h2>
                <p className="text-xl opacity-75">Wait for the timer...</p>
            </div>
          );
      }
      return (
        <div className="z-10 flex flex-col min-h-screen w-full">
            <div className="flex-1 grid grid-cols-2 gap-4 p-4">
                {Object.values(Shape).map((shape) => (
                    <button
                        key={shape}
                        onClick={() => onSubmit(shape)}
                        className={`${COLORS[shape]} rounded shadow-lg flex items-center justify-center active:scale-95 transition-transform`}
                    >
                        <span className="text-6xl text-white drop-shadow-md">{SHAPE_ICONS[shape]}</span>
                    </button>
                ))}
            </div>
        </div>
      );
  }

  // Results / Leaderboard view for player
  return (
    <div className="z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
        <div className="bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-sm">
            <p className="text-gray-500 font-bold uppercase text-sm mb-2">Current Score</p>
            <h2 className="text-5xl font-black mb-6">{score}</h2>
            
            <div className="bg-black text-white py-3 rounded-lg font-bold text-xl mb-2">
                {place > 0 ? `${place}${getOrdinal(place)} Place` : 'Good effort!'}
            </div>
        </div>
        <p className="mt-8 text-white/70 font-bold">{nickname}</p>
    </div>
  );
};

function getOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export default PlayerView;
