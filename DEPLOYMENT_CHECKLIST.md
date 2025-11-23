# Deployment Checklist

## Pre-Deployment

- [ ] Docker installed (version 20.10+)
- [ ] Docker Compose installed (version 2.0+)
- [ ] Ports available: 3000, 5000, 5432
- [ ] At least 2GB RAM available
- [ ] At least 5GB disk space available

## Security (Production)

- [ ] Change database password in `docker-compose.yml`
- [ ] Update `POSTGRES_PASSWORD` environment variable
- [ ] Update `DB_PASSWORD` environment variable
- [ ] Consider adding SSL/TLS for HTTPS
- [ ] Implement user authentication
- [ ] Set up firewall rules
- [ ] Enable Docker security features

## Configuration

- [ ] Review and update environment variables
- [ ] Configure backup strategy for PostgreSQL data
- [ ] Set up monitoring and logging
- [ ] Configure resource limits in docker-compose.yml

## First Run

- [ ] Navigate to project directory
- [ ] Run `./start.sh` or `docker-compose up --build`
- [ ] Verify all containers are running: `docker-compose ps`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Access frontend at http://localhost:3000
- [ ] Test API at http://localhost:5000/api/health
- [ ] Add a test wheel to verify functionality

## Testing

- [ ] Add a wheel to inventory
- [ ] Verify SKU generation
- [ ] Generate and view QR code label
- [ ] Test print functionality
- [ ] Test save label as image
- [ ] Test copy to clipboard
- [ ] Search for wheels
- [ ] Delete a test wheel
- [ ] Verify data persists after container restart

## Backup Strategy

### Manual Backup
```bash
# Backup database
docker exec wheel-inventory-db pg_dump -U admin wheel_inventory > backup.sql

# Restore database
docker exec -i wheel-inventory-db psql -U admin wheel_inventory < backup.sql
```

### Automated Backup (Recommended)
- [ ] Set up cron job for daily backups
- [ ] Store backups in secure location
- [ ] Test restore procedure
- [ ] Document backup/restore process

## Monitoring

- [ ] Set up container health checks
- [ ] Monitor disk space usage
- [ ] Monitor database size
- [ ] Set up alerts for container failures
- [ ] Log rotation configured

## Documentation

- [ ] Share access URLs with team
- [ ] Document custom configurations
- [ ] Create user guide for staff
- [ ] Document backup procedures
- [ ] Create incident response plan

## Post-Deployment

- [ ] Verify system is accessible from network
- [ ] Train users on the system
- [ ] Set up regular maintenance schedule
- [ ] Plan for future enhancements
- [ ] Collect user feedback

## Maintenance Schedule

### Daily
- Check application is running
- Review error logs

### Weekly
- Backup database
- Review disk space usage
- Check for security updates

### Monthly
- Update Docker images
- Review and optimize database
- Test disaster recovery

### Quarterly
- Security audit
- Performance optimization
- Feature updates based on feedback

---

## Quick Commands Reference

Start: `./start.sh` or `docker-compose up -d`
Stop: `docker-compose down`
Logs: `docker-compose logs -f`
Restart: `docker-compose restart`
Status: `docker-compose ps`
