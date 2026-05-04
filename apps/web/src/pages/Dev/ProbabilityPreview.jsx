import React, { useState } from 'react';
import ProbabilityCard from '../../components/Chat/ProbabilityCard';

const SAMPLES = {
    medium: {
        probability: 62,
        tier: '一般',
        confidence: 'medium',
        summary: "你们已经从陌生人聊到能互开玩笑，但 TA 还没主动约你，属于'有兴趣但没投入'阶段。",
        greenFlags: [
            { title: 'TA 主动延续话题', evidence: '截图第 3 轮 TA 问了你工作的事', weight: 'medium' },
            { title: '表情包互动自然', evidence: '双方都用了比心表情', weight: 'low' },
            { title: '周末主动聊天', evidence: '周六晚 9 点 TA 发起闲聊', weight: 'medium' }
        ],
        redFlags: [
            { title: '回复间隔在拉长', evidence: '从 5 分钟变成 2 小时', weight: 'high' }
        ],
        nextActions: [
            { action: '今晚主动发起一个轻度邀约（比如推荐一部刚上的电影）', tone: '主动' },
            { action: '把最后一句改成开放式问题，给 TA 延续话题的空间', tone: '温和' },
            { action: '如果 48 小时没回，不要追问，切换到朋友圈互动', tone: '稳健' }
        ]
    },
    high: {
        probability: 78,
        tier: '较高',
        confidence: 'high',
        summary: 'TA 多次主动发起话题并分享生活细节，约会邀请的接受意愿明显。现在是把关系从"常聊"推进到"见面"的最佳时机。',
        greenFlags: [
            { title: 'TA 主动分享私密话题', evidence: '谈到了家人和工作烦恼', weight: 'high' },
            { title: '聊天频率稳定上升', evidence: '本周日均 8 条，上周仅 3 条', weight: 'high' },
            { title: 'TA 对你朋友圈有互动', evidence: '连续 5 次点赞加评论', weight: 'medium' }
        ],
        redFlags: [
            { title: '还没见过面', evidence: '认识 3 周但未线下', weight: 'medium' }
        ],
        nextActions: [
            { action: '本周发起一次明确邀约（给两个具体时间和地点候选）', tone: '主动' },
            { action: '可以轻度表达好感，不必全部摊牌', tone: '有趣' },
            { action: '如果 TA 改期，第二次再邀约一次即可，不要第三次追', tone: '稳健' }
        ]
    },
    low: {
        probability: 28,
        tier: '极低',
        confidence: 'high',
        summary: 'TA 的回复简短、被动，且多次拒绝你的邀约。继续投入情绪会消耗自己，建议先降温，把精力放回自己的生活。',
        greenFlags: [
            { title: '没有拉黑或完全忽略', evidence: 'TA 还会回复，只是字数很少', weight: 'low' },
            { title: '偶尔会看你的朋友圈', evidence: '上周点过一次赞', weight: 'low' }
        ],
        redFlags: [
            { title: '近一周从未主动发消息', evidence: '都是你先开口', weight: 'high' },
            { title: '拒绝过两次邀约', evidence: '都用了"最近忙"', weight: 'high' },
            { title: '回复字数越来越少', evidence: '从一段话变成"哦""嗯"', weight: 'medium' }
        ],
        nextActions: [
            { action: '这周不要主动发消息，把时间和心思收回给自己', tone: '克制' },
            { action: '去做一件你一直想做但没做的事，让自己先"活回来"', tone: '稳健' },
            { action: '如果 TA 主动来找你，再顺着回应，不要热情扑上去', tone: '稳健' }
        ]
    },
    noImage: {
        probability: 50,
        tier: '一般',
        confidence: 'low',
        summary: '仅凭文字描述很难判断 TA 的真实态度。建议上传你们最近的聊天截图，我能给出更精确的分析。',
        greenFlags: [
            { title: '还在保持联系', evidence: '用户表示最近一周聊过两次', weight: 'low' },
            { title: '愿意回应私人话题', evidence: '提到了工作和家里的事', weight: 'medium' }
        ],
        redFlags: [
            { title: '信息不足，无法判断语气', evidence: '缺少聊天截图作为证据', weight: 'medium' }
        ],
        nextActions: [
            { action: '把你们最近一周的聊天截图发给我，我重新评估', tone: '主动' },
            { action: '先观察 TA 最近 48 小时是否主动发起话题', tone: '稳健' },
            { action: '列 3 件 TA 做过让你觉得有戏的小事发给我看', tone: '温和' }
        ]
    }
};

const pageStyle = {
    minHeight: '100vh',
    background: 'var(--bg-cream)',
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    fontFamily: '"PingFang SC", "HarmonyOS Sans SC", -apple-system, sans-serif'
};

const headerStyle = {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--text-ink)',
    marginBottom: '4px'
};

const descStyle = {
    fontSize: '14px',
    color: 'var(--text-muted)',
    marginBottom: '12px'
};

const tabsStyle = {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px'
};

const tabStyle = (active) => ({
    padding: '8px 16px',
    borderRadius: '10px',
    border: active ? '1px solid var(--primary-dark)' : '1px solid var(--border-soft)',
    background: active ? 'var(--bg-peach)' : 'var(--bg-input)',
    color: active ? 'var(--primary-dark)' : 'var(--text-body)',
    fontWeight: 500,
    cursor: 'pointer',
    fontSize: '13px'
});

const cardWrapStyle = {
    width: '100%',
    maxWidth: '680px',
    background: 'var(--bg-input)',
    padding: '16px',
    borderRadius: '20px',
    boxShadow: 'var(--shadow-soft)'
};

const copyNoteStyle = {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '8px'
};

const ProbabilityPreview = () => {
    const [variant, setVariant] = useState('medium');
    const [copied, setCopied] = useState('');

    const handleCopy = (text) => {
        setCopied(text);
        window.setTimeout(() => setCopied(''), 2000);
    };

    return (
        <div style={pageStyle}>
            <div style={headerStyle}>ProbabilityCard · 开发预览</div>
            <div style={descStyle}>切换不同分档查看视觉效果。此页仅用于开发调试。</div>

            <div style={tabsStyle}>
                <button style={tabStyle(variant === 'high')} onClick={() => setVariant('high')}>
                    较高 78%
                </button>
                <button style={tabStyle(variant === 'medium')} onClick={() => setVariant('medium')}>
                    一般 62%
                </button>
                <button style={tabStyle(variant === 'low')} onClick={() => setVariant('low')}>
                    极低 28%
                </button>
                <button style={tabStyle(variant === 'noImage')} onClick={() => setVariant('noImage')}>
                    低置信度 50%
                </button>
            </div>

            <div style={cardWrapStyle}>
                <ProbabilityCard
                    {...SAMPLES[variant]}
                    onCopyAction={handleCopy}
                />
                {copied && (
                    <div style={copyNoteStyle}>
                        已复制：{copied}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProbabilityPreview;
