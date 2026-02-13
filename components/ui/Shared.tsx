
import React, { ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export const Button = React.forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link' | 'glass', size?: 'default' | 'sm' | 'lg' | 'icon' }>(
  ({ className = '', variant = 'default', size = 'default', ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    const variants = {
      default: "bg-gradient-to-r from-primary to-orange-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110",
      destructive: "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20",
      outline: "border-2 border-border bg-transparent hover:bg-muted/50 hover:text-foreground hover:border-primary/50",
      ghost: "hover:bg-muted/60 hover:text-foreground",
      link: "text-primary underline-offset-4 hover:underline",
      glass: "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 shadow-sm",
    };

    const sizes = {
      default: "h-11 px-5 py-2",
      sm: "h-9 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base",
      icon: "h-10 w-10 rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-11 w-full rounded-xl border border-input bg-background/50 px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-primary transition-all duration-200 shadow-sm ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`} {...props}>
    {children}
  </div>
);

export const Avatar = ({ src, alt, fallback, className }: { src?: string, alt: string, fallback: string, className?: string }) => (
  <div className={`relative flex shrink-0 overflow-hidden rounded-2xl border-2 border-background shadow-sm ${className || 'h-10 w-10'}`}>
    {src ? (
      <img className="aspect-square h-full w-full object-cover" src={src} alt={alt} />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900 text-muted-foreground font-bold">
        {fallback.toUpperCase().slice(0, 2)}
      </div>
    )}
  </div>
);
