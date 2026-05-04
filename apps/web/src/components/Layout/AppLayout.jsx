import React from 'react';

const AppLayout = ({ children }) => {
    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {children}
        </div>
    );
};

export default AppLayout;
