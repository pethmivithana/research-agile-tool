# Cleanup Guide - Files to Remove

## Overview

This document lists all files that should be removed as they are no longer needed or were part of the old Node.js implementation.

## Files to Remove

### Docker-Related Files (if present)
Since the requirement is "don't use docker", these should not exist or should be removed:
- [ ] `Dockerfile`
- [ ] `docker-compose.yml`
- [ ] `.dockerignore`
- [ ] `docker/` directory (if it exists)

### Environment Files (Keep .env.example only)
Remove any actual `.env` files with sensitive data:
- [ ] `backend/.env` (but keep `backend/.env.example`)
- [ ] `ml-service/.env` (but keep `ml-service/.env.example`)
- [ ] `frontend/.env` (but keep `frontend/.env.local.example`)
- [ ] `.env` (in root)

### Old Node.js Backend Files (if they exist)
If there's an old Node.js backend directory:
- [ ] `nodejs-backend/` directory (entire folder)
- [ ] `server/` directory (if it was Node.js backend)
- [ ] `src/server/` (if old backend)
- [ ] `backend-old/` or similar
- [ ] Any files with names like `server.js`, `app.js`, `index.js` in root

### Old TypeScript/JavaScript Backend Files
- [ ] `backend.json`
- [ ] `tsconfig.backend.json`
- [ ] `.eslintrc` (if was for backend only)

### Summary/Text Files (except official docs)
Keep only official documentation:
- [ ] `summary.md` (if exists)
- [ ] `SUMMARY.md`
- [ ] `notes.md`
- [ ] Any ad-hoc `.md` files that are not part of official docs

**Keep these official docs:**
- ✅ `SETUP.md` - Setup instructions
- ✅ `INTEGRATION_GUIDE.md` - Integration details
- ✅ `FILES_CHANGED.md` - Changes documentation
- ✅ `QUICK_START.md` - Quick start guide
- ✅ `CLEANUP_GUIDE.md` - This file
- ✅ `README.md` - Project readme (if relevant)

### Temporary/Cache Files
These are usually auto-generated and safe to delete:
- [ ] `__pycache__/` directories (in backend and ml-service)
- [ ] `.pytest_cache/`
- [ ] `.coverage` or coverage files
- [ ] `*.pyc` files
- [ ] `node_modules/` in frontend (can be reinstalled with `npm install`)
- [ ] `dist/` in frontend (will be regenerated with `npm run build`)
- [ ] `.next/` (if Next.js was used)

### Build Artifacts
- [ ] `build/` directory
- [ ] `dist/` in root (if any)
- [ ] Any `.o`, `.so`, or compiled binary files

### Log Files
- [ ] `*.log`
- [ ] `logs/` directory
- [ ] `.log` files anywhere

### IDE/Editor Files
Can be deleted or ignored via `.gitignore`:
- [ ] `.vscode/` (personal settings)
- [ ] `.idea/` (IntelliJ)
- [ ] `*.swp` (Vim swap files)
- [ ] `.DS_Store` (macOS)
- [ ] `Thumbs.db` (Windows)

### Lock Files (Usually OK to Keep)
These can be kept for reproducibility:
- ✅ `package-lock.json` (keep)
- ✅ `poetry.lock` (if using Poetry, keep)

### Old/Backup Files
- [ ] `*.bak`
- [ ] `*.backup`
- [ ] `*.old`
- [ ] `~` files
- [ ] Any file ending in `.tmp`

## Cleanup Commands

### Linux/macOS

```bash
# Remove Docker files
rm -f Dockerfile docker-compose.yml .dockerignore
rm -rf docker/

# Remove .env files (but not .example)
rm -f backend/.env ml-service/.env frontend/.env frontend/.env.local

# Remove Python cache
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

# Remove node_modules and dist (will rebuild)
rm -rf frontend/node_modules frontend/dist

# Remove log files
find . -name "*.log" -delete 2>/dev/null

# Remove IDE files (optional)
rm -rf .vscode .idea
```

### Windows

