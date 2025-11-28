// --- IMPORTS ---
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import QRCodeStyling from 'qr-code-styling';
import { createClient } from "@supabase/supabase-js";

// --- From types.ts ---
const GameState = {
    MENU: 'MENU',
    CREATE: 'CREATE',
    LOBBY: 'LOBBY',
    COUNTDOWN: 'COUNTDOWN',
    QUESTION: 'QUESTION',
    LEADERBOARD: 'LEADERBOARD',
    PODIUM: 'PODIUM',
};
const Shape = {
    TRIANGLE: 'triangle', // Red
    DIAMOND: 'diamond',   // Blue
    CIRCLE: 'circle',     // Yellow
    SQUARE: 'square'      // Green
};

// --- From constants.ts ---
const COLORS = {
  [Shape.TRIANGLE]: 'bg-red-600 hover:bg-red-500',
  [Shape.DIAMOND]: 'bg-blue-600 hover:bg-blue-500',
  [Shape.CIRCLE]: 'bg-yellow-500 hover:bg-yellow-400',
  [Shape.SQUARE]: 'bg-green-600 hover:bg-green-500',
};
const SHAPE_ICONS = {
  [Shape.TRIANGLE]: '▲',
  [Shape.DIAMOND]: '◆',
  [Shape.CIRCLE]: '●',
  [Shape.SQUARE]: '■',
};
const AUDIO = {
  LOBBY_MUSIC: 'https://cdn.pixabay.com/audio/2022/03/10/audio_5b80a18413.mp3',
  COUNTDOWN: 'https://cdn.pixabay.com/audio/2022/03/15/audio_2738a08711.mp3',
  CORRECT: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c153e2.mp3',
  WRONG: 'https://cdn.pixabay.com/audio/2021/08/04/audio_c6ccf3232f.mp3',
  TIME_UP: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
};

// --- From lib/supabase.ts ---
const SUPABASE_URL = "https://szkpmdfcrucpwifbokkc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6a3BtZGZjcnVjcHdpZmJva2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTc5NDcsImV4cCI6MjA3OTE3Mzk0N30.MU-dW7-ZwRRS9weupQ4kb0dZN6brurW0PNQtbIPCn_U";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
        schema: 'public',
    },
});

const createGameSession = async (pin, quizTitle) => {
    const { data, error } = await supabase
        .from('games')
        .insert([{ 
            pin: pin, 
            status: 'LOBBY',
            quiz_name: quizTitle || "Quiz Sem Nome"
        }])
        .select()
        .single();
    
    if (error) console.error("Erro ao criar jogo:", JSON.stringify(error, null, 2));
    return data;
};

const registerPlayer = async (pin, nickname) => {
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('pin', pin)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (gameError || !game) {
        console.error("Erro ao encontrar jogo:", gameError);
        return null;
    }

    const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert([{ game_id: game.id, nickname: nickname, score: 0 }])
        .select()
        .single();
    
    if (playerError) {
        console.error("Erro ao registrar jogador:", playerError);
        return null;
    }

    return newPlayer;
};

const deletePlayer = async (playerId) => {
    if (!playerId) return;
    const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
    if (error) {
        console.error("Erro ao deletar jogador:", error);
    }
};

// --- From components/Shared/Background.tsx ---
const Background = () => {
  return (
    React.createElement('div', { className: "fixed inset-0 overflow-hidden pointer-events-none z-0" },
      React.createElement('div', { className: "absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-purple-800" }),
      [...Array(10)].map((_, i) => (
        React.createElement('div', {
          key: i,
          className: "shape-bg bg-white/10 rounded-lg absolute",
          style: {
            width: `${Math.random() * 100 + 50}px`,
            height: `${Math.random() * 100 + 50}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100 + 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 15}s`,
          }
        })
      ))
    )
  );
};

