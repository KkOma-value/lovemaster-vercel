import React from 'react';

export const Button = ({
    children,
    variant = 'primary',
    size = 'medium',
    loading = false,
    className = '',
    disabled,
    onClick,
    type = 'button',
    style = {},
    ...props
}) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const getVariantStyles = () => {
        switch (variant) {
            case 'secondary':
                return {
                    backgroundColor: isHovered ? 'rgba(107, 74, 56, 0.08)' : 'var(--bg-input)',
                    color: 'var(--text-ink)',
                    border: '1px solid var(--border-soft)'
                };
            case 'ghost':
                return {
                    backgroundColor: isHovered ? 'rgba(107, 74, 56, 0.08)' : 'transparent',
                    color: 'var(--text-ink)',
                    border: 'none'
                };
            case 'danger':
                return {
                    backgroundColor: isHovered ? '#D95F59' : '#F8E0E0',
                    color: isHovered ? 'var(--bg-input)' : '#A55F5F',
                    border: 'none'
                };
            default: // primary - warm brand gradient
                return {
                    backgroundColor: isHovered ? 'var(--primary-dark)' : 'var(--primary)',
                    color: 'var(--bg-input)',
                    border: 'none',
                    boxShadow: isHovered
                        ? '0 8px 24px rgba(196, 123, 90, 0.4)'
                        : '0 4px 16px rgba(196, 123, 90, 0.3)'
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { padding: '8px 16px', fontSize: '13px', borderRadius: '10px' };
            case 'large':
                return { padding: '16px 32px', fontSize: '16px', borderRadius: '16px' };
            default:
                return { padding: '12px 24px', fontSize: '14px', borderRadius: '12px' };
        }
    };

    const baseStyle = {
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...getVariantStyles(),
        ...getSizeStyles(),
        ...style
    };

    return (
        <button
            className={className}
            style={baseStyle}
            disabled={disabled || loading}
            onClick={onClick}
            type={type}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            {...props}
        >
            {loading && (
                <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
            )}
            {children}
        </button>
    );
};
