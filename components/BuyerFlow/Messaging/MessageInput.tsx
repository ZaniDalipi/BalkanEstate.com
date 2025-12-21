import React, { useState, useRef } from 'react';
import { PaperAirplaneIcon, PhotoIcon, XMarkIcon } from '../../../constants';

interface MessageInputProps {
    onSendMessage: (text: string, imageFile?: File) => Promise<void>;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, disabled = false }) => {
    const [text, setText] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);

        // Send typing indicator
        if (onTyping) {
            onTyping(true);

            // Clear existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Stop typing indicator after 2 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((text.trim() || imageFile) && !isSending) {
            setIsSending(true);

            // Stop typing indicator when sending
            if (onTyping) {
                onTyping(false);
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            try {
                await onSendMessage(text.trim(), imageFile || undefined);
                setText('');
                handleRemoveImage();
            } catch (error) {
                console.error('Failed to send message:', error);
            } finally {
                setIsSending(false);
            }
        }
    };

    return (
        <div className="space-y-2">
            {imagePreview && (
                <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="max-w-xs max-h-32 rounded-lg border border-neutral-300" />
                    <button
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        type="button"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isSending}
                    className="bg-neutral-200 text-neutral-700 rounded-full p-3.5 hover:bg-neutral-300 disabled:bg-neutral-100 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-end"
                >
                    <PhotoIcon className="h-5 w-5" />
                </button>
                <textarea
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                    placeholder="Type your message..."
                    disabled={disabled || isSending}
                    rows={1}
                    className="block w-full text-base bg-white border border-neutral-300 rounded-full text-neutral-900 shadow-sm px-5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    style={{ height: 'auto', minHeight: '50px' }}
                />
                <button
                    type="submit"
                    disabled={disabled || isSending || (!text.trim() && !imageFile)}
                    className="bg-primary text-white rounded-full p-3.5 hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex-shrink-0 self-end"
                >
                    {isSending ? (
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <PaperAirplaneIcon className="h-5 w-5" />
                    )}
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