// --- From components/Host/QuizCreator.tsx ---
const QuizCreator = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("Meu Quiz Incrível");
  const [questions, setQuestions] = useState([]);
  
  const addEmptyQuestion = () => {
    const newQ = {
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

  const updateQuestion = (index, field, value) => {
    const newQs = [...questions];
    newQs[index][field] = value;
    setQuestions(newQs);
  };

  const updateAnswer = (qIndex, aIndex, text) => {
    const newQs = [...questions];
    newQs[qIndex].answers[aIndex].text = text;
    setQuestions(newQs);
  };

  const toggleCorrect = (qIndex, aIndex) => {
    const newQs = [...questions];
    newQs[qIndex].answers[aIndex].isCorrect = !newQs[qIndex].answers[aIndex].isCorrect;
    setQuestions(newQs);
  };

  const handleFileSelect = (qIndex, file) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            updateQuestion(qIndex, 'imageUrl', reader.result);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e, qIndex) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      handleFileSelect(qIndex, file);
  };

  return React.createElement('div', { className: "relative z-10 flex flex-col w-full h-[100dvh] md:h-[90vh] md:max-w-5xl md:mx-auto bg-slate-900/90 md:bg-white/10 backdrop-blur-md md:rounded-xl border-none md:border border-white/20 shadow-2xl md:mt-4 overflow-hidden" },
      React.createElement('div', { className: "flex flex-col md:flex-row justify-between items-center p-4 bg-black/20 border-b border-white/10 shrink-0 gap-3" },
        React.createElement('div', { className: "flex items-center gap-4 w-full md:w-auto text-center md:text-left" },
          React.createElement('h2', { className: "text-xl md:text-3xl font-black text-white" }, "Criar Kahoot!")
        ),
        React.createElement('div', { className: "flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end" },
            React.createElement('div', { className: "flex gap-2 ml-auto" },
                React.createElement('button', { onClick: onCancel, className: "flex-1 md:flex-none px-3 py-2 bg-gray-600 rounded font-bold hover:bg-gray-500 text-sm" }, "Cancelar"),
                React.createElement('button', { onClick: () => onSave({ title, questions }), disabled: questions.length === 0, className: "flex-1 md:flex-none px-4 py-2 bg-green-600 rounded font-bold hover:bg-green-500 disabled:opacity-50 text-sm whitespace-nowrap" }, "Jogar Agora")
            )
        )
      ),
      React.createElement('div', { className: "flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6" },
        React.createElement('div', null,
            React.createElement('label', { className: "block text-xs uppercase font-bold mb-1 text-white/70" }, "Título do Quiz"),
            React.createElement('input', { value: title, onChange: (e) => setTitle(e.target.value), className: "w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-white focus:bg-white/20 transition-all font-bold text-lg", placeholder: "Digite o título..." })
        ),
        React.createElement('div', { className: "space-y-6" },
            questions.length === 0 && (
                React.createElement('div', { className: "text-center py-12 md:py-20 text-white/50 border-2 border-dashed border-white/20 rounded-xl bg-white/5" },
                    React.createElement('p', { className: "text-lg font-bold mb-2" }, "Seu quiz está vazio!"),
                    React.createElement('p', { className: "text-sm" }, "Clique em \"Adicionar Pergunta\".")
                )
            ),
            questions.map((q, qIndex) => (
            React.createElement('div', { key: q.id, className: "bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg relative group" },
                React.createElement('div', { className: "flex justify-between items-center mb-3" },
                    React.createElement('h3', { className: "font-bold text-white/80 text-sm uppercase" }, `Pergunta ${qIndex + 1}`),
                    React.createElement('button', { onClick: () => setQuestions(questions.filter((_, i) => i !== qIndex)), className: "text-red-400 hover:text-red-300 p-1 hover:bg-red-400/10 rounded", title: "Excluir Pergunta" }, "🗑️")
                ),
                React.createElement('input', { value: q.text, onChange: (e) => updateQuestion(qIndex, 'text', e.target.value), className: "w-full p-3 mb-4 text-lg md:text-xl font-bold text-center rounded-lg bg-white text-black placeholder-gray-400 focus:ring-4 ring-indigo-500/50 outline-none", placeholder: "Digite a pergunta aqui..." }),
                React.createElement('div', { className: "flex flex-col md:flex-row gap-3 mb-4" },
                    React.createElement('div', { className: "w-full md:w-1/3" },
                        React.createElement('label', { className: "text-[10px] uppercase font-bold text-white/60 mb-1 block" }, "Tempo (s)"),
                        React.createElement('select', { value: q.timeLimit, onChange: (e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value)), className: "w-full p-2 rounded bg-black/30 border border-white/20 text-white focus:border-white outline-none" },
                            React.createElement('option', { value: 5 }, "5 segundos"),
                            React.createElement('option', { value: 10 }, "10 segundos"),
                            React.createElement('option', { value: 20 }, "20 segundos"),
                            React.createElement('option', { value: 30 }, "30 segundos"),
                            React.createElement('option', { value: 60 }, "60 segundos"),
                            React.createElement('option', { value: 120 }, "120 segundos")
                        )
                    ),
                    React.createElement('div', { className: "w-full md:w-2/3" },
                        React.createElement('label', { className: "text-[10px] uppercase font-bold text-white/60 mb-1 block" }, "Imagem (Opcional)"),
                        q.imageUrl ? (
                            React.createElement('div', { className: 'relative group' },
                                React.createElement('img', { src: q.imageUrl, alt: "Pré-visualização", className: 'w-full h-24 object-cover rounded-md bg-black/30 border border-white/20' }),
                                React.createElement('button', {
                                    onClick: () => updateQuestion(qIndex, 'imageUrl', null),
                                    className: 'absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity'
                                }, 'X')
                            )
                        ) : (
                            React.createElement('label', {
                                htmlFor: `file-upload-${q.id}`,
                                className: 'flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/30 rounded-lg cursor-pointer bg-black/30 hover:bg-black/50 transition-colors',
                                onDragOver: handleDragOver,
                                onDrop: (e) => handleDrop(e, qIndex)
                            },
                                React.createElement('div', { className: 'text-center pointer-events-none' },
                                    React.createElement('p', { className: 'text-sm font-bold text-white/70' }, '🖼️'),
                                    React.createElement('p', { className: 'text-xs text-white/70' }, 'Arraste ou clique para enviar'),
                                ),
                                React.createElement('input', {
                                    id: `file-upload-${q.id}`,
                                    type: 'file',
                                    className: 'hidden',
                                    accept: 'image/*',
                                    onChange: (e) => handleFileSelect(qIndex, e.target.files[0])
                                })
                            )
                        )
                    )
                ),
                React.createElement('div', { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                q.answers.map((a, aIndex) => (
                    React.createElement('div', { key: a.id, className: `flex items-center p-2 rounded-lg transition-all border-2 ${a.isCorrect ? 'bg-green-600/20 border-green-500' : 'bg-black/20 border-transparent'}` },
                    React.createElement('div', { className: `w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center mr-2 rounded shadow-sm text-white font-bold text-sm md:text-base ${a.shape === Shape.TRIANGLE ? 'bg-red-500' : a.shape === Shape.DIAMOND ? 'bg-blue-500' : a.shape === Shape.CIRCLE ? 'bg-yellow-500' : 'bg-green-500'}` }, a.shape === Shape.TRIANGLE ? '▲' : a.shape === Shape.DIAMOND ? '◆' : a.shape === Shape.CIRCLE ? '●' : '■'),
                    React.createElement('input', { value: a.text, onChange: (e) => updateAnswer(qIndex, aIndex, e.target.value), className: "flex-1 bg-transparent border-b border-white/10 focus:border-white outline-none p-1 text-sm md:text-base text-white placeholder-white/30", placeholder: `Resposta ${aIndex + 1}` }),
                    React.createElement('div', { className: "ml-2 relative" },
                        React.createElement('input', { type: "checkbox", checked: a.isCorrect, onChange: () => toggleCorrect(qIndex, aIndex), className: "peer sr-only", id: `q${qIndex}-a${aIndex}` }),
                        React.createElement('label', { htmlFor: `q${qIndex}-a${aIndex}`, className: `block w-6 h-6 md:w-8 md:h-8 rounded-full border-2 cursor-pointer flex items-center justify-center transition-colors ${a.isCorrect ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white'}` }, a.isCorrect && React.createElement('span', { className: "text-white text-xs md:text-sm font-bold" }, "✓"))
                    ))
                )))
            )
            )),
            React.createElement('button', { onClick: addEmptyQuestion, className: "w-full py-4 border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:bg-white/10 hover:text-white font-bold transition-all uppercase tracking-wide flex items-center justify-center gap-2 mb-8" },
                React.createElement('span', { className: "text-2xl" }, "+"), " Adicionar Pergunta"
            )
        )
      )
    );
};

