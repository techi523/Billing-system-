import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class ErrorHandler {
    static async handleTenantError(err: any, req: Request, res: Response, next: NextFunction) {
        if (err.name === 'SequelizeForeignKeyConstraintError' && err.message.includes('tenantId')) {
            // Handle tenant resolution errors
            logger.error('Tenant resolution error', { error: err.message, userId: req.user?.id });

            return res.status(403).json({
                error: 'Workspace access required',
                action: 'SELECT_WORKSPACE',
                message: 'Please select or create a workspace to continue'
            });
        }

        if (err.name === 'Error' && err.message.includes('Tenant ID is required for non-super admin users')) {
            // Handle missing tenantId validation
            logger.error('Missing tenantId error', { error: err.message, userId: req.user?.id });

            return res.status(403).json({
                error: 'You don\'t have a workspace yet',
                action: 'CREATE_WORKSPACE',
                message: 'Please create a workspace to continue'
            });
        }

        next(err);
    }

    static async handleGeneralError(err: any, req: Request, res: Response, next: NextFunction) {
        logger.error('Unhandled error', { error: err.message, stack: err.stack, userId: req.user?.id });

        res.status(500).json({
            error: 'System error',
            message: 'Please try again or contact support'
        });
    }
}
