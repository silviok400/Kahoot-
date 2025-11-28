// --- IMPORTS ---
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import QRCodeStyling from 'qr-code-styling';
import { createClient } from "@supabase/supabase-js";

// --- From types.ts (Converted to JS constants where necessary) ---
const GameState = {
    MENU: 'MENU',
    CREATE: 'CREATE',
    LOBBY: 'LOBBY',
    COUNTDOWN: 'COUNTDOWN',
    QUESTION: 'QUESTION',
    ANSWER_REVEAL: 'ANSWER_REVEAL',
    LEADERBOARD: 'LEADERBOARD',
    PODIUM: 'PODIUM',
    MINIGAME: 'MINIGAME',
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
  BONUS_MUSIC: 'https://cdn.pixabay.com/audio/2021/09/06/audio_98777e4242.mp3',
  COLLECT: 'https://cdn.pixabay.com/audio/2022/03/24/audio_c8c2a382aa.mp3',
  EXPLOSION: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c8c8a73467.mp3',
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

const deleteGameSessionByPin = async (pin) => {
    if (!pin) return;

    // Find the latest game with this PIN
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('id')
        .eq('pin', pin)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
    
    if (gameError || !game) {
        console.error("Não foi possível encontrar o jogo para deletar com PIN:", pin, gameError);
        return;
    }
    
    // Delete associated players
    const { error: playersError } = await supabase
        .from('players')
        .delete()
        .eq('game_id', game.id);

    if (playersError) {
        console.error("Erro ao deletar jogadores do jogo:", playersError);
    }

    // Delete the game itself
    const { error: gameDeleteError } = await supabase
        .from('games')
        .delete()
        .eq('id', game.id);
    
    if (gameDeleteError) {
        console.error("Erro ao deletar sessão de jogo:", gameDeleteError);
    } else {
        console.log(`Jogo com PIN ${pin} (ID: ${game.id}) foi deletado com sucesso do banco de dados.`);
    }
};

// --- AVATAR SYSTEM ---
const AVATAR_OPTIONS = {
    skin: ['#f8d9ce', '#f3cfb3', '#eac086', '#d2a061', '#a56c42', '#7b4b2a', '#5c3a2a', '#3c2e28'],
    hair: ['#2c1b18', '#4a312c', '#7d5640', '#b58b5a', '#e6c888', '#f0f0f0', '#9b1b1b', '#3b82f6', '#ec4899', '#8b5cf6', '#22c55e', '#1f2937'],
    clothing: ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#1f2937', '#ffffff', '#000000', '#f97316', '#06b6d4'],
};

// Available counts for customization options
const AVATAR_COUNTS = {
    hairStyle: 12,
    clothingStyle: 10,
    accessory: 10,
    hat: 11
};

const Avatar = ({ config, size = "100%" }) => {
    const { skinColor, hairColor, clothingColor, hairStyle, clothingStyle, accessory, hat } = config || {
        skinColor: AVATAR_OPTIONS.skin[2],
        hairColor: AVATAR_OPTIONS.hair[1],
        clothingColor: AVATAR_OPTIONS.clothing[1],
        hairStyle: 0,
        clothingStyle: 0,
        accessory: 0,
        hat: 0
    };

    const stroke = "rgba(0,0,0,0.1)"; 
    const detail = "rgba(255,255,255,0.2)";

    return (
        React.createElement('svg', { viewBox: "0 0 100 100", width: size, height: size, className: "rounded-full bg-blue-100/50 shadow-inner overflow-hidden" },
            // --- CLOTHING (Body) ---
            React.createElement('g', null,
                // Base Body Shape
                React.createElement('path', { d: "M20 90 Q50 90 80 90 L80 100 L20 100 Z", fill: clothingColor }),
                React.createElement('path', { d: "M20 90 Q20 70 35 65 L65 65 Q80 70 80 90", fill: clothingColor }),
                
                // Clothing Details based on Style
                clothingStyle === 1 && React.createElement('path', { d: "M40 65 L50 80 L60 65", fill: "rgba(0,0,0,0.15)" }), // V-neck
                clothingStyle === 2 && React.createElement('g', null, // Hoodie
                    React.createElement('path', { d: "M35 65 Q50 85 65 65", fill: "none", stroke: "rgba(0,0,0,0.2)", strokeWidth: "2" }),
                    React.createElement('line', { x1: "50", y1: "65", x2: "50", y2: "100", stroke: "rgba(0,0,0,0.2)", strokeWidth: "1" })
                ),
                clothingStyle === 3 && React.createElement('g', null, // Suit
                    React.createElement('path', { d: "M35 65 L50 90 L65 65", fill: "white" }),
                    React.createElement('path', { d: "M48 65 L50 85 L52 65", fill: "#c0392b" }) // Tie
                ),
                clothingStyle === 4 && React.createElement('path', { d: "M30 65 Q50 90 70 65", fill: "none", stroke: detail, strokeWidth: "3", strokeDasharray: "4 2" }), // Necklace/Dress
                clothingStyle === 5 && React.createElement('rect', { x: "30", y: "65", width: "40", height: "35", fill: "rgba(0,0,0,0.1)", clipPath: "inset(0 25% 0 25%)" }), // Tank top
                clothingStyle === 6 && React.createElement('g', null, // Stripes
                    React.createElement('path', { d: "M25 75 H75", stroke: detail, strokeWidth: "2" }),
                    React.createElement('path', { d: "M22 85 H78", stroke: detail, strokeWidth: "2" })
                ),
                clothingStyle === 7 && React.createElement('g', null, // Overalls
                    React.createElement('rect', { x: "38", y: "65", width: "4", height: "35", fill: "#3b82f6" }),
                    React.createElement('rect', { x: "58", y: "65", width: "4", height: "35", fill: "#3b82f6" }),
                    React.createElement('rect', { x: "35", y: "80", width: "30", height: "20", fill: "#3b82f6" })
                ),
                clothingStyle === 8 && React.createElement('path', { d: "M20 70 Q50 60 80 70", fill: "none", stroke: detail, strokeWidth: "10", strokeOpacity: "0.2" }), // Sweater
                clothingStyle === 9 && React.createElement('g', null, // Button up
                    React.createElement('line', { x1: "50", y1: "65", x2: "50", y2: "100", stroke: "rgba(0,0,0,0.1)", strokeWidth: "1" }),
                    React.createElement('circle', { cx: "53", cy: "75", r: "1", fill: "rgba(0,0,0,0.3)" }),
                    React.createElement('circle', { cx: "53", cy: "85", r: "1", fill: "rgba(0,0,0,0.3)" })
                )
            ),

            // Neck
            React.createElement('rect', { x: "42", y: "55", width: "16", height: "15", fill: skinColor }),
            React.createElement('path', { d: "M42 55 L42 65 Q50 70 58 65 L58 55 Z", fill: "rgba(0,0,0,0.05)" }),

            // Head
            React.createElement('circle', { cx: "50", cy: "45", r: "22", fill: skinColor }),
            
            // Facial Features
            // Mouth
            React.createElement('path', { d: "M45 55 Q50 58 55 55", fill: "none", stroke: "#5c3a2a", strokeWidth: "1.5", strokeLinecap: "round" }),
            // Nose
            React.createElement('path', { d: "M50 48 Q48 50 50 52", fill: "none", stroke: "#c58c65", strokeWidth: "1", opacity: "0.5" }),

            // Eyes
            React.createElement('circle', { cx: "42", cy: "42", r: "2.5", fill: "#333" }),
            React.createElement('circle', { cx: "58", cy: "42", r: "2.5", fill: "#333" }),
            // Blush
            React.createElement('circle', { cx: "38", cy: "50", r: "3", fill: "#ff0000", opacity: "0.05" }),
            React.createElement('circle', { cx: "62", cy: "50", r: "3", fill: "#ff0000", opacity: "0.05" }),

            // --- HAIR (Back layer) ---
            [1, 4, 5, 6, 7, 8, 9].includes(hairStyle) && React.createElement('g', null,
                hairStyle === 1 && React.createElement('circle', { cx: "50", cy: "45", r: "24", fill: hairColor, clipPath: "inset(0 0 40% 0)" }), // Bob
                hairStyle === 4 && React.createElement('path', { d: "M26 40 L26 80 L74 80 L74 40", fill: hairColor }), // Long Straight
                hairStyle === 5 && React.createElement('circle', { cx: "65", cy: "50", r: "10", fill: hairColor }), // Ponytail side
                hairStyle === 6 && React.createElement('rect', { x: "46", y: "15", width: "8", height: "40", fill: hairColor }), // Mohawk strip
                hairStyle === 7 && React.createElement('circle', { cx: "50", cy: "45", r: "28", fill: hairColor }), // Afro
                hairStyle === 8 && React.createElement('g', null, // Buns
                    React.createElement('circle', { cx: "25", cy: "40", r: "8", fill: hairColor }),
                    React.createElement('circle', { cx: "75", cy: "40", r: "8", fill: hairColor })
                ),
                hairStyle === 9 && React.createElement('path', { d: "M26 40 Q20 60 26 80 L74 80 Q80 60 74 40", fill: hairColor }) // Wavy
            ),

            // --- HAIR (Front/Top) ---
            React.createElement('g', null,
                hairStyle === 0 && React.createElement('path', { d: "M30 40 Q50 15 70 40", fill: hairColor }), // Short
                hairStyle === 1 && React.createElement('path', { d: "M28 45 Q50 10 72 45 Q72 55 70 60 L30 60 Q28 55 28 45", fill: hairColor }), // Bob Front
                hairStyle === 2 && React.createElement('path', { d: "M28 40 Q50 5 72 40 L72 35 Q50 0 28 35 Z", fill: hairColor }), // Spiky
                hairStyle === 3 && React.createElement('path', { d: "M26 42 Q50 15 74 42 Q78 50 74 60 L26 60 Q22 50 26 42", fill: hairColor }), // Curly
                hairStyle === 4 && React.createElement('path', { d: "M30 40 Q50 15 70 40", fill: hairColor }), // Long Straight Top
                hairStyle === 5 && React.createElement('path', { d: "M30 40 Q50 15 70 40", fill: hairColor }), // Ponytail Top
                hairStyle === 6 && React.createElement('path', { d: "M45 20 L55 20 L52 45 L48 45 Z", fill: hairColor }), // Mohawk top
                hairStyle === 7 && React.createElement('path', { d: "M25 40 Q50 10 75 40", fill: hairColor, opacity: "0.8" }), // Afro texture
                hairStyle === 8 && React.createElement('path', { d: "M30 40 Q50 20 70 40", fill: hairColor }), // Buns top
                hairStyle === 9 && React.createElement('path', { d: "M30 40 Q50 20 70 40", fill: hairColor }), // Wavy top
                hairStyle === 10 && React.createElement('path', { d: "M28 42 Q60 20 72 50 L72 40 Q50 10 28 40 Z", fill: hairColor }), // Side part
                hairStyle === 11 && React.createElement('path', { d: "M30 35 Q50 35 70 35 L70 45 Q50 50 30 45 Z", fill: hairColor }) // Flat top
            ),

            // --- ACCESSORIES ---
            accessory === 1 && React.createElement('g', null, // Round Glasses
                React.createElement('circle', { cx: "42", cy: "42", r: "5", fill: "none", stroke: "black", strokeWidth: "1" }),
                React.createElement('circle', { cx: "58", cy: "42", r: "5", fill: "none", stroke: "black", strokeWidth: "1" }),
                React.createElement('line', { x1: "47", y1: "42", x2: "53", y2: "42", stroke: "black", strokeWidth: "1" })
            ),
            accessory === 2 && React.createElement('g', null, // Sunglasses
                React.createElement('rect', { x: "35", y: "40", width: "12", height: "6", fill: "black", rx: "1" }),
                React.createElement('rect', { x: "53", y: "40", width: "12", height: "6", fill: "black", rx: "1" }),
                React.createElement('line', { x1: "47", y1: "42", x2: "53", y2: "42", stroke: "black", strokeWidth: "1" })
            ),
            accessory === 3 && React.createElement('g', null, // Cat Eye
                React.createElement('path', { d: "M35 43 Q35 38 45 43 Q40 46 35 43", fill: "none", stroke: "black", strokeWidth: "1.5" }),
                React.createElement('path', { d: "M65 43 Q65 38 55 43 Q60 46 65 43", fill: "none", stroke: "black", strokeWidth: "1.5" }),
                React.createElement('line', { x1: "45", y1: "43", x2: "55", y2: "43", stroke: "black", strokeWidth: "1" })
            ),
            accessory === 4 && React.createElement('g', null, // Aviators
                React.createElement('path', { d: "M35 40 Q42 38 48 40 L48 45 Q42 48 35 45 Z", fill: "rgba(0,0,0,0.5)", stroke: "gold", strokeWidth: "1" }),
                React.createElement('path', { d: "M52 40 Q58 38 65 40 L65 45 Q58 48 52 45 Z", fill: "rgba(0,0,0,0.5)", stroke: "gold", strokeWidth: "1" }),
                React.createElement('line', { x1: "48", y1: "41", x2: "52", y2: "41", stroke: "gold", strokeWidth: "1" })
            ),
            accessory === 5 && React.createElement('g', null, // 3D Glasses
                React.createElement('rect', { x: "36", y: "40", width: "12", height: "6", fill: "rgba(255,0,0,0.3)", stroke: "white", strokeWidth: "1" }),
                React.createElement('rect', { x: "52", y: "40", width: "12", height: "6", fill: "rgba(0,0,255,0.3)", stroke: "white", strokeWidth: "1" })
            ),
            accessory === 6 && React.createElement('g', null, // Monocle
                React.createElement('circle', { cx: "58", cy: "42", r: "5", fill: "rgba(200,240,255,0.3)", stroke: "gold", strokeWidth: "1" }),
                React.createElement('line', { x1: "58", y1: "47", x2: "58", y2: "60", stroke: "gold", strokeWidth: "0.5" })
            ),
            accessory === 7 && React.createElement('g', null, // Eye Patch
                React.createElement('path', { d: "M35 38 L65 46", stroke: "black", strokeWidth: "1" }), 
                React.createElement('circle', { cx: "42", cy: "42", r: "6", fill: "black" }) 
            ),
            accessory === 8 && React.createElement('g', null, // Star Glasses
                 React.createElement('path', { d: "M36 42 l2 -6 l2 6 l6 0 l-4 4 l2 6 l-6 -4 l-6 4 l2 -6 l-4 -4 z", fill: "yellow", stroke: "orange", transform: "scale(0.8) translate(10, 10)" }),
                 React.createElement('path', { d: "M36 42 l2 -6 l2 6 l6 0 l-4 4 l2 6 l-6 -4 l-6 4 l2 -6 l-4 -4 z", fill: "yellow", stroke: "orange", transform: "scale(0.8) translate(35, 10)" })
            ),
            accessory === 9 && React.createElement('g', null, // Heart Glasses
                React.createElement('path', { d: "M35 42 Q38 36 41 42 Q44 36 47 42 L41 48 Z", fill: "pink", stroke: "red" }),
                React.createElement('path', { d: "M53 42 Q56 36 59 42 Q62 36 65 42 L59 48 Z", fill: "pink", stroke: "red" })
            ),

            // --- HATS ---
            hat === 1 && React.createElement('g', null, // Cap
                React.createElement('path', { d: "M25 35 Q50 20 75 35 L75 30 Q50 15 25 30 Z", fill: "#333" }),
                React.createElement('path', { d: "M25 35 L75 35", stroke: "#333", strokeWidth: "2" })
            ),
            hat === 2 && React.createElement('g', null, // Beanie
                React.createElement('path', { d: "M28 35 L72 35 L65 15 L35 15 Z", fill: "#3b82f6" }),
                React.createElement('circle', { cx: "50", cy: "15", r: "4", fill: "#3b82f6" })
            ),
            hat === 3 && React.createElement('g', null, // Top Hat
                React.createElement('rect', { x: "35", y: "15", width: "30", height: "25", fill: "#111" }),
                React.createElement('rect', { x: "25", y: "38", width: "50", height: "4", fill: "#111" }),
                React.createElement('rect', { x: "35", y: "33", width: "30", height: "5", fill: "#c0392b" })
            ),
            hat === 4 && React.createElement('g', null, // Cowboy Hat
                React.createElement('path', { d: "M20 35 Q50 45 80 35 L80 30 Q50 10 20 30 Z", fill: "#8d6e63" }),
                React.createElement('path', { d: "M35 30 L65 30 L60 10 L40 10 Z", fill: "#6d4c41" })
            ),
            hat === 5 && React.createElement('path', { d: "M30 35 L30 15 L40 25 L50 15 L60 25 L70 15 L70 35 Z", fill: "gold", stroke: "orange" }), // Crown
            hat === 6 && React.createElement('g', null, // Headphones
                React.createElement('path', { d: "M25 45 Q25 15 75 45", fill: "none", stroke: "#333", strokeWidth: "4" }),
                React.createElement('rect', { x: "20", y: "40", width: "8", height: "12", rx: "2", fill: "#555" }),
                React.createElement('rect', { x: "72", y: "40", width: "8", height: "12", rx: "2", fill: "#555" })
            ),
            hat === 7 && React.createElement('g', null, // Flower Crown
                React.createElement('circle', { cx: "30", cy: "35", r: "4", fill: "pink" }),
                React.createElement('circle', { cx: "40", cy: "33", r: "4", fill: "yellow" }),
                React.createElement('circle', { cx: "50", cy: "32", r: "5", fill: "white" }),
                React.createElement('circle', { cx: "60", cy: "33", r: "4", fill: "yellow" }),
                React.createElement('circle', { cx: "70", cy: "35", r: "4", fill: "pink" })
            ),
            hat === 8 && React.createElement('g', null, // Viking
                React.createElement('path', { d: "M30 35 Q50 20 70 35", fill: "#999" }),
                React.createElement('path', { d: "M30 35 L20 20", stroke: "#ddd", strokeWidth: "3" }),
                React.createElement('path', { d: "M70 35 L80 20", stroke: "#ddd", strokeWidth: "3" })
            ),
            hat === 9 && React.createElement('path', { d: "M30 35 L30 15 Q40 5 50 15 Q60 5 70 15 L70 35 Z", fill: "white", stroke: "#ddd" }), // Chef
            hat === 10 && React.createElement('g', null, // Party Hat
                React.createElement('polygon', { points: "35,35 50,10 65,35", fill: "cyan" }),
                React.createElement('circle', { cx: "50", cy: "10", r: "3", fill: "orange" })
            )
        )
    );
};

const AvatarEditor = ({ initialConfig, onSave }) => {
    const [config, setConfig] = useState(initialConfig || {
        skinColor: AVATAR_OPTIONS.skin[2],
        hairColor: AVATAR_OPTIONS.hair[1],
        clothingColor: AVATAR_OPTIONS.clothing[1],
        hairStyle: 0,
        clothingStyle: 0,
        accessory: 0,
        hat: 0
    });
    
    const update = (key, val) => setConfig(prev => ({ ...prev, [key]: val }));

    const categories = [
        { id: 'skin', label: 'Pele', type: 'color', options: AVATAR_OPTIONS.skin, key: 'skinColor' },
        { id: 'hair', label: 'Cabelo', type: 'style+color', count: AVATAR_COUNTS.hairStyle, colors: AVATAR_OPTIONS.hair, styleKey: 'hairStyle', colorKey: 'hairColor' },
        { id: 'clothing', label: 'Roupa', type: 'style+color', count: AVATAR_COUNTS.clothingStyle, colors: AVATAR_OPTIONS.clothing, styleKey: 'clothingStyle', colorKey: 'clothingColor' },
        { id: 'accessory', label: 'Óculos', type: 'style', count: AVATAR_COUNTS.accessory, styleKey: 'accessory' },
        { id: 'hat', label: 'Chapéu', type: 'style', count: AVATAR_COUNTS.hat, styleKey: 'hat' }
    ];

    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return React.createElement('div', { className: "bg-white text-black p-4 md:p-6 rounded-2xl shadow-2xl w-full max-w-md flex flex-col items-center animate-zoom-in max-h-[90vh]" },
        React.createElement('h2', { className: "text-2xl font-black mb-4 text-indigo-900" }, "Personalize"),
        
        // Preview
        React.createElement('div', { className: "w-48 h-48 mb-6 border-8 border-indigo-100 rounded-full bg-white shadow-lg shrink-0" },
            React.createElement(Avatar, { config: config })
        ),

        // Category Menu (Horizontal Scroll)
        React.createElement('div', { className: "w-full overflow-x-auto pb-2 mb-4 scrollbar-hide" },
            React.createElement('div', { className: "flex gap-2 min-w-min px-1" },
                categories.map(cat => (
                    React.createElement('button', {
                        key: cat.id,
                        onClick: () => setActiveCategory(cat),
                        className: `px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeCategory.id === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                    }, cat.label)
                ))
            )
        ),

        // Controls Area
        React.createElement('div', { className: "w-full flex-1 overflow-y-auto min-h-[200px] p-1 custom-scrollbar" },
            
            // Render Color Options if applicable
            (activeCategory.type === 'color' || activeCategory.type === 'style+color') && (
                React.createElement('div', { className: "mb-6" },
                    React.createElement('p', { className: "text-xs font-bold text-gray-400 uppercase mb-2" }, "Cores"),
                    React.createElement('div', { className: "flex flex-wrap gap-3" },
                        (activeCategory.colors || activeCategory.options).map(c => (
                            React.createElement('button', { 
                                key: c, 
                                onClick: () => update(activeCategory.colorKey || activeCategory.key, c),
                                className: `w-10 h-10 rounded-full border-2 shadow-sm transition-transform hover:scale-110 ${config[activeCategory.colorKey || activeCategory.key] === c ? 'border-indigo-600 scale-110 ring-2 ring-indigo-200' : 'border-white'}`,
                                style: { backgroundColor: c }
                            })
                        ))
                    )
                )
            ),

            // Render Style Options if applicable
            (activeCategory.type === 'style' || activeCategory.type === 'style+color') && (
                React.createElement('div', null,
                    React.createElement('p', { className: "text-xs font-bold text-gray-400 uppercase mb-2" }, "Estilos"),
                    React.createElement('div', { className: "grid grid-cols-3 sm:grid-cols-4 gap-3" },
                        Array.from({ length: activeCategory.count }).map((_, i) => ( 
                            React.createElement('button', {
                                key: i,
                                onClick: () => update(activeCategory.styleKey, i),
                                className: `aspect-square rounded-xl border-2 flex flex-col items-center justify-center bg-gray-50 hover:bg-white transition-all ${config[activeCategory.styleKey] === i ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}`
                            },
                                React.createElement('div', { className: "w-full h-full p-1" },
                                     React.createElement(Avatar, { 
                                         config: { ...config, [activeCategory.styleKey]: i },
                                         size: "100%"
                                     })
                                )
                            )
                        ))
                    )
                )
            )
        ),

        React.createElement('button', { 
            onClick: () => onSave(config), 
            className: "w-full mt-4 bg-black text-white py-4 rounded-xl font-black text-xl hover:bg-gray-800 transition-transform hover:scale-[1.02] shadow-xl" 
        }, "Pronto!")
    );
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

// --- Custom UI Components ---
const CustomDropdown = ({ options, value, onChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const selectedOption = options.find(opt => opt.value === value) || options[0];

    return (
        React.createElement('div', { className: "relative", ref: wrapperRef },
            React.createElement('label', { className: "text-[10px] uppercase font-bold text-white/60 mb-1 block" }, label),
            React.createElement('button', {
                type: "button",
                onClick: () => setIsOpen(!isOpen),
                className: "w-full p-3 rounded-lg bg-black/40 border border-white/10 text-white hover:bg-black/60 hover:border-white/30 focus:border-indigo-500 outline-none text-left flex justify-between items-center transition-all shadow-sm"
            },
                React.createElement('span', { className: "text-sm font-bold" }, selectedOption?.label),
                React.createElement('span', { className: `text-xs opacity-50 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}` }, "▼")
            ),
            isOpen && React.createElement('div', { className: "absolute top-full left-0 w-full bg-[#2d2a4c] border border-white/20 rounded-lg mt-2 z-50 shadow-2xl overflow-hidden animate-zoom-in origin-top" },
                React.createElement('div', { className: "max-h-60 overflow-y-auto" },
                    options.map(opt => (
                        React.createElement('button', {
                            key: opt.value,
                            type: "button",
                            onClick: () => {
                                onChange(opt.value);
                                setIsOpen(false);
                            },
                            className: `w-full text-left px-4 py-3 text-sm hover:bg-indigo-600/20 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group ${value === opt.value ? 'bg-indigo-600/30 text-white' : 'text-gray-300'}`
                        }, 
                           React.createElement('span', { className: value === opt.value ? 'font-bold' : '' }, opt.label),
                           value === opt.value && React.createElement('span', { className: "text-indigo-400 font-bold" }, "✓")
                        )
                    ))
                )
            )
        )
    );
};

// --- Joystick Component for Bonus Game ---
const VirtualJoystick = ({ onMove }) => {
    const joystickRef = useRef(null);
    const knobRef = useRef(null);
    
    // Track state in refs to avoid re-renders interfering with high-freq events
    const state = useRef({
        active: false,
        currentX: 0,
        currentY: 0,
        lastSentX: 0,
        lastSentY: 0
    });

    useEffect(() => {
        const joystick = joystickRef.current;
        if (!joystick) return;

        const updateVisuals = (dx, dy) => {
            if (knobRef.current) {
                knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
            }
        };

        const handleStart = (e) => {
            if (e.cancelable) e.preventDefault();
            state.current.active = true;
            processMove(e);
        };

        const handleMove = (e) => {
            if (!state.current.active) return;
            if (e.cancelable) e.preventDefault();
            processMove(e);
        };

        const handleEnd = (e) => {
            if (!state.current.active) return;
            if (e.cancelable) e.preventDefault();
            
            state.current.active = false;
            state.current.currentX = 0;
            state.current.currentY = 0;
            
            updateVisuals(0, 0);
            
            // IMMEDIATE STOP SEND
            // We force send (0,0) immediately to ensure the player stops.
            // We bypass the interval loop for this critical event.
            onMove({ x: 0, y: 0 });
            state.current.lastSentX = 0;
            state.current.lastSentY = 0;
        };

        const processMove = (e) => {
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = joystick.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const maxRadius = rect.width / 2;

            let dx = clientX - centerX;
            let dy = clientY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > maxRadius) {
                const angle = Math.atan2(dy, dx);
                dx = Math.cos(angle) * maxRadius;
                dy = Math.sin(angle) * maxRadius;
            }

            updateVisuals(dx, dy);

            // Update logic state
            state.current.currentX = parseFloat((dx / maxRadius).toFixed(2));
            state.current.currentY = parseFloat((dy / maxRadius).toFixed(2));
        };

        joystick.addEventListener('touchstart', handleStart, { passive: false });
        joystick.addEventListener('mousedown', handleStart);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        return () => {
            joystick.removeEventListener('touchstart', handleStart);
            joystick.removeEventListener('mousedown', handleStart);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleEnd);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleEnd);
        };
    }, [onMove]);

    // Network Loop
    useEffect(() => {
        const interval = setInterval(() => {
            if (!state.current.active) return;

            const { currentX, currentY, lastSentX, lastSentY } = state.current;

            // Simple diff check
            const diff = Math.abs(currentX - lastSentX) + Math.abs(currentY - lastSentY);

            // Send only if changed significantly (0.05 threshold) to prevent flooding.
            // This 100ms throttle + threshold prevents the "queue lag" effect.
            if (diff > 0.05) {
                onMove({ x: currentX, y: currentY });
                state.current.lastSentX = currentX;
                state.current.lastSentY = currentY;
            }
        }, 100); // 100ms throttle = 10 updates/sec

        return () => clearInterval(interval);
    }, [onMove]);

    return (
        React.createElement('div', { 
            className: "flex flex-col items-center justify-center h-full w-full fixed inset-0 bg-slate-900",
            style: { touchAction: 'none' } 
        },
            React.createElement('h3', { className: "text-2xl font-black mb-12 animate-pulse text-yellow-300 pointer-events-none select-none" }, "Controle o Personagem!"),
            React.createElement('div', { 
                ref: joystickRef,
                className: "w-64 h-64 bg-white/10 rounded-full border-4 border-white/30 relative flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.2)] touch-none select-none cursor-pointer",
            },
                React.createElement('div', { 
                    ref: knobRef,
                    className: "w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-2xl absolute border-4 border-white/50 pointer-events-none will-change-transform",
                })
            ),
            React.createElement('p', { className: "mt-12 text-white/50 font-bold uppercase tracking-widest text-sm pointer-events-none select-none" }, "Arraste para mover")
        )
    );
};

// --- Bonus Game Host Component ---
const BonusGameHost = ({ players, onUpdateScores, onEndGame }) => {
    const [timeLeft, setTimeLeft] = useState(30);
    const [gameItems, setGameItems] = useState([]);
    const [renderPositions, setRenderPositions] = useState({});
    
    // Refs for physics loop (avoids React state batching issues)
    const positionsRef = useRef({});
    // NEW: Separate velocities to avoid race condition with animation loop
    const velocitiesRef = useRef({});

    // Dynamic Player Size Calculation
    const playerSizeVw = useMemo(() => {
        const count = Math.max(players.length, 1);
        return Math.max(1.5, Math.min(6, 40 / Math.sqrt(count)));
    }, [players.length]);

    // Game loop refs
    const requestRef = useRef();
    const startTimeRef = useRef(Date.now());
    const lastItemSpawn = useRef(0);
    
    // Initialize positions and velocities
    useEffect(() => {
        players.forEach((p, i) => {
             // Init if not present
             if (!positionsRef.current[p.id]) {
                positionsRef.current[p.id] = { 
                    x: 10 + (Math.random() * 80), 
                    y: 10 + (Math.random() * 80), 
                    color: ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#ec4899', '#8b5cf6'][i % 6]
                };
             }
             if (!velocitiesRef.current[p.id]) {
                 velocitiesRef.current[p.id] = { x: 0, y: 0 };
             }
        });
        setRenderPositions({ ...positionsRef.current });
    }, [players]);

    // Socket Handler - Updates Velocity Ref only
    useEffect(() => {
        window.updatePlayerVelocity = (playerId, vec) => {
            velocitiesRef.current[playerId] = vec;
        };
        return () => { window.updatePlayerVelocity = null; };
    }, []);

    const animate = () => {
        const now = Date.now();
        const deltaTime = (now - startTimeRef.current) / 1000; // seconds
        
        // 1. Update Timer
        if (Math.floor(deltaTime) > (30 - timeLeft)) {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    onEndGame();
                    return 0;
                }
                return prev - 1;
            });
        }

        // 2. Spawn Items (Balls: 70%, Coins: 20%, Bombs: 10%)
        if (now - lastItemSpawn.current > 800) { // Every 800ms
            const typeRoll = Math.random();
            let type = 'ball';
            let value = 50;
            let size = 4; // vw

            if (typeRoll > 0.9) { type = 'bomb'; value = -100; size = 5; }
            else if (typeRoll > 0.7) { type = 'coin'; value = 200; size = 4; }

            setGameItems(prev => [...prev, {
                id: Date.now() + Math.random(),
                x: 5 + Math.random() * 90,
                y: 5 + Math.random() * 90,
                type,
                value,
                size
            }]);
            lastItemSpawn.current = now;
        }

        // 3. Update Physics & Collision
        const speed = 0.8; // Increased speed for better responsiveness (was 0.6)
        const radius = playerSizeVw / 2; // Radius in VW (approximation)
        
        const nextPos = { ...positionsRef.current };
        let hasChanges = false;
        
        // Move players
        Object.keys(nextPos).forEach(pid => {
            const p = nextPos[pid];
            const v = velocitiesRef.current[pid] || { x: 0, y: 0 }; // Read current input

            if (v.x !== 0 || v.y !== 0) {
                let nx = p.x + (v.x * speed);
                let ny = p.y + (v.y * speed);
                
                // Boundaries (keep entire ball inside)
                nx = Math.max(radius, Math.min(100 - radius, nx));
                ny = Math.max(radius, Math.min(100 - radius, ny));
                
                nextPos[pid] = { ...p, x: nx, y: ny };
                hasChanges = true;
            }
        });
        
        // Save back to ref
        positionsRef.current = nextPos;

        // Check Collisions (Needs to interact with State for Items)
        setGameItems(prevItems => {
            const survivingItems = [];
            const scoresToUpdate = {};
            let itemsChanged = false;

            prevItems.forEach(item => {
                let collected = false;
                Object.keys(nextPos).forEach(pid => {
                    if (collected) return;
                    const p = nextPos[pid];
                    
                    const dx = (p.x - item.x);
                    const dy = (p.y - item.y) * (16/9); 
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    
                    if (dist < (radius + item.size/2)) { 
                        collected = true;
                        if (!scoresToUpdate[pid]) scoresToUpdate[pid] = 0;
                        scoresToUpdate[pid] += item.value;
                    }
                });

                if (!collected) {
                    if (now - item.id > 10000) {
                        itemsChanged = true; // expired
                        return;
                    }
                    survivingItems.push(item);
                } else {
                    itemsChanged = true;
                }
            });

            if (Object.keys(scoresToUpdate).length > 0) {
                onUpdateScores(scoresToUpdate);
            }

            return itemsChanged ? survivingItems : prevItems;
        });

        // Trigger render if needed
        if (hasChanges) {
            setRenderPositions(nextPos);
        }

        if (timeLeft > 0) {
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [timeLeft, playerSizeVw]);

    return (
        React.createElement('div', { className: "relative w-full h-full bg-slate-900 overflow-hidden select-none" },
            // HUD
            React.createElement('div', { className: "absolute top-4 left-0 w-full flex justify-center z-50 pointer-events-none" },
                React.createElement('div', { className: "bg-white/20 backdrop-blur-md px-8 py-2 rounded-full border border-white/30 shadow-2xl" },
                    React.createElement('span', { className: "text-4xl font-black text-white drop-shadow-md" }, `Tempo: ${timeLeft}s`)
                )
            ),
            
            // Grid Lines for effect
            React.createElement('div', { className: "absolute inset-0 opacity-20", 
                style: { backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' } 
            }),

            // Items
            gameItems.map(item => (
                React.createElement('div', { 
                    key: item.id,
                    className: "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center transition-transform",
                    style: { 
                        left: `${item.x}%`, 
                        top: `${item.y}%`, 
                        width: `${item.size}vw`, 
                        height: `${item.size}vw`,
                        animation: 'zoom-in 0.3s'
                    }
                },
                    item.type === 'bomb' ? (
                        React.createElement('span', { className: "text-4xl animate-pulse filter drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]" }, "💣")
                    ) : item.type === 'coin' ? (
                        React.createElement('div', { className: "w-full h-full rounded-full bg-yellow-400 border-4 border-yellow-600 shadow-lg flex items-center justify-center animate-[bounce_1s_infinite]" },
                             React.createElement('span', { className: "font-black text-yellow-800 text-lg" }, "$")
                        )
                    ) : (
                        React.createElement('div', { className: "w-full h-full rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 shadow-[0_0_15px_rgba(0,255,255,0.5)] border-2 border-white/50" })
                    )
                )
            )),

            // Players
            Object.keys(renderPositions).map(pid => {
                const p = renderPositions[pid];
                const playerInfo = players.find(pl => pl.id === pid);
                return React.createElement('div', {
                    key: pid,
                    className: "absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transition-all duration-75 ease-linear will-change-transform",
                    style: { left: `${p.x}%`, top: `${p.y}%` }
                },
                    React.createElement('div', { 
                        className: "rounded-full border-2 md:border-4 border-white shadow-xl flex items-center justify-center text-white font-bold overflow-hidden transition-all",
                        style: { 
                            backgroundColor: p.color,
                            width: `${playerSizeVw}vw`,
                            height: `${playerSizeVw}vw`,
                            fontSize: `${playerSizeVw * 0.4}vw`
                        }
                    },
                         playerInfo?.avatar ? (
                             React.createElement(Avatar, { config: playerInfo.avatar, size: '100%' })
                         ) : (
                             playerInfo ? playerInfo.nickname.substring(0,2).toUpperCase() : '??'
                         )
                    ),
                    React.createElement('span', { className: "mt-1 bg-black/50 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm whitespace-nowrap" }, playerInfo?.nickname)
                );
            })
        )
    );
};

// --- From components/Host/QuizCreator.tsx ---
const SaveQuizModal = ({ quizTitle, onSave, onCancel, onError }) => {
    const [name, setName] = useState(quizTitle);
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !password) {
            onError("Por favor, preencha o nome e a senha.");
            return;
        }
        onSave(name, password);
    };

    return React.createElement('div', { className: "fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" },
        React.createElement('form', { onSubmit: handleSubmit, className: "bg-white text-black p-6 rounded-lg shadow-xl max-w-sm w-full animate-zoom-in" },
            React.createElement('h3', { className: "text-xl font-black mb-4" }, "Salvar Quiz"),
            React.createElement('div', { className: "mb-4" },
                React.createElement('label', { className: "block text-sm font-bold text-gray-700 mb-1" }, "Nome do Quiz"),
                React.createElement('input', {
                    type: "text",
                    value: name,
                    onChange: (e) => setName(e.target.value),
                    className: "w-full p-2 border border-gray-300 rounded",
                    required: true
                })
            ),
            React.createElement('div', { className: "mb-6" },
                React.createElement('label', { className: "block text-sm font-bold text-gray-700 mb-1" }, "Senha para Recuperação"),
                React.createElement('input', {
                    type: "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    className: "w-full p-2 border border-gray-300 rounded",
                    required: true
                })
            ),
            React.createElement('div', { className: "flex justify-end gap-4" },
                React.createElement('button', { type: "button", onClick: onCancel, className: "px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold transition-colors" }, "Cancelar"),
                React.createElement('button', { type: "submit", className: "px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold transition-colors" }, "Salvar")
            )
        )
    );
};


const QuizCreator = ({ onSave, onCancel, onSaveQuiz, initialQuiz, showNotification }) => {
  const [title, setTitle] = useState(initialQuiz?.title || "Meu Quiz Incrível");
  const [questions, setQuestions] = useState(initialQuiz?.questions || []);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const addEmptyQuestion = () => {
    const newQ = {
      id: `q-${Date.now()}`,
      text: "Nova Pergunta",
      timeLimit: 20,
      points: 100, // Default requested by user
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

  const timeOptions = [
    { value: 5, label: "5 segundos" },
    { value: 10, label: "10 segundos" },
    { value: 20, label: "20 segundos" },
    { value: 30, label: "30 segundos" },
    { value: 60, label: "60 segundos" },
    { value: 120, label: "120 segundos" },
  ];

  const pointOptions = [
    { value: 0, label: "0 pontos" },
    { value: 100, label: "100 pontos (Padrão)" },
    { value: 500, label: "500 pontos" },
    { value: 1000, label: "1000 pontos" },
    { value: 2000, label: "2000 pontos (Dobro)" },
  ];

  return React.createElement('div', { className: "relative z-10 flex flex-col w-full h-[100dvh] md:h-[90vh] md:max-w-5xl md:mx-auto bg-slate-900/90 md:bg-white/10 backdrop-blur-md md:rounded-xl border-none md:border border-white/20 shadow-2xl md:mt-4 overflow-hidden" },
      isSaveModalOpen && React.createElement(SaveQuizModal, {
          quizTitle: title,
          onSave: (name, password) => {
              onSaveQuiz({ title, questions }, name, password);
              setIsSaveModalOpen(false);
          },
          onCancel: () => setIsSaveModalOpen(false),
          onError: (msg) => showNotification(msg, 'error')
      }),
      React.createElement('div', { className: "flex flex-col md:flex-row justify-between items-center p-4 bg-black/20 border-b border-white/10 shrink-0 gap-3" },
        React.createElement('div', { className: "flex items-center gap-4 w-full md:w-auto text-center md:text-left" },
          React.createElement('h2', { className: "text-xl md:text-3xl font-black text-white" }, "Criar quiz")
        ),
        React.createElement('div', { className: "flex items-center gap-2 md:gap-4 w-full md:w-auto justify-end" },
            React.createElement('div', { className: "flex gap-2 ml-auto" },
                React.createElement('button', { onClick: onCancel, className: "flex-1 md:flex-none px-3 py-2 bg-gray-600 rounded font-bold hover:bg-gray-500 text-sm" }, "Cancelar"),
                React.createElement('button', { onClick: () => setIsSaveModalOpen(true), className: "flex-1 md:flex-none px-4 py-2 bg-blue-600 rounded font-bold hover:bg-blue-500 text-sm whitespace-nowrap" }, "Salvar"),
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
            React.createElement('div', { key: q.id, className: "bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg relative group", style: { zIndex: questions.length - qIndex } },
                React.createElement('div', { className: "flex justify-between items-center mb-3" },
                    React.createElement('h3', { className: "font-bold text-white/80 text-sm uppercase" }, `Pergunta ${qIndex + 1}`),
                    React.createElement('button', { onClick: () => setQuestions(questions.filter((_, i) => i !== qIndex)), className: "text-red-400 hover:text-red-300 p-1 hover:bg-red-400/10 rounded", title: "Excluir Pergunta" }, "🗑️")
                ),
                React.createElement('input', { value: q.text, onChange: (e) => updateQuestion(qIndex, 'text', e.target.value), className: "w-full p-3 mb-4 text-lg md:text-xl font-bold text-center rounded-lg bg-white text-black placeholder-gray-400 focus:ring-4 ring-indigo-500/50 outline-none", placeholder: "Digite a pergunta aqui..." }),
                React.createElement('div', { className: "flex flex-col md:flex-row gap-3 mb-4" },
                    React.createElement('div', { className: "w-full md:w-1/3 flex flex-col gap-3" },
                        React.createElement(CustomDropdown, {
                            label: "Tempo (s)",
                            options: timeOptions,
                            value: q.timeLimit,
                            onChange: (val) => updateQuestion(qIndex, 'timeLimit', val)
                        }),
                        React.createElement(CustomDropdown, {
                            label: "Pontos",
                            options: pointOptions,
                            value: q.points || 100,
                            onChange: (val) => updateQuestion(qIndex, 'points', val)
                        })
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
                                className: 'flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/30 rounded-lg cursor-pointer bg-black/30 hover:bg-black/50 transition-colors',
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
  const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://s.art-quiz.it';
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
                React.createElement('div', { className: "text-4xl md:text-5xl font-black text-indigo-900 tracking-tight leading-none my-1" }, "s.art-quiz.it"),
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
        React.createElement('div', { className: "flex flex-wrap gap-4 justify-center content-start pb-20" },
            players.length === 0 && (
                React.createElement('div', { className: "mt-10 md:mt-20 flex flex-col items-center animate-pulse opacity-60 text-center" },
                    React.createElement('div', { className: "text-5xl md:text-6xl mb-4" }, "⏳"),
                    React.createElement('h2', { className: "text-xl md:text-2xl font-bold" }, "Aguardando jogadores..."),
                    React.createElement('p', { className: "text-xs md:text-sm mt-2" }, "Use o PIN ou QR Code para entrar!")
                )
            ),
            players.map((p) => (
                React.createElement('div', { key: p.id, className: "bg-white text-black font-black text-lg md:text-xl p-3 rounded-lg shadow-lg animate-[bounce_0.5s_ease-out] border-b-4 border-gray-300 min-w-[100px] md:min-w-[120px] text-center flex flex-col items-center gap-2" },
                    p.avatar ? (
                        React.createElement(Avatar, { config: p.avatar, size: 60 })
                    ) : null,
                    React.createElement('span', null, p.nickname)
                )
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
const HostGame = ({ quiz, players, currentQuestionIndex, timeLeft, gameState, onNext, onEndGame, onStartBonusGame, onUpdateScores }) => {
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

      case GameState.MINIGAME:
          return React.createElement(BonusGameHost, { 
              players: players,
              onUpdateScores: onUpdateScores,
              onEndGame: onNext // When time up, go to Leaderboard (or next state)
          });

      case GameState.ANSWER_REVEAL:
          const totalAnswers = players.filter(p => p.lastAnswerShape).length;
          const answerCounts = question.answers.reduce((acc, answer) => {
              acc[answer.shape] = players.filter(p => p.lastAnswerShape === answer.shape).length;
              return acc;
          }, {});

          return React.createElement(AnimatedScreen, { key: 'answer-reveal', animationClass: 'animate-fade-in' },
              React.createElement('div', { className: "flex flex-col h-full p-4 w-full max-w-6xl mx-auto" },
                  React.createElement('div', { className: `bg-white text-black p-6 rounded-lg shadow-2xl text-center mx-auto w-full mb-6` },
                      React.createElement('h2', { className: "text-2xl md:text-4xl font-bold leading-tight" }, question.text)
                  ),
                  React.createElement('div', { className: "flex-1 grid grid-cols-1 md:grid-cols-2 gap-3" },
                      question.answers.map((answer) => {
                          const count = answerCounts[answer.shape] || 0;
                          const percentage = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;
                          return React.createElement('div', { key: answer.shape, className: `relative flex items-center justify-between p-4 rounded-lg text-white transition-all duration-500 overflow-hidden ${answer.isCorrect ? 'bg-green-600' : 'bg-slate-700'}`},
                              React.createElement('div', { className: 'absolute top-0 left-0 h-full bg-black/20 rounded-lg', style: { width: `${percentage}%`, transition: 'width 0.5s ease-out' } }),
                              React.createElement('div', { className: 'relative z-10 flex items-center' },
                                  React.createElement('div', { className: "text-3xl mr-4" }, SHAPE_ICONS[answer.shape]),
                                  React.createElement('span', { className: "text-lg font-bold" }, answer.text)
                              ),
                              React.createElement('div', { className: 'relative z-10 flex items-center gap-2' },
                                  answer.isCorrect && React.createElement('span', { className: 'text-2xl font-black' }, '✓'),
                                  React.createElement('span', { className: "text-xl font-black bg-black/30 px-3 py-1 rounded-md" }, count)
                              )
                          );
                      })
                  ),
                  React.createElement('div', { className: 'flex justify-end mt-4' },
                      React.createElement('button', { onClick: onNext, className: "bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded shadow-lg transition-transform hover:scale-105" }, 'Avançar')
                  )
              )
          );
          
      case GameState.LEADERBOARD:
      case GameState.PODIUM:
        const isPodium = gameState === GameState.PODIUM;
        return React.createElement(AnimatedScreen, { key: isPodium ? 'podium' : `leaderboard-${currentQuestionIndex}`, animationClass: 'animate-fade-in' },
          React.createElement('div', { className: "flex flex-col items-center pt-10 h-full w-full max-w-4xl mx-auto" },
            React.createElement('h1', { className: "text-4xl font-black bg-white text-indigo-900 px-8 py-2 rounded-lg mb-10" }, isPodium ? 'Pódio Final' : 'Placar'),
            React.createElement('div', { className: "flex flex-col gap-4 w-full px-8" },
              sortedPlayers.slice(0, 5).map((p, idx) => (
                React.createElement('div', { key: p.id, className: "flex items-center justify-between bg-white/10 backdrop-blur rounded-lg p-4 animate-slide-in-from-right", style: { animationDelay: `${idx * 0.1}s` } },
                  React.createElement('div', { className: "flex items-center gap-4" },
                    React.createElement('span', { className: "font-black text-2xl w-8" }, idx + 1),
                    p.avatar && React.createElement('div', { className: "w-10 h-10" }, React.createElement(Avatar, { config: p.avatar })),
                    React.createElement('span', { className: "font-bold text-xl" }, p.nickname),
                    p.streak > 2 && React.createElement('span', { className: "bg-orange-500 text-xs font-bold px-2 py-1 rounded-full" }, `🔥 ${p.streak}`)
                  ),
                  React.createElement('span', { className: "font-black text-2xl" }, p.score)
                )
              ))
            ),
            React.createElement('div', { className: "mt-auto mb-10 flex gap-4" },
                !isPodium && React.createElement('button', { onClick: onStartBonusGame, className: "bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded shadow-lg transition-transform hover:scale-105" }, '🎮 Rodada Bônus'),
                React.createElement('button', { onClick: isPodium ? onEndGame : onNext, className: "bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded shadow-lg transition-transform hover:scale-105" }, isPodium ? 'Voltar ao Menu' : 'Próxima Pergunta')
            )
          )
        );

      case GameState.QUESTION:
      default:
        const answeredCount = players.filter(p => p.lastAnswerShape).length;
        
        return React.createElement('div', { key: `question-${currentQuestionIndex}`, className: "animate-fade-in flex flex-col h-full p-4 w-full" },
          React.createElement('div', { className: "flex justify-end items-center mb-4 gap-4" },
            // Question Counter
            React.createElement('div', { className: "bg-white/90 backdrop-blur text-indigo-900 font-black px-6 py-2 rounded-full text-xl shadow-lg border-2 border-indigo-900/10" }, 
                `Questão ${currentQuestionIndex + 1} / ${quiz.questions.length}`
            ),
            // Answers Counter
            React.createElement('div', { className: "bg-indigo-600 text-white font-bold px-6 py-2 rounded-full text-xl shadow-lg border-2 border-white/20 flex items-center gap-2" },
                React.createElement('span', { className: "text-2xl" }, "📥"),
                React.createElement('span', null, `Respostas: ${answeredCount}`)
            ),
            // Timer
            React.createElement('div', { className: "w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl relative z-10" },
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
          )
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
const PlayerView = ({ onJoin, onSubmit, onJoystickMove, gameState, hasAnswered, score, place, nickname, feedback, showNotification }) => {
  const [step, setStep] = useState('LOGIN'); // LOGIN, AVATAR, LOBBY
  const [inputName, setInputName] = useState("");
  const [pin, setPin] = useState("");
  const [joined, setJoined] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam) setPin(pinParam);
    if (nickname) {
        setJoined(true);
        setStep('LOBBY');
    }
  }, [nickname]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (inputName.trim() && pin) {
        setStep('AVATAR');
    } else {
        showNotification("Por favor, preencha o PIN e o Apelido.", 'error');
    }
  };

  const handleAvatarSave = (config) => {
      setAvatarConfig(config);
      // Join game
      onJoin(inputName, pin, config);
  };
  
  const getOrdinal = (n) => "º";

  if (step === 'LOGIN' && !joined) {
    return (
      React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen p-4" },
        React.createElement('div', { className: "bg-white text-black p-8 rounded-lg shadow-2xl max-w-sm w-full text-center" },
            React.createElement('h1', { className: "text-4xl font-black mb-6 text-indigo-900" }, "S.art quiz"),
            React.createElement('form', { onSubmit: handleLoginSubmit },
              React.createElement('input', { type: "text", placeholder: "PIN do Jogo", className: "w-full p-3 bg-gray-800 border-2 border-gray-700 rounded mb-4 text-center font-bold text-xl text-white placeholder-gray-400", value: pin, onChange: e => setPin(e.target.value) }),
              React.createElement('input', { type: "text", placeholder: "Apelido", className: "w-full p-3 bg-gray-800 border-2 border-gray-700 rounded mb-6 text-center font-bold text-xl text-white placeholder-gray-400", value: inputName, onChange: e => setInputName(e.target.value) }),
              React.createElement('button', { type: "submit", className: "w-full bg-black text-white py-3 rounded font-black text-xl hover:bg-gray-800 transition-colors" }, "Próximo")
            )
        )
      )
    );
  }

  if (step === 'AVATAR' && !joined) {
      return (
          React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen p-4" },
              React.createElement(AvatarEditor, { onSave: handleAvatarSave })
          )
      );
  }

  // --- BONUS GAME VIEW ---
  if (gameState === GameState.MINIGAME) {
      return (
          React.createElement('div', { className: "fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center" },
              React.createElement(VirtualJoystick, { onMove: onJoystickMove })
          )
      );
  }

  // Only show full screen feedback during ANSWER_REVEAL state
  if (feedback && gameState === GameState.ANSWER_REVEAL) {
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
            avatarConfig && React.createElement('div', { className: "w-32 h-32 mb-4 mx-auto" }, React.createElement(Avatar, { config: avatarConfig })),
            React.createElement('p', { className: "text-xl" }, "Veja seu nome na tela?"),
            React.createElement('div', { className: "mt-4 text-2xl font-black bg-white/20 px-6 py-2 rounded-full animate-pulse" }, nickname)
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

  // Default / Leaderboard Screen (White Card)
  return (
    React.createElement('div', { className: "relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8" },
        React.createElement('div', { className: "bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-sm flex flex-col items-center" },
            React.createElement('p', { className: "text-gray-500 font-bold uppercase text-sm mb-2" }, "Pontuação Total"),
            React.createElement('h2', { className: "text-5xl font-black mb-4" }, score),
            
            // Explicit Points Gained Section
            React.createElement('div', { className: "bg-gray-100 rounded-lg p-3 mb-6 w-full flex flex-col items-center" },
                 React.createElement('span', { className: "text-xs font-bold text-gray-500 uppercase mb-1" }, "Última Rodada"),
                 feedback ? (
                    React.createElement('div', { className: "flex items-center gap-2" },
                        React.createElement('span', { 
                            className: `text-3xl font-black ${feedback.isCorrect ? 'text-green-600' : 'text-red-500'} animate-[bounce_0.5s_ease-out]` 
                        }, feedback.isCorrect ? `+${feedback.points}` : "+0"),
                        feedback.streak > 1 && React.createElement('span', { className: "text-xs font-bold bg-orange-500 text-white px-2 py-1 rounded-full animate-pulse" }, `🔥 ${feedback.streak}`)
                    )
                 ) : (
                    React.createElement('span', { className: "text-gray-400 font-bold text-xl" }, "-")
                 )
            ),

            React.createElement('div', { className: "bg-black text-white py-3 px-6 rounded-lg font-bold text-xl mb-2 w-full" }, place > 0 ? `${place}º Lugar` : '-')
        ),
        React.createElement('div', { className: "mt-8 flex flex-col items-center" },
            avatarConfig && React.createElement('div', { className: "w-20 h-20 mb-2" }, React.createElement(Avatar, { config: avatarConfig })),
            React.createElement('p', { className: "text-white/70 font-bold text-xl" }, nickname)
        )
    )
  );
};

// --- From App.tsx ---
const CHANNEL_NAME = 'kahoot-clone-2025';

const calculateScore = (timeLeft, totalTime, streak, maxPoints) => {
    // Pontos por velocidade: até maxPoints pontos.
    // Quanto mais rápida a resposta, mais próximo de maxPoints.
    const timePoints = Math.round(maxPoints * (timeLeft / totalTime));

    // Bônus por sequência de respostas, começando da 2ª resposta correta consecutiva.
    // +50 para 2, +100 para 3, até um máximo de +500.
    const streakBonus = streak > 1 ? Math.min((streak - 1) * 50, 500) : 0;

    return timePoints + streakBonus;
};

const NotificationModal = ({ message, type, onClose }) => {
    const isError = type === 'error';
    const isSuccess = type === 'success';

    return React.createElement('div', { className: "fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" },
        React.createElement('div', { className: "bg-white text-black p-6 rounded-xl shadow-2xl max-w-sm w-full text-center animate-zoom-in" },
            React.createElement('div', { className: `w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isError ? 'bg-red-100 text-red-600' : isSuccess ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}` },
                React.createElement('span', { className: "text-3xl font-black" }, isError ? '!' : isSuccess ? '✓' : 'i')
            ),
            React.createElement('h3', { className: "text-xl font-black mb-2" }, isError ? "Atenção" : isSuccess ? "Sucesso" : "Informação"),
            React.createElement('p', { className: "text-gray-600 font-medium mb-6" }, message),
            React.createElement('button', { 
                onClick: onClose, 
                className: `w-full py-3 rounded-lg font-bold text-white transition-all transform hover:scale-[1.02] ${isError ? 'bg-red-600 hover:bg-red-500' : isSuccess ? 'bg-green-600 hover:bg-green-500' : 'bg-blue-600 hover:bg-blue-500'}` 
            }, "Entendi")
        )
    );
};

const ConfirmModal = ({ onConfirm, onCancel, text }) => (
    React.createElement('div', { className: "fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" },
        React.createElement('div', { className: "bg-white text-black p-6 rounded-lg shadow-xl max-w-sm w-full text-center animate-zoom-in" },
            React.createElement('h3', { className: "text-xl font-black mb-2" }, "Atenção!"),
            React.createElement('p', { className: "text-gray-700 mb-6" }, text),
            React.createElement('div', { className: "flex justify-center gap-4" },
                React.createElement('button', { onClick: onCancel, className: "px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold transition-colors" }, "Cancelar"),
                React.createElement('button', { onClick: onConfirm, className: "px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors" }, "Confirmar e Sair")
            )
        )
    )
);

const LoadPasswordModal = ({ onConfirm, onCancel, title, buttonText, buttonClass }) => {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(password);
    };

    return React.createElement('div', { className: "fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" },
        React.createElement('form', { onSubmit: handleSubmit, className: "bg-white text-black p-6 rounded-lg shadow-xl max-w-sm w-full animate-zoom-in" },
            React.createElement('h3', { className: "text-xl font-black mb-4" }, title || "Digite a Senha do Quiz"),
            React.createElement('div', { className: "mb-6" },
                React.createElement('input', {
                    type: "password",
                    value: password,
                    onChange: (e) => setPassword(e.target.value),
                    className: "w-full p-2 border border-gray-300 rounded",
                    required: true,
                    autoFocus: true
                })
            ),
            React.createElement('div', { className: "flex justify-end gap-4" },
                React.createElement('button', { type: "button", onClick: onCancel, className: "px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded font-bold transition-colors" }, "Cancelar"),
                React.createElement('button', { type: "submit", className: `px-6 py-2 text-white rounded font-bold transition-colors ${buttonClass || 'bg-indigo-600 hover:bg-indigo-500'}` }, buttonText || "Carregar")
            )
        )
    );
};

const QuizLoader = ({ onLoad, onDelete, onBack, hashPassword, showNotification }) => {
    const [savedQuizzes, setSavedQuizzes] = useState([]);
    const [quizToLoad, setQuizToLoad] = useState(null);
    const [quizToDelete, setQuizToDelete] = useState(null);

    useEffect(() => {
        try {
            const quizzes = JSON.parse(localStorage.getItem('savedQuizzes-2025') || '[]');
            setSavedQuizzes(quizzes);
        } catch (e) {
            console.error("Failed to load quizzes from storage", e);
            setSavedQuizzes([]);
        }
    }, []);

    const handleLoadPasswordConfirm = async (password) => {
        if (!quizToLoad) return;
        const hash = await hashPassword(password);
        if (hash === quizToLoad.passwordHash) {
            onLoad(quizToLoad.quizData);
        } else {
            showNotification("Senha incorreta!", "error");
        }
        setQuizToLoad(null);
    };

    const handleDeletePasswordConfirm = async (password) => {
        if (!quizToDelete) return;
        const hash = await hashPassword(password);
        if (hash === quizToDelete.passwordHash) {
            onDelete(quizToDelete.id);
            setSavedQuizzes(prev => prev.filter(q => q.id !== quizToDelete.id));
        } else {
            showNotification("Senha incorreta!", "error");
        }
        setQuizToDelete(null);
    };

    return React.createElement('div', { className: "relative z-10 flex flex-col w-full h-screen p-4" },
        quizToLoad && React.createElement(LoadPasswordModal, {
            title: "Digite a Senha do Quiz",
            buttonText: "Carregar",
            buttonClass: "bg-indigo-600 hover:bg-indigo-500",
            onConfirm: handleLoadPasswordConfirm,
            onCancel: () => setQuizToLoad(null)
        }),
        quizToDelete && React.createElement(LoadPasswordModal, {
            title: `Excluir "${quizToDelete.name}"`,
            buttonText: "Excluir",
            buttonClass: "bg-red-600 hover:bg-red-500",
            onConfirm: handleDeletePasswordConfirm,
            onCancel: () => setQuizToDelete(null)
        }),
        React.createElement('div', { className: "w-full max-w-2xl mx-auto flex flex-col h-full" },
            React.createElement('div', { className: "flex items-center justify-between mb-8" },
                React.createElement('h1', { className: "text-4xl font-black" }, "Carregar Quiz Salvo"),
                React.createElement('button', { onClick: onBack, className: "bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-colors flex items-center gap-2" }, "← Voltar ao Menu")
            ),
            savedQuizzes.length === 0 ? (
                React.createElement('div', { className: "flex-1 flex flex-col items-center justify-center bg-black/20 rounded-xl" },
                    React.createElement('p', { className: "text-2xl" }, "📚"),
                    React.createElement('p', { className: "font-bold mt-2" }, "Nenhum quiz salvo encontrado."),
                    React.createElement('p', { className: "text-sm text-white/60" }, "Crie e salve um quiz para vê-lo aqui.")
                )
            ) : (
                React.createElement('div', { className: "flex-1 overflow-y-auto space-y-3" },
                    savedQuizzes.map(quiz => (
                        React.createElement('div', {
                            key: quiz.id,
                            className: "flex items-center justify-between bg-white/10 backdrop-blur rounded-lg p-4 animate-slide-in-from-right"
                        },
                            React.createElement('span', { className: "font-bold text-lg" }, quiz.name),
                            React.createElement('div', { className: "flex gap-2" },
                                React.createElement('button', { onClick: () => setQuizToDelete(quiz), className: "px-3 py-1 bg-red-600/50 hover:bg-red-600 rounded text-xs font-bold" }, "Excluir"),
                                React.createElement('button', { onClick: () => setQuizToLoad(quiz), className: "px-4 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-bold" }, "Carregar")
                            )
                        )
                    ))
                )
            )
        )
    );
};

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
  const [isConfirmingExit, setIsConfirmingExit] = useState(false);

  // Notification State
  const [notification, setNotification] = useState(null);

  const [isMuted, setIsMuted] = useState(false);
  const bgMusicRef = useRef(null);
  const sfxRef = useRef(null);

  const channelRef = useRef(null);
  const timerRef = useRef(null);
  const playerTimerRef = useRef(null);
  const playerTimeLeftRef = useRef(0);
  const myFeedbackRef = useRef(null);

  // Refs to hold current state for callbacks, preventing stale state issues.
  const quizRef = useRef(quiz);
  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  const qIndexRef = useRef(currentQIndex);
  useEffect(() => { qIndexRef.current = currentQIndex; }, [currentQIndex]);
  const myPlayerIdRef = useRef(myPlayerId);
  useEffect(() => { myPlayerIdRef.current = myPlayerId; }, [myPlayerId]);
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);
  const pinRef = useRef(pin);
  useEffect(() => { pinRef.current = pin; }, [pin]);
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // HELPER: Parse nickname for avatar data
  const parsePlayer = (p) => {
      // Format: "Nickname|||JSONString"
      if (!p.nickname.includes('|||')) return p;
      try {
          const parts = p.nickname.split('|||');
          const realNickname = parts[0];
          const avatar = JSON.parse(parts[1]);
          return { ...p, nickname: realNickname, avatar };
      } catch (e) {
          return p;
      }
  };

  const sanitizePlayerList = (list) => {
      return list.map(parsePlayer);
  };

  useEffect(() => {
    bgMusicRef.current = new Audio(AUDIO.LOBBY_MUSIC);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    sfxRef.current = new Audio();
  }, []);

  const showNotification = (message, type = 'info') => {
      setNotification({ message, type });
  };

  const closeNotification = () => {
      setNotification(null);
  };

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
        if (bgMusicRef.current.src !== AUDIO.LOBBY_MUSIC) bgMusicRef.current.src = AUDIO.LOBBY_MUSIC;
        bgMusicRef.current.play().catch(() => {});
    } else if (gameState === GameState.MINIGAME) {
        if (bgMusicRef.current.src !== AUDIO.BONUS_MUSIC) bgMusicRef.current.src = AUDIO.BONUS_MUSIC;
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
        // We broadcast RAW players (with JSON in nickname if present) to persist in other clients, 
        // but locally we display sanitized.
        // Wait, 'players' state in this component should probably hold SANITIZED data for display,
        // but when we sync, we might lose the avatar if we stripped it?
        // Let's store SANITIZED in state, but when we JOIN, we kept the avatar property.
        // broadcast sends what is in state.
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
            
            // Parse incoming join data
            const rawNick = msg.payload.nickname;
            let realNick = rawNick;
            let avatar = null;
            if (rawNick.includes('|||')) {
                try {
                    const parts = rawNick.split('|||');
                    realNick = parts[0];
                    avatar = JSON.parse(parts[1]);
                } catch(e) {}
            }
            
            // Or use the helper if we pass the whole object
            const parsedObj = parsePlayer(msg.payload);

            return [...prev, { 
                id: parsedObj.id, 
                nickname: parsedObj.nickname, 
                avatar: parsedObj.avatar,
                score: 0, 
                streak: 0, 
                lastAnswerShape: null 
            }];
        });
    } else if (msg.type === 'LEAVE') {
        setPlayers(prev => prev.filter(p => p.id !== msg.payload.playerId));
    } else if (msg.type === 'REQUEST_STATE') {
        if (quizRef.current && pinRef.current) {
            broadcast({ type: 'SYNC_STATE', payload: { state: gameStateRef.current, currentQuestionIndex: qIndexRef.current, totalQuestions: quizRef.current.questions.length, pin: pinRef.current } });
            broadcast({ type: 'UPDATE_PLAYERS', payload: playersRef.current });
        }
    } else if (msg.type === 'PLAYER_INPUT') {
        // High frequency input - do not trigger react state re-renders if possible for performance
        if (window.updatePlayerVelocity) {
            window.updatePlayerVelocity(msg.payload.id, msg.payload.vector);
        }
    } else if (msg.type === 'SUBMIT_ANSWER') {
        const { playerId, answerId, timeLeft: answerTime } = msg.payload;
        
        setPlayers(prev => {
            const playerIndex = prev.findIndex(p => p.id === playerId);
            if (playerIndex === -1) return prev;
            
            const player = prev[playerIndex];
            // Use refs to get current question index safely inside callback
            const currentQ = quizRef.current?.questions[qIndexRef.current];
            
            if (!currentQ) return prev;

            const answerShape = answerId; 
            const isCorrect = currentQ.answers.find(a => a.shape === answerShape)?.isCorrect || false;
            
            const currentStreak = isCorrect ? player.streak + 1 : 0;
            const maxPoints = currentQ.points || 100; // Default to 100 if not set, as requested
            const pointsToAdd = isCorrect ? calculateScore(answerTime, currentQ.timeLimit, currentStreak, maxPoints) : 0;

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
                lastAnswerCorrect: isCorrect,
                lastAnswerShape: answerShape
            };
            return newPlayers;
        });
    }
  };

  const hostStartGame = () => {
      hostStartCountdown(0);
  };

  const hostStartCountdown = (indexOverride) => {
      const activeIndex = typeof indexOverride === 'number' ? indexOverride : qIndexRef.current;
      
      playSfx(AUDIO.COUNTDOWN);
      setGameState(GameState.COUNTDOWN);
      setTimeLeft(5);
      // Reset player answers for the new question
      setPlayers(prev => prev.map(p => ({ ...p, lastAnswerShape: null })));
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.COUNTDOWN, currentQuestionIndex: activeIndex, totalQuestions: quizRef.current.questions.length, pin: pinRef.current } });
      
      let count = 5;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
          count--;
          setTimeLeft(count);
          if (count <= 0) {
              clearInterval(timerRef.current);
              hostStartQuestion(activeIndex);
          }
      }, 1000);
  };

  const hostStartQuestion = (indexOverride) => {
      const activeIndex = typeof indexOverride === 'number' ? indexOverride : qIndexRef.current;

      setGameState(GameState.QUESTION);
      // Use quizRef.current to avoid stale closure on 'quiz'
      const q = quizRef.current.questions[activeIndex];
      setTimeLeft(q.timeLimit);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.QUESTION, currentQuestionIndex: activeIndex, totalQuestions: quizRef.current.questions.length, pin: pinRef.current } });
      broadcast({ type: 'QUESTION_START', payload: { questionIndex: activeIndex, timeLimit: q.timeLimit } });

      let count = q.timeLimit;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
          count--;
          setTimeLeft(count);
          if (count <= 0) {
              clearInterval(timerRef.current);
              hostShowAnswerReveal();
          }
      }, 1000);
  };
  
  const hostShowAnswerReveal = () => {
      playSfx(AUDIO.TIME_UP);
      setGameState(GameState.ANSWER_REVEAL);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.ANSWER_REVEAL, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
  };

  const hostShowLeaderboard = () => {
      setGameState(GameState.LEADERBOARD);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.LEADERBOARD, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
  };
  
  const hostStartBonusGame = () => {
      setGameState(GameState.MINIGAME);
      broadcast({ type: 'SYNC_STATE', payload: { state: GameState.MINIGAME, pin } });
  };

  const hostUpdateBonusScores = (scoreUpdates) => {
      // scoreUpdates: { playerId: pointsAdded }
      playSfx(AUDIO.COLLECT);
      setPlayers(prev => {
          return prev.map(p => {
              if (scoreUpdates[p.id]) {
                  return { ...p, score: Math.max(0, p.score + scoreUpdates[p.id]) };
              }
              return p;
          });
      });
  };

  const hostNextQuestion = () => {
      if (currentQIndex + 1 >= quiz.questions.length) {
          setGameState(GameState.PODIUM);
          broadcast({ type: 'SYNC_STATE', payload: { state: GameState.PODIUM, currentQuestionIndex: currentQIndex, totalQuestions: quiz.questions.length, pin } });
      } else {
          const nextIndex = currentQIndex + 1;
          setCurrentQIndex(nextIndex);
          hostStartCountdown(nextIndex);
      }
  };
  
  const handleNextFromHostGame = () => {
    if (gameState === GameState.ANSWER_REVEAL || gameState === GameState.MINIGAME) {
        hostShowLeaderboard();
    } else if (gameState === GameState.LEADERBOARD) {
        hostNextQuestion();
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
          
          // Sound trigger logic: Only play feedback sound when entering ANSWER_REVEAL state
          if (msg.payload.state === GameState.ANSWER_REVEAL) {
             if (myFeedbackRef.current) {
                 if (myFeedbackRef.current.isCorrect) playSfx(AUDIO.CORRECT);
                 else playSfx(AUDIO.WRONG);
             }
          }

          if (msg.payload.state === GameState.QUESTION || msg.payload.state === GameState.COUNTDOWN) {
              setHasAnswered(false);
              setMyFeedback(null); 
              myFeedbackRef.current = null;
          }
          if (msg.payload.state === GameState.LOBBY) {
              setMyScore(0);
          }
          if (msg.payload.state !== GameState.QUESTION) {
              if (playerTimerRef.current) clearInterval(playerTimerRef.current);
          }
      } 
      else if (msg.type === 'UPDATE_PLAYERS') {
          setPlayers(sanitizePlayerList(msg.payload));
          const me = msg.payload.find(p => p.id === myPlayerIdRef.current);
          if (me) {
              setMyScore(me.score);
          }
      }
      else if (msg.type === 'ANSWER_RESULT') {
          if (msg.payload.playerId === myPlayerIdRef.current) {
              const fb = {
                  isCorrect: msg.payload.isCorrect,
                  points: msg.payload.pointsToAdd,
                  streak: msg.payload.newStreak
              };
              setMyFeedback(fb);
              myFeedbackRef.current = fb;
              
              // If we are late and state is already ANSWER_REVEAL, play sound now
              if (gameStateRef.current === GameState.ANSWER_REVEAL) {
                   if (fb.isCorrect) playSfx(AUDIO.CORRECT);
                   else playSfx(AUDIO.WRONG);
              }
              // Otherwise wait for SYNC_STATE to ANSWER_REVEAL
          }
      }
      else if (msg.type === 'QUESTION_START') {
          if (playerTimerRef.current) clearInterval(playerTimerRef.current);
          
          let count = msg.payload.timeLimit;
          setPlayerTimeLeft(count);
          playerTimeLeftRef.current = count;

          playerTimerRef.current = setInterval(() => {
              count--;
              setPlayerTimeLeft(count);
              playerTimeLeftRef.current = count;
              if (count <= 0) {
                  clearInterval(playerTimerRef.current);
              }
          }, 1000);
      }
      else if (msg.type === 'GAME_ENDED') {
        showNotification("O anfitrião encerrou o jogo.", 'info');
        setMyPlayerId("");
        localStorage.removeItem('kahoot-player-id');
        resetAllState();
    }
  };
  
  const playerJoin = async (nickname, pinToJoin, avatarConfig) => {
      if (!pinToJoin) {
          showNotification("Por favor, insira um PIN para entrar no jogo.", 'error');
          return;
      }
      
      // Persist avatar by appending it to the nickname string before sending to DB
      const encodedNickname = avatarConfig 
        ? `${nickname}|||${JSON.stringify(avatarConfig)}`
        : nickname;
      
      const newPlayer = await registerPlayer(pinToJoin, encodedNickname);
      
      if (newPlayer) {
          setMyPlayerId(newPlayer.id);
          localStorage.setItem('kahoot-player-id', newPlayer.id);
          
          // Broadcast raw encoded name so other clients parse it
          broadcast({ type: 'JOIN', payload: { nickname: encodedNickname, id: newPlayer.id } });
          
          setGameState(GameState.LOBBY);
          const url = new URL(window.location.href);
          if (url.searchParams.get('pin') !== pinToJoin) {
            url.searchParams.set('pin', pinToJoin);
            try {
                window.history.pushState({}, '', url);
            } catch (e) {
                console.warn("Failed to update history:", e);
            }
          }
      } else {
          console.error("Falha ao entrar no jogo.");
          showNotification("Falha ao entrar no jogo. O PIN pode estar incorreto ou o jogo não existe.", 'error');
      }
  };

  const playerSubmit = (shape) => {
      if (hasAnswered) return;
      setHasAnswered(true);
      if (playerTimerRef.current) clearInterval(playerTimerRef.current);
      broadcast({ type: 'SUBMIT_ANSWER', payload: { playerId: myPlayerId, answerId: shape, timeLeft: playerTimeLeftRef.current } }); 
  };
  
  // Stable callback using Refs to avoid re-creation on every render
  const playerJoystickMove = useCallback((vector) => {
      broadcast({ type: 'PLAYER_INPUT', payload: { id: myPlayerIdRef.current, vector }});
  }, []);
  
  const resetAllState = () => {
    setAppMode('MENU');
    setGameState(GameState.MENU);
    setQuiz(null);
    setPin("");
    setPlayers([]);
    setCurrentQIndex(0);
    setTimeLeft(0);
    setMyFeedback(null);
    myFeedbackRef.current = null;
    setHasAnswered(false);
    setMyScore(0);
    if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current.currentTime = 0;
    }
    if (window.location.search) {
        try {
            window.history.pushState({}, document.title, window.location.pathname);
        } catch (e) {
            console.warn("Failed to update history:", e);
        }
    }
  };

  const executeBackToMenu = () => {
    if (appMode === 'PLAYER' && myPlayerId) {
        broadcast({ type: 'LEAVE', payload: { playerId: myPlayerId } });
        deletePlayer(myPlayerId);
        localStorage.removeItem('kahoot-player-id');
        setMyPlayerId("");
    }
    
    if (appMode === 'HOST') {
        broadcast({ type: 'GAME_ENDED' });
        deleteGameSessionByPin(pin);
    }

    resetAllState();
  };

  const handleBackToMenu = () => {
    if (appMode === 'MENU' || isConfirmingExit) return;
    setIsConfirmingExit(true);
  };

  const shouldShowBackButton = () => {
    if (appMode === 'MENU' || appMode === 'LOADER') return false;
    if (appMode === 'HOST' && (gameState === GameState.CREATE || gameState === GameState.LOBBY)) {
        return false; // No back button in creator or host lobby
    }
    return true;
  };
  
  const hashPassword = async (password) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
  };

  const handleSaveQuiz = async (quizData, name, password) => {
      if (!name || !password) {
          showNotification("O nome do quiz e a senha são obrigatórios.", 'error');
          return;
      }
      const passwordHash = await hashPassword(password);
      const newQuiz = {
          id: `quiz-${Date.now()}`,
          name,
          passwordHash,
          quizData
      };
      try {
          const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes-2025') || '[]');
          savedQuizzes.push(newQuiz);
          localStorage.setItem('savedQuizzes-2025', JSON.stringify(savedQuizzes));
          showNotification(`Quiz "${name}" salvo com sucesso!`, 'success');
      } catch (e) {
          showNotification("Ocorreu um erro ao salvar o quiz.", 'error');
      }
  };

  const handleDeleteQuiz = (quizId) => {
      try {
          const savedQuizzes = JSON.parse(localStorage.getItem('savedQuizzes-2025') || '[]');
          const updatedQuizzes = savedQuizzes.filter(q => q.id !== quizId);
          localStorage.setItem('savedQuizzes-2025', JSON.stringify(updatedQuizzes));
      } catch (e) {
          showNotification("Ocorreu um erro ao excluir o quiz.", 'error');
      }
  };

  const handleLoadQuiz = (quizData) => {
      setQuiz(quizData);
      setAppMode('HOST');
      setGameState(GameState.CREATE);
  };

  const BackButton = () => (
    React.createElement('button', { onClick: handleBackToMenu, className: "absolute top-4 left-4 z-50 bg-white/20 hover:bg-white/40 text-white px-4 py-2 rounded-full font-bold backdrop-blur-sm transition-colors flex items-center gap-2" },
        React.createElement('span', null, "←"), " Voltar"
    )
  );

  const myPlayer = players.find(p => p.id === myPlayerId);
  const myNickname = myPlayer ? myPlayer.nickname : "";
  const myRank = players.sort((a,b) => b.score - a.score).findIndex(p => p.id === myPlayerId) + 1;

  return (
    React.createElement('div', { className: "relative min-h-screen font-sans text-white overflow-hidden" },
      // Notification Modal
      notification && React.createElement(NotificationModal, {
          message: notification.message,
          type: notification.type,
          onClose: closeNotification
      }),
      isConfirmingExit && React.createElement(ConfirmModal, {
          text: appMode === 'HOST' ? "Tem certeza que deseja sair? O jogo será encerrado para todos os jogadores." : "Tem certeza que deseja sair da sala?",
          onConfirm: () => {
              setIsConfirmingExit(false);
              executeBackToMenu();
          },
          onCancel: () => setIsConfirmingExit(false)
      }),
      appMode === 'MENU' ? (
          React.createElement('div', { className: "relative min-h-screen flex flex-col items-center justify-center" },
            React.createElement(Background, null),
            React.createElement('div', { className: "relative z-10 text-center p-8 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full" },
                React.createElement('h1', { className: "text-6xl font-black mb-12 tracking-tight" }, "S.art quiz"),
                React.createElement('div', { className: "flex flex-col gap-4" },
                    React.createElement('button', { onClick: () => { setQuiz(null); setAppMode('HOST'); setGameState(GameState.CREATE); }, className: "bg-white text-indigo-900 font-black text-xl py-4 rounded shadow-lg hover:scale-105 transition-transform" }, "Criar Jogo"),
                    React.createElement('button', { onClick: () => setAppMode('LOADER'), className: "bg-purple-600 text-white font-bold text-xl py-4 rounded shadow-lg hover:bg-purple-500 transition-colors" }, "Carregar Quiz Salvo"),
                    React.createElement('button', { onClick: () => setAppMode('PLAYER'), className: "bg-indigo-600 border-2 border-indigo-400 text-white font-bold text-xl py-4 rounded shadow-lg hover:bg-indigo-500 transition-colors" }, "Entrar no Jogo")
                ),
                !isConnected && (
                    React.createElement('p', { className: "mt-4 text-xs text-yellow-300 animate-pulse" }, "Conectando ao servidor...")
                )
            )
        )
      ) : appMode === 'LOADER' ? (
          React.createElement('div', null,
              React.createElement(Background, null),
              React.createElement(QuizLoader, {
                  onLoad: handleLoadQuiz,
                  onDelete: handleDeleteQuiz,
                  onBack: () => setAppMode('MENU'),
                  hashPassword: hashPassword,
                  showNotification: showNotification
              })
          )
      ) : appMode === 'HOST' ? (
        React.createElement('div', { className: "relative min-h-screen flex flex-col" },
             React.createElement(Background, null),
             shouldShowBackButton() && React.createElement(BackButton, null),
             React.createElement('div', { className: "absolute bottom-4 right-4 z-50" },
                React.createElement('button', { onClick: toggleMute, className: "bg-white/20 p-3 rounded-full hover:bg-white/40 transition-colors shadow-lg border border-white/10", title: isMuted ? "Ativar som" : "Mudo" }, isMuted ? '🔇' : '🔊')
             ),
             gameState === GameState.CREATE ? (
                 React.createElement(QuizCreator, { onSave: startHost, onCancel: handleBackToMenu, onSaveQuiz: handleSaveQuiz, initialQuiz: quiz, showNotification: showNotification })
             ) : gameState === GameState.LOBBY ? (
                 React.createElement(Lobby, { pin: pin, players: players, onStart: hostStartGame, onCancel: handleBackToMenu })
             ) : (
                 React.createElement(HostGame, { 
                     quiz: quiz, 
                     players: players, 
                     currentQuestionIndex: currentQIndex, 
                     timeLeft: timeLeft, 
                     gameState: gameState, 
                     onNext: handleNextFromHostGame, 
                     onEndGame: handleBackToMenu,
                     onStartBonusGame: hostStartBonusGame,
                     onUpdateScores: hostUpdateBonusScores
                 })
             )
        )
      ) : ( // PLAYER MODE
        React.createElement('div', { className: "h-screen w-full overflow-hidden" },
            React.createElement(Background, null),
            shouldShowBackButton() && React.createElement(BackButton, null),
            React.createElement(PlayerView, { 
                onJoin: playerJoin, 
                onSubmit: playerSubmit,
                onJoystickMove: playerJoystickMove,
                gameState: gameState, 
                hasAnswered: hasAnswered,
                score: myScore,
                place: myRank,
                nickname: myNickname, 
                feedback: myFeedback,
                showNotification: showNotification
            })
        )
      )
    )
  );
};

// --- RENDER APP ---
const root = createRoot(document.getElementById('root'));
root.render(React.createElement(App));