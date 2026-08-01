---
description: How to deploy the SurfBill application (frontend and backend) to the production server.
---

# Deployment Workflow

Follow these steps to deploy the application to the production server (`154.159.237.49`).

## 1. Build the Frontend
Navigate to the frontend directory and build the production assets.
```powershell
cd frontend
npm run build
```

## 2. Copy Frontend Assets to Server
Copy the generated `dist` folder to the server's web root.
// turbo
```powershell
scp -r frontend/dist/* root@154.159.237.49:/var/www/app
```

## 3. Copy Backend Code to Server
Copy the root `src` directory to the server's backend path.
// turbo
```powershell
scp -r src/* root@154.159.237.49:/root/Billing-System-/src/
```

## 4. Restart Backend via PM2
SSH into the server and restart the backend process.
```powershell
ssh root@154.159.237.49 "pm2 restart billing-system || pm2 start /root/Billing-System-/src/server.ts --interpreter ts-node --name billing-system && pm2 save"
```

## 5. Verify Deployment
Test the API and frontend accessibility.
```powershell
curl http://154.159.237.49/api/test
```
