import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const STEP_LABELS = {
    thinking: '思考中',
    intake_status: '读取截图',
    ocr_result: '识别完成',
    rewrite_result: '整理问题',
    rag_status: '检索知识库',
    status: '生成回复',
    tool_call: '调用工具',
};

const TOOL_NAMES = {
    webSearch: '网页搜索',
    webScraping: '网页抓取',
    searchImage: '图片搜索',
    downloadResource: '图片下载',
    downloadImage: '图片下载',
    generatePDF: '文档生成',
    terminalOperation: '终端执行',
    fileOperation: '文件操作',
    sendEmail: '邮件发送',
    doTerminate: '任务完成',
};

const getToolFriendlyName = (content) => {
    if (!content) return '';
    const toolMatch = content.match(/(?:已执行|Calling tool:|调用)\s*(\w+)/);
    if (toolMatch) {
        const toolKey = toolMatch[1];
        return TOOL_NAMES[toolKey] || toolKey;
    }
    return content;
};

const getStepDisplayText = (step) => {
    if (step.type === 'rewrite_result') {
        return STEP_LABELS[step.type];
    }
    if (step.type === 'tool_call') {
        const friendlyName = getToolFriendlyName(step.content);
        return friendlyName || STEP_LABELS[step.type];
    }
    return step.content || STEP_LABELS[step.type] || '处理中';
};

const StatusSteps = ({ steps, isStreaming, hasContent }) => {
    const [userExpanded, setUserExpanded] = useState(false);

    if (!steps || steps.length === 0) return null;

    const isActive = isStreaming && !hasContent;

    if (isActive) {
        const currentStep = steps[steps.length - 1];
        return (
            <div className="flex flex-col gap-2.5 mb-2 mt-1">
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
                        {getStepDisplayText(currentStep)}
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
    }

    const summaryText = steps
        .map(s => STEP_LABELS[s.type] || s.type)
        .join(' · ');

    return (
        <div className="flex flex-col gap-2 mb-3">
            <button
                className="inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-md transition-colors"
                style={{ 
                    color: 'var(--text-muted)',
                    background: userExpanded ? 'var(--bg-peach)' : 'transparent',
                    cursor: 'pointer',
                    border: 'none',
                    fontSize: 12
                }}
                onClick={() => setUserExpanded(prev => !prev)}
                type="button"
                title={userExpanded ? "收起思考过程" : "展开思考过程"}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-dark)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
                <Check size={12} />
                <span className="truncate max-w-[200px]" style={{ opacity: 0.8 }}>{summaryText}</span>
                <ChevronDown
                    size={12}
                    style={{ 
                        transform: userExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s',
                        opacity: 0.6
                    }}
                />
            </button>
            {userExpanded && (
                <div className="flex flex-col gap-1.5 pl-1 mb-2">
                    {steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-body)' }}>
                            <Check size={12} style={{ color: 'var(--sage)' }} />
                            <span>{getStepDisplayText(step)}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="dot-divider mb-1 opacity-60" />
        </div>
    );
};

export default StatusSteps;
