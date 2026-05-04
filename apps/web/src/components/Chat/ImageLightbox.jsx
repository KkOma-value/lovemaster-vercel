import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Download } from 'lucide-react';

const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.75)',
    animation: 'lightboxFadeIn 200ms ease-out',
};

const imgStyle = {
    maxWidth: '90vw',
    maxHeight: '90vh',
    borderRadius: '8px',
    objectFit: 'contain',
    animation: 'lightboxZoomIn 200ms ease-out',
};

const btnBase = {
    position: 'absolute',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
};

const ImageLightbox = ({ src, alt, onClose }) => {
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') onClose();
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [handleKeyDown]);

    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = src;
        link.download = alt || 'image';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.click();
    };

    return createPortal(
        <div style={overlayStyle} onClick={onClose}>
            <img src={src} alt={alt || ''} style={imgStyle} onClick={(e) => e.stopPropagation()} />
            <button
                style={{ ...btnBase, top: '16px', right: '16px' }}
                onClick={onClose}
                aria-label="关闭"
            >
                <X size={20} />
            </button>
            <button
                style={{ ...btnBase, bottom: '16px', right: '16px' }}
                onClick={handleDownload}
                aria-label="下载"
            >
                <Download size={18} />
            </button>
            <style>{`
                @keyframes lightboxFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes lightboxZoomIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>,
        document.body
    );
};

export default ImageLightbox;
