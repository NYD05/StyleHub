# StyleHub Deployment Guide

## Overview

This guide provides instructions for deploying the StyleHub fashion sketch sharing platform to a production environment.

## Prerequisites

- Ubuntu 20.04 LTS or newer (or equivalent Linux distribution)
- Python 3.8+
- Node.js 14+
- Nginx
- Systemd (for service management)
- Domain name (optional but recommended)
- SSL certificate (recommended)

## Server Setup

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Required Software

```bash
# Install Python and pip
sudo apt install python3 python3-pip -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt install nginx -y
```

### 3. Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

## Application Deployment

### Backend Deployment

1. **Create Application Directory**

```bash
sudo mkdir -p /var/www/stylehub
sudo chown $USER:$USER /var/www/stylehub
```

2. **Copy Application Files**

```bash
# Copy backend files to server
scp -r backend/* user@your-server:/var/www/stylehub/backend/
```

3. **Install Python Dependencies**

```bash
cd /var/www/stylehub/backend
pip3 install -r requirements.txt
```

4. **Configure Environment Variables**

Create a `.env` file in the backend directory:

```bash
SECRET_KEY=your-random-secret-key-here
DATABASE_URL=/var/www/stylehub/stylehub.db
UPLOAD_FOLDER=/var/www/stylehub/uploads
```

5. **Initialize Database**

```bash
cd /var/www/stylehub/backend
python3 app.py
```

6. **Set Up Gunicorn**

```bash
pip3 install gunicorn
```

Create a systemd service file `/etc/systemd/system/stylehub-backend.service`:

```ini
[Unit]
Description=StyleHub Backend Service
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/stylehub/backend
ExecStart=/usr/local/bin/gunicorn --workers 3 --bind unix:stylehub.sock -m 007 app:app
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl start stylehub-backend
sudo systemctl enable stylehub-backend
```

### Frontend Deployment

1. **Build React Application**

```bash
cd /path/to/react-frontend
npm run build
```

2. **Copy Build Files**

```bash
sudo cp -r dist/* /var/www/stylehub/frontend/
```

## Nginx Configuration

Create an Nginx configuration file `/etc/nginx/sites-available/stylehub`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Frontend static files
    location / {
        root /var/www/stylehub/frontend;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # Backend API
    location /api {
        proxy_pass http://unix:/var/www/stylehub/backend/stylehub.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploaded files
    location /uploads {
        alias /var/www/stylehub/uploads;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/stylehub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## SSL Configuration (Recommended)

Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Obtain SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## File Permissions

Set proper file permissions:

```bash
sudo chown -R www-data:www-data /var/www/stylehub
sudo chmod -R 755 /var/www/stylehub
```

## Monitoring and Logging

### Log Files

- Nginx logs: `/var/log/nginx/`
- Application logs: `/var/log/stylehub/`
- Systemd logs: `journalctl -u stylehub-backend`

### Health Checks

Create a simple health check script:

```bash
#!/bin/bash
# /usr/local/bin/stylehub-health-check.sh

# Check if backend is running
if ! systemctl is-active --quiet stylehub-backend; then
    echo "Backend service is not running"
    systemctl start stylehub-backend
fi

# Check if Nginx is running
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is not running"
    systemctl start nginx
fi
```

Make it executable and add to cron:

```bash
chmod +x /usr/local/bin/stylehub-health-check.sh
crontab -e
# Add this line to run every 5 minutes
*/5 * * * * /usr/local/bin/stylehub-health-check.sh
```

## Backup Strategy

### Database Backup

Create a backup script `/usr/local/bin/stylehub-backup.sh`:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/stylehub"
mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/stylehub/stylehub.db $BACKUP_DIR/stylehub_$DATE.db

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/stylehub/uploads

# Keep only last 7 days of backups
find $BACKUP_DIR -name "stylehub_*.db" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete
```

Schedule backups:

```bash
chmod +x /usr/local/bin/stylehub-backup.sh
crontab -e
# Add this line to run daily at 2 AM
0 2 * * * /usr/local/bin/stylehub-backup.sh
```

## Scaling Considerations

### Horizontal Scaling

For high traffic scenarios:

1. Deploy multiple backend instances behind a load balancer
2. Use a shared database (PostgreSQL) instead of SQLite
3. Store uploaded files in cloud storage (AWS S3, Google Cloud Storage)
4. Use Redis for session storage

### Vertical Scaling

Upgrade server resources:
- CPU: Minimum 2 cores
- RAM: Minimum 4GB
- Storage: SSD with sufficient space for uploads

## Troubleshooting

### Common Issues

1. **Permission Denied Errors**
   - Check file ownership and permissions
   - Ensure www-data user has access to all application files

2. **502 Bad Gateway**
   - Check if backend service is running
   - Verify socket file permissions
   - Check Nginx error logs

3. **404 Not Found**
   - Verify file paths in Nginx configuration
   - Check if static files were copied correctly

4. **Database Connection Issues**
   - Verify database file permissions
   - Check if database file exists and is readable

### Logs

Check logs for troubleshooting:

```bash
# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Application log
sudo journalctl -u stylehub-backend -f

# System log
sudo tail -f /var/log/syslog
```

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   cd /var/www/stylehub/backend
   pip3 install --upgrade -r requirements.txt
   ```

2. **Clear Old Sessions**
   ```sql
   DELETE FROM sessions WHERE expires_at < datetime('now');
   ```

3. **Monitor Disk Space**
   ```bash
   df -h
   ```

### Application Updates

1. Stop services
2. Backup current version
3. Deploy new code
4. Run database migrations (if any)
5. Restart services
6. Verify functionality

## Security Considerations

1. Keep all software updated
2. Use strong passwords and authentication
3. Implement rate limiting
4. Regularly review access logs
5. Use fail2ban for intrusion prevention
6. Regular security audits

## Support

For support, contact:
- Email: support@stylehub.com
- Phone: +1 (555) 123-4567

## Public IP/URL

The application is accessible at: [http://stylehub-demo.example.com](http://stylehub-demo.example.com)

For HTTPS access: [https://stylehub-demo.example.com](https://stylehub-demo.example.com)