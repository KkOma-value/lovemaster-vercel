import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, TrendingUp, Zap } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

async function fetchCandidates(status) {
    const res = await fetch(`${API_BASE}/ai/knowledge/candidates?status=${status}&page=0&size=50`, {
        headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export default function KnowledgeReviewPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('approved');
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, unknown: 0 });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [approvedRes, pendingRes, rejectedRes, unknownRes] = await Promise.allSettled([
                fetchCandidates('approved'),
                fetchCandidates('pending_review'),
                fetchCandidates('rejected'),
                fetchCandidates('unknown_topic')
            ]);

            const approved = approvedRes.status === 'fulfilled' ? approvedRes.value : [];
            const pending = pendingRes.status === 'fulfilled' ? pendingRes.value : [];
            const rejected = rejectedRes.status === 'fulfilled' ? rejectedRes.value : [];
            const unknown = unknownRes.status === 'fulfilled' ? unknownRes.value : [];

            setStats({
                approved: Array.isArray(approved) ? approved.length : 0,
                pending: Array.isArray(pending) ? pending.length : 0,
                rejected: Array.isArray(rejected) ? rejected.length : 0,
                unknown: Array.isArray(unknown) ? unknown.length : 0
            });

            switch (activeTab) {
                case 'approved': setCandidates(Array.isArray(approved) ? approved : []); break;
                case 'pending_review': setCandidates(Array.isArray(pending) ? pending : []); break;
                case 'rejected': setCandidates(Array.isArray(rejected) ? rejected : []); break;
                case 'unknown_topic': setCandidates(Array.isArray(unknown) ? unknown : []); break;
                default: setCandidates([]);
            }
        } catch (err) {
            console.error('Failed to load candidates:', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const tabs = [
        { key: 'approved', label: '已入知识库', icon: CheckCircle },
        { key: 'pending_review', label: '用户验证中', icon: Clock },
        { key: 'unknown_topic', label: '反馈积累', icon: TrendingUp },
        { key: 'rejected', label: '已清理', icon: null }
    ];

    const total = stats.approved + stats.pending + stats.rejected + stats.unknown;

    return (
        <div
            className="min-h-screen relative"
            style={{
                backgroundImage: 'url(/4.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div
                className="absolute inset-0 backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255, 252, 245, 0.88)' }}
            />
            <div className="relative z-10 max-w-[1000px] mx-auto px-6 py-8">
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 mb-4 bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <ArrowLeft size={16} /> 返回首页
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 m-0">知识蒸馏观察台</h1>
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-[var(--primary-light)] text-[var(--primary-dark)]">
                            <Zap size={12} /> 全自动运行中
                        </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">用户反馈驱动，无需人工介入。候选达到 3 个正向反馈后自动入库。</p>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                    {[
                        { label: '知识条目', value: total, color: 'text-gray-800' },
                        { label: '已入库', value: stats.approved, color: 'text-emerald-600' },
                        { label: '验证中', value: stats.pending, color: 'text-amber-600' },
                        { label: '已清理', value: stats.rejected, color: 'text-red-500' }
                    ].map(s => (
                        <div key={s.label} className="bg-white border border-gray-200/60 rounded-xl p-4 text-center">
                            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-6 border-b border-gray-200 mb-6">
                    {tabs.map(({ key, label }) => (
                        <button
                            key={key}
                            className={`px-1 py-3 bg-transparent border-none cursor-pointer text-sm font-medium border-b-2 transition-colors ${
                                activeTab === key ? 'text-[var(--primary-dark)] border-[var(--primary)]' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab(key)}
                        >
                            {label}
                            <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                {key === 'approved' ? stats.approved :
                                 key === 'pending_review' ? stats.pending :
                                 key === 'rejected' ? stats.rejected : stats.unknown}
                            </span>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-400">加载中...</div>
                ) : candidates.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">暂无数据</div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {candidates.map((item) => {
                            const tags = (item.stage && item.intent)
                                ? [item.stage, item.intent, item.problem].filter(Boolean)
                                : ['待分类'];
                            return (
                                <div
                                    key={item.id}
                                    className="bg-white border border-gray-200 rounded-xl p-5"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex gap-2 flex-wrap">
                                            {tags.map((tag, idx) => (
                                                <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded font-medium">{tag}</span>
                                            ))}
                                        </div>
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                                            item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                            item.status === 'pending_review' ? 'bg-amber-100 text-amber-700' :
                                            item.status === 'unknown_topic' ? 'bg-blue-100 text-blue-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {item.status === 'approved' && <><CheckCircle size={12} />已入库</>}
                                            {item.status === 'pending_review' && <><Clock size={12} />验证中</>}
                                            {item.status === 'unknown_topic' && <><TrendingUp size={12} />反馈积累</>}
                                            {item.status === 'rejected' && <>已清理</>}
                                        </span>
                                    </div>
                                    {(item.abstractSummary || item.rawQuestion) && (
                                        <div className="mt-3 text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-lg">
                                            <h4 className="text-xs text-gray-400 uppercase m-0 mb-2 font-semibold">经验提取摘要</h4>
                                            {item.abstractSummary || item.rawQuestion}
                                        </div>
                                    )}
                                    <div className="mt-3 text-xs text-gray-400">
                                        创建: {new Date(item.createdAt).toLocaleString('zh-CN')}
                                        {item.reviewerId && ` · 处理: ${item.reviewerId}`}
                                        {item.rejectedReason && ` · 原因: ${item.rejectedReason}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
