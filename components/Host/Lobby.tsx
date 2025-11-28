import React, { useEffect, useRef } from 'react';
import { Player } from '../../types';
import QRCode from 'qrcode';

interface LobbyProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  onCancel: () => void; // Added to allow exiting the lobby
}

const Lobby: React.FC<LobbyProps> = ({ pin, players, onStart, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const joinUrl = `${window.location.protocol}//${window.location.host}/?pin=${pin}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 100, // Smaller QR for the header
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      }, (error) => {
        if (error) console.error(error);
      });
    }
  }, [joinUrl, pin]);

  return (
    <div className="relative z-10 flex flex-col h-screen w-full">
      
      {/* --- HEADER: QR, PIN, URL --- */}
      <div className="bg-white text-black shadow-xl flex flex-col md:flex-row items-center justify-between px-6 py-3 shrink-0 relative z-20">
        
        {/* Left: Join Info */}
        <div className="flex items-center gap-4">
            <div className="bg-white p-1 border border-gray-200 rounded hidden md:block">
                 <canvas ref={canvasRef} className="rounded" />
            </div>
            <div className="text-left">
                <p className="text-gray-500 font-bold text-sm uppercase">Entre em</p>
                <div className="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight">
                    kahoot.it
                </div>
                <p className="text-xs text-gray-400 font-mono hidden md:block">{joinUrl}</p>
            </div>
        </div>

        {/* Center: Mobile QR (Visible only on small screens) */}
        <div className="md:hidden my-2">
             <canvas ref={canvasRef} style={{ width: '80px', height: '80px' }} className="rounded border shadow-sm" />
        </div>

        {/* Right: Game PIN */}
        <div className="text-center md:text-right">
            <p className="text-gray-500 font-bold text-sm uppercase">PIN do Jogo</p>
            <div className="text-4xl md:text-6xl font-black tracking-widest text-black">
                {pin}
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT: PLAYER GRID --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full bg-black/20 backdrop-blur-sm">
        
        <div className="flex justify-between items-center mb-6">
            <div className="bg-black/40 text-white px-6 py-2 rounded-full font-bold backdrop-blur-md border border-white/10">
                👤 {players.length} Jogador{players.length !== 1 ? 'es' : ''}
            </div>
            
            {/* Cancel Button (Top Right of content area) */}
            <button 
                onClick={onCancel}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-4 py-2 rounded font-bold transition-colors text-sm"
            >
                Cancelar Jogo
            </button>
        </div>

        {/* Players Grid */}
        <div className="flex flex-wrap gap-4 justify-center content-start">
            {players.length === 0 && (
                <div className="mt-20 flex flex-col items-center animate-pulse opacity-60">
                    <div className="text-6xl mb-4">⏳</div>
                    <h2 className="text-2xl font-bold">Aguardando jogadores...</h2>
                    <p className="text-sm">Entre usando o PIN acima!</p>
                </div>
            )}

            {players.map((p) => (
                <div 
                    key={p.id} 
                    className="bg-white text-black font-black text-xl px-6 py-3 rounded-lg shadow-lg animate-[bounce_0.5s_ease-out] border-b-4 border-gray-300 min-w-[120px] text-center"
                >
                    {p.nickname}
                </div>
            ))}
        </div>
      </div>

      {/* --- FOOTER: START BUTTON --- */}
      <div className="p-4 md:p-6 bg-indigo-900/80 backdrop-blur-md border-t border-white/10 flex justify-end shrink-0">
          <button 
              onClick={onStart}
              disabled={players.length === 0}
              className="w-full md:w-auto bg-white text-black font-black text-2xl px-12 py-4 rounded shadow-[0_4px_0_rgb(0,0,0,0.2)] hover:shadow-[0_2px_0_rgb(0,0,0,0.2)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
          >
              Iniciar Jogo
          </button>
      </div>
    </div>
  );
};

export default Lobby;