# Docker Setup and Deployment Guide

## Quick Start with Docker

### Development Environment

```bash
# Start all services
docker-compose up

# Initialize database (in another terminal)
docker-compose exec app npm run db:push
docker-compose exec app npm run db:seed

# Visit http://localhost:3000
```

### Stop Services

```bash
docker-compose down
```

## Docker Commands Reference

### View Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app

# Follow logs
docker-compose logs -f app
```

### Execute Commands

```bash
# Run npm commands
docker-compose exec app npm run lint

# Database operations
docker-compose exec app npm run db:push
docker-compose exec app npm run db:reset

# Access shell
docker-compose exec app sh
```

### Database Management

```bash
# Backup database
docker-compose exec postgres pg_dump -U ocm_user openclawmarket > backup.sql

# List containers
docker-compose ps

# Remove everything
docker-compose down -v  # Removes data
```

## Production Docker Build

### Build Image

```bash
docker build -t openclawmarket:2.0.0 .
docker tag openclawmarket:2.0.0 yourusername/openclawmarket:latest
```

### Test Image

```bash
docker run -d \
  --name openclawmarket-test \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="test-secret" \
  openclawmarket:2.0.0

curl http://localhost:3000/api/auth/me

docker stop openclawmarket-test
docker rm openclawmarket-test
```

### Push to Docker Hub

```bash
docker login
docker push yourusername/openclawmarket:latest
```

## Environment Variables for Docker

Edit `docker-compose.yml` environment section:

```yaml
environment:
  NODE_ENV: development
  DATABASE_URL: postgresql://ocm_user:ocm_password@postgres:5432/openclawmarket
  JWT_SECRET: your-secret-key
  NEXT_PUBLIC_API_URL: http://localhost:3000
```

## Troubleshooting

### Port Conflict

```bash
# Find process using port 3000
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows
```

### Database Connection Failed

```bash
# Check postgres health
docker-compose ps

# View postgres logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up
```

### Out of Memory

```bash
# Clean up
docker system prune -a

# Remove volumes
docker volume prune
```

## Docker Compose Services

- **postgres** - PostgreSQL database
- **redis** - Redis cache
- **app** - Next.js application

## Files Included

- `docker-compose.yml` - Development setup
- `Dockerfile` - Production image
- `.dockerignore` - Build optimization

See [DEPLOYMENT.md](./DEPLOYMENT.md) for cloud deployment guides.