// --- From components/Host/Lobby.tsx ---
const QRCodeView = ({ url, size }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current) return;

        ref.current.innerHTML = ''; // Clear previous QR code

        const qrCode = new QRCodeStyling({
            width: size,
            height: size,
            type: 'svg',
            data: url,
            dotsOptions: { color: "#000000", type: "rounded" },
            cornersSquareOptions: { type: "extra-rounded", color: "#000000" },
            backgroundOptions: { color: "#ffffff" },
            imageOptions: { crossOrigin: "anonymous", margin: 10 }
        });
        
        qrCode.append(ref.current);
    }, [url, size]);

    return React.createElement('div', { ref: ref, className: "overflow-hidden rounded-lg" });
};

const Lobby = ({ pin, players, onStart, onCancel }) => {
  const [isExiting, setIsExiting] = useState(false);
  const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://kahoot.it';
  const joinUrl = `${origin}/?pin=${pin}`;

  const handleStart = () => {
    setIsExiting(true);
    setTimeout(onStart, 500); // Animation duration
  };

  return (
    React.createElement('div', { className: `relative z-10 flex flex-col h-screen w-full ${isExiting ? 'animate-fade-out' : 'animate-fade-in'}` },
      React.createElement('div', { className: "bg-white text-black shadow-xl flex flex-col md:flex-row items-center justify-between px-4 py-2 md:px-6 md:py-4 shrink-0 relative z-20 gap-4 md:gap-0" },
        React.createElement('div', { className: "flex items-center gap-6 w-full md:w-auto justify-center md:justify-start" },
            React.createElement('div', { className: "bg-white p-2 border-2 border-black/10 rounded-xl hidden md:block shadow-lg hover:scale-[2.5] transition-transform origin-top-left z-50 cursor-pointer", title: "Clique ou passe o mouse para ampliar" },
                 React.createElement(QRCodeView, { url: joinUrl, size: 120 })
            ),
            React.createElement('div', { className: "text-center md:text-left" },
                React.createElement('p', { className: "text-gray-500 font-bold text-sm md:text-base uppercase tracking-wider" }, "Entre em"),
                React.createElement('div', { className: "text-4xl md:text-5xl font-black text-indigo-900 tracking-tight leading-none my-1" }, "kahoot.it"),
                React.createElement('p', { className: "text-sm text-gray-400 font-bold font-mono hidden md:block max-w-[250px] truncate select-all" }, joinUrl)
            )
        ),
        React.createElement('div', { className: "md:hidden my-2 bg-white p-3 rounded-2xl shadow-lg border-2 border-gray-100" },
             React.createElement(QRCodeView, { url: joinUrl, size: 200 })
        ),
        React.createElement('div', { className: "text-center md:text-right w-full md:w-auto" },
            React.createElement('p', { className: "text-gray-500 font-bold text-sm md:text-base uppercase tracking-wider" }, "PIN do Jogo"),
            React.createElement('div', { className: "text-6xl md:text-8xl font-black tracking-widest text-black leading-none select-all" }, pin)
        )
      ),
      React.createElement('div', { className: "flex-1 overflow-y-auto p-4 md:p-8 w-full bg-black/20 backdrop-blur-sm" },
        React.createElement('div', { className: "flex justify-between items-center mb-6" },
            React.createElement('div', { className: "bg-black/40 text-white px-4 py-2 md:px-6 md:py-2 rounded-full font-bold backdrop-blur-md border border-white/10 text-sm md:text-base" }, `👤 ${players.length} Jogador${players.length !== 1 ? 'es' : ''}`),
            React.createElement('button', { onClick: onCancel, className: "bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded font-bold transition-colors text-xs md:text-sm" }, "Cancelar Jogo")
        ),
        React.createElement('div', { className: "flex flex-wrap gap-3 md:gap-4 justify-center content-start pb-20" },
            players.length === 0 && (
                React.createElement('div', { className: "mt-10 md:mt-20 flex flex-col items-center animate-pulse opacity-60 text-center" },
                    React.createElement('div', { className: "text-5xl md:text-6xl mb-4" }, "⏳"),
                    React.createElement('h2', { className: "text-xl md:text-2xl font-bold" }, "Aguardando jogadores..."),
                    React.createElement('p', { className: "text-xs md:text-sm mt-2" }, "Use o PIN ou QR Code para entrar!")
                )
            ),
            players.map((p) => (
                React.createElement('div', { key: p.id, className: "bg-white text-black font-black text-lg md:text-xl px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-lg animate-[bounce_0.5s_ease-out] border-b-4 border-gray-300 min-w-[100px] md:min-w-[120px] text-center" }, p.nickname)
            ))
        )
      ),
      React.createElement('div', { className: "p-4 md:p-6 bg-indigo-900/90 backdrop-blur-md border-t border-white/10 flex justify-end shrink-0 absolute bottom-0 w-full md:relative" },
          React.createElement('button', { onClick: handleStart, disabled: players.length === 0 || isExiting, className: "w-full md:w-auto bg-white text-black font-black text-xl md:text-2xl px-8 py-3 md:px-12 md:py-4 rounded shadow-[0_4px_0_rgb(0,0,0,0.2)] hover:shadow-[0_2px_0_rgb(0,0,0,0.2)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none" }, "Iniciar Jogo")
      )
    )
  );
};

