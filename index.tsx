import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import QRCodeStyling from 'qr-code-styling';

// --- TYPES ---

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
  | { type: 'REQUEST_STATE' } 
  | { type: 'UPDATE_PLAYERS'; payload: Player[] }
  | { type: 'SYNC_STATE'; payload: { state: GameState; currentQuestionIndex: number; totalQuestions: number; pin: string } }
  | { type: 'START_GAME'; payload: { totalQuestions: number } }
  | { type: 'QUESTION_START'; payload: { questionIndex: number; timeLimit: number } }
  | { type: 'SUBMIT_ANSWER'; payload: { playerId: string; answerId: string; timeLeft: number } }
  | { type: 'ANSWER_RESULT'; payload: { playerId: string; isCorrect: boolean; pointsToAdd: number; newStreak: number } }
  | { type: 'TIME_UP' }
  | { type: 'SHOW_LEADERBOARD' }
  | { type: 'GAME_OVER' };

// --- CONSTANTS ---

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

export const AUDIO = {
  LOBBY_MUSIC: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b80a18413.mp3',
  COUNTDOWN: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2738a08711.mp3',
  CORRECT: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c153e2.mp3',
  WRONG: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3',
  TIME_UP: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
};

const CHANNEL_NAME = 'kahoot-clone-2025';

// --- SUB-COMPONENTS ---

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-purple-800" />
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="shape-bg bg-white/10 rounded-lg absolute"
          style={{
            width: `${Math.random() * 100 + 50}px`,
            height: `${Math.random() * 100 + 50}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100 + 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 15}s`,
          }}
        />
      ))}
    </div>
  );
};

// Helper for QR Code
const QRCodeView: React.FC<{ url: string; size: number }> = ({ url, size }) => {
    const ref = useRef<HTMLDivElement>(null);
    const qrCode = useRef<QRCodeStyling | null>(null);

    useEffect(() => {
        qrCode.current = new QRCodeStyling({
            width: size,
            height: size,
            type: 'svg',
            data: url,
            dotsOptions: { color: "#000000", type: "rounded" },
            cornersSquareOptions: { type: "extra-rounded" },
            backgroundOptions: { color: "#ffffff" },
            imageOptions: { crossOrigin: "anonymous", margin: 10 }
        });

        if (ref.current) {
            ref.current.innerHTML = '';
            qrCode.current.append(ref.current);
        }
    }, [size]);

    useEffect(() => {
        qrCode.current?.update({ data: url });
    }, [url]);

    return <div ref={ref} className="overflow-hidden rounded-lg" />;
};

interface QuizCreatorProps {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("Meu Quiz Incrível");
  const [questions, setQuestions] = useState<Question[]>([]);

