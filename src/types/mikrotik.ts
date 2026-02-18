export interface MikroTikCapabilities {
    hotspot: boolean;
    radius: boolean;
    queues: boolean;
}

export interface MikroTikSession {
    id: string;
    username: string;
    ipAddress: string;
    macAddress: string;
    uptime: string;
    bytesIn: string;
    bytesOut: string;
    sessionTime: string;
}

export interface MikroTikResource {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: string;
    temperature: number | null;
}

export interface MikroTikUserData {
    name: string;
    password?: string;
    profile: string;
    comment: string;
    'mac-address'?: string;
}

export interface MikroTikProfileData {
    name: string;
    'shared-users': string;
    'status-autorefresh'?: string;
    'transparent-proxy'?: 'yes' | 'no';
    'rate-limit'?: string;
}
