import React from 'react';

const Card = ({ 
  children, 
  title, 
  subtitle, 
  footer, 
  hover = false,
  onClick,
  className = ''
}) => {
  return (
    <div 
      className={`
        bg-white rounded-xl shadow-lg overflow-hidden
        ${hover ? 'hover:shadow-xl transition cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {(title || subtitle) && (
        <div className="p-4 border-b border-gray-100">
          {title && <h3 className="font-semibold text-gray-800">{title}</h3>}
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
      )}
      
      <div className="p-4">
        {children}
      </div>
      
      {footer && (
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;