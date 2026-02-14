# WebsiteEmailScrapper Deployment Guide

## Prerequisites

- Docker and Docker Compose installed on your server
- Access to production MySQL database
- Git installed

## Deployment Steps

### 1. Clone the Repository

```bash
git clone https://github.com/ankush2016/ytextractor_com.git
cd ytextractor_com/WebsiteEmailScrapper
```

### 2. Configure Environment Variables

```bash
# Copy the production environment template
cp .env.production.example .env

# Edit the .env file with your production database credentials
nano .env  # or use vim, vi, or any text editor
```

Update the following values in `.env`:

```env
DB_HOST=your-production-db-host.com
DB_USER=your-production-db-user
DB_PASSWORD=your-production-db-password
DB_NAME=ytextractordb_production
```

### 3. Create Checkpoint Directory

```bash
# Create a directory for persistent checkpoint storage
mkdir -p ./checkpoints
```

### 4. Build and Run with Docker Compose

```bash
# Build and start the container in detached mode
docker-compose up -d --build
```

### 5. Monitor Logs

```bash
# View real-time logs
docker-compose logs -f

# View last 100 lines
docker-compose logs --tail=100
```

## Management Commands

### Stop the Scraper

```bash
docker-compose down
```

### Restart the Scraper

```bash
docker-compose restart
```

### View Container Status

```bash
docker-compose ps
```

### Access Container Shell (for debugging)

```bash
docker-compose exec youtube-scraper /bin/sh
```

## Database Configuration

The scraper connects to your MySQL database using the credentials in `.env`. Ensure:

1. **Database exists**: The database specified in `DB_NAME` must exist
2. **Table exists**: The `channels` table must exist with the correct schema
3. **Network access**: Your server can reach the database host
4. **Credentials are correct**: Test the connection before deploying

### Required Table Schema

```sql
CREATE TABLE IF NOT EXISTS channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id VARCHAR(255) NOT NULL,
    channel_name VARCHAR(255),
    website VARCHAR(500),
    email VARCHAR(255) DEFAULT NULL,
    source VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Checkpoint System

The scraper uses a checkpoint system to track progress:

- **Location**: `./checkpoints/` directory (mounted as volume)
- **Purpose**: Allows resuming from the last processed batch if the container restarts
- **Persistence**: Data persists across container restarts

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs

# Verify environment variables
docker-compose config
```

### Database Connection Issues

```bash
# Test database connection from container
docker-compose exec youtube-scraper /bin/sh
# Inside container:
# npm install -g mysql
# mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

### Out of Memory

If the scraper runs out of memory, uncomment the resource limits in `docker-compose.yml`:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.5'
      memory: 2G
```

## Security Best Practices

1. **Never commit `.env` file** - It contains sensitive credentials
2. **Use strong database passwords** - Ensure production credentials are secure
3. **Restrict database access** - Only allow connections from your server's IP
4. **Keep Docker updated** - Regularly update Docker and base images
5. **Monitor logs** - Check for suspicious activity

## Updating the Scraper

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

## Deployment on Coolify

### Option A: Using Docker Compose Build Pack (Recommended)
If you select **Docker Compose** as the Build Pack:
1.  Coolify will automatically use the `docker-compose.yml` file.
2.  Since we defined `volumes: - ./checkpoints:/data/checkpoints` in that file, **Coolify will automatically handle the persistent storage**.
3.  You typically **do not** need to manually configure storage in the UI, as it reads the compose file.

### Option B: Using Dockerfile Build Pack
If you select **Dockerfile** as the Build Pack:
1.  **Environment Variables**: Add your `.env` variables (Database credentials, etc.) in the Coolify UI.
2.  **Persistent Storage (Crucial for Checkpoints)**:
    *   Go to the **Storage** or **Volumes** configuration tab for your service.
    *   Add a new volume.
    *   **Mount Path (inside container)**: `/data/checkpoints`
    *   **Host Path**: Leave empty (for auto-managed volume) or specify a path on the host server.
    *   *Note*: This ensures that `checkpoint.json` is saved to a persistent location and survives container restarts/redeployments.

### Configuring Database Connection (Environment Variables)
To connect to a custom database (e.g., Aiven), you must set these **Environment Variables** in your Coolify Service:

*   `DB_HOST`: Database hostname.
*   `DB_PORT`: Database port (e.g., `26543` for Aiven).
*   `DB_USER`: Database username.
*   `DB_PASSWORD`: Database password.
*   `DB_NAME`: Database name.
*   `DB_SSL`: Set to `true` to enable SSL (Required for Aiven).
*   `CHECKPOINT_DIR`: **Optional**. Defaults to `/data/checkpoints`.

> **Note**: The code has been updated to support custom ports and SSL via these variables.

## Support

For issues or questions, refer to the main repository documentation or create an issue on GitHub.
