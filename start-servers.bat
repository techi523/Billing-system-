@echo off
echo Starting backend server...
cd /d c:\Users\samtech\billing
start cmd /k npm run dev

echo Waiting for backend to start...
timeout /t 5 >nul

echo Starting frontend server...
cd /d c:\Users\samtech\billing\frontend
start cmd /k npm run dev

echo Servers should be running now!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173