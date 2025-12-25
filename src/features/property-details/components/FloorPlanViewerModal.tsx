import React, { useState, useRef, useEffect, useCallback } from 'react';
import { XMarkIcon, MagnifyingGlassPlusIcon, MagnifyingGlassMinusIcon, ArrowPathIcon } from '../../../constants';

interface FloorPlanViewerModalProps {
    imageUrl: string;
    onClose: () => void;
}

const FloorPlanViewerModal: React.FC<FloorPlanViewerModalProps> = ({ imageUrl, onClose }) => {
    const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const imageContainerRef = useRef<HTMLDivElement>(null);

    const resetTransform = useCallback(() => {
        setTransform({ scale: 1, x: 0, y: 0 });
    }, []);

    const zoom = useCallback((direction: 'in' | 'out', clientX?: number, clientY?: number) => {
        const scaleFactor = 1.2;
        const newScale = direction === 'in' ? transform.scale * scaleFactor : transform.scale / scaleFactor;
        
        if (newScale < 0.5 || newScale > 10) return;

        const container = imageContainerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const pivotX = clientX !== undefined ? clientX - rect.left : rect.width / 2;
        const pivotY = clientY !== undefined ? clientY - rect.top : rect.height / 2;

        const newX = pivotX - (pivotX - transform.x) * (newScale / transform.scale);
        const newY = pivotY - (pivotY - transform.y) * (newScale / transform.scale);
        
        setTransform({ scale: newScale, x: newX, y: newY });
    }, [transform]);

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        zoom(e.deltaY < 0 ? 'in' : 'out', e.clientX, e.clientY);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setIsPanning(true);
        setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        setTransform(prev => ({
            ...prev,
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y,
        }));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black/80 z-[6000] flex flex-col items-center justify-center p-4" 
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                 <div className="flex items-center gap-1 bg-neutral-800/60 p-1.5 rounded-lg backdrop-blur-sm">
                    <button onClick={() => zoom('out')} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md"><MagnifyingGlassMinusIcon className="w-6 h-6"/></button>
                    <button onClick={resetTransform} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md"><ArrowPathIcon className="w-6 h-6"/></button>
                    <button onClick={() => zoom('in')} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-md"><MagnifyingGlassPlusIcon className="w-6 h-6"/></button>
                 </div>
                 <button onClick={onClose} className="p-2 bg-neutral-800/60 text-white/80 hover:text-white hover:bg-white/10 rounded-full backdrop-blur-sm"><XMarkIcon className="w-6 h-6"/></button>
            </div>

            <div 
                ref={imageContainerRef}
                className="w-full h-full overflow-hidden" 
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div 
                    className={`w-full h-full transition-transform duration-75 ease-out ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
                    style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
                >
                    <img 
                        src={imageUrl} 
                        alt="Floor Plan" 
                        className="max-w-full max-h-full h-full w-auto object-contain mx-auto" 
                        style={{ imageRendering: 'pixelated' }} // better for sharp lines on zoom
                        onDragStart={(e) => e.preventDefault()}
                    />
                </div>
            </div>
        </div>
    );
};

export default FloorPlanViewerModal;