import React, { useState } from 'react';
import { useBranding } from '../../context/BrandingContext';
import { Wifi } from 'lucide-react';

export interface SurfBillLogoProps {
    variant?: 'primary' | 'dark' | 'light' | 'mobile' | 'invoice' | 'email' | 'captive' | 'favicon' | 'icon';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    className?: string;
    onClick?: () => void;
}

export const SurfBillLogo: React.FC<SurfBillLogoProps> = ({
    variant = 'primary',
    size = 'md',
    showText = true,
    className = '',
    onClick,
}) => {
    const { branding } = useBranding();
    const [imgError, setImgError] = useState(false);

    // Select Logo URL based on requested variant
    let logoUrl: string | null | undefined = null;

    if (variant === 'dark') logoUrl = branding.darkModeLogoUrl || branding.primaryLogoUrl;
    else if (variant === 'light') logoUrl = branding.lightModeLogoUrl || branding.primaryLogoUrl;
    else if (variant === 'mobile') logoUrl = branding.mobileLogoUrl || branding.primaryLogoUrl;
    else if (variant === 'invoice') logoUrl = branding.invoiceLogoUrl || branding.primaryLogoUrl;
    else if (variant === 'email') logoUrl = branding.emailLogoUrl || branding.primaryLogoUrl;
    else if (variant === 'captive') logoUrl = branding.captivePortalLogoUrl || branding.primaryLogoUrl;
    else if (variant === 'favicon') logoUrl = branding.faviconUrl || branding.primaryLogoUrl;
    else logoUrl = branding.primaryLogoUrl;

    // Dimensions mapping
    const sizeMap = {
        xs: { height: 'h-6', icon: 'w-6 h-6 text-xs', text: 'text-xs' },
        sm: { height: 'h-8', icon: 'w-8 h-8 text-sm', text: 'text-sm' },
        md: { height: 'h-10', icon: 'w-10 h-10 text-base', text: 'text-base' },
        lg: { height: 'h-14', icon: 'w-14 h-14 text-xl', text: 'text-xl' },
        xl: { height: 'h-20', icon: 'w-20 h-20 text-2xl', text: 'text-2xl' },
    };

    const currentSize = sizeMap[size];

    return (
        <div
            onClick={onClick}
            className={`inline-flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
        >
            {logoUrl && !imgError && variant !== 'icon' ? (
                <img
                    src={logoUrl}
                    alt={branding.platformName || 'SurfBill Logo'}
                    onError={() => setImgError(true)}
                    className={`${currentSize.height} w-auto object-contain max-w-full transition-opacity duration-200`}
                />
            ) : (
                /* Fallback Branded SVG Mark */
                <div
                    className={`${currentSize.icon} rounded-2xl flex items-center justify-center font-black text-white shadow-lg transition-all flex-shrink-0`}
                    style={{ backgroundColor: branding.primaryColor || '#0284c7' }}
                >
                    <Wifi className="w-1/2 h-1/2" />
                </div>
            )}

            {showText && variant !== 'icon' && (
                <div className="flex flex-col justify-center">
                    <span className={`font-black tracking-tight text-[var(--text-primary)] leading-none ${currentSize.text}`}>
                        {branding.platformName || 'SurfBill Pro'}
                    </span>
                    <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest mt-0.5">
                        ISP BILLING
                    </span>
                </div>
            )}
        </div>
    );
};

export default SurfBillLogo;
