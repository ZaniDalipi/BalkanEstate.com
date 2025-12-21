import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon } from '../../constants';

interface ToastProps {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ show, message, type, onClose }) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />;

  return (
    <div
      className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 ease-in-out ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
      }`}
    >
      {show && (
        <div className={`flex items-center gap-3 text-white py-3 px-5 rounded-lg shadow-2xl ${bgColor}`}>
          {icon}
          <p className="font-semibold text-base">{message}</p>
          <button onClick={onClose} className="ml-4 font-bold text-xl leading-none opacity-70 hover:opacity-100">&times;</button>
        </div>
      )}
    </div>
  );
};

export default Toast;
