import React from 'react';

/**
 * Editorial Card Component
 * Luxury atelier-style card with soft shadows and refined typography
 */
const EditorialCard = ({ 
  children, 
  title, 
  subtitle,
  className = '',
  noPadding = false,
  hover = false 
}) => {
  return (
    <div 
      className={`
        bg-white rounded-3xl shadow-editorial border border-atelier-stone/20 
        overflow-hidden
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
    >
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-atelier-stone/10 bg-atelier-beige">
          {title && (
            <h3 className="font-display text-xl text-atelier-espresso">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-atelier-stone-dark mt-1 font-body">
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      {/* Content */}
      <div className={noPadding ? '' : 'p-6'}>
        {children}
      </div>
    </div>
  );
};

/**
 * Stat Card - For displaying key metrics
 */
export const StatCard = ({ label, value, icon: Icon, color = 'espresso' }) => {
  const colorClasses = {
    espresso: 'bg-gradient-to-br from-atelier-espresso-light to-atelier-espresso text-atelier-cream',
    stone: 'bg-gradient-to-br from-atelier-stone to-atelier-stone-dark text-white',
    bronze: 'bg-gradient-to-br from-atelier-bronze to-atelier-copper text-white',
  };

  return (
    <div className={`rounded-3xl p-6 shadow-editorial ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-caption opacity-90">{label}</div>
        {Icon && <Icon className="w-5 h-5 opacity-80" />}
      </div>
      <div className="font-display text-4xl font-semibold">
        {value}
      </div>
    </div>
  );
};

/**
 * Info Card - For tips and informational content
 */
export const InfoCard = ({ title, children, icon: Icon }) => {
  return (
    <div className="bg-gradient-to-br from-atelier-cream to-atelier-beige rounded-3xl p-6 border-2 border-atelier-stone/20 shadow-soft">
      <div className="flex items-start gap-3 mb-3">
        {Icon && (
          <div className="w-10 h-10 rounded-full bg-atelier-espresso/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-atelier-espresso" />
          </div>
        )}
        <h4 className="font-display text-lg text-atelier-espresso">
          {title}
        </h4>
      </div>
      <div className="text-body-elegant text-atelier-espresso-light text-sm">
        {children}
      </div>
    </div>
  );
};

export default EditorialCard;