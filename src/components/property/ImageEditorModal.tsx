// ImageEditorModal - Standalone image editor with drawing capabilities
// Extracted from PropertyDetailsPage for better modularity

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Property } from '../../../types';
import { useAppContext } from '../../../context/AppContext';
import { createConversation, sendMessage, uploadMessageImage } from '../../../services/apiService';
import { ArrowUturnLeftIcon, XMarkIcon, PencilIcon, ArrowDownTrayIcon } from '../../../constants';

type Point = { x: number; y: number };
type Path = { points: Point[]; color: string; lineWidth: number };

interface ImageEditorModalProps {
  imageUrl: string;
  property: Property;
  onClose: () => void;
}

/**
 * Image Editor Modal for property images
 *
 * Features:
 * - Drawing with multiple colors
 * - Zoom and pan
 * - Save and send to agent
 * - Download annotated image
 *
 * Usage:
 * ```tsx
 * <ImageEditorModal
 *   imageUrl={property.images[0]}
 *   property={property}
 *   onClose={() => setShowEditor(false)}
 * />
 * ```
 */
export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({ imageUrl, property, onClose }) => {
  const { dispatch, state } = useAppContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [paths, setPaths] = useState<Path[]>([]);
  const [currentPath, setCurrentPath] = useState<Path | null>(null);
  const [color, setColor] = useState('#FF0000'); // Red
  const [lineWidth, setLineWidth] = useState(5);
  const [isSending, setIsSending] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [sentConversationId, setSentConversationId] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (!canvas || !ctx || !img.src) return;

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
  }, [zoom, offset, paths, currentPath]);

  useEffect(() => {
    const img = imageRef.current;
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        // Fit image to canvas initially
        const canvasAspect = canvas.clientWidth / canvas.clientHeight;
        const imgAspect = img.width / img.height;
        const initialZoom = canvasAspect > imgAspect
          ? canvas.clientHeight / img.height
          : canvas.clientWidth / img.width;
        setZoom(initialZoom);
        setOffset({
          x: (canvas.clientWidth - img.width * initialZoom) / 2,
          y: (canvas.clientHeight - img.height * initialZoom) / 2,
        });
      }
    };
  }, [imageUrl]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getCanvasPoint = (e: React.MouseEvent | React.Touch): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / zoom;
    const y = (e.clientY - rect.top - offset.y) / zoom;
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const point = getCanvasPoint(e);
    if (point) {
      setIsDrawing(true);
      setCurrentPath({ points: [point], color, lineWidth });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentPath) return;
    const point = getCanvasPoint(e);
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

      // Create blob from canvas
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSending(false);
          return;
        }

        try {
          // Find or create conversation
          let conversationId = state.conversations.find(c => c.property.id === property.id)?.id;

          if (!conversationId) {
            const newConv = await createConversation(property.id);
            conversationId = newConv.id;
          }

          // Upload image
          const file = new File([blob], 'annotated-image.png', { type: 'image/png' });
          const imageUrl = await uploadMessageImage(conversationId, file);

          // Send message with image
          await sendMessage(conversationId, {
            text: 'I have some questions about this property. Please see my annotations:',
            imageUrl,
            sender: state.currentUser?.id || '',
            timestamp: Date.now(),
          });

          setSentConversationId(conversationId);
          setShowSuccessDialog(true);
        } catch (error) {
          console.error('Failed to send to agent:', error);
          alert('Failed to send annotated image. Please try again.');
        } finally {
          setIsSending(false);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Failed to send to agent:', error);
      alert('Failed to send annotated image. Please try again.');
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

  return (
    <div className="fixed inset-0 z-[1100] bg-black bg-opacity-95 flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-900 p-4 flex items-center justify-between gap-4">
        <button onClick={onClose} className="text-white hover:text-gray-300">
          <XMarkIcon className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-4">
          {/* Color picker */}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />

          {/* Line width */}
          <input
            type="range"
            min="1"
            max="20"
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
            className="w-32"
          />

          {/* Undo */}
          <button
            onClick={handleUndo}
            disabled={paths.length === 0}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50"
          >
            <ArrowUturnLeftIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Download
          </button>

          <button
            onClick={handleSendToAgent}
            disabled={isSending}
            className={`px-4 py-2 text-white rounded flex items-center gap-2 ${
              isSending
                ? 'bg-green-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSending ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Send to Agent'
            )}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="w-full h-full cursor-crosshair"
        />
      </div>

      {/* Success Dialog */}
      {showSuccessDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-fade-in">
            {/* Success Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Message */}
            <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">
              Sent Successfully!
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Your annotated image has been sent to the agent. They will respond shortly.
            </p>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGoToChat}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Go to Chat
              </button>
              <button
                onClick={() => {
                  setShowSuccessDialog(false);
                  onClose();
                }}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