// --- From components/Host/HostGame.tsx ---
const HostGame = ({ quiz, players, currentQuestionIndex, timeLeft, gameState, onNext, onEndGame }) => {
  const question = quiz.questions[currentQuestionIndex];
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  const AnimatedScreen = ({ children, animationClass, key }) => (
    React.createElement('div', { key: key, className: `w-full h-full flex flex-col items-center justify-center ${animationClass}` }, children)
  );

  const renderContent = () => {
    switch (gameState) {
      case GameState.COUNTDOWN:
        return React.createElement(AnimatedScreen, { key: 'countdown', animationClass: 'animate-zoom-in' },
          React.createElement('h1', { className: "text-4xl font-bold mb-8 text-center px-4" }, quiz.title),
          React.createElement('div', { className: "text-[12rem] font-black" }, timeLeft),
          React.createElement('p', { className: "text-2xl mt-8" }, "Prepare-se!")
        );

      case GameState.LEADERBOARD:
      case GameState.PODIUM:
        const isPodium = gameState === GameState.PODIUM;
        return React.createElement(AnimatedScreen, { key: isPodium ? 'podium' : `leaderboard-${currentQuestionIndex}`, animationClass: 'animate-fade-in' },
          React.createElement('div', { className: "flex flex-col items-center pt-10 h-full w-full max-w-4xl mx-auto" },
            React.createElement('h1', { className: "text-4xl font-black bg-white text-indigo-900 px-8 py-2 rounded-lg mb-10" }, isPodium ? 'Pódio' : 'Placar'),
            React.createElement('div', { className: "flex flex-col gap-4 w-full px-8" },
              sortedPlayers.slice(0, 5).map((p, idx) => (
                React.createElement('div', { key: p.id, className: "flex items-center justify-between bg-white/10 backdrop-blur rounded-lg p-4 animate-slide-in-from-right", style: { animationDelay: `${idx * 0.1}s` } },
                  React.createElement('div', { className: "flex items-center gap-4" },
                    React.createElement('span', { className: "font-black text-2xl w-8" }, idx + 1),
                    React.createElement('span', { className: "font-bold text-xl" }, p.nickname),
                    p.streak > 2 && React.createElement('span', { className: "bg-orange-500 text-xs font-bold px-2 py-1 rounded-full" }, `🔥 ${p.streak}`)
                  ),
                  React.createElement('span', { className: "font-black text-2xl" }, p.score)
                )
              ))
            ),
            React.createElement('button', { onClick: isPodium ? onEndGame : onNext, className: "mt-auto mb-10 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded shadow-lg transition-transform hover:scale-105" }, isPodium ? 'Voltar ao Menu' : 'Próxima Pergunta')
          )
        );

      case GameState.QUESTION:
      default:
        return React.createElement('div', { key: `question-${currentQuestionIndex}`, className: "animate-fade-in flex flex-col h-full p-4 w-full" },
          React.createElement('div', { className: "flex justify-between items-start mb-4" },
            React.createElement('div', { className: "bg-white text-black font-bold px-4 py-2 rounded-full text-xl shadow-lg" }, `${currentQuestionIndex + 1} / ${quiz.questions.length}`),
            React.createElement('div', { className: "w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl" },
              React.createElement('span', { className: "text-4xl font-black" }, timeLeft)
            )
          ),
          React.createElement('div', { className: `bg-white text-black p-8 rounded-lg shadow-2xl text-center mx-auto max-w-4xl w-full ${!question.imageUrl ? 'flex-1 flex flex-col justify-center' : ''} mb-6` },
            React.createElement('h2', { className: "text-3xl md:text-5xl font-bold leading-tight" }, question.text)
          ),
          question.imageUrl && React.createElement('div', { className: "flex-1 flex justify-center items-center mb-6 relative" },
            React.createElement('div', { className: "h-full max-h-[40vh] aspect-video bg-black/20 rounded-lg overflow-hidden border-4 border-white/20 shadow-lg" },
              React.createElement('img', { src: question.imageUrl, alt: "Question", className: "w-full h-full object-cover" })
            )
          ),
          React.createElement('div', { className: "grid grid-cols-2 gap-4 h-48 md:h-64" },
            question.answers.map((answer, idx) => (
              React.createElement('div', { key: idx, className: `${COLORS[answer.shape]} flex items-center p-6 rounded shadow-lg transition-transform` },
                React.createElement('div', { className: "text-4xl md:text-5xl mr-6 text-white drop-shadow-md" }, SHAPE_ICONS[answer.shape]),
                React.createElement('span', { className: "text-xl md:text-3xl font-bold text-white drop-shadow-md" }, answer.text)
              )
            ))
          ),
          React.createElement('div', { className: "absolute bottom-4 left-4 text-white/50 font-bold text-xl" }, "kahoot-clone-2025")
        );
    }
  };

  return (
    React.createElement('div', { className: "relative z-10 h-screen w-full" },
      renderContent()
    )
  );
};

