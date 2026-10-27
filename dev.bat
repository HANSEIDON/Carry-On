@echo off
rem Carry On: start the dev server and open it in the browser.
rem Double-click this file. Close the window (or press Ctrl+C) to stop the server.
rem The phone on the same Wi-Fi can open the "Network:" address it prints.

cd /d "%~dp0"

if not exist node_modules (
  echo Installing packages the first time...
  call npm install || goto :error
)

call npm run dev -- --open --host
goto :eof

:error
echo.
echo Something went wrong. See the messages above.
pause
