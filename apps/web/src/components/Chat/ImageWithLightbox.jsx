import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import ImageLightbox from './ImageLightbox';

const containerStyle = {
    margin: '12px 0',
    display: 'inline-block',
    maxWidth: '100%',
};

const imgStyle = {
    maxWidth: '360px',
    maxHeight: '280px',
    borderRadius: '12px',
    objectFit: 'cover',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    display: 'block',
    transition: 'opacity 0.3s ease',
};

const skeletonStyle = {
    width: '360px',
    maxWidth: '100%',
    height: '200px',
    borderRadius: '12px',
    background: '#ECEFF3',
};

const errorStyle = {
    width: '360px',
    maxWidth: '100%',
    height: '120px',
    borderRadius: '12px',
    background: '#FEF2F2',
    border: '1px dashed #FECACA',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: '#9CA3AF',
    fontSize: '13px',
};

const ImageWithLightbox = ({ src, alt }) => {
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    if (error) {
        return (
            <div style={containerStyle}>
                <div style={errorStyle}>
                    <ImageOff size={24} color="#FECACA" />
                    <span>图片加载失败</span>
                    {alt && <span style={{ fontSize: '12px', color: '#D1D5DB' }}>{alt}</span>}
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {!loaded && <div style={skeletonStyle} />}
            <img
                src={src}
                alt={alt || ''}
                style={{
                    ...imgStyle,
                    opacity: loaded ? 1 : 0,
                    position: loaded ? 'static' : 'absolute',
                }}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                onClick={() => setLightboxOpen(true)}
            />
            {lightboxOpen && (
                <ImageLightbox
                    src={src}
                    alt={alt}
                    onClose={() => setLightboxOpen(false)}
                />
            )}
        </div>
    );
};

export default ImageWithLightbox;
