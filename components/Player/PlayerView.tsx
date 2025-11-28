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
  feedback: { isCorrect: boolean; points: number; streak: number } | null;
}

const PlayerView: React.FC<PlayerViewProps> = ({ onJoin, onSubmit, gameState, hasAnswered, score, place, nickname, feedback }) => {
  const [inputName, setInputName] = useState("");
  const [pin, setPin] = useState("");
  const [joined, setJoined] = useState(false);

  // Auto-fill PIN from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam) setPin(pinParam);
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
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white text-black p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h1 className="text-4xl font-black mb-6 text-indigo-900">Kahoot!</h1>
            <form onSubmit={handleJoin}>
              <input 
                  type="text" 
                  placeholder="PIN do Jogo" 
                  className="w-full p-3 border-2 border-gray-300 rounded mb-4 text-center font-bold text-xl uppercase text-black placeholder-gray-400"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
              />
              <input 
                  type="text" 
                  placeholder="Apelido" 
                  className="w-full p-3 border-2 border-gray-300 rounded mb-6 text-center font-bold text-xl text-black placeholder-gray-400"
                  value={inputName}
                  onChange={e => setInputName(e.target.value)}
              />
              <button 
                  type="submit"
                  className="w-full bg-black text-white py-3 rounded font-black text-xl hover:bg-gray-800 transition-colors"
              >
                  Entrar
              </button>
            </form>
        </div>
      </div>
    );
  }

  // --- RESULT SCREEN (CORRECT / WRONG) ---
  if (feedback && gameState !== GameState.QUESTION && gameState !== GameState.COUNTDOWN) {
      const isCorrect = feedback.isCorrect;
      return (
        <div className={`relative z-20 absolute inset-0 flex flex-col items-center justify-center p-8 ${isCorrect ? 'bg-green-600' : 'bg-red-600'} transition-colors duration-300 min-h-screen`}>
             <div className="bg-white/20 p-8 rounded-full mb-6 backdrop-blur-md shadow-lg animate-[bounce_0.6s_infinite]">
                <span className="text-6xl font-black">{isCorrect ? '✓' : '✗'}</span>
             </div>
             <h2 className="text-4xl font-black mb-4 uppercase drop-shadow-md">
                 {isCorrect ? 'Correto!' : 'Incorreto'}
             </h2>
             
             {isCorrect && (
                <div className="bg-black/30 px-6 py-3 rounded-xl mb-4 text-center">
                    <p className="text-sm font-bold opacity-80 uppercase">Pontos</p>
                    <p className="text-3xl font-black">+{feedback.points}</p>
                </div>
             )}

             {feedback.streak > 1 && (
                 <div className="flex items-center gap-2 bg-orange-500 px-4 py-2 rounded-full font-bold shadow-lg animate-pulse">
                     <span>🔥</span>
                     <span>Sequência de Respostas: {feedback.streak}</span>
                 </div>
             )}

             <div className="absolute bottom-8 text-white/80 font-bold">
                 Você está em {place}{getOrdinal(place)} lugar
             </div>
        </div>
      )
  }

  if (gameState === GameState.LOBBY) {
      return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
            <h2 className="text-3xl font-bold mb-4">Você entrou!</h2>
            <p className="text-xl">Veja seu apelido na tela?</p>
            <div className="mt-8 text-2xl font-black bg-white/20 px-6 py-2 rounded-full animate-pulse">{inputName}</div>
        </div>
      )
  }

  if (gameState === GameState.COUNTDOWN) {
      return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8 bg-purple-700">
             <h2 className="text-4xl font-black">Prepare-se!</h2>
             <div className="mt-8 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"/>
        </div>
      )
  }

  if (gameState === GameState.QUESTION) {
      if (hasAnswered) {
          return (
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                    <span className="text-4xl">...</span>
                </div>
                <h2 className="text-3xl font-bold mb-4">Resposta Enviada!</h2>
                <p className="text-xl opacity-75">Será que você acertou?</p>
            </div>
          );
      }
      return (
        <div className="relative z-10 flex flex-col min-h-screen w-full">
            <div className="flex-1 grid grid-cols-2 gap-4 p-4 h-full">
                {Object.values(Shape).map((shape) => (
                    <button
                        key={shape}
                        onClick={() => onSubmit(shape)}
                        className={`${COLORS[shape]} rounded shadow-lg flex items-center justify-center active:scale-95 transition-transform h-full`}
                    >
                        <span className="text-6xl text-white drop-shadow-md">{SHAPE_ICONS[shape]}</span>
                    </button>
                ))}
            </div>
        </div>
      );
  }

  // Fallback / Leaderboard waiting view
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
        <div className="bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-sm">
            <p className="text-gray-500 font-bold uppercase text-sm mb-2">Pontuação Total</p>
            <h2 className="text-5xl font-black mb-6">{score}</h2>
            <div className="bg-black text-white py-3 rounded-lg font-bold text-xl mb-2">
                {place > 0 ? `${place}º Lugar` : '-'}
            </div>
        </div>
        <p className="mt-8 text-white/70 font-bold">{nickname}</p>
    </div>
  );
};

function getOrdinal(n: number) {
  // In Portuguese, it is usually just "º"
  return "º";
}

export default PlayerView;