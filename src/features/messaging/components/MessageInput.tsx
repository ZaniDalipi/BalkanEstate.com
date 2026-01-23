import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PaperAirplaneIcon, PhotoIcon, XMarkIcon } from '@/constants';

interface MessageInputProps {
    onSendMessage: (text: string, imageFile?: File) => Promise<void>;
    onTyping?: (isTyping: boolean) => void;
    disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, onTyping, disabled = false }) => {
    const { t } = useTranslation(['messages']);
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

        if (onTyping) {
            onTyping(true);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 2000);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((text.trim() || imageFile) && !isSending) {
            setIsSending(true);

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
                    <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-w-[120px] sm:max-w-xs max-h-24 sm:max-h-32 rounded-lg border border-neutral-300"
                    />
                    <button
                        onClick={handleRemoveImage}
                        className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full p-0.5 sm:p-1 hover:bg-red-600"
                        type="button"
                    >
                        <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-1.5 sm:gap-2">
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
                    className="bg-neutral-200 text-neutral-700 rounded-full p-2.5 sm:p-3.5 hover:bg-neutral-300 disabled:bg-neutral-100 disabled:cursor-not-allowed transition-colors flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
                >
                    <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
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
                    placeholder={t('inbox.typeMessage')}
                    disabled={disabled || isSending}
                    rows={1}
                    className="block w-full text-sm sm:text-base bg-white border border-neutral-300 rounded-full text-neutral-900 shadow-sm px-3 sm:px-5 py-2 sm:py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all resize-none disabled:bg-neutral-100 disabled:cursor-not-allowed"
                    style={{ height: 'auto', minHeight: '40px' }}
                />
                <button
                    type="submit"
                    disabled={disabled || isSending || (!text.trim() && !imageFile)}
                    className="bg-primary text-white rounded-full p-2.5 sm:p-3.5 hover:bg-primary-dark disabled:bg-primary/50 disabled:cursor-not-allowed transition-colors flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center"
                >
                    {isSending ? (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                        <PaperAirplaneIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    )}
                </button>
            </form>
        </div>
    );
};

export default MessageInput;