  const addEmptyQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      text: "Nova Pergunta",
      timeLimit: 20,
      answers: [
        { id: `a-1`, text: "Resposta 1", isCorrect: true, shape: Shape.TRIANGLE },
        { id: `a-2`, text: "Resposta 2", isCorrect: false, shape: Shape.DIAMOND },
        { id: `a-3`, text: "Resposta 3", isCorrect: false, shape: Shape.CIRCLE },
        { id: `a-4`, text: "Resposta 4", isCorrect: false, shape: Shape.SQUARE },
      ]
    };
    setQuestions([...questions, newQ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQs = [...questions];
    (newQs[index] as any)[field] = value;
    setQuestions(newQs);
  };

  const updateAnswer = (qIndex: number, aIndex: number, text: string) => {
    const newQs = [...questions];
    newQs[qIndex].answers[aIndex].text = text;
    setQuestions(newQs);
  };

  const toggleCorrect = (qIndex: number, aIndex: number) => {
    const newQs = [...questions];
    newQs[qIndex].answers[aIndex].isCorrect = !newQs[qIndex].answers[aIndex].isCorrect;
    setQuestions(newQs);
  };

  return (
    <div className="relative z-10 flex flex-col w-full h-[100dvh] md:h-[90vh] md:max-w-5xl md:mx-auto bg-slate-900/90 md:bg-white/10 backdrop-blur-md md:rounded-xl border-none md:border border-white/20 shadow-2xl md:mt-4 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-black/20 md:bg-transparent border-b border-white/10 md:border-none shrink-0 gap-3">
        <h2 className="text-xl md:text-3xl font-black text-white w-full text-center md:text-left">Criar Kahoot!</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={onCancel} className="flex-1 md:flex-none px-3 py-2 bg-gray-600 rounded font-bold hover:bg-gray-500 text-sm">Cancelar</button>
          <button 
            onClick={() => onSave({ title, questions })} 
            disabled={questions.length === 0}
            className="flex-1 md:flex-none px-4 py-2 bg-green-600 rounded font-bold hover:bg-green-500 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            Salvar & Jogar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div>
            <label className="block text-xs uppercase font-bold mb-1 text-white/70">Título do Quiz</label>
            <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-white focus:bg-white/20 transition-all font-bold text-lg"
            placeholder="Digite o título..."
            />
        </div>

        <div className="space-y-6">
            {questions.length === 0 && (
                <div className="text-center py-12 md:py-20 text-white/50 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                    <p className="text-lg font-bold mb-2">Seu quiz está vazio!</p>
                    <p className="text-sm">Clique abaixo para adicionar a primeira pergunta.</p>
                </div>
            )}
            
            {questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg relative group">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-white/80 text-sm uppercase">Pergunta {qIndex + 1}</h3>
                    <button 
                        onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} 
                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-400/10 rounded"
                        title="Excluir Pergunta"
                    >
                        🗑️
                    </button>
                </div>
                
                <input 
                value={q.text} 
                onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                className="w-full p-3 mb-4 text-lg md:text-xl font-bold text-center rounded-lg bg-white text-black placeholder-gray-400 focus:ring-4 ring-indigo-500/50 outline-none"
                placeholder="Digite a pergunta aqui..."
                />

                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="w-full md:w-1/3">
                        <label className="text-[10px] uppercase font-bold text-white/60 mb-1 block">Tempo (s)</label>
                        <select 
                            value={q.timeLimit}
                            onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                            className="w-full p-2 rounded bg-black/30 border border-white/20 text-white focus:border-white outline-none"
                        >
                            <option value={5}>5 segundos</option>
                            <option value={10}>10 segundos</option>
                            <option value={20}>20 segundos</option>
                            <option value={30}>30 segundos</option>
                            <option value={60}>60 segundos</option>
                            <option value={120}>120 segundos</option>
                        </select>
                    </div>
                    <div className="w-full md:w-2/3">
                        <label className="text-[10px] uppercase font-bold text-white/60 mb-1 block">URL da Imagem (Opcional)</label>
                        <input 
                            value={q.imageUrl || ''}
                            onChange={(e) => updateQuestion(qIndex, 'imageUrl', e.target.value)}
                            className="w-full p-2 rounded bg-black/30 border border-white/20 text-white placeholder-white/20 focus:border-white outline-none text-sm"
                            placeholder="https://exemplo.com/imagem.jpg"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.answers.map((a, aIndex) => (
                    <div key={a.id} className={`flex items-center p-2 rounded-lg transition-all border-2 ${a.isCorrect ? 'bg-green-600/20 border-green-500' : 'bg-black/20 border-transparent'}`}>
                    
                    <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center mr-2 rounded shadow-sm text-white font-bold text-sm md:text-base
                        ${a.shape === Shape.TRIANGLE ? 'bg-red-500' : 
                        a.shape === Shape.DIAMOND ? 'bg-blue-500' : 
                        a.shape === Shape.CIRCLE ? 'bg-yellow-500' : 'bg-green-500'}`}
                    >
                        {SHAPE_ICONS[a.shape]}
                    </div>
                    
                    <input 
                        value={a.text}
                        onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                        className="flex-1 bg-transparent border-b border-white/10 focus:border-white outline-none p-1 text-sm md:text-base text-white placeholder-white/30"
                        placeholder={`Resposta ${aIndex + 1}`}
                    />
                    
                    <div className="ml-2 relative">
                        <input 
                            type="checkbox" 
                            checked={a.isCorrect} 
                            onChange={() => toggleCorrect(qIndex, aIndex)}
                            className="peer sr-only"
                            id={`q${qIndex}-a${aIndex}`}
                        />
                        <label 
                            htmlFor={`q${qIndex}-a${aIndex}`}
                            className={`block w-6 h-6 md:w-8 md:h-8 rounded-full border-2 cursor-pointer flex items-center justify-center transition-colors
                                ${a.isCorrect ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white'}
                            `}
                        >
                            {a.isCorrect && <span className="text-white text-xs md:text-sm font-bold">✓</span>}
                        </label>
                    </div>
                    </div>
                ))}
                </div>
            </div>
            ))}

            <button 
                onClick={addEmptyQuestion}
                className="w-full py-4 border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:bg-white/10 hover:text-white font-bold transition-all uppercase tracking-wide flex items-center justify-center gap-2 mb-8"
            >
                <span className="text-2xl">+</span> Adicionar Pergunta
            </button>
        </div>
      </div>
    </div>
  );
};

interface LobbyProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  onCancel: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ pin, players, onStart, onCancel }) => {
  const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://kahoot.it';
  const joinUrl = `${origin}/?pin=${pin}`;

  return (
    <div className="relative z-10 flex flex-col h-screen w-full">
      <div className="bg-white text-black shadow-xl flex flex-col md:flex-row items-center justify-between px-4 py-2 md:px-6 md:py-4 shrink-0 relative z-20 gap-4 md:gap-0">
        <div className="flex items-center gap-6 w-full md:w-auto justify-center md:justify-start">
            <div className="bg-white p-2 border-2 border-black/10 rounded-xl hidden md:block shadow-lg hover:scale-[2.5] transition-transform origin-top-left z-50 cursor-pointer" title="Clique ou passe o mouse para ampliar">
                 <QRCodeView url={joinUrl} size={120} />
            </div>
            <div className="text-center md:text-left">
                <p className="text-gray-500 font-bold text-sm md:text-base uppercase tracking-wider">Entre em</p>
                <div className="text-4xl md:text-5xl font-black text-indigo-900 tracking-tight leading-none my-1">
                    kahoot.it
                </div>
                <p className="text-sm text-gray-400 font-bold font-mono hidden md:block max-w-[250px] truncate select-all">{joinUrl}</p>
            </div>
        </div>

        <div className="md:hidden my-2 bg-white p-3 rounded-2xl shadow-lg border-2 border-gray-100">
             <QRCodeView url={joinUrl} size={200} />
        </div>

        <div className="text-center md:text-right w-full md:w-auto">
            <p className="text-gray-500 font-bold text-sm md:text-base uppercase tracking-wider">PIN do Jogo</p>
            <div className="text-6xl md:text-8xl font-black tracking-widest text-black leading-none select-all">
                {pin}
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full bg-black/20 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6">
            <div className="bg-black/40 text-white px-4 py-2 md:px-6 md:py-2 rounded-full font-bold backdrop-blur-md border border-white/10 text-sm md:text-base">
                👤 {players.length} Jogador{players.length !== 1 ? 'es' : ''}
            </div>
            <button 
                onClick={onCancel}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded font-bold transition-colors text-xs md:text-sm"
            >
                Cancelar Jogo
            </button>
        </div>

        <div className="flex flex-wrap gap-3 md:gap-4 justify-center content-start pb-20">
            {players.length === 0 && (
                <div className="mt-10 md:mt-20 flex flex-col items-center animate-pulse opacity-60 text-center">
                    <div className="text-5xl md:text-6xl mb-4">⏳</div>
                    <h2 className="text-xl md:text-2xl font-bold">Aguardando jogadores...</h2>
                    <p className="text-xs md:text-sm mt-2">Use o PIN ou QR Code para entrar!</p>
                </div>
            )}

            {players.map((p) => (
                <div 
                    key={p.id} 
                    className="bg-white text-black font-black text-lg md:text-xl px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-lg animate-[bounce_0.5s_ease-out] border-b-4 border-gray-300 min-w-[100px] md:min-w-[120px] text-center"
                >
                    {p.nickname}
                </div>
            ))}
        </div>
      </div>

      <div className="p-4 md:p-6 bg-indigo-900/90 backdrop-blur-md border-t border-white/10 flex justify-end shrink-0 absolute bottom-0 w-full md:relative">
          <button 
              onClick={onStart}
              disabled={players.length === 0}
              className="w-full md:w-auto bg-white text-black font-black text-xl md:text-2xl px-8 py-3 md:px-12 md:py-4 rounded shadow-[0_4px_0_rgb(0,0,0,0.2)] hover:shadow-[0_2px_0_rgb(0,0,0,0.2)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
          >
              Iniciar Jogo
          </button>
      </div>
    </div>
  );
};

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
      <div className="flex justify-between items-start mb-4">
        <div className="bg-white text-black font-bold px-4 py-2 rounded-full text-xl shadow-lg">
            {currentQuestionIndex + 1} / {quiz.questions.length}
        </div>
        <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
            <span className="text-4xl font-black">{timeLeft}</span>
        </div>
      </div>

      <div className="bg-white text-black p-8 rounded-lg shadow-2xl text-center mb-6 mx-auto max-w-4xl w-full">
        <h2 className="text-3xl md:text-5xl font-bold leading-tight">{question.text}</h2>
      </div>

      <div className="flex-1 flex justify-center items-center mb-6 relative">
         <div className="h-full max-h-[40vh] aspect-video bg-black/20 rounded-lg overflow-hidden border-4 border-white/20 shadow-lg">
             <img src={question.imageUrl || "https://picsum.photos/800/400"} alt="Question" className="w-full h-full object-cover" />
         </div>
      </div>

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

      <div className="absolute bottom-4 left-4 text-white/50 font-bold text-xl">
          kahoot-clone-2025
      </div>
    </div>
  );
};

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
                 Você está em {place}º lugar
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

// --- MAIN APP ---

const calculateScore = (timeLeft: number, totalTime: number, streak: number) => {
    const percentage = timeLeft / totalTime;
    const baseScore = Math.floor(500 + (percentage * 500));
    const streakBonus = Math.min(streak * 100, 500);
    return baseScore + streakBonus;
};

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<'MENU' | 'HOST' | 'PLAYER'>('MENU');
  
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pin, setPin] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myFeedback, setMyFeedback] = useState<{ isCorrect: boolean; points: number; streak: number } | null>(null);
  const [myScore, setMyScore] = useState(0);

  const [isMuted, setIsMuted] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    bgMusicRef.current = new Audio(AUDIO.LOBBY_MUSIC);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    sfxRef.current = new Audio();

    const savedId = localStorage.getItem('kahoot-player-id');
    if (savedId) {
        setMyPlayerId(savedId);
    }
  }, []);

  const playSfx = (url: string) => {
      if (isMuted || !sfxRef.current) return;
      sfxRef.current.src = url;
      sfxRef.current.currentTime = 0;
      sfxRef.current.play().catch(e => console.log("Audio play failed", e));
  };

  const toggleMute = () => {
      setIsMuted(!isMuted);
      if (bgMusicRef.current) {
          bgMusicRef.current.muted = !isMuted;
      }
  };

  useEffect(() => {
    if (!bgMusicRef.current || isMuted) return;

    if (appMode === 'HOST' && (gameState === GameState.LOBBY || gameState === GameState.LEADERBOARD)) {
        bgMusicRef.current.play().catch(() => {});
    } else if (gameState === GameState.COUNTDOWN || gameState === GameState.QUESTION) {
        bgMusicRef.current.pause(); 
    } else {
        bgMusicRef.current.pause();
    }
  }, [gameState, appMode, isMuted]);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    
    channelRef.current.onmessage = (event) => {
        const msg = event.data as BroadcastMessage;
        
        if (appMode === 'PLAYER') {
            handlePlayerMessages(msg);
        } else if (appMode === 'HOST') {
            handleHostMessages(msg);
        }
    };

    if (appMode === 'PLAYER') {
        setTimeout(() => broadcast({ type: 'REQUEST_STATE' }), 500);
    }

    return () => {
        channelRef.current?.close();
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appMode]); 

  useEffect(() => {
    if (appMode === 'HOST' && players.length > 0) {
        broadcast({ type: 'UPDATE_PLAYERS', payload: players });
    }
  }, [players, appMode]);

  const startHost = (createdQuiz: Quiz) => {
    setQuiz(createdQuiz);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(newPin);
    setGameState(GameState.LOBBY);
    setAppMode('HOST');
    setTimeout(() => {
        broadcast({ type: 'SYNC_STATE', payload: { state: GameState.LOBBY, currentQuestionIndex: 0, totalQuestions: createdQuiz.questions.length, pin: newPin } });
    }, 500);
  };

  const handleHostMessages = (msg: BroadcastMessage) => {
    if (msg.type === 'JOIN') {
        setPlayers(prev => {
            if (prev.find(p => p.id === msg.payload.id)) return prev;
            playSfx(AUDIO.CORRECT); 
            return [...prev, { id: msg.payload.id, nickname: msg.payload.nickname, score: 0, streak: 0 }];
        });
    } else if (msg.type === 'REQUEST_STATE') {
        if (quiz && pin) {
            broadcast({ type: 'SYNC_STATE', payload: { state: gameState, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
            broadcast({ type: 'UPDATE_PLAYERS', payload: players });
        }
    } else if (msg.type === 'SUBMIT_ANSWER') {
        const { playerId, answerId, timeLeft: answerTime } = msg.payload;
        
        setPlayers(prev => {
            const playerIndex = prev.findIndex(p => p.id === playerId);
            if (playerIndex === -1) return prev;
            
            const player = prev[playerIndex];
            const currentQ = quiz?.questions[currentQIndex];
            
            if (!currentQ) return prev;

            const answerShape = answerId as unknown as Shape; 
            const isCorrect = currentQ.answers.find(a => a.shape === answerShape)?.isCorrect || false;
            
            const currentStreak = isCorrect ? player.streak + 1 : 0;
            const pointsToAdd = isCorrect ? calculateScore(answerTime, currentQ.timeLimit, currentStreak) : 0;

            broadcast({ 
                type: 'ANSWER_RESULT', 
                payload: { 
                    playerId, 
                    isCorrect, 
                    pointsToAdd, 
                    newStreak: currentStreak 
                } 
            });

            const newPlayers = [...prev];
            newPlayers[playerIndex] = {
                ...player,
                score: player.score + pointsToAdd,
                streak: currentStreak,
                lastAnswerCorrect: isCorrect
            };
            return newPlayers;
        });
    }
  };

  const hostStartGame = () => {
      hostStartCountdown();
  };

  const hostStartCountdown = () => {
      playSfx(AUDIO.COUNTDOWN);
      setGameState(GameState.COUNTDOWN);
      setTimeLeft(5);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.COUNTDOWN, currentQuestionIndex: currentQIndex, totalQuestions: quiz!.questions.length, pin } });
      
      let count = 5;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
          count--;
          setTimeLeft(count);
          if (count <= 0) {
              clearInterval(timerRef.current);
              hostStartQuestion();
          }
      }, 1000);
  };

  const hostStartQuestion = () => {
      setGameState(GameState.QUESTION);
      const q = quiz!.questions[currentQIndex];
      setTimeLeft(q.timeLimit);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.QUESTION, currentQuestionIndex: currentQIndex, totalQuestions: quiz!.questions.length, pin } });
      broadcast({ type: 'QUESTION_START', payload: { questionIndex: currentQIndex, timeLimit: q.timeLimit } });

      let count = q.timeLimit;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
          count--;
          setTimeLeft(count);
          if (count <= 0) {
              clearInterval(timerRef.current);
              hostShowLeaderboard();
          }
      }, 1000);
  };

  const hostShowLeaderboard = () => {
      playSfx(AUDIO.TIME_UP);
      setGameState(GameState.LEADERBOARD);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.LEADERBOARD, currentQuestionIndex: currentQIndex, totalQuestions: quiz!.questions.length, pin } });
  };

  const hostNextQuestion = () => {
      if (currentQIndex + 1 >= quiz!.questions.length) {
          setGameState(GameState.PODIUM);
          broadcast({ type: 'SYNC_STATE', payload: { state: GameState.PODIUM, currentQuestionIndex: currentQIndex, totalQuestions: quiz!.questions.length, pin } });
      } else {
          setCurrentQIndex(prev => prev + 1);
          hostStartCountdown();
      }
  };

  const broadcast = (msg: BroadcastMessage) => {
      channelRef.current?.postMessage(msg);
  };

  const handlePlayerMessages = (msg: BroadcastMessage) => {
      if (msg.type === 'SYNC_STATE') {
          setGameState(msg.payload.state);
          if (msg.payload.state === GameState.QUESTION) {
              setHasAnswered(false);
              setMyFeedback(null); 
          }
          if (msg.payload.state === GameState.LOBBY) {
              setMyScore(0);
          }
      } 
      else if (msg.type === 'UPDATE_PLAYERS') {
          setPlayers(msg.payload);
          const me = msg.payload.find(p => p.id === myPlayerId);
          if (me) {
              setMyScore(me.score);
          }
      }
      else if (msg.type === 'ANSWER_RESULT') {
          if (msg.payload.playerId === myPlayerId) {
              setMyFeedback({
                  isCorrect: msg.payload.isCorrect,
                  points: msg.payload.pointsToAdd,
                  streak: msg.payload.newStreak
              });
              if (msg.payload.isCorrect) playSfx(AUDIO.CORRECT);
              else playSfx(AUDIO.WRONG);
          }
      }
  };
  
  const playerJoin = (nickname: string) => {
      let id = myPlayerId;
      if (!id) {
        id = `p-${Date.now()}-${Math.floor(Math.random()*1000)}`;
        setMyPlayerId(id);
        localStorage.setItem('kahoot-player-id', id);
      }
      broadcast({ type: 'JOIN', payload: { nickname, id } });
      setGameState(GameState.LOBBY); 
  };

  const playerSubmit = (shape: Shape) => {
      if (hasAnswered) return;
      setHasAnswered(true);
      broadcast({ type: 'SUBMIT_ANSWER', payload: { playerId: myPlayerId, answerId: shape, timeLeft } }); 
  };

  const handleBackToMenu = () => {
    const isHost = appMode === 'HOST';
    const isPlayerJoined = appMode === 'PLAYER' && players.some(p => p.id === myPlayerId);

    if (isHost || isPlayerJoined) {
        if (!window.confirm("Tem certeza que deseja sair? O progresso atual do jogo será perdido.")) {
            return;
        }
    }

    setAppMode('MENU');
    setGameState(GameState.MENU);
    setQuiz(null);
    setPin("");
    setPlayers([]);
    setCurrentQIndex(0);
    setTimeLeft(0);
    setMyFeedback(null);
    setHasAnswered(false);
    if (bgMusicRef.current) bgMusicRef.current.pause();
  };

  if (appMode === 'MENU') {
      return (
        <div className="relative min-h-screen font-sans text-white overflow-hidden flex flex-col items-center justify-center">
            <Background />
            <div className="relative z-10 text-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full">
                <h1 className="text-6xl font-black mb-2 tracking-tight">Kahoot!</h1>
                <p className="text-xl mb-12 opacity-80 font-bold text-purple-200">Experiência Clone 2025</p>
                
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={() => {
                            setAppMode('HOST');
                            setGameState(GameState.CREATE);
                        }}
                        className="bg-white text-indigo-900 font-black text-xl py-4 rounded shadow-lg hover:scale-105 transition-transform"
                    >
                        Hospedar Jogo
                    </button>
                    <button 
                        onClick={() => setAppMode('PLAYER')}
                        className="bg-indigo-600 border-2 border-indigo-400 text-white font-bold text-xl py-4 rounded shadow-lg hover:bg-indigo-500 transition-colors"
                    >
                        Entrar no Jogo
                    </button>
                </div>
                <p className="mt-8 text-xs text-white/40">
                    Hospede em um dispositivo, entre em outros usando o mesmo Wi-Fi.<br/>
                    Desenvolvido com React.
                </p>
            </div>
        </div>
      );
  }

  const shouldShowBackButton = () => {
      if (appMode === 'HOST') return false;
      if (appMode === 'PLAYER') {
         const isJoined = players.some(p => p.id === myPlayerId);
         return !isJoined;
      }
      return true;
  };

  const BackButton = () => (
    <button 
        onClick={handleBackToMenu}
        className="absolute top-4 left-4 z-50 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-colors flex items-center gap-2"
    >
        <span>←</span> Voltar
    </button>
  );

  if (appMode === 'HOST') {
      return (
        <div className="relative min-h-screen text-white overflow-hidden flex flex-col">
             <Background />
             {shouldShowBackButton() && <BackButton />}
             <div className="absolute bottom-4 right-4 z-50">
                <button 
                    onClick={toggleMute} 
                    className="bg-white/20 p-3 rounded-full hover:bg-white/40 transition-colors shadow-lg border border-white/10"
                    title={isMuted ? "Ativar som" : "Mudo"}
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>
             </div>

             {gameState === GameState.CREATE ? (
                 <QuizCreator onSave={startHost} onCancel={handleBackToMenu} />
             ) : gameState === GameState.LOBBY ? (
                 <Lobby pin={pin} players={players} onStart={hostStartGame} onCancel={handleBackToMenu} />
             ) : (
                 <HostGame 
                    quiz={quiz!} 
                    players={players} 
                    currentQuestionIndex={currentQIndex} 
                    timeLeft={timeLeft}
                    gameState={gameState}
                    onNext={hostNextQuestion}
                 />
             )}
        </div>
      );
  }

  const myPlayer = players.find(p => p.id === myPlayerId);
  const myNickname = myPlayer ? myPlayer.nickname : "";
  const myRank = players.sort((a,b) => b.score - a.score).findIndex(p => p.id === myPlayerId) + 1;

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
        <Background />
        {shouldShowBackButton() && <BackButton />}
        <PlayerView 
            onJoin={playerJoin} 
            onSubmit={playerSubmit} 
            gameState={gameState} 
            hasAnswered={hasAnswered}
            score={myScore}
            place={myRank}
            nickname={myNickname} 
            feedback={myFeedback}
        />
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);