import React, { useEffect, useState } from 'react';
// eslint-disable-next-line no-unused-vars
import { m, AnimatePresence } from 'framer-motion';
import { Check, AlertCircle, Loader } from 'lucide-react';

/**
 * @param {'generating'|'completed'|'failed'} status
 * @param {Function} onDismiss - Called when banner auto-hides or user dismisses
 */
const RecoveryBanner = ({ status, onDismiss }) => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (status === 'completed' || status === 'failed') {
            const timer = setTimeout(() => {
                setVisible(false);
                onDismiss?.();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [status, onDismiss]);

    const config = {
        generating: {
            icon: <Loader size={14} className="animate-spin" />,
            text: '这条回复正在后台继续生成中',
            className: 'bg-[rgba(232,122,93,0.1)] text-[#B0624A] border-[rgba(232,122,93,0.2)]'
        },
        completed: {
            icon: <Check size={14} />,
            text: '该回复已在你离开期间生成完成',
            className: 'bg-[rgba(74,160,98,0.1)] text-[#3A7D4F] border-[rgba(74,160,98,0.2)]'
        },
        failed: {
            icon: <AlertCircle size={14} />,
            text: '后台生成失败，请尝试重新发送',
            className: 'bg-[rgba(220,80,60,0.1)] text-[#B84A3A] border-[rgba(220,80,60,0.2)]'
        }
    };

    const c = config[status];
    if (!c) return null;

    return (
        <AnimatePresence>
            {visible && (
                <m.div
                    className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-medium my-2 mx-auto max-w-[400px] w-fit pointer-events-none border ${c.className}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    role="status"
                    aria-live="polite"
                >
                    {c.icon}
                    <span className="leading-[1.2]">{c.text}</span>
                </m.div>
            )}
        </AnimatePresence>
    );
};

export default RecoveryBanner;
