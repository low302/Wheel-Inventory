# 🚀 Getting Started Guide

## Welcome to the OEM Wheel Inventory System!

This guide will help you get the system up and running in minutes.

---

## ⚡ Quick Start (3 Minutes)

### Step 1: Transfer Files to Your Server
```bash
# Copy the wheel-inventory folder to your server
# You can use SCP, SFTP, or any file transfer method
scp -r wheel-inventory/ user@your-server:/home/user/
```

### Step 2: Navigate to Directory
```bash
cd /home/user/wheel-inventory
```

### Step 3: Start Everything
```bash
chmod +x start.sh
./start.sh
```

### Step 4: Access the Application
Open your browser and go to:
```
http://localhost:3000
```
or
```
http://your-server-ip:3000
```

**That's it! You're ready to go! 🎉**

---

## 📚 First-Time Setup Walkthrough

### Prerequisites Check

1. **Install Docker** (if not already installed)
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   # Log out and back in
   ```

2. **Install Docker Compose** (if not already installed)
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install docker-compose-plugin
   ```

3. **Verify Installation**
   ```bash
   docker --version
   docker compose version
   ```

### Detailed Setup Steps

#### 1. Prepare the System
```bash
# Create directory
mkdir -p ~/projects
cd ~/projects

# Upload wheel-inventory folder here
# Either using SCP, Git, or direct file transfer
```

#### 2. Configure (Optional)
```bash
cd wheel-inventory

# Edit docker-compose.yml if you want to change:
# - Database password
# - Port numbers
# - Resource limits

nano docker-compose.yml
```

#### 3. First Run
```bash
# Make start script executable
chmod +x start.sh

# Start the application
./start.sh

# Wait for containers to build and start (2-3 minutes)
```

#### 4. Verify Services
```bash
# Check if all containers are running
docker compose ps

# Should show:
# wheel-inventory-frontend   running
# wheel-inventory-backend    running
# wheel-inventory-db         running
```

#### 5. Test the Application
```bash
# Test backend health
curl http://localhost:5000/api/health

# Should return: {"status":"OK","timestamp":"..."}
```

#### 6. Access the Web Interface
Open browser to: http://localhost:3000

You should see:
- Header: "🚗 OEM Wheel Inventory System"
- Left: "Add New Wheel" form
- Right: "Inventory" list (empty initially)

---

## 🎯 Your First Wheel Entry

### Step-by-Step Tutorial

1. **Open the Application**
   - Go to http://localhost:3000

2. **Fill the Form (Left Side)**
   ```
   Year: 2024
   Make: Subaru (pre-filled)
   Model: Outback
   Wheel Size: 18"
   Offset: +48mm (optional)
   Bolt Pattern: 5x114.3 (pre-filled)
   Condition: Excellent
   Quantity: 4
   Location: Test Storage
   Notes: My first test wheel
   ```

3. **Click "Add to Inventory"**
   - Wait a moment
   - Alert: "Wheel added successfully!"
   - Form clears automatically

4. **View Your Wheel**
   - Right side shows new wheel card
   - SKU automatically generated (e.g., SUB-24-OUTB-18-E-472)
   - All details displayed

5. **Create a Label**
   - Click "🏷️ Label" button
   - Modal opens with 2"x2" label preview
   - Try each action:
     - **Print**: Opens print dialog
     - **Save**: Downloads PNG image
     - **Copy**: Copies to clipboard

6. **Test Search**
   - Type "2024" in search box
   - Your wheel appears
   - Type "Outback" - still appears
   - Clear search to see all

7. **Clean Up Test Data**
   - Click "🗑️ Delete" button
   - Confirm deletion
   - Wheel removed from inventory

**Congratulations! You've completed your first cycle! 🎉**

---

## 🔧 Common Setup Scenarios

### Scenario 1: Running on a Remote Server

```bash
# On your remote server
cd /home/user/wheel-inventory
./start.sh

# Access from your computer
# http://your-server-ip:3000
```

**Note**: Make sure port 3000 is open in your firewall:
```bash
sudo ufw allow 3000/tcp
```

### Scenario 2: Running on Windows Server

1. Install Docker Desktop for Windows
2. Copy wheel-inventory folder to: `C:\Projects\wheel-inventory`
3. Open PowerShell as Administrator
4. Run:
   ```powershell
   cd C:\Projects\wheel-inventory
   docker compose up --build -d
   ```
5. Access: http://localhost:3000

### Scenario 3: Running on macOS

