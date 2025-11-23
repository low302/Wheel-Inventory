#!/bin/bash

echo "🔧 Complete Fix for Wheel Inventory Project"
echo "==========================================="
echo ""

cd /Users/zaidalia/documents/GitHub/Wheel-Inventory

# Create directories if they don't exist
echo "📁 Creating directory structure..."
mkdir -p backend
mkdir -p frontend/src/components
mkdir -p frontend/public

# Fix Backend Dockerfile
echo "📝 Creating correct backend Dockerfile..."
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
EOF

# Fix Frontend Dockerfile
echo "📝 Creating correct frontend Dockerfile..."
cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Move backend files if they're in root
echo "📦 Organizing backend files..."
[ -f "server.js" ] && mv server.js backend/ 2>/dev/null
[ -f "backend-package.json" ] && mv backend-package.json backend/package.json 2>/dev/null

# Create backend package.json
echo "📝 Creating backend package.json..."
cat > backend/package.json << 'EOF'
{
  "name": "wheel-inventory-backend",
  "version": "1.0.0",
  "description": "Backend for OEM Wheel Inventory System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "cors": "^2.8.5",
    "qrcode": "^1.5.3",
    "dotenv": "^16.3.1",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# Move frontend files if they're in root
echo "📦 Organizing frontend files..."
[ -f "nginx.conf" ] && mv nginx.conf frontend/ 2>/dev/null
[ -f "App.js" ] && mv App.js frontend/src/ 2>/dev/null
[ -f "App.css" ] && mv App.css frontend/src/ 2>/dev/null
[ -f "index.js" ] && mv index.js frontend/src/ 2>/dev/null
[ -f "index.css" ] && mv index.css frontend/src/ 2>/dev/null
[ -f "index.html" ] && mv index.html frontend/public/ 2>/dev/null
[ -f "LabelModal.js" ] && mv LabelModal.js frontend/src/components/ 2>/dev/null
[ -f "WheelForm.js" ] && mv WheelForm.js frontend/src/components/ 2>/dev/null
[ -f "WheelList.js" ] && mv WheelList.js frontend/src/components/ 2>/dev/null

# Create frontend package.json
echo "📝 Creating frontend package.json..."
cat > frontend/package.json << 'EOF'
{
  "name": "wheel-inventory-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "axios": "^1.6.0",
    "react-qr-code": "^2.0.12",
    "html2canvas": "^1.4.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  }
}
EOF

# Create nginx.conf if missing
if [ ! -f "frontend/nginx.conf" ]; then
    echo "📝 Creating nginx.conf..."
    cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
fi

echo ""
echo "✅ Fix complete!"
echo ""
echo "📁 Verifying structure..."
echo ""

# Verify backend
if [ -f "backend/Dockerfile" ] && [ -f "backend/package.json" ] && [ -f "backend/server.js" ]; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: Missing files"
    [ ! -f "backend/Dockerfile" ] && echo "   Missing: backend/Dockerfile"
    [ ! -f "backend/package.json" ] && echo "   Missing: backend/package.json"
    [ ! -f "backend/server.js" ] && echo "   Missing: backend/server.js"
fi

# Verify frontend
if [ -f "frontend/Dockerfile" ] && [ -f "frontend/package.json" ] && [ -f "frontend/nginx.conf" ]; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: Missing files"
    [ ! -f "frontend/Dockerfile" ] && echo "   Missing: frontend/Dockerfile"
    [ ! -f "frontend/package.json" ] && echo "   Missing: frontend/package.json"
    [ ! -f "frontend/nginx.conf" ] && echo "   Missing: frontend/nginx.conf"
fi

if [ -f "frontend/src/App.js" ] && [ -f "frontend/public/index.html" ]; then
    echo "✅ Frontend source: OK"
else
    echo "❌ Frontend source: Missing files"
    [ ! -f "frontend/src/App.js" ] && echo "   Missing: frontend/src/App.js"
    [ ! -f "frontend/public/index.html" ] && echo "   Missing: frontend/public/index.html"
fi

echo ""
echo "🎯 Next steps:"
echo "   chmod +x start.sh"
echo "   ./start.sh"
echo ""
