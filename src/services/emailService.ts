import dotenv from 'dotenv';

dotenv.config();

export const sendPasswordResetEmail = async (to: string, token: string) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    console.log(`[MOCK EMAIL] To: ${to}`);
    console.log(`[MOCK EMAIL] Subject: SurfBill Password Reset`);
    console.log(`[MOCK EMAIL] Link: ${resetUrl}`);
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500));
};