```batch
REM Remove Docker files
del Dockerfile docker-compose.yml .dockerignore
rmdir /s /q docker

REM Remove .env files (but not .example)
del backend\.env ml-service\.env frontend\.env frontend\.env.local

REM Remove Python cache
for /d /r . %d in (__pycache__) do @if exist "%d" rmdir /s /q "%d"

REM Remove node_modules and dist
rmdir /s /q frontend\node_modules frontend\dist

REM Remove log files (use everything tool or manually)
```

## Before & After Checklist

### Before Cleanup
- [ ] Backup `.env` files if they have important values
- [ ] Commit all changes to git
- [ ] Verify all services are stopped
- [ ] Note any custom configurations

### After Cleanup
- [ ] Verify project structure is clean
- [ ] Check that `.env.example` files still exist
- [ ] Confirm `.gitignore` includes unnecessary files
- [ ] Test that application still runs:
  - [ ] Backend starts
  - [ ] ML Service starts
  - [ ] Frontend builds
- [ ] Verify git status shows clean tree

## .gitignore Entries

Make sure your `.gitignore` includes:

```
# Environment
.env
.env.local
.env.*.local

# Python
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/
venv/
env/
.pytest_cache/

# Node
node_modules/
npm-debug.log
.npm

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Build
dist/
build/

# Docker (if not using)
Dockerfile
docker-compose.yml
.dockerignore
```

## Optional: Deep Cleanup

If you want an absolutely clean project:

```bash
# Remove all temporary Python environments
rm -rf backend/venv ml-service/venv

# Remove all build artifacts
rm -rf frontend/dist backend/build ml-service/build

# Remove all pycache
find . -type d -name __pycache__ -exec rm -rf {} +

# Clean npm cache
npm cache clean --force
```

**Note**: You'll need to reinstall dependencies after this:
```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# ML Service
cd ml-service && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

## Files to Keep

These are essential and should NOT be deleted:

### Documentation
- ✅ `README.md`
- ✅ `SETUP.md`
- ✅ `QUICK_START.md`
- ✅ `INTEGRATION_GUIDE.md`
- ✅ `FILES_CHANGED.md`
- ✅ `CLEANUP_GUIDE.md`

### Configuration Examples
- ✅ `backend/.env.example`
- ✅ `ml-service/.env.example`
- ✅ `frontend/.env.example`

### Startup Scripts
- ✅ `start-dev.sh`
- ✅ `start-dev.bat`

### Source Code
- ✅ All files in `backend/app/`
- ✅ All files in `ml-service/` (except `.env`)
- ✅ All files in `frontend/src/`

### Configuration Files
- ✅ `backend/requirements.txt`
- ✅ `ml-service/requirements.txt`
- ✅ `frontend/package.json`
- ✅ `frontend/vite.config.js`
- ✅ `backend/main.py`
- ✅ `ml-service/main.py`

### Git Files
- ✅ `.gitignore`
- ✅ `.git/`

## After Cleanup Verification

Run this to verify the cleanup was successful:

```bash
# Check project structure
tree -L 2 -I 'node_modules|venv'

# Check no .env files (without .example)
find . -name '.env' -o -name '.env.local' | grep -v example

# Check essential files exist
ls backend/.env.example
ls ml-service/.env.example
ls frontend/.env.example
ls SETUP.md QUICK_START.md INTEGRATION_GUIDE.md
```

## Troubleshooting Cleanup Issues

### Files won't delete (Windows)
- Close all terminals and IDEs using the directory
- Restart your computer if files still lock
- Use Task Manager to close any processes

### Lost files after cleanup
- Check git history: `git log --oneline`
- Restore: `git checkout <commit>`

### Can't reinstall dependencies
- Delete venv/node_modules completely
- Clear package managers: `npm cache clean --force`
- Reinstall fresh

## Summary

1. **Backup** - Backup `.env` files with important values
2. **Remove** - Delete unnecessary files listed above
3. **Cleanup** - Clear cache and build artifacts
4. **Verify** - Test that app still runs
5. **Commit** - Commit cleanup to git with meaningful message

**Result**: Clean, production-ready codebase with no old files or sensitive data!
