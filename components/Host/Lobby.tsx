import React, { useEffect, useRef } from 'react';
import { Player } from '../../types';
import QRCodeStyling from 'qr-code-styling';

interface LobbyProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  onCancel: () => void;
}

// Helper Component for QR Code to avoid Ref conflicts
const QRCodeView: React.FC<{ url: string; size: number }> = ({ url, size }) => {
    const ref = useRef<HTMLDivElement>(null);
    const qrCode = useRef<QRCodeStyling | null>(null);

    useEffect(() => {
        // Initialize QRCodeStyling
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

        // Append to DOM
        if (ref.current) {
            ref.current.innerHTML = '';
            qrCode.current.append(ref.current);
        }
    }, [size]); // Re-init if size changes drastically, though usually stable

    useEffect(() => {
        // Update data if URL changes
        qrCode.current?.update({ data: url });
    }, [url]);

    return <div ref={ref} className="overflow-hidden rounded-lg" />;
};

const Lobby: React.FC<LobbyProps> = ({ pin, players, onStart, onCancel }) => {
  // Use window.location.origin to support Vercel/Production domains correctly
  const joinUrl = `${window.location.origin}/?pin=${pin}`;

  return (
    <div className="relative z-10 flex flex-col h-screen w-full">
      
      {/* --- HEADER: QR, PIN, URL --- */}
      <div className="bg-white text-black shadow-xl flex flex-col md:flex-row items-center justify-between px-4 py-2 md:px-6 md:py-3 shrink-0 relative z-20 gap-4 md:gap-0">
        
        {/* Left: Join Info */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
            <div className="bg-white p-1 border border-gray-200 rounded hidden md:block shadow-sm">
                 <QRCodeView url={joinUrl} size={80} />
            </div>
            <div className="text-center md:text-left">
                <p className="text-gray-500 font-bold text-xs md:text-sm uppercase">Entre em</p>
                <div className="text-2xl md:text-3xl font-black text-indigo-900 tracking-tight">
                    kahoot.it
                </div>
                <p className="text-xs text-gray-400 font-mono hidden md:block max-w-[200px] truncate" title={joinUrl}>{joinUrl}</p>
            </div>
        </div>

        {/* Center: Mobile QR (Visible only on small screens) */}
        <div className="md:hidden my-1 bg-white p-2 rounded-xl shadow-md border border-gray-100">
             <QRCodeView url={joinUrl} size={140} />
        </div>

        {/* Right: Game PIN */}
        <div className="text-center md:text-right w-full md:w-auto">
            <p className="text-gray-500 font-bold text-xs md:text-sm uppercase">PIN do Jogo</p>
            <div className="text-5xl md:text-6xl font-black tracking-widest text-black leading-none">
                {pin}
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT: PLAYER GRID --- */}
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

        {/* Players Grid */}
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

      {/* --- FOOTER: START BUTTON --- */}
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

export default Lobby;