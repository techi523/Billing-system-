import { Router } from 'express';
import { BrandingService } from '../services/branding.service';
import { authMiddleware } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/branding/public
 * Public endpoint for frontend, landing page, login page, captive portal & footers
 */
router.get('/public', async (_req, res) => {
    try {
        const branding = await BrandingService.getPlatformBranding();
        res.json({ branding });
    } catch (error: any) {
        logger.error('Failed to fetch public branding', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch public branding' });
    }
});

/**
 * GET /api/v1/superadmin/branding
 * Super Admin branding settings
 */
router.get('/superadmin', authMiddleware, async (req: any, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Super Admin access required' });
        }
        const branding = await BrandingService.getPlatformBranding();
        res.json({ branding });
    } catch (error: any) {
        logger.error('Failed to fetch admin branding', { error: error.message });
        res.status(500).json({ error: 'Failed to fetch admin branding' });
    }
});

/**
 * PUT /api/v1/superadmin/branding
 * Super Admin update branding identity, logos & colors
 */
router.put('/superadmin', authMiddleware, async (req: any, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Super Admin access required' });
        }
        const updated = await BrandingService.updatePlatformBranding(req.body);
        res.json({ success: true, branding: updated });
    } catch (error: any) {
        logger.error('Failed to update platform branding', { error: error.message });
        res.status(400).json({ error: error.message || 'Failed to update platform branding' });
    }
});

export default router;
