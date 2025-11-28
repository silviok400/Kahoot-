import React, { useEffect, useRef } from 'react';
import { Player } from '../../types';
import QRCodeStyling from 'qr-code-styling';

interface LobbyProps {
  pin: string;
  players: Player[];
  onStart: () => void;
  onCancel: () => void;
}

// Helper Component for QR Code to avoid Ref conflicts and ensure proper rendering
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
    }, [size]); // Re-init if size changes

    useEffect(() => {
        // Update data if URL changes
        qrCode.current?.update({ data: url });
    }, [url]);

    return <div ref={ref} className="overflow-hidden rounded-lg bg-white" />;
};

const Lobby: React.FC<LobbyProps> = ({ pin, players, onStart, onCancel }) => {
  // Dynamic URL detection for Vercel compatibility
  // If window.location.origin is available, use it (e.g. https://my-app.vercel.app)
  // Otherwise fallback to kahoot.it for the "look" (though functionality depends on the domain)
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://kahoot.it';
  const displayUrl = origin.replace(/^https?:\/\//, ''); // Clean URL for display
  const joinUrl = `${origin}/?pin=${pin}`;

  return (
    <div className="relative z-10 flex flex-col h-screen w-full">
      
      {/* --- HEADER: QR, PIN, URL --- */}
      <div className="bg-white text-black shadow-xl flex flex-col md:flex-row items-center justify-between px-4 py-2 md:px-6 md:py-3 shrink-0 relative z-20 gap-3 md:gap-0">
        
        {/* Left: Join Info & QR */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            
            {/* Desktop QR - Large and Zoomable */}
            <div className="hidden md:block bg-white p-1 border border-black/10 rounded shadow-lg hover:scale-[3] transition-transform origin-top-left z-50 cursor-pointer">
                 <QRCodeView url={joinUrl} size={100} />
            </div>

            <div className="text-left md:ml-2">
                <p className="text-gray-500 font-bold text-xs md:text-sm uppercase tracking-wider">Acesse para jogar</p>
                <div className="text-xl md:text-3xl font-black text-indigo-900 tracking-tight leading-none my-0.5 truncate max-w-[200px] md:max-w-none">
                    {displayUrl}
                </div>
            </div>

            {/* Mobile QR Toggle/View (Hidden by default, shown if space permits or specialized UI) */}
             <div className="md:hidden block">
                 {/* On mobile header, we just show the PIN prominently, QR is in body if needed */}
             </div>
        </div>

        {/* Right: Game PIN */}
        <div className="text-center md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-end items-center md:items-end border-t md:border-t-0 border-gray-200 pt-2 md:pt-0 mt-2 md:mt-0">
            <p className="text-gray-500 font-bold text-xs md:text-sm uppercase tracking-wider md:mb-1">PIN do Jogo</p>
            <div className="text-5xl md:text-7xl font-black tracking-widest text-black leading-none select-all bg-gray-100 px-2 rounded md:bg-transparent md:px-0">
                {pin}
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT: PLAYER GRID --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full bg-black/20 backdrop-blur-sm flex flex-col items-center">
        
        {/* Mobile Big QR Code (Only visible on small screens) */}
        <div className="md:hidden mb-6 bg-white p-4 rounded-2xl shadow-2xl border-4 border-white rotate-1">
             <QRCodeView url={joinUrl} size={180} />
             <p className="text-center text-black font-bold text-xs mt-2 uppercase">Escaneie para entrar</p>
        </div>

        <div className="w-full max-w-6xl">
            <div className="flex justify-between items-center mb-6">
                <div className="bg-black/40 text-white px-4 py-2 md:px-6 md:py-2 rounded-full font-bold backdrop-blur-md border border-white/10 text-sm md:text-base shadow-lg">
                    👤 {players.length} Jogador{players.length !== 1 ? 'es' : ''}
                </div>
                
                <button 
                    onClick={onCancel}
                    className="bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white px-3 py-1.5 md:px-4 md:py-2 rounded font-bold transition-colors text-xs md:text-sm"
                >
                    Cancelar
                </button>
            </div>

            {/* Players Grid */}
            <div className="flex flex-wrap gap-3 md:gap-4 justify-center content-start pb-24">
                {players.length === 0 && (
                    <div className="mt-8 md:mt-20 flex flex-col items-center opacity-70 text-center bg-black/30 p-8 rounded-2xl border-2 border-dashed border-white/20">
                        <div className="text-5xl md:text-6xl mb-4 animate-bounce">⏳</div>
                        <h2 className="text-xl md:text-2xl font-bold">Aguardando jogadores...</h2>
                        <p className="text-xs md:text-sm mt-2">Use o PIN {pin} ou o QR Code para entrar!</p>
                    </div>
                )}

                {players.map((p) => (
                    <div 
                        key={p.id} 
                        className="bg-white text-black font-black text-base md:text-xl px-4 py-2 md:px-6 md:py-3 rounded-lg shadow-[0_4px_0_rgba(0,0,0,0.2)] animate-[bounce_0.5s_ease-out] border-b-4 border-gray-300 min-w-[100px] md:min-w-[140px] text-center transform hover:scale-105 transition-transform"
                    >
                        {p.nickname}
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* --- FOOTER: START BUTTON --- */}
      <div className="p-4 md:p-6 bg-indigo-900/95 backdrop-blur-xl border-t border-white/10 flex justify-end shrink-0 fixed md:relative bottom-0 w-full z-50">
          <div className="w-full max-w-6xl mx-auto flex justify-end">
            <button 
                onClick={onStart}
                disabled={players.length === 0}
                className="w-full md:w-auto bg-white text-black font-black text-xl md:text-2xl px-8 py-3 md:px-12 md:py-4 rounded shadow-[0_4px_0_rgb(0,0,0,0.2)] hover:shadow-[0_2px_0_rgb(0,0,0,0.2)] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none"
            >
                Iniciar Jogo
            </button>
          </div>
      </div>
    </div>
  );
};

export default Lobby;