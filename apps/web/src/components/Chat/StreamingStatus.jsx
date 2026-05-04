import React from 'react';
import { AlertCircle } from 'lucide-react';

const StreamingStatus = ({ type, content, isVisible = true, onRetry }) => {
    if (!isVisible) return null;

    if (type === 'error') {
        return (
            <div className="flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-lg mt-2" 
                 style={{ color: '#A55F5F', background: 'rgba(165,95,95,0.08)' }}>
                <AlertCircle size={14} />
                <span>{content || '连接出现问题，请稍后重试'}</span>
                {onRetry && (
                    <button 
                        onClick={onRetry}
                        className="ml-auto underline cursor-pointer"
                        style={{ border: 'none', background: 'transparent', color: '#A55F5F' }}
                    >
                        重新生成
                    </button>
                )}
            </div>
        );
    }

    const statusText = getStatusText(type, content);

    return (
        <div className="flex flex-col gap-2.5 mt-1 mb-2">
            <div className="flex items-center gap-2">
                <span 
                    className="inline-block rounded-full" 
                    style={{
                        width: 6,
                        height: 6,
                        background: 'var(--primary)',
                        boxShadow: '0 0 0 2px rgba(232,155,122,0.2)',
                        animation: 'pulseDot 1.4s ease-in-out infinite'
                    }} 
                />
                <span className="text-[13px] font-medium" style={{ color: 'var(--primary-dark)' }}>
                    {statusText}
                </span>
            </div>
            <div 
                className="h-[2px] rounded-full overflow-hidden" 
                style={{ background: 'rgba(232,155,122,0.15)', width: '60%' }}
            >
                <div 
                    className="h-full bg-[var(--primary)]" 
                    style={{ width: '40%', animation: 'shimmer 2s ease-in-out infinite' }}
                />
            </div>
        </div>
    );
};

function getStatusText(type, content) {
    if (content && type !== 'rewrite_result') return content;
    switch (type) {
        case 'thinking': return '正在思考...';
        case 'intake_status': return '正在读取聊天截图...';
        case 'ocr_result': return '截图识别完成';
        case 'rewrite_result': return '问题已整理';
        case 'rag_status': return '正在查阅恋爱知识库...';
        case 'status': return '正在生成回复建议...';
        case 'tool_call': return '正在调用工具...';
        default: return '正在处理...';
    }
}

export default StreamingStatus;
