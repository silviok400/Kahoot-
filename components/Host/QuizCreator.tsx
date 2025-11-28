import React, { useState, useEffect } from 'react';
import { Quiz, Question, Shape } from '../../types';
import { saveQuizToSupabase, fetchQuizzes, fetchFullQuiz, updateQuizInSupabase } from '../../lib/supabase';

interface QuizCreatorProps {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}

export const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("Meu Quiz Incrível");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadedQuizId, setLoadedQuizId] = useState<string | null>(null);
  
  // Database State
  const [savedQuizzes, setSavedQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingQuizId, setProcessingQuizId] = useState<string | null>(null);
  
  useEffect(() => {
    loadSavedQuizzes();
  }, []);

  const loadSavedQuizzes = async () => {
      setIsLoading(true);
      const data = await fetchQuizzes();
      setSavedQuizzes(data);
      setIsLoading(false);
  };

  const handleLoadQuiz = async (quizId: string) => {
      if (!quizId) return;
      setIsLoading(true);
      setProcessingQuizId(quizId);
      const fullQuiz = await fetchFullQuiz(quizId);
      if (fullQuiz) {
          setTitle(fullQuiz.title);
          setQuestions(fullQuiz.questions);
          setLoadedQuizId(quizId);
      }
      setIsLoading(false);
      setProcessingQuizId(null);
  };

  const handleNewQuiz = () => {
    setTitle("Meu Quiz Incrível");
    setQuestions([]);
    setLoadedQuizId(null);
  };

  const handleSaveToCloud = async () => {
      setIsSaving(true);
      const quizData = { title, questions };
      const result = loadedQuizId
        ? await updateQuizInSupabase(loadedQuizId, quizData)
        : await saveQuizToSupabase(quizData);
        
      setIsSaving(false);
      if (result.success && result.id) {
          alert(`Quiz ${loadedQuizId ? 'atualizado' : 'salvo'} com sucesso!`);
          loadSavedQuizzes(); // Refresh list
          setLoadedQuizId(result.id);
      } else {
          const msg = result.error?.message || result.error?.details || JSON.stringify(result.error);
          alert(`Erro ao salvar: ${msg}. Verifique o console para mais detalhes.`);
      }
  };

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
    // Kahoot style: can have multiple, but usually toggle logic
    newQs[qIndex].answers[aIndex].isCorrect = !newQs[qIndex].answers[aIndex].isCorrect;
    setQuestions(newQs);
  };

  return (
    <div className="relative z-10 flex flex-col w-full h-[100dvh] md:h-[90vh] md:max-w-5xl md:mx-auto bg-slate-900/90 md:bg-white/10 backdrop-blur-md md:rounded-xl border-none md:border border-white/20 shadow-2xl md:mt-4 overflow-hidden">
      
      {/* Header - Fixed at top */}
      <div className="flex flex-col md:flex-row justify-between items-center p-4 bg-black/20 border-b border-white/10 shrink-0 gap-3">
        <div className="flex items-center gap-4 w-full md:w-auto text-center md:text-left">
          <h2 className="text-xl md:text-3xl font-black text-white">Criar Kahoot!</h2>
          <button onClick={handleNewQuiz} className="px-3 py-1 bg-white/10 rounded font-bold hover:bg-white/20 text-xs whitespace-nowrap">+ Novo Quiz</button>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={onCancel} className="flex-1 md:flex-none px-3 py-2 bg-gray-600 rounded font-bold hover:bg-gray-500 text-sm">Cancelar</button>
          
          <button 
            onClick={handleSaveToCloud} 
            disabled={isSaving || questions.length === 0}
            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 rounded font-bold hover:bg-blue-500 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {isSaving ? 'Salvando...' : (loadedQuizId ? 'Atualizar (DB)' : 'Salvar (DB)')}
          </button>

          <button 
            onClick={() => onSave({ title, questions })} 
            disabled={questions.length === 0}
            className="flex-1 md:flex-none px-4 py-2 bg-green-600 rounded font-bold hover:bg-green-500 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            Jogar Agora
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
        
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
        
        {/* Saved Quizzes Section */}
        <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <h3 className="text-xs uppercase font-bold mb-3 text-white/70">Quizzes Salvos</h3>
            {savedQuizzes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {savedQuizzes.map(q => (
                        <div key={q.id} className="flex items-center justify-between bg-black/20 p-2 rounded gap-2">
                            <div className="flex-1 truncate">
                                <p className="font-bold text-sm text-white">{q.title}</p>
                                <p className="text-xs text-white/50">{new Date(q.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex gap-2 ml-2 shrink-0">
                                <button 
                                    onClick={() => handleLoadQuiz(q.id)} 
                                    disabled={isLoading}
                                    className="px-2 py-1 bg-blue-600 rounded text-xs font-bold hover:bg-blue-500 disabled:opacity-50"
                                >
                                    {(isLoading && processingQuizId === q.id) ? '...' : 'Carregar'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-white/50 text-center py-2">{isLoading ? "Carregando..." : "Nenhum quiz salvo encontrado."}</p>
            )}
        </div>

        {/* Questions List */}
        <div className="space-y-6">
            {questions.length === 0 && (
                <div className="text-center py-12 md:py-20 text-white/50 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                    <p className="text-lg font-bold mb-2">Seu quiz está vazio!</p>
                    <p className="text-sm">Clique em "Adicionar Pergunta".</p>
                </div>
            )}
            
            {questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg relative group">
                {/* Header of card */}
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
                
                {/* Question Text */}
                <input 
                value={q.text} 
                onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                className="w-full p-3 mb-4 text-lg md:text-xl font-bold text-center rounded-lg bg-white text-black placeholder-gray-400 focus:ring-4 ring-indigo-500/50 outline-none"
                placeholder="Digite a pergunta aqui..."
                />

                {/* Settings Row */}
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

                {/* Answers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.answers.map((a, aIndex) => (
                    <div key={a.id} className={`flex items-center p-2 rounded-lg transition-all border-2 ${a.isCorrect ? 'bg-green-600/20 border-green-500' : 'bg-black/20 border-transparent'}`}>
                    
                    {/* Shape Icon */}
                    <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 flex items-center justify-center mr-2 rounded shadow-sm text-white font-bold text-sm md:text-base
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