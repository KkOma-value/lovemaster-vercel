import React from 'react';

export const Card = ({
    children,
    className = '',
    hoverable = false,
    onClick,
    style = {}
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const baseStyle = {
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s ease',
        cursor: hoverable ? 'pointer' : 'default',
        ...(hoverable && isHovered ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
        } : {}),
        ...style
    };

    return (
        <div
            className={className}
            style={baseStyle}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {children}
        </div>
    );
};
