import React, { useState, useEffect } from 'react';
import { Quiz, Player, GameState, Shape } from '../../types';
import { COLORS, SHAPE_ICONS } from '../../constants';

interface HostGameProps {
  quiz: Quiz;
  players: Player[];
  currentQuestionIndex: number;
  timeLeft: number;
  gameState: GameState;
  onNext: () => void;
}

const HostGame: React.FC<HostGameProps> = ({ quiz, players, currentQuestionIndex, timeLeft, gameState, onNext }) => {
  const question = quiz.questions[currentQuestionIndex];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  if (gameState === GameState.COUNTDOWN) {
      return (
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
              <h1 className="text-4xl font-bold mb-8">{quiz.title}</h1>
              <div className="text-[12rem] font-black animate-ping">{timeLeft}</div>
              <p className="text-2xl mt-8">Prepare-se!</p>
          </div>
      )
  }

  if (gameState === GameState.LEADERBOARD || gameState === GameState.PODIUM) {
      const isPodium = gameState === GameState.PODIUM;
      return (
        <div className="relative z-10 flex flex-col items-center pt-10 min-h-screen w-full max-w-4xl mx-auto">
            <h1 className="text-4xl font-black bg-white text-indigo-900 px-8 py-2 rounded-lg mb-10">
                {isPodium ? 'Pódio' : 'Placar'}
            </h1>
            
            <div className="flex flex-col gap-4 w-full px-8">
                {sortedPlayers.slice(0, 5).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between bg-white/10 backdrop-blur rounded-lg p-4 animate-slide-in" style={{animationDelay: `${idx * 0.1}s`}}>
                        <div className="flex items-center gap-4">
                            <span className="font-black text-2xl w-8">{idx + 1}</span>
                            <span className="font-bold text-xl">{p.nickname}</span>
                            {p.streak > 2 && <span className="bg-orange-500 text-xs font-bold px-2 py-1 rounded-full">🔥 {p.streak}</span>}
                        </div>
                        <span className="font-black text-2xl">{p.score}</span>
                    </div>
                ))}
            </div>

            <button 
                onClick={onNext}
                className="mt-auto mb-10 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded shadow-lg transition-transform hover:scale-105"
            >
                {isPodium ? 'Voltar ao Menu' : 'Próxima Pergunta'}
            </button>
        </div>
      );
  }

  return (
    <div className="relative z-10 flex flex-col h-screen p-4 w-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="bg-white text-black font-bold px-4 py-2 rounded-full text-xl shadow-lg">
            {currentQuestionIndex + 1} / {quiz.questions.length}
        </div>
        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
            <span className="text-4xl font-black">{timeLeft}</span>
        </div>
      </div>

      {/* Question */}
      <div className="bg-white text-black p-8 rounded-lg shadow-2xl text-center mb-6 mx-auto max-w-4xl w-full">
        <h2 className="text-3xl md:text-5xl font-bold leading-tight">{question.text}</h2>
      </div>

      {/* Image Area */}
      <div className="flex-1 flex justify-center items-center mb-6 relative">
         <div className="h-full max-h-[40vh] aspect-video bg-black/20 rounded-lg overflow-hidden border-4 border-white/20 shadow-lg">
             <img src={question.imageUrl || "https://picsum.photos/800/400"} alt="Question" className="w-full h-full object-cover" />
         </div>
      </div>

      {/* Answers Grid */}
      <div className="grid grid-cols-2 gap-4 h-48 md:h-64">
        {question.answers.map((answer, idx) => (
            <div key={idx} className={`${COLORS[answer.shape]} flex items-center p-6 rounded shadow-lg transition-transform`}>
                <div className="text-4xl md:text-5xl mr-6 text-white drop-shadow-md">
                    {SHAPE_ICONS[answer.shape]}
                </div>
                <span className="text-xl md:text-3xl font-bold text-white drop-shadow-md">{answer.text}</span>
            </div>
        ))}
      </div>

      {/* Moved to Bottom-Left */}
      <div className="absolute bottom-4 left-4 text-white/50 font-bold text-xl">
          kahoot-clone-2025
      </div>
    </div>
  );
};

export default HostGame;