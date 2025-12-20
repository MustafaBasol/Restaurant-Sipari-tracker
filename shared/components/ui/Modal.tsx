import React, { ReactNode } from 'react';
import { XIcon } from '../icons/Icons';

interface ModalProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  isOpen: boolean;
}

export const Modal: React.FC<ModalProps> = ({ children, title, onClose, isOpen }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-20"
      onClick={onClose}
    >
      <div
        className="bg-light-bg w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-medium flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <header className="flex items-center justify-between p-4 border-b border-border-color bg-card-bg">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200">
            <XIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
