import * as React from "react"

interface ChartContainerProps {
    children: React.ReactNode
    className?: string
}

interface ChartTooltipProps {
    children: React.ReactNode
}

interface ChartTooltipContentProps {
    label?: string
    value?: string | number
    color?: string
}

const ChartContainer: React.FC<ChartContainerProps> = ({
    children,
    className = ""
}) => {
    return (
        <div className={`chart-container ${className}`}>
            {children}
        </div>
    )
}

const ChartTooltip: React.FC<ChartTooltipProps> = ({ children }) => {
    return (
        <div className="chart-tooltip">
            {children}
        </div>
    )
}

const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({
    label,
    value,
    color = "#3b82f6"
}) => {
    return (
        <div className="chart-tooltip-content p-2 bg-white rounded-lg shadow-lg border">
            {label && (
                <div className="text-sm text-gray-600 mb-1">{label}</div>
            )}
            {value && (
                <div className="text-lg font-semibold" style={{ color }}>
                    {value}
                </div>
            )}
        </div>
    )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
