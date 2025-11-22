
import React from "react";

interface Props {
  className?: string;
  size?: number;
  showHologram?: boolean;
  isSpeaking?: boolean;
  isAnalyzing?: boolean;
}

export const DrRakSvgAvatar: React.FC<Props> = ({
  className = "",
  size = 200,
  showHologram = true,
  isSpeaking = false,
  isAnalyzing = false,
}) => {
  // Determine styles. If className has width/height classes (like w-32), use them. 
  // Otherwise fallback to inline size.
  const hasSizeClass = className.includes("w-") || className.includes("h-");
  const styleProps = hasSizeClass ? {} : { width: size, height: size };

  // Determine animation state classes
  const isIdle = !isSpeaking && !isAnalyzing;

  return (
    <div
      className={`relative flex items-center justify-center rounded-full select-none ${className}`}
      style={styleProps}
    >
      {/* 1. Outer Glow Ring (Holographic AI Effect) */}
      <div
        className={`absolute inset-0 rounded-full transition-opacity duration-700 ${
          showHologram ? "opacity-100" : "opacity-0"
        }`}
      >
        <div 
            className={`absolute inset-[-6px] rounded-full bg-gradient-to-tr from-indigo-300 via-purple-200 to-teal-200 opacity-50 blur-lg ${isAnalyzing ? 'animate-spin-slow' : 'animate-pulse'}`} 
        />
        <div className="absolute inset-0 rounded-full border-2 border-white/60" />
      </div>

      {/* 2. Avatar Container */}
      <div className="relative w-full h-full rounded-full overflow-hidden bg-indigo-50 shadow-lg border-4 border-white z-10">
        
        {/* NEW MODERN ARTISTIC SVG AVATAR */}
        <svg 
          viewBox="0 0 400 400" 
          className="w-full h-full" 
          xmlns="http://www.w3.org/2000/svg" 
          preserveAspectRatio="xMidYMid slice"
        >
            <defs>
                {/* Skin Gradient: Soft warm tone */}
                <linearGradient id="skinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE5D1" />
                    <stop offset="100%" stopColor="#FFD1A8" />
                </linearGradient>

                {/* Hair Gradient: Dark glossy brown */}
                <linearGradient id="hairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4A3830" />
                    <stop offset="100%" stopColor="#2D211C" />
                </linearGradient>

                {/* Coat Gradient: White to soft blue-grey shadow */}
                <linearGradient id="coatGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#F1F5F9" />
                </linearGradient>

                {/* Shirt Gradient: Professional Teal */}
                <linearGradient id="shirtGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#2DD4BF" />
                    <stop offset="100%" stopColor="#0F766E" />
                </linearGradient>

                {/* Background Abstract */}
                <radialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#EEF2FF" />
                    <stop offset="100%" stopColor="#C7D2FE" />
                </radialGradient>
            </defs>

            {/* Background */}
            <rect width="400" height="400" fill="url(#bgGradient)" />
            <circle cx="50" cy="100" r="30" fill="#FFFFFF" opacity="0.3" />
            <circle cx="350" cy="60" r="50" fill="#FFFFFF" opacity="0.4" />
            <circle cx="320" cy="300" r="20" fill="#FFFFFF" opacity="0.3" />

            {/* --- MAIN CHARACTER GROUP (Animated for Breathing/Bobbing) --- */}
            <g className={`origin-bottom ${isIdle ? 'animate-breathe' : ''} ${isSpeaking ? 'animate-speak-bob' : ''}`}>

                {/* --- BACK HAIR (Layered BEHIND Body and Neck) --- */}
                <path d="M120,190 C110,290 120,340 150,360 L250,360 C280,340 290,290 280,190" fill="#2D211C" />

                {/* --- BODY --- */}
                <g transform="translate(0, 40)">
                    {/* Shoulders/Coat Base */}
                    <path d="M60,360 C60,280 110,240 200,240 C290,240 340,280 340,360 V400 H60 V360 Z" fill="url(#coatGradient)" />
                    
                    {/* Inner Shirt (V-neck) */}
                    <path d="M160,240 L200,310 L240,240" fill="url(#shirtGradient)" />
                    <path d="M160,240 L200,270 L240,240" fill="none" /> 
                    
                    {/* Coat Lapels */}
                    <path d="M140,240 L200,360 L180,400 L60,400 L60,360 C60,300 140,240 140,240 Z" fill="url(#coatGradient)" opacity="0.9" />
                    <path d="M260,240 L200,360 L220,400 L340,400 L340,360 C340,300 260,240 260,240 Z" fill="url(#coatGradient)" opacity="0.9" />
                    
                    {/* Lapel Shadow Detail */}
                    <path d="M200,360 L140,240" stroke="#CBD5E1" strokeWidth="1" />
                    <path d="M200,360 L260,240" stroke="#CBD5E1" strokeWidth="1" />
                </g>

                {/* --- NECK --- */}
                <path d="M175,220 L175,260 C175,275 225,275 225,260 L225,220" fill="#FFD1A8" />

                {/* --- HEAD --- */}
                <g transform="translate(0, 10)">
                    {/* Face Shape */}
                    <path d="M130,150 C130,240 155,275 200,275 C245,275 270,240 270,150 C270,80 240,50 200,50 C160,50 130,80 130,150 Z" fill="url(#skinGradient)" />
                    
                    {/* Blush */}
                    <ellipse cx="155" cy="185" rx="12" ry="8" fill="#FF8A80" opacity="0.3" />
                    <ellipse cx="245" cy="185" rx="12" ry="8" fill="#FF8A80" opacity="0.3" />

                    {/* --- FACE FEATURES --- */}
                    {/* Eyes */}
                    <g fill="#3E2723">
                        {/* Left Eye */}
                        <ellipse cx="165" cy="165" rx="9" ry="11" />
                        {/* Highlight - Pulsing when speaking */}
                        <circle cx="168" cy="162" r="3" fill="white" className={isSpeaking ? 'animate-pulse-fast' : ''} /> 
                        
                        {/* Right Eye */}
                        <ellipse cx="235" cy="165" rx="9" ry="11" />
                        {/* Highlight - Pulsing when speaking */}
                        <circle cx="238" cy="162" r="3" fill="white" className={isSpeaking ? 'animate-pulse-fast' : ''} /> 
                    </g>
                    
                    {/* Eyelashes */}
                    <path d="M155,160 Q150,155 148,150" stroke="#3E2723" strokeWidth="2" fill="none" />
                    <path d="M245,160 Q250,155 252,150" stroke="#3E2723" strokeWidth="2" fill="none" />

                    {/* Eyebrows */}
                    <path d="M155,145 Q165,140 175,145" stroke="#4A3830" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M225,145 Q235,140 245,145" stroke="#4A3830" strokeWidth="3" fill="none" strokeLinecap="round" />

                    {/* Nose */}
                    <path d="M198,180 Q200,185 202,180" stroke="#CEA07E" strokeWidth="2" fill="none" />

                    {/* Mouth (Gentle Smile) - Animates when speaking */}
                    <path 
                        d="M185,205 Q200,215 215,205" 
                        stroke="#D84315" 
                        strokeWidth="2.5" 
                        fill="none" 
                        strokeLinecap="round"
                        className={`transition-all duration-200 origin-center ${isSpeaking ? 'animate-talking-mouth' : ''}`}
                    />

                    {/* --- HAIR (Front) --- */}
                    {/* Main Hair Shape (Longer sides) */}
                    {/* Left Side */}
                    <path d="M200,30 C140,30 110,90 110,180 C110,250 120,320 140,330 C150,300 140,200 200,30" fill="url(#hairGradient)" />
                    {/* Right Side */}
                    <path d="M200,30 C260,30 290,90 290,180 C290,250 280,320 260,330 C250,300 260,200 200,30" fill="url(#hairGradient)" />

                    {/* Bangs / Fringe */}
                    <path d="M200,30 C180,30 140,50 135,120 C150,120 180,60 220,60 C250,60 265,120 270,150 C275,80 250,30 200,30" fill="url(#hairGradient)" />
                    
                    {/* Hair Highlight */}
                    <path d="M160,50 Q200,40 240,50" stroke="rgba(255,255,255,0.1)" strokeWidth="8" strokeLinecap="round" fill="none" />

                    {/* Glasses (Optional, makes her look smart/doctor-like) */}
                    <g stroke="#64748B" strokeWidth="2" fill="rgba(255,255,255,0.1)">
                        <circle cx="165" cy="165" r="22" />
                        <circle cx="235" cy="165" r="22" />
                        <line x1="187" y1="165" x2="213" y2="165" />
                    </g>
                </g>

                {/* --- STETHOSCOPE --- */}
                <g transform="translate(0, 40)">
                    <path d="M150,310 C150,360 180,400 200,400 C220,400 250,360 250,310" stroke="#475569" strokeWidth="4" fill="none" strokeLinecap="round" />
                    <circle cx="200" cy="400" r="8" fill="#94A3B8" />
                    <circle cx="200" cy="400" r="4" fill="#CBD5E1" />
                </g>
            </g>
        </svg>

        {/* 3. Glossy Overlay (Glass Effect Reflection) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
        <div className="absolute top-4 right-8 w-8 h-4 bg-white/30 rounded-full blur-sm transform -rotate-45 pointer-events-none"></div>
      </div>

      {/* 4. Status Dot - Responsive Color */}
      <div 
        className={`absolute bottom-[5%] right-[5%] w-[15%] h-[15%] rounded-full border-2 border-white shadow-sm z-20 transition-colors duration-300 ${
            isAnalyzing ? 'bg-indigo-500' : (isSpeaking ? 'bg-amber-400' : 'bg-green-400')
        } animate-bounce-subtle`}
      >
         <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${isAnalyzing ? 'bg-indigo-500' : (isSpeaking ? 'bg-amber-400' : 'bg-green-400')}`}></div>
      </div>
      
      <style>{`
        .animate-spin-slow {
            animation: spin-slow 4s linear infinite;
        }
        @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        /* Talking Animations */
        .animate-talking-mouth {
            animation: talking-mouth 0.4s ease-in-out infinite;
            transform-box: fill-box;
            transform-origin: center;
        }
        @keyframes talking-mouth {
            0%, 100% { stroke-width: 2.5; transform: scaleY(1); }
            50% { stroke-width: 3; transform: scaleY(1.3); }
        }

        .animate-speak-bob {
            animation: speak-bob 0.5s ease-in-out infinite alternate;
        }
        @keyframes speak-bob {
            from { transform: translateY(0); }
            to { transform: translateY(-1px); }
        }

        .animate-pulse-fast {
            animation: pulse-fast 0.5s ease-in-out infinite;
        }
        @keyframes pulse-fast {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.9); }
        }

        /* Idle Animations */
        .animate-breathe {
            animation: breathe 4s ease-in-out infinite;
        }
        @keyframes breathe {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-2px) scale(1.005); }
        }
      `}</style>
    </div>
  );
};
