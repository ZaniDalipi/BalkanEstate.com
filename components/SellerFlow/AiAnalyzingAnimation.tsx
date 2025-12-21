import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BedIcon, BathIcon, LivingRoomIcon, SqftIcon, ParkingIcon, CubeIcon } from '../../constants';

const baseIcons = [
    { id: 1, icon: <BedIcon className="w-6 h-6 text-primary" /> },
    { id: 2, icon: <BathIcon className="w-6 h-6 text-primary" /> },
    { id: 3, icon: <LivingRoomIcon className="w-6 h-6 text-primary" /> },
    { id: 4, icon: <SqftIcon className="w-6 h-6 text-primary" /> },
    { id: 5, icon: <ParkingIcon className="w-6 h-6 text-primary" /> },
    { id: 6, icon: <CubeIcon className="w-6 h-6 text-primary" /> },
];

const GRAVITY = 0.1;
const DAMPING = 0.8;
const FRICTION = 0.99;

// FIX: Add props to support use in discount game modal
interface AiAnalyzingAnimationProps {
    isOfferGame?: boolean;
    onGameComplete?: (discount: number) => void;
}

const AiAnalyzingAnimation: React.FC<AiAnalyzingAnimationProps> = ({ isOfferGame, onGameComplete }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const [gameButtonVisible, setGameButtonVisible] = useState(false);

    const [bots, setBots] = useState(() => baseIcons.map(icon => ({
        ...icon,
        x: Math.random() * 100 + 40,
        y: Math.random() * 50,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        isDragging: false,
    })));

    useEffect(() => {
        if (isOfferGame) {
            const timer = setTimeout(() => {
                setGameButtonVisible(true);
            }, 3000); // Show button after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [isOfferGame]);

    useEffect(() => {
        const animate = () => {
            setBots(prevBots => {
                if (!containerRef.current) return prevBots;
                const { width, height } = containerRef.current.getBoundingClientRect();
                const botSize = 48;

                return prevBots.map(bot => {
                    if (bot.isDragging) return bot;

                    let { x, y, vx, vy } = bot;
                    
                    vy += GRAVITY;
                    vx *= FRICTION;
                    vy *= FRICTION;
                    x += vx;
                    y += vy;

                    let needsNudge = false;
                    if (y > height - botSize - 2 && Math.abs(vy) < 0.2 && Math.abs(vx) < 0.2) {
                        needsNudge = true;
                    }
                    
                    if (x < 0) { x = 0; vx *= -DAMPING; }
                    else if (x > width - botSize) { x = width - botSize; vx *= -DAMPING; }
                    
                    if (y < 0) { y = 0; vy *= -DAMPING; }
                    else if (y > height - botSize) { y = height - botSize; vy *= -DAMPING; }
                    
                    if (needsNudge) {
                        vy -= Math.random() * 1.5;
                        vx += (Math.random() - 0.5) * 1;
                    }

                    return { ...bot, x, y, vx, vy };
                });
            });
            animationFrameId.current = requestAnimationFrame(animate);
        };

        animationFrameId.current = requestAnimationFrame(animate);
        return () => {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    const handleMouseDown = (id: number, e: React.MouseEvent) => {
        e.preventDefault();
        setBots(prev => prev.map(bot => bot.id === id ? { ...bot, isDragging: true } : bot));
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setBots(prev => {
            const draggingBot = prev.find(b => b.isDragging);
            if (!draggingBot || !containerRef.current) return prev;
            const rect = containerRef.current.getBoundingClientRect();
            return prev.map(bot => bot.id === draggingBot.id ? { ...bot, x: e.clientX - rect.left - 24, y: e.clientY - rect.top - 24, vx: e.movementX, vy: e.movementY } : bot);
        });
    };

    const handleMouseUp = () => {
        setBots(prev => prev.map(bot => bot.isDragging ? { ...bot, isDragging: false } : bot));
    };

    const handleClaimDiscount = () => {
        if (onGameComplete) {
            const discount = Math.floor(Math.random() * 31) + 20; // 20% to 50%
            onGameComplete(discount);
        }
    };

    return (
        <div 
            className="flex flex-col items-center justify-center py-8"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="relative w-64 h-64" ref={containerRef}>
                <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100">
                    <path d="M10 90 V45 L50 10 L90 45 V90 H10 Z" fill="#0252CD" />
                </svg>
                {bots.map(bot => (
                    <div
                        key={bot.id}
                        className="absolute w-12 h-12 bg-white rounded-full shadow-lg border-2 border-primary-light flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
                        style={{ transform: `translate(${bot.x}px, ${bot.y}px)`, userSelect: 'none' }}
                        onMouseDown={(e) => handleMouseDown(bot.id, e)}
                    >
                        {bot.icon}
                    </div>
                ))}
            </div>
            <h3 className="text-xl font-bold text-neutral-800 mt-8">
                {isOfferGame ? 'Claim Your Discount!' : 'Analyzing Property...'}
            </h3>
            <p className="text-neutral-600 mt-2 max-w-sm mx-auto text-center">
                {isOfferGame ? 'Click the button to reveal your special one-time discount for listing your property.' : 'Our AI is hard at work. Feel free to play around with the icons while you wait!'}
            </p>
            {isOfferGame && gameButtonVisible && (
                <button 
                    onClick={handleClaimDiscount} 
                    className="mt-6 px-8 py-3 bg-secondary text-white font-bold rounded-lg shadow-lg hover:bg-opacity-90 transition-transform hover:scale-105 animate-fade-in"
                >
                    Reveal My Discount!
                </button>
            )}
        </div>
    );
};

export default AiAnalyzingAnimation;
