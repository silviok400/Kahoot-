import React, { useState } from 'react';
import { Quiz, Question, Shape } from '../../types';

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
    <div className="relative z-10 flex flex-col w-full h-[100dvh] md:h-[90vh] md:max-w-5xl md:mx-auto bg-slate-900 md:bg-white/10 backdrop-blur-md md:rounded-xl border-none md:border border-white/20 shadow-2xl md:mt-4 overflow-hidden">
      
      {/* Header - Fixed at top */}
      <div className="flex flex-col md:flex-row justify-between items-center p-3 md:p-4 bg-black/30 md:bg-transparent border-b border-white/10 md:border-none shrink-0 gap-3">
        <h2 className="text-xl md:text-3xl font-black text-white w-full text-center md:text-left">Criar Kahoot!</h2>
        <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
          <button onClick={onCancel} className="px-3 py-2 bg-gray-600 rounded font-bold hover:bg-gray-500 text-sm">Cancelar</button>
          <button 
            onClick={() => onSave({ title, questions })} 
            disabled={questions.length === 0}
            className="px-4 py-2 bg-green-600 rounded font-bold hover:bg-green-500 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            Salvar & Jogar
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
        
        {/* Quiz Title Input */}
        <div>
            <label className="block text-xs uppercase font-bold mb-1 text-white/70">Título do Quiz</label>
            <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-white focus:bg-white/20 transition-all font-bold text-lg"
            placeholder="Digite o título..."
            />
        </div>

        {/* Questions List */}
        <div className="space-y-6">
            {questions.length === 0 && (
                <div className="text-center py-12 md:py-20 text-white/50 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                    <p className="text-lg font-bold mb-2">Seu quiz está vazio!</p>
                    <p className="text-sm">Clique abaixo para adicionar a primeira pergunta.</p>
                </div>
            )}
            
            {questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white/5 p-3 md:p-4 rounded-xl border border-white/10 shadow-lg relative group">
                {/* Header of card */}
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-white/80 text-sm uppercase">Pergunta {qIndex + 1}</h3>
                    <button 
                        onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} 
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded"
                        title="Excluir Pergunta"
                    >
                        🗑️
                    </button>
                </div>
                
                {/* Question Text */}
                <input 
                value={q.text} 
                onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                className="w-full p-3 mb-4 text-lg md:text-xl font-bold text-center rounded-lg bg-white text-black placeholder-gray-400 focus:ring-4 ring-indigo-500/50 outline-none"
                placeholder="Digite a pergunta aqui..."
                />

                {/* Settings Row (Stacked on Mobile) */}
                <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="w-full md:w-1/3">
                        <label className="text-[10px] uppercase font-bold text-white/60 mb-1 block">Tempo (s)</label>
                        <select 
                            value={q.timeLimit}
                            onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                            className="w-full p-3 rounded bg-black/30 border border-white/20 text-white focus:border-white outline-none"
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
                            className="w-full p-3 rounded bg-black/30 border border-white/20 text-white placeholder-white/20 focus:border-white outline-none text-sm"
                            placeholder="https://exemplo.com/imagem.jpg"
                        />
                    </div>
                </div>

                {/* Answers Grid (Stacked on Mobile) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {q.answers.map((a, aIndex) => (
                    <div key={a.id} className={`flex items-center p-2 rounded-lg transition-all border-2 ${a.isCorrect ? 'bg-green-600/20 border-green-500' : 'bg-black/20 border-transparent'}`}>
                    
                    {/* Shape Icon */}
                    <div className={`w-10 h-10 shrink-0 flex items-center justify-center mr-2 rounded shadow-sm text-white font-bold text-lg
                        ${a.shape === Shape.TRIANGLE ? 'bg-red-500' : 
                        a.shape === Shape.DIAMOND ? 'bg-blue-500' : 
                        a.shape === Shape.CIRCLE ? 'bg-yellow-500' : 'bg-green-500'}`}
                    >
                        {a.shape === Shape.TRIANGLE ? '▲' : 
                        a.shape === Shape.DIAMOND ? '◆' : 
                        a.shape === Shape.CIRCLE ? '●' : '■'}
                    </div>
                    
                    {/* Input */}
                    <input 
                        value={a.text}
                        onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                        className="flex-1 bg-transparent border-b border-white/10 focus:border-white outline-none p-1 text-sm md:text-base text-white placeholder-white/30"
                        placeholder={`Resposta ${aIndex + 1}`}
                    />
                    
                    {/* Checkbox */}
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
                            className={`block w-8 h-8 rounded-full border-2 cursor-pointer flex items-center justify-center transition-colors
                                ${a.isCorrect ? 'bg-green-500 border-green-500' : 'border-white/30 hover:border-white'}
                            `}
                        >
                            {a.isCorrect && <span className="text-white text-sm font-bold">✓</span>}
                        </label>
                    </div>
                    </div>
                ))}
                </div>
            </div>
            ))}

            {/* Add Button */}
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

export default QuizCreator;