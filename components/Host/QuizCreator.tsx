import React, { useState } from 'react';
import { Quiz, Question, Shape } from '../../types';
import { generateQuizQuestions } from '../../services/geminiService';

interface QuizCreatorProps {
  onSave: (quiz: Quiz) => void;
  onCancel: () => void;
}

const QuizCreator: React.FC<QuizCreatorProps> = ({ onSave, onCancel }) => {
  const [title, setTitle] = useState("My Awesome Quiz");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [geminiTopic, setGeminiTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeminiGenerate = async () => {
    if (!geminiTopic) return;
    setIsGenerating(true);
    const generatedQuestions = await generateQuizQuestions(geminiTopic);
    setQuestions([...questions, ...generatedQuestions]);
    setIsGenerating(false);
    setGeminiTopic("");
  };

  const addEmptyQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      text: "New Question",
      timeLimit: 20,
      answers: [
        { id: `a-1`, text: "Answer 1", isCorrect: true, shape: Shape.TRIANGLE },
        { id: `a-2`, text: "Answer 2", isCorrect: false, shape: Shape.DIAMOND },
        { id: `a-3`, text: "Answer 3", isCorrect: false, shape: Shape.CIRCLE },
        { id: `a-4`, text: "Answer 4", isCorrect: false, shape: Shape.SQUARE },
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
    <div className="relative z-10 p-6 max-w-5xl mx-auto bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl h-[90vh] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-black text-white">Create Kahoot!</h2>
        <div className="flex gap-4">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-500 rounded font-bold hover:bg-gray-400">Cancel</button>
          <button 
            onClick={() => onSave({ title, questions })} 
            disabled={questions.length === 0}
            className="px-6 py-2 bg-green-500 rounded font-bold hover:bg-green-400 disabled:opacity-50"
          >
            Save & Play
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-4 items-end">
        <div className="flex-1">
            <label className="block text-sm font-bold mb-1">Quiz Title</label>
            <input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            className="w-full p-3 rounded bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none focus:border-white"
            placeholder="Enter quiz title..."
            />
        </div>
        <div className="flex-1">
            <label className="block text-sm font-bold mb-1">✨ Magic Generate (Gemini)</label>
            <div className="flex gap-2">
            <input 
                value={geminiTopic} 
                onChange={(e) => setGeminiTopic(e.target.value)} 
                className="w-full p-3 rounded bg-white/20 text-white placeholder-white/50 border border-white/30 focus:outline-none"
                placeholder="e.g. 'Quantum Physics' or 'History of Rome'"
            />
            <button 
                onClick={handleGeminiGenerate} 
                disabled={isGenerating || !geminiTopic}
                className="px-4 py-2 bg-purple-600 rounded font-bold hover:bg-purple-500 whitespace-nowrap disabled:opacity-50"
            >
                {isGenerating ? 'Generating...' : '✨ Generate'}
            </button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-2">
        {questions.length === 0 && (
            <div className="text-center py-20 text-white/50 border-2 border-dashed border-white/20 rounded-xl">
                <p className="text-xl">No questions yet. Add one manually or use Gemini Magic!</p>
            </div>
        )}
        
        {questions.map((q, qIndex) => (
          <div key={q.id} className="bg-white/5 p-6 rounded-xl border border-white/10">
            <div className="flex justify-between mb-4">
                <h3 className="font-bold text-xl">Question {qIndex + 1}</h3>
                <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIndex))} className="text-red-400 hover:text-red-300">Delete</button>
            </div>
            
            <input 
              value={q.text} 
              onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
              className="w-full p-4 mb-4 text-xl font-bold text-center rounded bg-white text-black"
              placeholder="Start typing your question..."
            />

            <div className="flex gap-4 mb-4">
                <div className="w-1/3">
                    <label className="text-xs uppercase font-bold text-white/70">Time Limit (sec)</label>
                    <select 
                        value={q.timeLimit}
                        onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                        className="w-full p-2 rounded bg-black/40 border border-white/20"
                    >
                        <option value={5}>5s</option>
                        <option value={10}>10s</option>
                        <option value={20}>20s</option>
                        <option value={30}>30s</option>
                        <option value={60}>60s</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {q.answers.map((a, aIndex) => (
                <div key={a.id} className={`flex items-center p-2 rounded ${a.isCorrect ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-black/20'}`}>
                  <div className={`w-8 h-8 flex items-center justify-center mr-2 rounded-full text-white font-bold
                    ${a.shape === Shape.TRIANGLE ? 'bg-red-500' : 
                      a.shape === Shape.DIAMOND ? 'bg-blue-500' : 
                      a.shape === Shape.CIRCLE ? 'bg-yellow-500' : 'bg-green-500'}`}
                  >
                    {aIndex + 1}
                  </div>
                  <input 
                    value={a.text}
                    onChange={(e) => updateAnswer(qIndex, aIndex, e.target.value)}
                    className="flex-1 bg-transparent border-b border-transparent focus:border-white outline-none p-1"
                    placeholder={`Answer ${aIndex + 1}`}
                  />
                  <input 
                    type="checkbox" 
                    checked={a.isCorrect} 
                    onChange={() => toggleCorrect(qIndex, aIndex)}
                    className="w-6 h-6 ml-2 accent-green-500 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        <button 
          onClick={addEmptyQuestion}
          className="w-full py-4 border-2 border-dashed border-white/30 rounded-xl text-white/70 hover:bg-white/10 hover:text-white font-bold transition-all"
        >
          + Add Question
        </button>
      </div>
    </div>
  );
};

export default QuizCreator;
