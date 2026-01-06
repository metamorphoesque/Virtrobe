import React from 'react';

const Header = ({ title, subtitle, action }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      </div>
      
      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default Header;