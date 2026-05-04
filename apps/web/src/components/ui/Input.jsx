import React from 'react';

export const Input = ({ icon: Icon, className = '', ...props }) => {
    return (
        <div className={`relative ${className}`}>
            {Icon && (
                <Icon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-ink)] pointer-events-none"
                    size={20}
                />
            )}
            <input
                className={`
                    w-full bg-[var(--bg-input)] text-[var(--text-ink)] font-medium
                    border-[3px] border-[var(--text-ink)]
                    placeholder-gray-500
                    py-3 ${Icon ? 'pl-12' : 'pl-4'} pr-4
                    focus:outline-none focus:shadow-[4px_4px_0_0_var(--text-ink)] focus:-translate-y-1 focus:-translate-x-1
                    transition-all duration-200 ease-out
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                {...props}
            />
        </div>
    );
};

export default Input;
