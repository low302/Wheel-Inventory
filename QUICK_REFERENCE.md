# Quick Reference Card

## 🚀 Start the Application

### Option 1: Using the startup script
```bash
./start.sh
```

### Option 2: Using Docker Compose directly
```bash
docker-compose up --build -d
```

## 🌐 Access URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Database**: localhost:5432

## 📝 Common Commands

### View logs
```bash
docker-compose logs -f
```

### Stop application
```bash
docker-compose down
```

### Restart application
```bash
docker-compose restart
```

### View running containers
```bash
docker-compose ps
```

### Access database directly
```bash
docker exec -it wheel-inventory-db psql -U admin -d wheel_inventory
```

## 🔑 Default Database Credentials

- **Database**: wheel_inventory
- **Username**: admin
- **Password**: wheel_secure_pass_2024
- **Port**: 5432

⚠️ **IMPORTANT**: Change these in production!

## 🏷️ Label Specifications

- **Size**: 2" x 2"
- **Format**: PNG image
- **QR Code**: High error correction (Level H)
- **Actions**: Print, Save, Copy to clipboard

## 🆘 Troubleshooting

### Container won't start
```bash
# View logs
docker-compose logs

# Remove all containers and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up --build
```

### Port already in use
Edit `docker-compose.yml` and change port mappings:
- Frontend: Change `3000:80` to `3001:80`
- Backend: Change `5000:5000` to `5001:5000`
- Database: Change `5432:5432` to `5433:5432`

### Database connection failed
```bash
# Restart database container
docker-compose restart postgres

# Check database logs
docker-compose logs postgres
```

## 📊 Database Queries

### View all wheels
```sql
SELECT * FROM wheels ORDER BY created_at DESC;
```

### Count wheels by model
```sql
SELECT model, COUNT(*) as count 
FROM wheels 
GROUP BY model 
ORDER BY count DESC;
```

### Find wheels by condition
```sql
SELECT * FROM wheels WHERE condition = 'Excellent';
```

### Search by year range
```sql
SELECT * FROM wheels WHERE year BETWEEN 2020 AND 2024;
```
