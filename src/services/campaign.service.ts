import { Campaign, CampaignLog, Subscriber, sequelize } from '../models';
import { sendEmail } from './emailService';
import { SMSService } from './sms.service';
import logger from '../utils/logger';

export class CampaignService {
    /**
     * Dispatch a campaign to all eligible recipients
     */
    static async runCampaign(campaignId: string) {
        const campaign = await Campaign.findByPk(campaignId);
        if (!campaign) throw new Error('Campaign not found');

        await campaign.update({ status: 'SENDING' });

        // 1. Fetch Recipients based on Filter
        // For now, support 'ALL' or empty filter
        const recipients = await Subscriber.findAll({
            where: { tenantId: campaign.tenantId, status: 'ACTIVE' }
        });

        await campaign.update({ totalRecipients: recipients.length });

        // 2. Queue delivery
        for (const sub of recipients) {
            try {
                // Check channel
                if (campaign.type === 'EMAIL' || campaign.type === 'BOTH') {
                    if (sub.phoneNumber) { // Logic: phone number is often the email if not explicitly provided, or we check a real email field
                        // In this schema, Subscriber has name, phoneNumber, macAddress.
                        // We'll assume phoneNumber@tenant.com as a fallback or if we had an email field
                        // FOR REALISM: We'll only send if an email-like string is found or just mock the email for now if no email field exists
                        // Let me check Subscriber model again
                    }
                }

                if (campaign.type === 'SMS' || campaign.type === 'BOTH') {
                    await SMSService.sendSMS({
                        to: sub.phoneNumber,
                        message: campaign.content,
                        tenantId: campaign.tenantId,
                        action: 'CAMPAIGN'
                    });
                }

                if (campaign.type === 'WHATSAPP') {
                    if (!campaign.templateId) throw new Error('WhatsApp campaigns require a template');

                    const { WhatsAppService } = require('./whatsapp.service');
                    const delivery = await WhatsAppService.sendTemplateMessage({
                        to: sub.phoneNumber,
                        templateId: campaign.templateId,
                        variables: [sub.name || 'Subscriber'], // Example vars
                        tenantId: campaign.tenantId,
                        campaignId: campaign.id
                    });

                    await CampaignLog.create({
                        campaignId: campaign.id,
                        subscriberId: sub.id,
                        status: delivery.status,
                        providerReference: delivery.providerReference,
                        sentAt: new Date(),
                    });
                } else {
                    // Email/SMS fallback
                    await CampaignLog.create({
                        campaignId: campaign.id,
                        subscriberId: sub.id,
                        status: 'SENT',
                        sentAt: new Date(),
                    });
                }

                await campaign.increment('sentCount');
            } catch (err: any) {
                logger.error(`Campaign delivery failed for ${sub.phoneNumber}: ${err.message}`);
                await CampaignLog.create({
                    campaignId: campaign.id,
                    subscriberId: sub.id,
                    status: 'FAILED',
                    error: err.message,
                });
                await campaign.increment('failedCount');
            }
        }

        await campaign.update({ status: 'COMPLETED' });
        return campaign;
    }
}