// --- From components/Player/PlayerView.tsx ---
const PlayerView = ({ onJoin, onSubmit, gameState, hasAnswered, score, place, nickname, feedback }) => {
  const [inputName, setInputName] = useState("");
  const [pin, setPin] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam) setPin(pinParam);
    if (nickname) setJoined(true);
  }, [nickname]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (inputName.trim() && pin) {
      onJoin(inputName);
    }
  };
  
  const getOrdinal = (n) => "º";

  if (!joined) {
    return (
      React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen p-4" },
        React.createElement('div', { className: "bg-white text-black p-8 rounded-lg shadow-2xl max-w-sm w-full text-center" },
            React.createElement('h1', { className: "text-4xl font-black mb-6 text-indigo-900" }, "Kahoot!"),
            React.createElement('form', { onSubmit: handleJoin },
              React.createElement('input', { type: "text", placeholder: "PIN do Jogo", className: "w-full p-3 border-2 border-gray-300 rounded mb-4 text-center font-bold text-xl uppercase text-black placeholder-gray-400", value: pin, onChange: e => setPin(e.target.value) }),
              React.createElement('input', { type: "text", placeholder: "Apelido", className: "w-full p-3 border-2 border-gray-300 rounded mb-6 text-center font-bold text-xl text-black placeholder-gray-400", value: inputName, onChange: e => setInputName(e.target.value) }),
              React.createElement('button', { type: "submit", className: "w-full bg-black text-white py-3 rounded font-black text-xl hover:bg-gray-800 transition-colors" }, "Entrar")
            )
        )
      )
    );
  }

  if (feedback && gameState !== GameState.QUESTION && gameState !== GameState.COUNTDOWN) {
      const isCorrect = feedback.isCorrect;
      return (
        React.createElement('div', { className: `relative z-20 absolute inset-0 flex flex-col items-center justify-center p-8 ${isCorrect ? 'bg-green-600' : 'bg-red-600'} transition-colors duration-300 min-h-screen animate-zoom-in` },
             React.createElement('div', { className: "bg-white/20 p-8 rounded-full mb-6 backdrop-blur-md shadow-lg animate-[bounce_0.6s_infinite]" },
                React.createElement('span', { className: "text-6xl font-black" }, isCorrect ? '✓' : '✗')
             ),
             React.createElement('h2', { className: "text-4xl font-black mb-4 uppercase drop-shadow-md" }, isCorrect ? 'Correto!' : 'Incorreto'),
             isCorrect && (
                React.createElement('div', { className: "bg-black/30 px-6 py-3 rounded-xl mb-4 text-center" },
                    React.createElement('p', { className: "text-sm font-bold opacity-80 uppercase" }, "Pontos"),
                    React.createElement('p', { className: "text-3xl font-black" }, `+${feedback.points}`)
                )
             ),
             feedback.streak > 1 && (
                 React.createElement('div', { className: "flex items-center gap-2 bg-orange-500 px-4 py-2 rounded-full font-bold shadow-lg animate-pulse" },
                     React.createElement('span', null, "🔥"),
                     React.createElement('span', null, `Sequência de Respostas: ${feedback.streak}`)
                 )
             ),
             React.createElement('div', { className: "absolute bottom-8 text-white/80 font-bold" }, `Você está em ${place}${getOrdinal(place)} lugar`)
        )
      )
  }

  if (gameState === GameState.LOBBY) {
      return (
        React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8" },
            React.createElement('h2', { className: "text-3xl font-bold mb-4" }, "Você entrou!"),
            React.createElement('p', { className: "text-xl" }, "Veja seu apelido na tela?"),
            React.createElement('div', { className: "mt-8 text-2xl font-black bg-white/20 px-6 py-2 rounded-full animate-pulse" }, nickname)
        )
      )
  }

  if (gameState === GameState.COUNTDOWN) {
      return (
        React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8 bg-purple-700" },
             React.createElement('h2', { className: "text-4xl font-black" }, "Prepare-se!"),
             React.createElement('div', { className: "mt-8 w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" })
        )
      )
  }

  if (gameState === GameState.QUESTION) {
      if (hasAnswered) {
          return (
            React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8 animate-fade-in" },
                React.createElement('div', { className: "w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-4 animate-pulse" },
                    React.createElement('span', { className: "text-4xl" }, "...")
                ),
                React.createElement('h2', { className: "text-3xl font-bold mb-4" }, "Resposta Enviada!"),
                React.createElement('p', { className: "text-xl opacity-75" }, "Será que você acertou?")
            )
          );
      }
      return (
        React.createElement('div', { className: "relative z-10 flex flex-col min-h-screen w-full" },
            React.createElement('div', { className: "flex-1 grid grid-cols-2 gap-4 p-4 h-full" },
                Object.values(Shape).map((shape) => (
                    React.createElement('button', {
                        key: shape,
                        onClick: () => onSubmit(shape),
                        className: `${COLORS[shape]} rounded shadow-lg flex items-center justify-center active:scale-95 transition-transform h-full`
                    },
                        React.createElement('span', { className: "text-6xl text-white drop-shadow-md" }, SHAPE_ICONS[shape])
                    )
                ))
            )
        )
      );
  }

  return (
    React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8" },
        React.createElement('div', { className: "bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-sm" },
            React.createElement('p', { className: "text-gray-500 font-bold uppercase text-sm mb-2" }, "Pontuação Total"),
            React.createElement('h2', { className: "text-5xl font-black mb-6" }, score),
            React.createElement('div', { className: "bg-black text-white py-3 rounded-lg font-bold text-xl mb-2" }, place > 0 ? `${place}º Lugar` : '-')
        ),
        React.createElement('p', { className: "mt-8 text-white/70 font-bold" }, nickname)
    )
  );
};

