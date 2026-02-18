export interface Subscriber {
    id: string;
    name: string;
    ip?: string; // Made optional as it's not always present in list view
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
    [key: string]: unknown; // Keep loose for now to prevent breakage during transition
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
    [key: string]: unknown;
}

export interface Router {
    id: string; // Changed from number to string to match other IDs usually, but RouterList uses number. Checking RouterList again.
    // RouterList uses number ids: { id: 1, ... }
    // But other parts might expect string. I'll make it number | string or just number if consistent.
    // SubscriberTable uses string IDs.
    // Let's check RouterList usage again.
    // "id: 1"
    // I should probably unify this to string or number. Let's stick to string for consistency with others, but RouterList has numbers.
    // I will use string | number for id in Router to be safe.
    name: string;
    ip: string;
    host?: string;
    location?: string;
    status?: 'online' | 'offline';
    cpuLoad?: number;
    activeUsers?: number;
}
