import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'draft' | 'active' | 'paused' | 'completed' | 'scheduled' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className 
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full transition-colors';
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  };
  
  const variantClasses = {
    default: 'bg-muted text-muted-foreground',
    draft: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30',
    active: 'bg-chart-2/10 text-chart-2 border border-chart-2/20',
    paused: 'bg-chart-3/10 text-chart-3 border border-chart-3/20',
    completed: 'bg-chart-1/10 text-chart-1 border border-chart-1/20',
    scheduled: 'bg-chart-4/10 text-chart-4 border border-chart-4/20',
    destructive: 'bg-destructive/10 text-destructive border border-destructive/20'
  };
  
  return (
    <span 
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;