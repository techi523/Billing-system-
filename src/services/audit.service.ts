import { AuditLog } from '../models';

export class AuditService {
    static async log(action: string, details: string, tenantId?: string, userId?: string, ipAddress?: string) {
        try {
            await AuditLog.create({
                action,
                details,
                tenantId: tenantId || null,
                userId: userId || null,
                ipAddress: ipAddress || null
            });
        } catch (error) {
            console.error('Failed to create audit log:', error);
        }
    }

    static async getLogs(tenantId?: string) {
        const where = tenantId ? { tenantId } : {};
        return await AuditLog.findAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: 100
        });
    }
}
