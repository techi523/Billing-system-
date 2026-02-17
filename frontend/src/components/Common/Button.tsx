import * as React from "react"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        const variantClasses = {
            default: "bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95",
            destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-200 active:scale-95",
            outline: "border-2 border-slate-200 bg-transparent text-slate-700 hover:border-slate-900 hover:text-slate-900 active:scale-95",
            secondary: "bg-sky-500 text-white hover:bg-sky-600 shadow-lg shadow-sky-200 active:scale-95",
            ghost: "text-slate-600 hover:bg-slate-100 active:scale-95",
            link: "text-sky-600 underline-offset-4 hover:underline"
        }

        const sizeClasses = {
            default: "h-12 px-8 py-3 rounded-2xl",
            sm: "h-10 px-6 py-2 rounded-xl text-xs",
            lg: "h-14 px-10 py-4 rounded-[1.5rem] text-lg",
            icon: "h-12 w-12 rounded-2xl"
        }

        return (
            <button
                className={`inline-flex items-center justify-center whitespace-nowrap font-black uppercase tracking-widest text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
                ref={ref}
                {...props}
            />
        )
    }
)

Button.displayName = "Button"

export { Button }
