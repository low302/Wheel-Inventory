#!/bin/bash

echo "🔧 Reorganizing Wheel Inventory Project Structure..."
echo ""

# Create backend directory
echo "Creating backend directory..."
mkdir -p backend

# Move backend files
echo "Moving backend files..."
mv server.js backend/ 2>/dev/null
mv package.json backend/backend-package.json 2>/dev/null
mv Dockerfile backend/backend-Dockerfile 2>/dev/null

# Rename backend package.json
cd backend
mv backend-package.json package.json 2>/dev/null
mv backend-Dockerfile Dockerfile 2>/dev/null
cd ..

# Create frontend directories
echo "Creating frontend directories..."
mkdir -p frontend/src/components
mkdir -p frontend/public

# Move frontend configuration files
echo "Moving frontend configuration files..."
mv nginx.conf frontend/ 2>/dev/null

# Move frontend source files
echo "Moving frontend source files..."
mv App.js frontend/src/ 2>/dev/null
mv App.css frontend/src/ 2>/dev/null
mv index.js frontend/src/ 2>/dev/null
mv index.css frontend/src/ 2>/dev/null

# Move frontend components
echo "Moving frontend components..."
mv LabelModal.js frontend/src/components/ 2>/dev/null
mv WheelForm.js frontend/src/components/ 2>/dev/null
mv WheelList.js frontend/src/components/ 2>/dev/null

# Move frontend public files
echo "Moving frontend public files..."
mv index.html frontend/public/ 2>/dev/null

echo ""
echo "Creating frontend package.json..."
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

echo "Creating frontend Dockerfile..."
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

echo "Creating backend package.json (if needed)..."
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

echo ""
echo "✅ Reorganization complete!"
echo ""
echo "📁 New structure:"
find . -type f \( -name "*.js" -o -name "*.json" -o -name "Dockerfile" \) ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/mnt/*" | sort

echo ""
echo "🎯 Next steps:"
echo "  1. chmod +x start.sh"
echo "  2. ./start.sh"
echo ""
