import React, { useState } from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imageClassName?: string;
  showText?: boolean;
  textClassName?: string;
  subtextClassName?: string;
  theme?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  imageClassName = '',
  showText = false,
  textClassName = '',
  subtextClassName = '',
  theme = 'light'
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-11 h-11',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20'
  };

  const imageSrc = theme === 'dark' ? '/logo-transparent.png' : '/logo.png';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div
        className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden bg-white shadow-xs border border-slate-200/80 flex items-center justify-center p-1 shrink-0 group-hover:scale-105 transition-transform`}
      >
        {!imgError ? (
          <img
            src={imageSrc}
            alt="شعار صحتك في يدك"
            className={`w-full h-full object-contain ${imageClassName}`}
            referrerPolicy="no-referrer"
            onError={() => {
              // fallback to regular logo.png if transparent fails
              if (imageSrc !== '/logo.png') {
                // do nothing or switch
              } else {
                setImgError(true);
              }
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 rounded-lg flex items-center justify-center text-white font-black text-sm">
            ص
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col text-start">
          <span
            className={`font-black tracking-tight leading-tight ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            } ${size === 'lg' ? 'text-xl' : 'text-base sm:text-lg'} ${textClassName}`}
          >
            صحتك في يدك Sehatak Fe Yadeki
          </span>
          <span
            className={`text-xs font-medium leading-normal ${
              theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
            } ${subtextClassName}`}
          >
            مركز الرعاية الصحية والعيادات التخصصية
          </span>
        </div>
      )}
    </div>
  );
};