// --- From App.tsx ---
const CHANNEL_NAME = 'kahoot-clone-2025';

const calculateScore = (timeLeft, totalTime, streak) => {
    const percentage = timeLeft / totalTime;
    const baseScore = Math.floor(500 + (percentage * 500));
    const streakBonus = Math.min(streak * 100, 500);
    return baseScore + streakBonus;
};

const ConnectionBadge = ({ isConnected }) => (
  React.createElement('div', { className: "fixed top-2 right-2 md:top-4 md:right-4 z-[100] flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-xl transition-all hover:bg-black/80 cursor-help", title: isConnected ? "Conectado ao servidor" : "Sem conexão com o servidor" },
    React.createElement('div', { className: `w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors duration-500 ${isConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500 animate-pulse'}` }),
    React.createElement('span', { className: "text-[10px] md:text-xs font-bold text-white/90 uppercase tracking-wider" }, isConnected ? 'Online' : 'Offline')
  )
);

const App = () => {
  const [appMode, setAppMode] = useState('MENU');
  
  const [gameState, setGameState] = useState(GameState.MENU);
  const [quiz, setQuiz] = useState(null);
  const [pin, setPin] = useState("");
  const [players, setPlayers] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [myPlayerId, setMyPlayerId] = useState("");
  const [playerTimeLeft, setPlayerTimeLeft] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myFeedback, setMyFeedback] = useState(null);
  const [myScore, setMyScore] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const bgMusicRef = useRef(null);
  const sfxRef = useRef(null);

  const channelRef = useRef(null);
  const timerRef = useRef(null);
  const playerTimerRef = useRef(null);

  useEffect(() => {
    bgMusicRef.current = new Audio(AUDIO.LOBBY_MUSIC);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    sfxRef.current = new Audio();

    const savedId = localStorage.getItem('kahoot-player-id');
    if (savedId) {
        // We don't set player ID here anymore to prevent rejoining without going through the join flow.
        // It will be re-established on a successful join.
    }
  }, []);

  const playSfx = (url) => {
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

  useEffect(() => {
    const channel = supabase.channel(CHANNEL_NAME);

    channel
      .on(
        'broadcast',
        { event: 'game-event' },
        (payload) => {
          const msg = payload.payload;
          
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

    if (appMode === 'PLAYER') {
        setTimeout(() => broadcast({ type: 'REQUEST_STATE' }), 1000);
    }

    return () => {
        supabase.removeChannel(channel);
        if (timerRef.current) clearInterval(timerRef.current);
        if (playerTimerRef.current) clearInterval(playerTimerRef.current);
    };
  }, [appMode]);

  useEffect(() => {
    if (appMode === 'HOST' && players.length > 0) {
        broadcast({ type: 'UPDATE_PLAYERS', payload: players });
    }
  }, [players, appMode]);

  const startHost = (createdQuiz) => {
    setQuiz(createdQuiz);
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setPin(newPin);
    
    createGameSession(newPin, createdQuiz.title).then(() => {
        console.log("Game session created in DB for PIN:", newPin);
    });

    setGameState(GameState.LOBBY);
    setTimeout(() => {
        broadcast({ type: 'SYNC_STATE', payload: { state: GameState.LOBBY, currentQuestionIndex: 0, totalQuestions: createdQuiz.questions.length, pin: newPin } });
    }, 1000);
  };

  const handleHostMessages = (msg) => {
    if (msg.type === 'JOIN') {
        setPlayers(prev => {
            if (prev.find(p => p.id === msg.payload.id)) return prev;
            playSfx(AUDIO.CORRECT); 
            return [...prev, { id: msg.payload.id, nickname: msg.payload.nickname, score: 0, streak: 0 }];
        });
    } else if (msg.type === 'LEAVE') {
        setPlayers(prev => prev.filter(p => p.id !== msg.payload.playerId));
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

            const answerShape = answerId; 
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
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.COUNTDOWN, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
      
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
      const q = quiz.questions[currentQIndex];
      setTimeLeft(q.timeLimit);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.QUESTION, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
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
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.LEADERBOARD, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
  };

  const hostNextQuestion = () => {
      if (currentQIndex + 1 >= quiz.questions.length) {
          setGameState(GameState.PODIUM);
          broadcast({ type: 'SYNC_STATE', payload: { state: GameState.PODIUM, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
      } else {
          setCurrentQIndex(prev => prev + 1);
          hostStartCountdown();
      }
  };

  const broadcast = async (msg) => {
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

  const handlePlayerMessages = (msg) => {
      if (msg.type === 'SYNC_STATE') {
          setGameState(msg.payload.state);
          if (msg.payload.state === GameState.QUESTION) {
              setHasAnswered(false);
              setMyFeedback(null); 
          }
          if (msg.payload.state === GameState.LOBBY) {
              setMyScore(0);
          }
          if (msg.payload.state === GameState.LEADERBOARD || msg.payload.state === GameState.PODIUM) {
              if (playerTimerRef.current) clearInterval(playerTimerRef.current);
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
      else if (msg.type === 'QUESTION_START') {
          if (playerTimerRef.current) clearInterval(playerTimerRef.current);
          
          let count = msg.payload.timeLimit;
          setPlayerTimeLeft(count);

          playerTimerRef.current = setInterval(() => {
              count--;
              setPlayerTimeLeft(count);
              if (count <= 0) {
                  clearInterval(playerTimerRef.current);
              }
          }, 1000);
      }
  };
  
  const playerJoin = async (nickname) => {
      const urlParams = new URLSearchParams(window.location.search);
      const pinParam = urlParams.get('pin');
      if (!pinParam) {
          console.error("Nenhum PIN na URL");
          // TODO: Add user-facing error
          return;
      }
      
      const newPlayer = await registerPlayer(pinParam, nickname);
      
      if (newPlayer) {
          setMyPlayerId(newPlayer.id);
          localStorage.setItem('kahoot-player-id', newPlayer.id);
          broadcast({ type: 'JOIN', payload: { nickname: newPlayer.nickname, id: newPlayer.id } });
          setGameState(GameState.LOBBY);
      } else {
          console.error("Falha ao entrar no jogo.");
          // TODO: Add user-facing error
      }
  };

  const playerSubmit = (shape) => {
      if (hasAnswered) return;
      setHasAnswered(true);
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      broadcast({ type: 'SUBMIT_ANSWER', payload: { playerId: myPlayerId, answerId: shape, timeLeft: playerTimeLeft } }); 
  };

  const handleBackToMenu = () => {
    if (appMode === 'PLAYER' && myPlayerId) {
        broadcast({ type: 'LEAVE', payload: { playerId: myPlayerId } });
        deletePlayer(myPlayerId);
        localStorage.removeItem('kahoot-player-id');
        setMyPlayerId("");
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
    if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
    }
  };

  const shouldShowBackButton = () => {
    if (appMode === 'MENU') return false;
    if (appMode === 'HOST' && gameState === GameState.CREATE) {
        return false; // Only show cancel button inside creator
    }
    return true;
  };

  if (appMode === 'MENU') {
      return (
        React.createElement('div', { className: "relative min-h-screen font-sans text-white overflow-hidden flex flex-col items-center justify-center" },
            React.createElement(Background, null),
            React.createElement(ConnectionBadge, { isConnected: isConnected }),
            React.createElement('div', { className: "relative z-10 text-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full" },
                React.createElement('h1', { className: "text-6xl font-black mb-2 tracking-tight" }, "Kahoot!"),
                React.createElement('p', { className: "text-xl mb-12 opacity-80 font-bold text-purple-200" }, "Experiência Clone 2025"),
                React.createElement('div', { className: "flex flex-col gap-4" },
                    React.createElement('button', { onClick: () => { setAppMode('HOST'); setGameState(GameState.CREATE); }, className: "bg-white text-indigo-900 font-black text-xl py-4 rounded shadow-lg hover:scale-105 transition-transform" }, "Hospedar Jogo"),
                    React.createElement('button', { onClick: () => setAppMode('PLAYER'), className: "bg-indigo-600 border-2 border-indigo-400 text-white font-bold text-xl py-4 rounded shadow-lg hover:bg-indigo-500 transition-colors" }, "Entrar no Jogo")
                ),
                !isConnected && (
                    React.createElement('p', { className: "mt-4 text-xs text-yellow-300 animate-pulse" }, "Conectando ao servidor...")
                ),
                React.createElement('p', { className: "mt-8 text-xs text-white/40" },
                    "Hospede em um dispositivo, entre em outros pela internet.", React.createElement('br'),
                    "Powered by Supabase Realtime."
                )
            )
        )
      );
  }

  const BackButton = () => (
    React.createElement('button', { onClick: handleBackToMenu, className: "absolute top-4 left-4 z-50 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-colors flex items-center gap-2" },
        React.createElement('span', null, "←"), " Voltar"
    )
  );

  if (appMode === 'HOST') {
      return (
        React.createElement('div', { className: "relative min-h-screen text-white overflow-hidden flex flex-col" },
             React.createElement(Background, null),
             React.createElement(ConnectionBadge, { isConnected: isConnected }),
             shouldShowBackButton() && React.createElement(BackButton, null),
             React.createElement('div', { className: "absolute bottom-4 right-4 z-50" },
                React.createElement('button', { onClick: toggleMute, className: "bg-white/20 p-3 rounded-full hover:bg-white/40 transition-colors shadow-lg border border-white/10", title: isMuted ? "Ativar som" : "Mudo" }, isMuted ? '🔇' : '🔊')
             ),
             gameState === GameState.CREATE ? (
                 React.createElement(QuizCreator, { onSave: startHost, onCancel: handleBackToMenu })
             ) : gameState === GameState.LOBBY ? (
                 React.createElement(Lobby, { pin: pin, players: players, onStart: hostStartGame, onCancel: handleBackToMenu })
             ) : (
                 React.createElement(HostGame, { quiz: quiz, players: players, currentQuestionIndex: currentQIndex, timeLeft: timeLeft, gameState: gameState, onNext: hostNextQuestion, onEndGame: handleBackToMenu })
             )
        )
      );
  }

  const myPlayer = players.find(p => p.id === myPlayerId);
  const myNickname = myPlayer ? myPlayer.nickname : "";
  const myRank = players.sort((a,b) => b.score - a.score).findIndex(p => p.id === myPlayerId) + 1;

  return (
    React.createElement('div', { className: "relative min-h-screen text-white overflow-hidden" },
        React.createElement(Background, null),
        React.createElement(ConnectionBadge, { isConnected: isConnected }),
        shouldShowBackButton() && React.createElement(BackButton, null),
        React.createElement(PlayerView, { 
            onJoin: playerJoin, 
            onSubmit: playerSubmit, 
            gameState: gameState, 
            hasAnswered: hasAnswered,
            score: myScore,
            place: myRank,
            nickname: myNickname, 
            feedback: myFeedback
        })
    )
  );
};

// --- RENDER APP ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));