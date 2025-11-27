import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tonal' | 'ghost';
  icon?: string;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  isLoading, 
  className = '', 
  disabled,
  ...props 
}) => {
  
  const baseStyles = "relative inline-flex items-center justify-center h-10 px-6 rounded-full font-medium transition-all duration-200 overflow-hidden active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-md-sys-primary text-md-sys-onPrimary hover:opacity-90 shadow-lg shadow-md-sys-primary/20",
    secondary: "bg-md-sys-surfaceVariant text-md-sys-tertiary hover:bg-white/10 border border-md-sys-outline",
    tonal: "bg-md-sys-secondary text-md-sys-surface hover:brightness-110",
    ghost: "text-md-sys-primary hover:bg-md-sys-primary/10",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="material-symbols-rounded animate-spin text-[20px]">
          progress_activity
        </span>
      ) : (
        <>
          {icon && (
            <span className={`material-symbols-rounded text-[20px] ${children ? 'mr-2' : ''}`}>
              {icon}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
};
