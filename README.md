# Website Email Scraper - Deployment Package

This is a complete, production-ready folder with everything needed to deploy the YouTube Email Scraper on AWS or any server.

---

## Contents

- **Dockerfile** - Container definition for Docker
- **docker-compose.yml** - Docker Compose configuration
- **.dockerignore** - Files to exclude from Docker build
- **package.json** - Node.js dependencies
- **scrape_db_channels.js** - Main scraper script
- **.env.example** - Environment variables template
- **README.md** - This file

---

## Quick Start - 3 Steps

### Step 1: Setup Environment

```bash
# Copy example to .env and edit with your database credentials
cp .env.example .env
nano .env
```

Update these with your values:
```env
DB_HOST=your-database-host
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=ytextractordb_local
CHECKPOINT_DIR=/var/lib/youtube-scraper/checkpoints
```

### Step 2: Build Docker Image

```bash
docker build -t youtube-scraper .
```

### Step 3: Run Container

```bash
# Create checkpoint directory
mkdir -p /var/lib/youtube-scraper/checkpoints

# Run with docker-compose (recommended)
docker-compose up -d

# Or run with docker command
docker run -d \
  --name youtube-scraper \
  -v /var/lib/youtube-scraper/checkpoints:/data/checkpoints \
  --env-file .env \
  youtube-scraper

# View logs
docker logs -f youtube-scraper
```

---

## Local Development (Without Docker)

```bash
# 1. Install dependencies
npm install

# 2. Create .env file
cp .env.example .env
# Edit .env with your database credentials

# 3. Create checkpoint directory
mkdir -p /var/lib/youtube-scraper/checkpoints

# 4. Run script
npm start
# or
node scrape_db_channels.js
```

---

## AWS Deployment

### Full Instructions

Read the parent folder's documentation:
- **AWS_DEPLOYMENT_GUIDE.md** - Complete AWS setup guide
- **SERVER_DEPLOYMENT_GUIDE.md** - Server deployment guide
- **DOCKER_CHECKPOINT_GUIDE.md** - Checkpoint persistence guide

### Quick Summary

```bash
# 1. SSH into your AWS EC2 instance
ssh -i "key.pem" ubuntu@your-instance-ip

# 2. Clone repository
git clone your-repo-url
cd your-repo/WebsiteEmailScrapper

# 3. Create checkpoint directory
mkdir -p /var/lib/youtube-scraper/checkpoints

# 4. Configure .env
nano .env

# 5. Start with docker-compose
docker-compose up -d

# 6. Monitor
docker-compose logs -f
```

---

## Checkpoint Persistence

Your progress is saved at: `/var/lib/youtube-scraper/checkpoints/scrape_checkpoint.json`

This file:
- ✅ Persists when container restarts
- ✅ Survives container deletion
- ✅ Can be copied to migrate between servers
- ✅ Contains: lastProcessedId, batchNumber, totalProcessed, totalFound

### View Checkpoint Status

```bash
cat /var/lib/youtube-scraper/checkpoints/scrape_checkpoint.json
```

### Reset Progress (Start Over)

```bash
rm /var/lib/youtube-scraper/checkpoints/scrape_checkpoint.json
docker-compose restart
```

---

## Available Commands

### Docker Compose

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f youtube-scraper

# Restart services
docker-compose restart youtube-scraper

# Follow logs (real-time)
docker-compose logs -f
```

### Docker Commands

```bash
# Build image
docker build -t youtube-scraper .

# Run container
docker run -d --name youtube-scraper -v /var/lib/youtube-scraper/checkpoints:/data/checkpoints --env-file .env youtube-scraper

# View logs
docker logs -f youtube-scraper

# Stop container
docker stop youtube-scraper

# Start container
docker start youtube-scraper

# View running containers
docker ps

# Remove container
docker rm youtube-scraper
```

### Direct Node.js (Local Development)

```bash
# Install dependencies
npm install

# Run script
npm start

