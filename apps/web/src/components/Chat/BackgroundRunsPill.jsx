import React from 'react';
// eslint-disable-next-line no-unused-vars
import { m, AnimatePresence } from 'framer-motion';

const BackgroundRunsPill = ({ activeCount, onNavigate }) => {
    return (
        <AnimatePresence>
            {activeCount > 0 && (
                <m.button
                    onClick={onNavigate}
                    initial={{ opacity: 0, scale: 0.8, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -4 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    aria-live="polite"
                    aria-label={`${activeCount} 个回复正在后台生成`}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200 hover:bg-[rgba(232,122,93,0.2)] hover:border-[rgba(232,122,93,0.35)]"
                    style={{
                        background: 'rgba(232,122,93,0.12)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        border: '1px solid rgba(232,122,93,0.2)',
                        whiteSpace: 'nowrap'
                    }}
                >
                    <span 
                        className="w-1.5 h-1.5 rounded-full shrink-0" 
                        style={{ background: '#E87A5D', animation: 'pillPulse 1.5s ease-in-out infinite' }}
                    />
                    <span className="text-[12px] md:text-[11px] font-medium leading-none" style={{ color: '#7A5C47' }}>
                        正在后台生成 {activeCount} 个回复
                    </span>
                </m.button>
            )}
        </AnimatePresence>
    );
};

export default BackgroundRunsPill;
