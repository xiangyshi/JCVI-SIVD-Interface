# Installation Log - Node.js and npm Setup

## System Information
- **OS**: Amazon Linux 2023.8.20250715
- **Platform**: AWS EC2 (platform:al2023)
- **Architecture**: x86_64
- **Date**: Wed Aug 13 05:22:05 UTC 2025
- **User**: ec2-user

## Pre-Installation Status
- **Node.js**: Not installed
- **npm**: Not installed
- **Package Manager**: yum/dnf (Amazon Linux)

## Installation Steps

### Step 1: System Update
```bash
sudo yum update -y
```

### Step 2: Install Node.js and npm via NodeSource Repository
Using the official NodeSource repository for the latest LTS version.

```bash
# Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -

# Install Node.js (includes npm)
sudo yum install -y nodejs
```

### Alternative Method (if needed): Using Amazon's Package Manager
```bash
# Alternative using Amazon's built-in packages
sudo yum install -y nodejs npm
```

## Installation Verification
After installation, the following commands will verify successful installation:

```bash
node --version
npm --version
which node
which npm
```

## Project Dependencies Installation
Once npm is available, install project dependencies:

```bash
cd /data/zqjd/zqjd77/server
npm install
```

This will install the following packages as defined in package.json:

### Production Dependencies:
- **express**: ^4.18.2 - Web framework for Node.js
- **multer**: ^1.4.5-lts.1 - Middleware for handling multipart/form-data
- **cors**: ^2.8.5 - CORS middleware for Express

### Development Dependencies:
- **nodemon**: ^3.0.2 - Utility for auto-restarting server during development

## Expected Package Tree
After installation, npm will create the following structure:

```
server/
├── node_modules/
│   ├── express/
│   ├── multer/
│   ├── cors/
│   ├── nodemon/
│   └── [many other dependency packages]
├── package.json
└── package-lock.json (created after install)
```

## Installed Package Versions

### System Level:
- **Node.js**: v22.18.0 (LTS) - /usr/bin/node
- **npm**: 10.9.3 - /usr/bin/npm

### Project Dependencies (Direct):
- **express**: 4.21.2 - Web framework for Node.js
- **multer**: 1.4.5-lts.2 - Middleware for handling multipart/form-data  
- **cors**: 2.8.5 - CORS middleware for Express
- **nodemon**: 3.1.10 - Utility for auto-restarting server during development

### Total Packages Installed:
- **Direct dependencies**: 4 packages
- **Total packages (including transitive)**: 118 packages
- **No security vulnerabilities found**

## Installation Commands History
All commands executed during installation:

```bash
# 1. System check
cat /etc/os-release
which node  # (not found initially)
which npm   # (not found initially)

# 2. Add NodeSource repository
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -

# 3. Install Node.js (includes npm)
sudo dnf install nodejs -y

# 4. Verify installation
node --version    # v22.18.0
npm --version     # 10.9.3
which node        # /usr/bin/node
which npm         # /usr/bin/npm

# 5. Install project dependencies
cd /data/zqjd/zqjd77/server
npm install

# 6. Verify project setup
npm list --depth=0
node -e "console.log('Node.js is working! Version:', process.version)"
```

## Troubleshooting Notes
Common issues and solutions:

1. **Permission Errors**: Use sudo for system-wide installation
2. **Repository Issues**: Ensure internet connectivity
3. **Version Conflicts**: Use specific version if needed

## Post-Installation Testing
Commands to verify everything works:

```bash
# Test Node.js
node -e "console.log('Node.js is working!')"

# Test npm
npm --help

# Test server startup
cd /data/zqjd/zqjd77/server
npm start
```

## Security Considerations
- Node.js installed with appropriate permissions
- npm packages from trusted sources only
- Regular updates recommended

---

**Installation Status**: ✅ COMPLETED SUCCESSFULLY
**Last Updated**: Wed Aug 13 05:22:05 UTC 2025

## Installation Summary
- ✅ Node.js v22.18.0 LTS installed via NodeSource repository
- ✅ npm 10.9.3 installed automatically with Node.js
- ✅ 118 packages installed with no security vulnerabilities
- ✅ File upload server dependencies ready
- ✅ Installation verified and tested
