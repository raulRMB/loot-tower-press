@echo off
rem Serves the press kit from this folder and opens it in the default browser.
rem It has to go through a local server: opened straight from disk, some browsers refuse to
rem load the font. Close this window, or press Ctrl+C, to stop.

setlocal
set PORT=8780

where python >nul 2>nul
if errorlevel 1 (
	echo Python was not found on PATH. Install it, or serve this folder some other way.
	pause
	exit /b 1
)

start "" "http://127.0.0.1:%PORT%/"
python -m http.server %PORT% --bind 127.0.0.1 --directory "%~dp0."
