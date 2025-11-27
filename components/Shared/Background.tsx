import React from 'react';

const Background: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-900 to-purple-800" />
      {/* Floating Shapes */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="shape-bg bg-white/10 rounded-lg absolute"
          style={{
            width: `${Math.random() * 100 + 50}px`,
            height: `${Math.random() * 100 + 50}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100 + 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 15}s`,
          }}
        />
      ))}
    </div>
  );
};

export default Background;
