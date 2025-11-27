import React from 'react';
import { Player } from '../../types';

interface LobbyProps {
  pin: string;
  players: Player[];
  onStart: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ pin, players, onStart }) => {
  return (
    <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center p-8">
      <div className="bg-white text-black px-12 py-4 rounded-b-xl shadow-lg absolute top-0 font-black text-3xl">
        PIN: <span className="text-5xl tracking-widest">{pin}</span>
      </div>

      <div className="mt-24 flex flex-col md:flex-row items-center gap-12 bg-black/30 p-8 rounded-3xl backdrop-blur-sm border border-white/10">
        <div className="bg-white p-4 rounded-xl shadow-2xl">
            {/* Placeholder for QR Code - In a real app use a QR lib, simulated here with an image for brevity as per constraints */}
           <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=kahoot-clone-join:${pin}`} 
            alt="Join QR" 
            className="w-64 h-64"
           />
           <p className="text-black font-bold mt-2">Scan to join!</p>
        </div>
        <div className="text-left">
            <h1 className="text-5xl font-black mb-2">Join at <span className="text-blue-300">kahoot.it</span></h1>
            <p className="text-xl text-white/80">or use the Kahoot! app</p>
        </div>
      </div>

      <div className="mt-12 w-full max-w-6xl">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-black/40 px-6 py-2 rounded-full">
                {players.length} Player{players.length !== 1 ? 's' : ''}
            </h2>
            <button 
                onClick={onStart}
                disabled={players.length === 0}
                className="bg-white text-black font-black text-xl px-12 py-4 rounded hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
            >
                Start
            </button>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center">
            {players.map(p => (
                <div key={p.id} className="bg-black/50 backdrop-blur px-6 py-3 rounded-xl font-bold text-xl animate-bounce-short">
                    {p.nickname}
                </div>
            ))}
             {players.length === 0 && (
                <p className="text-white/50 text-xl animate-pulse">Waiting for players...</p>
             )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
