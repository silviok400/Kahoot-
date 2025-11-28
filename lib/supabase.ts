import { createClient } from '@supabase/supabase-js';
import { Quiz, Question, Answer, Shape } from '../types';

const SUPABASE_URL = "https://szkpmdfcrucpwifbokkc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6a3BtZGZjcnVjcHdpZmJva2tjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1OTc5NDcsImV4cCI6MjA3OTE3Mzk0N30.MU-dW7-ZwRRS9weupQ4kb0dZN6brurW0PNQtbIPCn_U";

// A forma moderna e confiável de especificar o esquema é através das opções do cliente.
// A solução anterior com 'customFetch' era uma gambiarra que podia falhar em certos casos, como nas exclusões.
// Esta mudança garante que o esquema 'public' seja usado em todas as operações de forma consistente.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: {
        schema: 'public',
    },
});

// --- HELPER FUNCTIONS FOR DATABASE INTERACTION ---

const _insertQuestionsAndAnswers = async (quizId: string, questions: Question[]) => {
    for (const q of questions) {
        const { data: qData, error: qError } = await supabase
            .from('questions')
            .insert([{ 
                quiz_id: quizId, 
                text: q.text || "Nova Pergunta", 
                time_limit: q.timeLimit || 20,
                image_url: q.imageUrl || null 
            }])
            .select()
            .single();
        
        if (qError) throw qError;
        const qId = qData.id;

        if (q.answers && q.answers.length > 0) {
            const answersToInsert = q.answers.map(a => ({
                question_id: qId,
                text: a.text || "",
                is_correct: a.isCorrect || false,
                shape: a.shape || Shape.TRIANGLE
            }));

            const { error: aError } = await supabase
                .from('answers')
                .insert(answersToInsert);
            
            if (aError) throw aError;
        }
    }
};

// 1. Fetch all Quizzes
export const fetchQuizzes = async () => {
    const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Erro ao buscar quizzes:', JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
};

// 2. Fetch Full Quiz Details (Questions + Answers)
export const fetchFullQuiz = async (quizId: string): Promise<Quiz | null> => {
    if (!quizId) return null;

    // Get Quiz Info
    const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', quizId)
        .single();
    
    if (quizError || !quizData) {
        console.error('Erro ao buscar detalhe do quiz:', JSON.stringify(quizError, null, 2));
        return null;
    }

    // Get Questions
    const { data: questionsData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId);

    if (qError || !questionsData) {
        console.error('Erro ao buscar questões:', JSON.stringify(qError, null, 2));
        return null;
    }

    // Build the Quiz Object
    const questions: Question[] = [];

    for (const q of questionsData) {
        // Get Answers for this question
        const { data: answersData, error: aError } = await supabase
            .from('answers')
            .select('*')
            .eq('question_id', q.id);
        
        if (aError) {
             console.error(`Erro ao buscar respostas para a questão ${q.id}:`, JSON.stringify(aError, null, 2));
        }

        const answers: Answer[] = (answersData || []).map((a: any) => ({
            id: a.id,
            text: a.text || "",
            isCorrect: !!a.is_correct,
            shape: (a.shape as Shape) || Shape.TRIANGLE
        }));

        questions.push({
            id: q.id,
            text: q.text || "Pergunta sem texto",
            timeLimit: q.time_limit || 20,
            imageUrl: q.image_url || undefined,
            answers: answers
        });
    }

    return {
        title: quizData.title,
        questions: questions
    };
};

// 3. Save Quiz (Insert into quizzes -> questions -> answers)
export const saveQuizToSupabase = async (quiz: Quiz) => {
    try {
        // A. Insert Quiz
        const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert([{ title: quiz.title || "Novo Quiz" }])
            .select()
            .single();

        if (quizError) throw quizError;
        const quizId = quizData.id;

        // B. Insert Questions & Answers
        await _insertQuestionsAndAnswers(quizId, quiz.questions);

        return { success: true, id: quizId };
    } catch (error: any) {
        console.error("Erro ao salvar quiz:", JSON.stringify(error, null, 2));
        return { success: false, error };
    }
};

// 4. Update an existing Quiz - REBUILT FOR ROBUSTNESS
export const updateQuizInSupabase = async (quizId: string, quiz: Quiz) => {
    try {
        // A. Update the quiz title
        const { error: titleUpdateError } = await supabase
            .from('quizzes')
            .update({ title: quiz.title })
            .eq('id', quizId);

        if (titleUpdateError) throw titleUpdateError;

        // B. Delete all old questions and answers robustly
        // Step B1: Find all old question IDs for the quiz.
        const { data: oldQuestions, error: questionsSelectError } = await supabase
            .from('questions')
            .select('id')
            .eq('quiz_id', quizId);
        
        if (questionsSelectError) throw questionsSelectError;

        const oldQuestionIds = oldQuestions?.map(q => q.id) || [];

        // Step B2: If old questions exist, delete their answers first.
        if (oldQuestionIds.length > 0) {
            const { error: answersError } = await supabase
                .from('answers')
                .delete()
                .in('question_id', oldQuestionIds);
            
            if (answersError) throw answersError;
        }

        // Step B3: Now delete all questions for the quiz in a single operation.
        const { error: questionsError } = await supabase
            .from('questions')
            .delete()
            .eq('quiz_id', quizId);

        if (questionsError) throw questionsError;

        // C. Re-insert the new questions and answers
        await _insertQuestionsAndAnswers(quizId, quiz.questions);
        
        return { success: true, id: quizId };
    } catch (error: any) {
        console.error("Erro ao atualizar quiz:", JSON.stringify(error, null, 2));
        return { success: false, error };
    }
};


// 5. Create Game Session (games)
export const createGameSession = async (pin: string, quizTitle: string) => {
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

// 6. Register Player (players)
export const registerPlayer = async (pin: string, nickname: string, score: number = 0) => {
    // First find the game by PIN
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('pin', pin)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (gameError) {
        console.error("Erro ao encontrar jogo para registrar jogador:", JSON.stringify(gameError, null, 2));
        return;
    }

    if (game) {
        const { error: playerError } = await supabase.from('players').insert([{
            game_id: game.id,
            nickname: nickname,
            score: score
        }]);
        
        if (playerError) console.error("Erro ao registrar jogador:", JSON.stringify(playerError, null, 2));
    }
};
