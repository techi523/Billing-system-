/** Raw API response shape from /api/v1/admin/subscribers */
export interface ApiSubscriberRaw {
    id: string | number;
    name?: string;
    phoneNumber?: string;
    phone?: string;
    package?: { name: string };
    displayStatus?: string;
    usagePercent?: number;
    expiresIn?: string;
    lastPaymentDate?: string;
    activeSession?: { ipAddress?: string } | null;
    pppoeUsername?: string;
    pppoePassword?: string;
    packageId?: string;
    routerId?: string;
    address?: string;
    notes?: string;
}

export interface Subscriber {
    id: string;
    name: string;
    ip?: string;
    status: 'Active' | 'Inactive' | 'Suspended' | 'Warning' | 'Expired';
    plan: string;
    usage: number;
    data_usage?: number;
    upload?: number;
    download?: number;
    phone: string;
    location?: string;
    expires?: string;
    lastSeen?: string;
    ipAddress?: string;
    deviceType?: string;
    raw?: ApiSubscriberRaw;
}

export interface SubscriberFormData {
    name: string;
    phoneNumber: string;
    pppoeUsername?: string;
    pppoePassword?: string;
    packageId: string;
    routerId: string;
    address?: string;
    notes?: string;
}

export interface Package {
    id: string;
    name: string;
    price: number;
    speed?: string;
    type?: string;
    duration?: number;
    durationMinutes?: number;
    speedLimit?: string;
}

export interface AdminStats {
    totalRevenue: number;
    activeTenants: number;
    totalTenants: number;
    totalPayments: number;
    systemHealth: number;
    activeUsers: number;
    networkLoad: number;
}

export interface TenantStats {
    totalRevenue: number;
    activeSessions: number;
    totalSubscribers: number;
    voucherSales: number;
}

export interface Payment {
    id?: string;
    phoneNumber: string;
    mpesaReceiptNumber?: string;
    amount: number;
    package?: { name: string };
    date?: string;
    status?: string;
}

export interface Router {
    id: string | number;
    name: string;
    ip: string;
    host?: string;
    location?: string;
    status?: 'online' | 'offline';
    cpuLoad?: number;
    activeUsers?: number;
}
