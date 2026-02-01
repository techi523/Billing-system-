import { Campaign, CampaignLog, Subscriber, sequelize } from '../models';
import { sendEmail } from './emailService';
import { SMSService } from './sms.service';
import { WhatsAppService } from './whatsapp.service';
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
        const recipients = await Subscriber.findAll({
            where: { tenantId: campaign.tenantId, status: 'ACTIVE' }
        });

        await campaign.update({ totalRecipients: recipients.length });

        // 2. Queue delivery
        for (const sub of recipients) {
            try {
                let deliveryResult = { status: 'SENT', ref: null as string | null };

                // Handle Channels
                if (campaign.type === 'EMAIL' || campaign.type === 'BOTH') {
                    if (sub.email) {
                        await sendEmail({
                            to: sub.email,
                            subject: campaign.subject || 'SurfBill Notification',
                            html: campaign.content,
                            tenantId: campaign.tenantId,
                            action: 'CAMPAIGN'
                        });
                    } else {
                        logger.warn(`Skipping email for subscriber ${sub.id} - No email address.`);
                    }
                }

                if (campaign.type === 'SMS' || campaign.type === 'BOTH') {
                    const sms = await SMSService.sendSMS({
                        to: sub.phoneNumber,
                        message: campaign.content,
                        tenantId: campaign.tenantId,
                        action: 'CAMPAIGN'
                    });
                    deliveryResult.ref = sms.reference;
                }

                if (campaign.type === 'WHATSAPP') {
                    if (!campaign.templateId) throw new Error('WhatsApp campaigns require a template');

                    const delivery = await WhatsAppService.sendTemplateMessage({
                        to: sub.phoneNumber,
                        templateId: campaign.templateId,
                        variables: [sub.name || 'Subscriber'],
                        tenantId: campaign.tenantId,
                        campaignId: campaign.id
                    });
                    deliveryResult.status = delivery.status;
                    deliveryResult.ref = delivery.providerReference;
                }

                // Log outcome
                await CampaignLog.create({
                    campaignId: campaign.id,
                    subscriberId: sub.id,
                    status: deliveryResult.status as any,
                    providerReference: deliveryResult.ref,
                    sentAt: new Date(),
                });

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
