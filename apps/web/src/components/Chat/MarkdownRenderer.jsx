import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { preprocessStreamingMarkdown } from '../../utils/streamingMarkdownProcessor';
import ImageWithLightbox from './ImageWithLightbox';

const MarkdownRenderer = React.memo(({ content, isStreaming = false }) => {
    const processedContent = preprocessStreamingMarkdown(content, isStreaming);

    return (
        <div style={{
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
            color: 'var(--text-ink)'
        }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Code blocks
                    code({ inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline ? (
                            <div style={{
                                margin: '16px 0',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB'
                            }}>
                                {match && (
                                    <div style={{
                                        backgroundColor: '#F3F4F6',
                                        padding: '8px 14px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: '#6B7280',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {match[1]}
                                    </div>
                                )}
                                <div style={{ padding: '14px', overflowX: 'auto' }}>
                                    <code style={{
                                        fontFamily: "'SF Mono', 'Menlo', monospace",
                                        fontSize: '13px',
                                        color: 'var(--text-ink)'
                                    }} {...props}>
                                        {children}
                                    </code>
                                </div>
                            </div>
                        ) : (
                            <code style={{
                                backgroundColor: 'var(--bg-peach)',
                                color: 'var(--primary-dark)',
                                padding: '2px 6px',
                                borderRadius: '6px',
                                fontFamily: "'SF Mono', 'Menlo', monospace",
                                fontSize: '13px',
                                fontWeight: 500
                            }} {...props}>
                                {children}
                            </code>
                        );
                    },
                    // Images — render with lightbox for known sources
                    img({ src, alt }) {
                        if (!src) return null;
                        return <ImageWithLightbox src={src} alt={alt} />;
                    },
                    // Links
                    a({ href, children, ...props }) {
                        return (
                            <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    color: '#C47B5A',
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    borderBottom: '1px solid rgba(196, 123, 90, 0.3)'
                                }}
                                {...props}
                            >
                                {children}
                            </a>
                        );
                    },
                    // Lists
                    ul: ({ children }) => (
                        <ul style={{
                            paddingLeft: '20px',
                            margin: '12px 0',
                            listStyleType: 'disc'
                        }}>
                            {children}
                        </ul>
                    ),
                    ol: ({ children }) => (
                        <ol style={{
                            paddingLeft: '20px',
                            margin: '12px 0'
                        }}>
                            {children}
                        </ol>
                    ),
                    li: ({ children }) => (
                        <li style={{ marginBottom: '6px' }}>{children}</li>
                    ),
                    // Paragraphs — unwrap if the only child is a block element (e.g. image)
                    p: ({ children, node }) => {
                        const hasImage = node?.children?.some(
                            (child) => child.tagName === 'img'
                        );
                        if (hasImage) {
                            return <div style={{ marginBottom: '12px' }}>{children}</div>;
                        }
                        return <p style={{ marginBottom: '12px' }}>{children}</p>;
                    },
                    // Headings
                    h1: ({ children }) => (
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            marginTop: '24px',
                            marginBottom: '12px',
                            color: 'var(--text-ink)'
                        }}>
                            {children}
                        </h1>
                    ),
                    h2: ({ children }) => (
                        <h2 style={{
                            fontSize: '20px',
                            fontWeight: 600,
                            marginTop: '20px',
                            marginBottom: '10px',
                            color: 'var(--text-ink)'
                        }}>
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            marginTop: '16px',
                            marginBottom: '8px',
                            color: 'var(--text-ink)'
                        }}>
                            {children}
                        </h3>
                    ),
                    // Blockquotes
                    blockquote: ({ children }) => (
                        <blockquote style={{
                            borderLeft: '3px solid #C47B5A',
                            paddingLeft: '16px',
                            margin: '16px 0',
                            color: '#6B7280',
                            fontStyle: 'italic'
                        }}>
                            {children}
                        </blockquote>
                    )
                }}
            >
                {processedContent}
            </ReactMarkdown>
        </div>
    );
});

export default MarkdownRenderer;

