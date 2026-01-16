# SurfBill - Hotspot Billing System

Production-ready billing system for ISPs using Mikrotik routers and M-Pesa payments.

## 🚀 Quick Start (No Global Dependencies)

If you don't have `pnpm` or `npm` installed globally, you can use the included script to run the system using the locally installed packages:

```bash
./run.sh
```

This will start:
- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:5173

## 🛠 Manual Start

If you prefer to run commands manually:

### Backend
```bash
./node_modules/.bin/ts-node src/server.ts
```

### Frontend
```bash
cd frontend
./node_modules/.bin/vite
```

## 🧪 Testing

To run type checks:
```bash
./node_modules/.bin/tsc --noEmit
cd frontend && ./node_modules/.bin/tsc --noEmit
```
