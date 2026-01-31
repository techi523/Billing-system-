@echo off
echo Starting backend server...
start cmd /k npm.cmd run dev

echo Waiting for backend to start...
timeout /t 5 >nul

echo Starting frontend server...
cd frontend
start cmd /k pnpm.cmd run dev
cd ..

echo Servers should be running now!
echo Backend: http://localhost:3010
echo Frontend: http://localhost:5173
