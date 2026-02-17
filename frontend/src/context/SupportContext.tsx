import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface PlatformSetting {
    key: string;
    value: string;
}

interface SupportContextType {
    settings: Record<string, string>;
    loading: boolean;
    getSetting: (key: string) => string;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await axios.get<PlatformSetting[]>('/api/v1/portal/public/settings');
                const settingsMap = response.data.reduce((acc, curr) => {
                    acc[curr.key] = curr.value;
                    return acc;
                }, {} as Record<string, string>);
                setSettings(settingsMap);
            } catch (error: unknown) {
                console.error('Failed to fetch platform settings:', error);
                // Fallback to defaults if API fails
                setSettings({
                    CONTACT_WHATSAPP: '+254714498996',
                    CONTACT_WHATSAPP_URL: 'https://wa.me/254714498996',
                    CONTACT_PHONE: '+254714498996',
                    CONTACT_PHONE_TEL: 'tel:+254714498996',
                    CONTACT_EMAIL: 'surfbill0@gmail.com',
                    CONTACT_EMAIL_MAILTO: 'mailto:surfbill0@gmail.com',
                    CONTACT_FACEBOOK_PAGE: 'SurfBill',
                    CONTACT_FACEBOOK_URL: 'https://www.facebook.com/SurfBill',
                    CONTACT_SUPPORT_MESSAGE: 'Hello SurfBill Support, I need help with…'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const getSetting = (key: string) => settings[key] || '';

    return (
        <SupportContext.Provider value={{ settings, loading, getSetting }}>
            {children}
        </SupportContext.Provider>
    );
};

export const useSupport = () => {
    const context = useContext(SupportContext);
    if (context === undefined) {
        throw new Error('useSupport must be used within a SupportProvider');
    }
    return context;
};
