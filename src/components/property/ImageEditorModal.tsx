// ImageEditorModal - Standalone image editor with drawing capabilities
// Extracted from PropertyDetailsPage for better modularity

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '../../../types';
import { useAppContext } from '../../../context/AppContext';
import { createConversation, sendMessage, uploadMessageImage } from '../../../services/apiService';
import { ArrowUturnLeftIcon, XMarkIcon, ArrowDownTrayIcon } from '../../../constants';

type Point = { x: number; y: number };
type Path = { points: Point[]; color: string; lineWidth: number };

interface ImageEditorModalProps {
  imageUrl: string;
  property: Property;
  onClose: () => void;
}

/**
 * Image Editor Modal for property images
 * Mobile-optimized with touch support
 */
export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageUrl, property, onClose }) => {
  const { t } = useTranslation(['modals']);
  const { dispatch, state } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [color, setColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(5);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [sentConversationId, setSentConversationId] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img.src || !imageLoaded) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, 0, 0);

    [...paths, currentPath].forEach(path => {
      if (!path) return;
      ctx.beginPath();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      path.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    });

    ctx.restore();
  }, [zoom, offset, paths, currentPath, imageLoaded]);

  // Fit image to container
  const fitImageToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const img = imageRef.current;
    if (!canvas || !container || !img.width || !img.height) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate scale to fit image in container with some padding
    const scaleX = containerWidth / img.width;
    const scaleY = containerHeight / img.height;
    const initialZoom = Math.min(scaleX, scaleY) * 0.95; // 95% to leave some margin

    setZoom(initialZoom);
    setOffset({
      x: (containerWidth - img.width * initialZoom) / 2,
      y: (containerHeight - img.height * initialZoom) / 2,
    });
  }, []);

  useEffect(() => {
    const img = imageRef.current;
    // Set crossOrigin before src to enable CORS
    img.crossOrigin = "anonymous";

    // Add cache-busting parameter to avoid service worker returning opaque cached response
    // This forces a fresh fetch with proper CORS headers
    const cacheBuster = `_cb=${Date.now()}`;
    const urlWithCacheBuster = imageUrl.includes('?')
      ? `${imageUrl}&${cacheBuster}`
      : `${imageUrl}?${cacheBuster}`;

    img.src = urlWithCacheBuster;
    img.onload = () => {
      setImageLoaded(true);
      // Small delay to ensure container is measured correctly
      setTimeout(fitImageToCanvas, 50);
    };
    img.onerror = () => {
      // Fallback: try without cache buster if CORS still fails
      // Warning removed
      img.crossOrigin = "anonymous";
      img.src = imageUrl;
    };
  }, [imageUrl, fitImageToCanvas]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded) {
        fitImageToCanvas();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, fitImageToCanvas]);

  const getCanvasPoint = useCallback((clientX: number, clientY: number): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left - offset.x) / zoom;
    const y = (clientY - rect.top - offset.y) / zoom;
    return { x, y };
  }, [offset, zoom]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (point) {
      setIsDrawing(true);
      setCurrentPath({ points: [point], color, lineWidth });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    const point = getCanvasPoint(e.clientX, e.clientY);
    if (point) {
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
    }
  };

  const handleMouseUp = () => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  };

  // Touch events for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY);
    if (point) {
      setIsDrawing(true);
      setCurrentPath({ points: [point], color, lineWidth });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || !currentPath) return;
    const touch = e.touches[0];
    const point = getCanvasPoint(touch.clientX, touch.clientY);
    if (point) {
      setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
    }
  };

  const handleTouchEnd = () => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `property-${property.id}-annotated.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleSendToAgent = async () => {
    if (isSending) return;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsSending(true);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSending(false);
          return;
        }

        try {
          let conversationId = state.conversations.find(c => c.property.id === property.id)?.id;

          if (!conversationId) {
            const newConv = await createConversation(property.id);
            conversationId = newConv.id;
            // Add the new conversation to global state so it's available in inbox
            dispatch({ type: 'CREATE_CONVERSATION', payload: newConv });
          }

          const file = new File([blob], 'annotated-image.png', { type: 'image/png' });
          const uploadedImageUrl = await uploadMessageImage(conversationId, file);

          await sendMessage(conversationId, {
            id: `msg-${Date.now()}`,
            text: 'I have some questions about this property. Please see my annotations:',
            imageUrl: uploadedImageUrl,
            senderId: state.currentUser?.id || '',
            timestamp: Date.now(),
            isRead: false,
          });

          setSentConversationId(conversationId);
          setShowSuccessDialog(true);
        } catch (error) {
          // Error removed
          dispatch({
            type: 'SHOW_ALERT',
            payload: {
              type: 'error',
              title: t('common:error'),
              message: t('imageEditor.failedToSend'),
            },
          });
        } finally {
          setIsSending(false);
        }
      }, 'image/png');
    } catch (error) {
      // Error removed
      dispatch({
        type: 'SHOW_ALERT',
        payload: {
          type: 'error',
          title: t('common:error'),
          message: t('imageEditor.failedToSend'),
        },
      });
      setIsSending(false);
    }
  };

  const handleGoToChat = () => {
    if (sentConversationId) {
      dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: sentConversationId });
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'inbox' });
    }
    onClose();
  };

  // Quick color presets
  const colorPresets = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#FFFFFF'];

  return (
    <div className="fixed inset-0 z-[1100] bg-black flex flex-col">
      {/* Compact Mobile Toolbar */}
      <div className="bg-gray-900 px-2 py-2 sm:px-4 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0">
        {/* Close button */}
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Drawing tools - compact on mobile */}
        <div className="flex items-center gap-1 sm:gap-3 flex-1 justify-center">
          {/* Color presets for mobile */}
          <div className="flex gap-1 sm:hidden">
            {colorPresets.slice(0, 4).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Color picker for desktop */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="hidden sm:block w-8 h-8 rounded cursor-pointer bg-transparent"
          />

          {/* Line width - hidden on very small screens */}
          <input
            type="range"
            min="2"
            max="15"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-16 sm:w-24 accent-primary"
          />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={paths.length === 0}
            className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-40 transition-colors"
          >
            <ArrowUturnLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-1 sm:gap-2">
          <button
            onClick={handleDownload}
            className="p-2 sm:px-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline text-sm">{t('imageEditor.download')}</span>
          </button>

          <button
            onClick={handleSendToAgent}
            disabled={isSending}
            className={`p-2 sm:px-3 sm:py-2 text-white rounded-lg flex items-center gap-1 transition-colors ${
              isSending ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSending ? (
              <svg className="animate-spin w-4 h-4 sm:w-5 sm:h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
            <span className="hidden sm:inline text-sm">
              {isSending ? t('imageEditor.sending') : t('imageEditor.sendToAgent')}
            </span>
          </button>
        </div>
      </div>

      {/* Canvas container - fills remaining space */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden bg-neutral-900">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-full h-full cursor-crosshair touch-none"
        />

        {/* Loading indicator */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
          </div>
        )}
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 max-w-sm w-full shadow-2xl animate-fade-in">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 text-center mb-1">
              {t('imageEditor.sentSuccessTitle')}
            </h3>
            <p className="text-sm text-gray-600 text-center mb-5">
              {t('imageEditor.sentSuccessMessage')}
            </p>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleGoToChat}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {t('imageEditor.goToChat')}
              </button>
              <button
                onClick={() => {
                  setShowSuccessDialog(false);
                  onClose();
                }}
                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