```bash
# Install Docker Desktop for Mac (if not installed)
# Download from: https://www.docker.com/products/docker-desktop

# Navigate to project
cd ~/Projects/wheel-inventory

# Start
./start.sh

# Access
open http://localhost:3000
```

### Scenario 4: Different Port Numbers

If port 3000 is already in use:

1. Edit `docker-compose.yml`:
   ```yaml
   frontend:
     ports:
       - "8080:80"  # Change 3000 to 8080
   ```

2. Restart:
   ```bash
   docker compose down
   docker compose up -d
   ```

3. Access: http://localhost:8080

---

## 🛡️ Security Setup (Production)

### Change Database Password

1. **Edit docker-compose.yml**
   ```yaml
   postgres:
     environment:
       POSTGRES_PASSWORD: YOUR_SECURE_PASSWORD_HERE
   
   backend:
     environment:
       DB_PASSWORD: YOUR_SECURE_PASSWORD_HERE
   ```

2. **Restart services**
   ```bash
   docker compose down -v  # -v removes old database
   docker compose up -d
   ```

### Add Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 3000/tcp
sudo ufw enable

# For production, use reverse proxy with SSL
# Only expose 443 (HTTPS), not 3000
```

### Enable HTTPS (Recommended)

1. Install Nginx on host
2. Configure SSL certificate (Let's Encrypt)
3. Proxy to localhost:3000
4. Change docker-compose.yml to only expose internally

---

## 📊 Monitoring & Maintenance

### View Logs
```bash
# All services
docker compose logs -f

# Just backend
docker compose logs -f backend

# Just database
docker compose logs -f postgres
```

### Check Resource Usage
```bash
docker stats
```

### Backup Database
```bash
# Create backup
docker exec wheel-inventory-db pg_dump -U admin wheel_inventory > backup_$(date +%Y%m%d).sql

# Restore backup
docker exec -i wheel-inventory-db psql -U admin wheel_inventory < backup_20241122.sql
```

### Update Application
```bash
# Pull new code (if using git)
git pull

# Rebuild and restart
docker compose down
docker compose up --build -d
```

---

## 🆘 Troubleshooting

### Problem: Containers won't start

**Solution:**
```bash
# Check logs
docker compose logs

# Remove everything and start fresh
docker compose down -v
docker compose up --build
```

### Problem: Port already in use

**Solution:**
```bash
# Find what's using the port
sudo lsof -i :3000

# Kill the process or change port in docker-compose.yml
```

### Problem: Cannot connect to database

**Solution:**
```bash
# Restart database container
docker compose restart postgres

# Check database logs
docker compose logs postgres

# Verify database is ready
docker exec wheel-inventory-db pg_isready -U admin
```

### Problem: Frontend shows blank page

**Solution:**
```bash
# Check frontend logs
docker compose logs frontend

# Rebuild frontend
docker compose up --build frontend

# Clear browser cache
# Try in incognito mode
```

### Problem: QR codes not generating

**Solution:**
```bash
# Check backend logs
docker compose logs backend

# Verify backend is running
curl http://localhost:5000/api/health

# Restart backend
docker compose restart backend
```

---

## 📱 Next Steps

### Recommended Actions

1. ✅ Add 5-10 test wheels to familiarize yourself
2. ✅ Print a few labels to test your printer
3. ✅ Set up regular database backups
4. ✅ Change default database password
5. ✅ Document your location naming scheme
6. ✅ Train staff on the system

### Advanced Features to Explore

- [ ] Create custom location zones
- [ ] Set up automated backups with cron
- [ ] Add SSL certificate for HTTPS
- [ ] Create inventory reports
- [ ] Export data to spreadsheets
- [ ] Integrate with barcode scanners

---

## 📖 Additional Resources

### Documentation Files
- **README.md** - Complete documentation
- **QUICK_REFERENCE.md** - Common commands
- **DEPLOYMENT_CHECKLIST.md** - Production setup
- **ARCHITECTURE.md** - System design
- **USAGE_EXAMPLES.md** - Real-world scenarios
- **PROJECT_SUMMARY.md** - Overview

### Support

If you run into issues:
1. Check the logs: `docker compose logs -f`
2. Review troubleshooting section above
3. Verify all prerequisites are met
4. Try rebuilding: `docker compose up --build`

---

## 🎉 You're Ready!

The system is now set up and ready for production use. Start adding your OEM wheel inventory and enjoy the streamlined workflow!

### Remember:
- 🔒 Change default passwords in production
- 💾 Set up regular backups
- 📊 Monitor system health
- 📝 Keep inventory updated

**Happy Inventory Managing! 🚗**
