# 🚗 OEM Wheel Inventory System

A modern, full-stack web application for managing OEM wheel inventory with QR code generation and label printing capabilities. Designed specifically for Subaru OEM wheels (2019-2026).

## 🌟 Features

- **Modern React Frontend**: Clean, responsive UI with gradient design
- **Persistent Storage**: PostgreSQL database for reliable data storage
- **SKU Generation**: Automatic SKU generation based on wheel specifications
- **QR Code Integration**: Generate QR codes for each wheel
- **Label Printing**: Create 2"x2" printable labels with wheel info and QR codes
- **Search Functionality**: Quick search across SKU, model, year, and location
- **Docker Compose**: Easy deployment with containerized architecture

## 🏗️ Architecture

- **Frontend**: React 18 with modern hooks and functional components
- **Backend**: Node.js with Express
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose

## 📋 Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- 2GB free RAM
- 5GB free disk space

## 🚀 Quick Start

### 1. Clone or Download

```bash
cd wheel-inventory
```

### 2. Build and Start

```bash
docker-compose up --build
```

This will:
- Build the frontend and backend images
- Start PostgreSQL database
- Initialize the database schema
- Start all services

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432

## 🔧 Configuration

### Environment Variables

Backend environment variables (configured in `docker-compose.yml`):

```yaml
DB_HOST: postgres
DB_PORT: 5432
DB_NAME: wheel_inventory
DB_USER: admin
DB_PASSWORD: wheel_secure_pass_2024
PORT: 5000
```

### Changing Database Password

1. Edit `docker-compose.yml`
2. Update `POSTGRES_PASSWORD` and `DB_PASSWORD`
3. Rebuild: `docker-compose up --build`

## 📖 Usage Guide

### Adding a Wheel

1. Fill out the form on the left side:
   - Year (required)
   - Make (Subaru - preset)
   - Model (required)
   - Wheel Size (required)
   - Offset (optional)
   - Bolt Pattern (default: 5x114.3)
   - Condition (required)
   - Quantity (default: 1)
   - Location (optional)
   - Notes (optional)

2. Click "Add to Inventory"
3. A unique SKU will be generated automatically
4. QR code is created and stored with the wheel

### SKU Format

Format: `SUB-YY-MODEL-SIZE-COND-XXX`

Example: `SUB-24-OUTB-18-E-247`
- SUB: Subaru (make code)
- 24: Year (2024)
- OUTB: Model (Outback)
- 18: Wheel size (18")
- E: Condition (Excellent)
- 247: Random identifier

### Viewing and Printing Labels

1. Click the "🏷️ Label" button on any wheel card
2. A modal opens showing the 2"x2" label preview
3. Options:
   - **Print**: Direct print to printer
   - **Save**: Download as PNG image
   - **Copy**: Copy to clipboard

### Searching Inventory

Use the search box to filter wheels by:
- SKU
- Make/Model
- Year
- Location

## 🛠️ Development

### Local Development (without Docker)

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**Database:**
Set up PostgreSQL locally and update connection settings.

### Project Structure

```
wheel-inventory/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js
│       ├── App.css
│       ├── index.js
│       ├── index.css
│       └── components/
│           ├── WheelForm.js
│           ├── WheelList.js
│           └── LabelModal.js
└── README.md
```

## 🔌 API Endpoints

- `GET /api/health` - Health check
- `GET /api/wheels` - Get all wheels
- `GET /api/wheels/:id` - Get wheel by ID
- `GET /api/wheels/sku/:sku` - Get wheel by SKU
- `POST /api/wheels` - Add new wheel
- `PUT /api/wheels/:id` - Update wheel
- `DELETE /api/wheels/:id` - Delete wheel
- `GET /api/wheels/search/:query` - Search wheels

## 🐳 Docker Commands

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# Rebuild containers
docker-compose up --build

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Access PostgreSQL
docker exec -it wheel-inventory-db psql -U admin -d wheel_inventory
```

## 🗄️ Database Schema

```sql
CREATE TABLE wheels (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  year INTEGER NOT NULL,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  wheel_size VARCHAR(20) NOT NULL,
  offset VARCHAR(20),
  bolt_pattern VARCHAR(20),
  condition VARCHAR(50) NOT NULL,
  quantity INTEGER DEFAULT 1,
  location VARCHAR(100),
  notes TEXT,
  qr_code TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔒 Security Notes

- Change default database password in production
- Use environment variables for sensitive data
- Consider adding authentication for production use
- Enable HTTPS in production environments

## 🐛 Troubleshooting

### Port Conflicts
If ports 3000, 5000, or 5432 are in use:
1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres
```

### Frontend Not Loading
```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild frontend
docker-compose up --build frontend
```

## 📝 License

This project is provided as-is for use with OEM wheel inventory management.

## 🤝 Support

For issues or questions, check the logs:
```bash
docker-compose logs -f
```

## 🎯 Future Enhancements

- User authentication and authorization
- Multiple location support
- Inventory reports and analytics
- Barcode scanner integration
- Export to CSV/Excel
- Photo upload for wheels
- Low stock alerts
- Transaction history

---

Made with ❤️ for efficient wheel inventory management