# Run with PM2
pm2 start scrape_db_channels.js --name youtube-scraper
pm2 logs youtube-scraper
pm2 stop youtube-scraper
```

---

## Directory Structure

```
WebsiteEmailScrapper/
├── Dockerfile                    # Docker container definition
├── docker-compose.yml            # Docker Compose config
├── .dockerignore                 # Files to exclude from Docker
├── package.json                  # Node.js dependencies
├── scrape_db_channels.js         # Main scraper script
├── .env.example                  # Example environment variables
└── README.md                     # This file
```

---

## What This Script Does

**Scrapes YouTube Channels for Email Addresses:**

1. ✅ Reads YouTube channel IDs from MySQL database
2. ✅ Visits each channel's "About" page
3. ✅ Extracts email addresses from:
   - YouTube page text
   - Channel description
   - Contact links
   - Websites linked from channel
4. ✅ Saves emails to database with source info
5. ✅ Resumes from checkpoint on restart
6. ✅ Processes in batches of 50 channels

**Progress Tracking:**
- Automatic checkpoint after each batch
- Survives server crashes/restarts
- Easy migration between servers

---

## Environment Variables

Required:
- `DB_HOST` - MySQL database host
- `DB_USER` - MySQL database user
- `DB_PASSWORD` - MySQL database password
- `DB_NAME` - MySQL database name

Optional:
- `CHECKPOINT_DIR` - Where to save progress file (default: ~/.youtube-scraper-data)

---

## Troubleshooting

### Database Connection Error

```bash
# Verify credentials
cat .env

# Test connection
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME

# Check from inside docker
docker exec youtube-scraper mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

### Permission Denied on Checkpoint

```bash
# Fix permissions
sudo chown $USER:$USER /var/lib/youtube-scraper/checkpoints
chmod 755 /var/lib/youtube-scraper/checkpoints
```

### Container Won't Start

```bash
# Check logs
docker logs youtube-scraper

# Run in foreground to see errors
docker run -it --env-file .env youtube-scraper
```

### Out of Memory

```bash
# Check resource usage
docker stats youtube-scraper

# Set memory limits in docker-compose.yml
# See comments in docker-compose.yml for limits section
```

---

## Production Best Practices

✅ **Use docker-compose** - Easier management  
✅ **Set up regular backups** - Backup checkpoint file daily  
✅ **Monitor logs** - Use `docker-compose logs -f`  
✅ **Use absolute paths** - Checkpoint directory on persistent storage  
✅ **Network drive** - For multi-server deployments  
✅ **Set resource limits** - In docker-compose.yml  

---

## Deployment Options

### Option 1: AWS EC2 + Docker (Recommended)
- Easy to scale
- Auto-restart on failure  
- Pay-as-you-go pricing

### Option 2: Local Server + PM2
- Direct Node.js execution
- No Docker overhead
- Full system access

### Option 3: Multi-Server + Network Drive
- Checkpoint on shared storage
- Easy migration
- High availability

---

## Support & Documentation

For more details, see:
- **../AWS_DEPLOYMENT_GUIDE.md** - AWS setup guide
- **../DOCKER_CHECKPOINT_GUIDE.md** - Checkpoint system details
- **../DOCKER_SETUP.md** - Docker configuration details
- **../CHECKPOINT_GUIDE.md** - Checkpoint reference

---

## File Size & Disk Space

- **Docker image:** ~500MB
- **Checkpoint file:** ~1KB (after each batch)
- **Logs:** ~10MB per 1000 channels
- **Recommended space:** 50GB minimum

---

## Performance Notes

- **Batch size:** 50 channels per batch
- **Process time:** ~5-10 minutes per batch
- **Memory usage:** ~500MB - 1GB
- **CPU usage:** 1-2 cores

---

## Next Steps

1. Copy `.env.example` to `.env`
2. Edit `.env` with your credentials
3. Run `docker-compose up -d`
4. Monitor with `docker-compose logs -f`
5. Check progress in checkpoint file

Good luck! 🚀
