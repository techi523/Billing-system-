
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = 'http://localhost:3000/api/v1';
const TENANT_NAME = `SimTenant-${uuidv4().slice(0, 8)}`;
const SUBDOMAIN = `sim-${uuidv4().slice(0, 8)}`;
const ADMIN_EMAIL = `admin-${uuidv4().slice(0, 8)}@example.com`;
const PASSWORD = 'Password123!';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSimulation() {
    console.log('🚀 Starting Full System Simulation...');

    try {
        // 1. Register Tenant
        console.log(`\n1. Registering Tenant: ${TENANT_NAME} (${SUBDOMAIN})...`);
        const registerRes = await axios.post(`${BASE_URL}/auth/register`, {
            email: ADMIN_EMAIL,
            password: PASSWORD,
            tenantName: TENANT_NAME,
            subdomain: SUBDOMAIN
        });
        console.log('✅ Tenant Registered:', registerRes.data.tenant.id);
        const { tenant, user: _user } = registerRes.data;

        // 2. Login
        console.log('\n2. Logging in...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: ADMIN_EMAIL,
            password: PASSWORD
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in. Token received.');

        const authHeaders = {
            headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant.id }
        };

        // 3. Create Package
        console.log('\n3. Creating Service Package...');
        const packageRes = await axios.post(`${BASE_URL}/admin/packages`, {
            name: '1 Hour Ultra',
            price: 10,
            durationMinutes: 60,
            speedLimit: '5M/5M',
            description: 'Fast internet'
        }, authHeaders);
        console.log('✅ Package Created:', packageRes.data.id);
        const pkg = packageRes.data;

        // 4. Create Router (Mock)
        console.log('\n4. Creating Router Node...');
        const routerRes = await axios.post(`${BASE_URL}/admin/routers`, {
            name: 'Main Gateway',
            host: '192.168.88.1',
            username: 'admin',
            password: 'password',
            type: 'MIKROTIK'
        }, authHeaders);
        console.log('✅ Router Created:', routerRes.data.id);
        const router = routerRes.data;

        // 5. Simulate Subscriber Payment (Hotspot Flow)
        console.log('\n5. Simulating Payment Initiation (Hotspot)...');
        const macAddress = 'AA:BB:CC:DD:EE:FF';
        const initRes = await axios.post(`${BASE_URL}/portal/${tenant.id}/pay`, {
            packageId: pkg.id,
            routerId: router.id,
            phone: '254712345678',
            mac: macAddress,
            ip: '10.0.0.50'
        });
        console.log('✅ Payment Initiated. CheckoutID:', initRes.data.checkoutId);
        const { checkoutId, paymentId: _paymentId } = initRes.data;

        // 6. Simulate M-Pesa Callback
        console.log('\n6. Simulating M-Pesa Webhook Callback...');
        const callbackPayload = {
            Body: {
                stkCallback: {
                    MerchantRequestID: "29115-34620561-1",
                    CheckoutRequestID: checkoutId,
                    ResultCode: 0,
                    ResultDesc: "The service request is processed successfully.",
                    CallbackMetadata: {
                        Item: [
                            { Name: "Amount", Value: 10 },
                            { Name: "MpesaReceiptNumber", Value: `QG${uuidv4().slice(0, 8).toUpperCase()}` },
                            { Name: "Balance", Value: 0 },
                            { Name: "TransactionDate", Value: 20230623124511 },
                            { Name: "PhoneNumber", Value: 254712345678 }
                        ]
                    }
                }
            }
        };

        await axios.post('http://localhost:3000/api/v1/callbacks/mpesa', callbackPayload);
        console.log('✅ Callback Sent.');

        // 7. Verification: Check Payment Status
        console.log('\n7. Verifying Payment Status...');
        // Wait for webhook processing
        await delay(2000);

        // We can't check database directly easily, but we can verify via a subscriber/session check or logs.
        // Let's check via admin dashboard stats which should increment.
        const statsRes = await axios.get(`${BASE_URL}/admin/stats`, authHeaders);
        console.log('✅ Admin Stats:', statsRes.data);

        if (statsRes.data.totalRevenue >= 10) {
            console.log('🎉 SUCCESS: Revenue recorded correctly.');
        } else {
            console.error('❌ FAILURE: Revenue not updated.');
        }

    } catch (error: any) {
        console.error('❌ Simulation Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runSimulation();
