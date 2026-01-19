import * as React from "react"

interface ProgressProps extends React.ComponentPropsWithoutRef<'div'> {
    value?: number
    className?: string
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className = "", value = 0, ...props }, ref) => (
        <div
            ref={ref}
            className={`relative w-full overflow-hidden rounded-full bg-slate-200 ${className}`}
            {...props}
        >
            <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${value}%` }}
            />
        </div>
    )
)

Progress.displayName = "Progress"

export { Progress }
