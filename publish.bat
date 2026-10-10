@echo off
rem Publishes this folder to GitHub Pages.
rem
rem The first run creates a PUBLIC repository for the press kit, pushes everything in this
rem folder to it and switches GitHub Pages on, after asking. Every run after that commits
rem whatever has changed and pushes it; the live page follows a minute or two later.
rem
rem Needs git and the GitHub CLI (gh), signed in with: gh auth login

setlocal
set REPO=loot-tower-press

cd /d "%~dp0"

where git >nul 2>nul
if errorlevel 1 (
	echo Git was not found on PATH.
	pause
	exit /b 1
)

where gh >nul 2>nul
if errorlevel 1 (
	echo The GitHub CLI was not found on PATH. Install it from https://cli.github.com
	pause
	exit /b 1
)

set OWNER=
for /f "usebackq delims=" %%u in (`gh api user --jq .login 2^>nul`) do set OWNER=%%u
if not defined OWNER (
	echo Not signed in to GitHub. Run this first:  gh auth login
	pause
	exit /b 1
)

rem This folder is its own small repository, separate from the game's.
if not exist ".git" git init -q -b main

git add -A
git diff --cached --quiet
if errorlevel 1 (
	git commit -q -m "Update press kit"
	if errorlevel 1 goto failed
) else (
	echo Nothing has changed since the last publish.
)

gh repo view %OWNER%/%REPO% >nul 2>nul
if errorlevel 1 goto create
goto push

:create
echo.
echo This will create a PUBLIC repository at github.com/%OWNER%/%REPO%
echo and put everything in this folder on the web.
choice /c YN /m "Continue"
if errorlevel 2 exit /b 0

gh repo create %REPO% --public --source . --remote origin --push --description "Loot Tower press kit"
if errorlevel 1 goto failed

gh api -X POST "repos/%OWNER%/%REPO%/pages" -f "source[branch]=main" -f "source[path]=/" >nul
if errorlevel 1 (
	echo.
	echo The files are up, but GitHub Pages could not be switched on from here.
	echo Turn it on by hand: the repository's Settings, then Pages, then branch "main".
)
goto done

:push
git remote get-url origin >nul 2>nul
if errorlevel 1 git remote add origin https://github.com/%OWNER%/%REPO%.git
git push -u origin main
if errorlevel 1 goto failed

:done
echo.
echo Published. The page updates a minute or two after a push:
echo   https://%OWNER%.github.io/%REPO%/
pause
exit /b 0

:failed
echo.
echo That did not go through. The message from git or gh just above says why.
pause
exit /b 1
