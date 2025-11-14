import React from 'react';
import { useLanguage } from '../../../shared/hooks/useLanguage';

const AppPreview: React.FC = () => {
    const { t } = useLanguage();
    return (
        <div className="
            w-[48rem] max-w-none rounded-2xl bg-white/5 p-2 ring-1 ring-white/10
            transform-gpu rotate-[-5deg] origin-bottom-left
        ">
            <div className="bg-card-bg rounded-xl shadow-2xl p-4">
                 <div className="flex justify-between items-center p-2 border-b border-border-color">
                     <span className="text-sm font-bold">{t('branding.name')}</span>
                     <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                     </div>
                 </div>
                 <div className="grid grid-cols-3 gap-2 p-4">
                    <div className="aspect-square bg-status-free/20 rounded-lg flex items-center justify-center font-bold text-status-free">T1</div>
                    <div className="aspect-square bg-status-occupied/20 rounded-lg flex items-center justify-center font-bold text-status-occupied">T2</div>
                    <div className="aspect-square bg-status-free/20 rounded-lg flex items-center justify-center font-bold text-status-free">T3</div>
                    <div className="aspect-square bg-status-occupied/20 rounded-lg flex items-center justify-center font-bold text-status-occupied">T4</div>
                    <div className="aspect-square bg-status-occupied/20 rounded-lg flex items-center justify-center font-bold text-status-occupied">T5</div>
                    <div className="aspect-square bg-status-free/20 rounded-lg flex items-center justify-center font-bold text-status-free">T6</div>
                 </div>
            </div>
        </div>
    );
};

export default AppPreview;