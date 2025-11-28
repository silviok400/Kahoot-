import React, { useState, useEffect, useRef } from 'react';
import { BroadcastMessage, GameState, Player, Quiz, Shape } from './types';
import { AUDIO } from './constants';
import Background from './components/Shared/Background';
import { QuizCreator } from './components/Host/QuizCreator';
import Lobby from './components/Host/Lobby';
import HostGame from './components/Host/HostGame';
import PlayerView from './components/Player/PlayerView';
import { supabase, createGameSession, registerPlayer } from './lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

const CHANNEL_NAME = 'kahoot-clone-2025';

// Helper to calculate score based on Kahoot algorithm + Streak
const calculateScore = (timeLeft: number, totalTime: number, streak: number) => {
    // Basic: Up to 1000 points depending on speed
    const percentage = timeLeft / totalTime;
    const baseScore = Math.floor(500 + (percentage * 500));
    
    // Streak Bonus: +100 per streak level, capped at 500 bonus
    const streakBonus = Math.min(streak * 100, 500);
    
    return baseScore + streakBonus;
};

// --- COMPONENTE DE STATUS DA CONEXÃO ---
const ConnectionBadge: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div className="fixed top-2 right-2 md:top-4 md:right-4 z-[100] flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl transition-all hover:bg-black/80 cursor-help" title={isConnected ? "Conectado ao servidor" : "Sem conexão com o servidor"}>
    <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors duration-500 ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}`} />
    <span className="text-[10px] md:text-xs font-bold text-white/90 uppercase tracking-wider">
      {isConnected ? 'Online' : 'Offline'}
    </span>
  </div>
);

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<'MENU' | 'HOST' | 'PLAYER'>('MENU');
  
  // Game State
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [pin, setPin] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Player specific state (only used if appMode === 'PLAYER')
  const [myPlayerId, setMyPlayerId] = useState<string>("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myFeedback, setMyFeedback] = useState<{ isCorrect: boolean; points: number; streak: number } | null>(null);
  const [myScore, setMyScore] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Audio
  const [isMuted, setIsMuted] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const sfxRef = useRef<HTMLAudioElement | null>(null);

  // Comms
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<any>(null);

  // --- INIT & AUDIO ---
  useEffect(() => {
    bgMusicRef.current = new Audio(AUDIO.LOBBY_MUSIC);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    sfxRef.current = new Audio();

    // Check LocalStorage for existing player session
    const savedId = localStorage.getItem('kahoot-player-id');
    if (savedId) {
        setMyPlayerId(savedId);
    }
  }, []);

  const playSfx = (url: string) => {
      if (isMuted || !sfxRef.current) return;
      sfxRef.current.src = url;
      sfxRef.current.currentTime = 0;
      sfxRef.current.play().catch(e => console.log("Audio play failed (interaction needed)", e));
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

  // --- SUPABASE REALTIME SYSTEM ---
  useEffect(() => {
    // 1. Create/Get the channel
    const channel = supabase.channel(CHANNEL_NAME);

    // 2. Subscribe to broadcast events
    channel
      .on(
        'broadcast',
        { event: 'game-event' },
        (payload) => {
          const msg = payload.payload as BroadcastMessage;
          
          if (appMode === 'PLAYER') {
            handlePlayerMessages(msg);
          } else if (appMode === 'HOST') {
            handleHostMessages(msg);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          console.log('Connected to Supabase Realtime');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setIsConnected(false);
          console.log('Supabase Disconnected:', status);
        }
      });

    channelRef.current = channel;

    // If I just opened as player, ask for state (give it a moment to connect)
    if (appMode === 'PLAYER') {
        setTimeout(() => broadcast({ type: 'REQUEST_STATE' }), 1000);
    }

    return () => {
        supabase.removeChannel(channel);
        if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [appMode]); // Re-bind if appMode changes (so the handlers use the correct mode)

  // --- SYNC PLAYERS HOST -> CLIENT ---
  useEffect(() => {
    if (appMode === 'HOST' && players.length > 0) {
        broadcast({ type: 'UPDATE_PLAYERS', payload: players });
    }
  }, [players, appMode]);


  // --- HOST LOGIC ---

  const startHost = (createdQuiz: Quiz) => {
    setQuiz(createdQuiz);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(newPin);
    
    // DB: Create Game Session in 'jogos'
    createGameSession(newPin, createdQuiz.title).then(() => {
        console.log("Game session created in DB for PIN:", newPin);
    });

    setGameState(GameState.LOBBY);
    setAppMode('HOST');
    // Initial broadcast
    setTimeout(() => {
        broadcast({ type: 'SYNC_STATE', payload: { state: GameState.LOBBY, currentQuestionIndex: 0, totalQuestions: createdQuiz.questions.length, pin: newPin } });
    }, 1000);
  };

  const handleHostMessages = (msg: BroadcastMessage) => {
    if (msg.type === 'JOIN') {
        setPlayers(prev => {
            if (prev.find(p => p.id === msg.payload.id)) return prev;
            playSfx(AUDIO.CORRECT); 
            return [...prev, { id: msg.payload.id, nickname: msg.payload.nickname, score: 0, streak: 0 }];
        });
    } else if (msg.type === 'REQUEST_STATE') {
        // A new player joined or refreshed, send them the current state
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

  const broadcast = async (msg: BroadcastMessage) => {
      if (!channelRef.current) return;
      try {
        await channelRef.current.send({
            type: 'broadcast',
            event: 'game-event',
            payload: msg
        });
      } catch (err) {
        console.error("Broadcast error", err);
      }
  };

  // --- PLAYER LOGIC ---

  const handlePlayerMessages = (msg: BroadcastMessage) => {
      if (msg.type === 'SYNC_STATE') {
          setGameState(msg.payload.state);
          // If we receive state, we can also imply the PIN if needed, 
          // but mainly we update UI mode
          
          if (msg.payload.state === GameState.QUESTION) {
              setHasAnswered(false);
              setMyFeedback(null); 
          }
          if (msg.payload.state === GameState.LOBBY) {
              setMyScore(0);
          }
      } 
      else if (msg.type === 'UPDATE_PLAYERS') {
          // IMPORTANT: Update local list of players so we can find ourselves
          setPlayers(msg.payload);
          
          // Update my own score from server truth
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
      
      // DB: Register player in 'jogadores' linked to this PIN
      // Note: We need the PIN from URL if direct join, but the PlayerView manages validation
      // Here we assume PIN is available via URL or passed context if we refined further, 
      // but 'pin' state in App.tsx might be empty for player.
      // However, we can try to grab it from URL params for DB logging.
      const urlParams = new URLSearchParams(window.location.search);
      const pinParam = urlParams.get('pin');
      if (pinParam) {
          registerPlayer(pinParam, nickname).then(() => {
              console.log("Player registered in DB");
          });
      }

      setGameState(GameState.LOBBY); 
  };

  const playerSubmit = (shape: Shape) => {
      if (hasAnswered) return;
      setHasAnswered(true);
      broadcast({ type: 'SUBMIT_ANSWER', payload: { playerId: myPlayerId, answerId: shape, timeLeft } }); 
  };

  // --- NAVIGATION LOGIC ---
  const handleBackToMenu = () => {
    const isHost = appMode === 'HOST';
    // If we are a host and have moved past the initial menu (e.g. creating quiz or lobby)
    // Or if we are a player and are joined
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
    // We do not clear myPlayerId to allow rejoining easily
    if (bgMusicRef.current) bgMusicRef.current.pause();
  };

  // --- RENDER ---

  if (appMode === 'MENU') {
      return (
        <div className="relative min-h-screen font-sans text-white overflow-hidden flex flex-col items-center justify-center">
            <Background />
            <ConnectionBadge isConnected={isConnected} />
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
                {!isConnected && (
                    <p className="mt-4 text-xs text-yellow-300 animate-pulse">
                        Conectando ao servidor...
                    </p>
                )}
                <p className="mt-8 text-xs text-white/40">
                    Hospede em um dispositivo, entre em outros pela internet.<br/>
                    Powered by Supabase Realtime & DB.
                </p>
            </div>
        </div>
      );
  }

  // Common Back Button Logic
  const shouldShowBackButton = () => {
      // Host: Never show back button once we leave MENU
      if (appMode === 'HOST') return false;
      
      // Player: Show only if NOT joined yet (still on PIN screen)
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

  // --- HOST VIEW ---
  if (appMode === 'HOST') {
      return (
        <div className="relative min-h-screen text-white overflow-hidden flex flex-col">
             <Background />
             <ConnectionBadge isConnected={isConnected} />
             {shouldShowBackButton() && <BackButton />}
             {/* Mute Button moved to bottom-right to avoid header overlap */}
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

  // --- PLAYER VIEW ---
  // Find my nickname from the synced list
  const myPlayer = players.find(p => p.id === myPlayerId);
  const myNickname = myPlayer ? myPlayer.nickname : "";
  const myRank = players.sort((a,b) => b.score - a.score).findIndex(p => p.id === myPlayerId) + 1;

  return (
    <div className="relative min-h-screen text-white overflow-hidden">
        <Background />
        <ConnectionBadge isConnected={isConnected} />
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

export default App;