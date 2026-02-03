# Environment Variables Setup Guide

## Database Configuration

### SQLite (Development - Current)
```
DATABASE_URL=file:./dev.db
```

### PostgreSQL (Production)
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
DB_USER=ocm_user
DB_PASSWORD=your_secure_password
DB_NAME=openclawmarket
DB_HOST=localhost
DB_PORT=5432
```

## Authentication

```
JWT_SECRET=your-random-32-character-secret-key-here
SESSION_TIMEOUT=24
COOKIE_SECURE=true
COOKIE_HTTP_ONLY=true
COOKIE_SAME_SITE=Lax
```

## Payment Processing

**Stripe (Optional for Development)**
- Get keys from: https://dashboard.stripe.com/apikeys
- Set: `STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`
- Configure webhook: Set `STRIPE_WEBHOOK_SECRET`

**Cryptocurrency (Optional)**
- Use Coinbase Commerce or NOWPayments
- Set corresponding API keys

## Email (Optional)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-specific-password
SMTP_FROM_NAME=OpenClawMarket
SMTP_FROM_EMAIL=noreply@openclawmarket.com
```

## Application Settings

```
NODE_ENV=development|staging|production
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## Security

```
RATE_LIMIT_REQUESTS=10
RATE_LIMIT_WINDOW=60000
ALLOWED_ORIGINS=https://yourdomain.com
```

## Cache

```
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
CACHE_TTL=3600
```

## Monitoring (Optional)

```
SENTRY_DSN=https://your-sentry-dsn@sentry.io/projectid
DATADOG_API_KEY=your-datadog-key
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

## Setup Instructions

### Local Development
```
cp .env.example .env.local
# Edit .env.local with your settings
```

### Docker Development
```
cp .env.example .env.docker
# Edit .env.docker with your settings
docker-compose up
```

### Production
- Use environment management system of your hosting platform
- Vercel: Settings → Environment Variables
- AWS: Systems Manager Parameter Store or Secrets Manager
- DigitalOcean: App Platform Environment Variables

## Security Notes

⚠️ **Never commit .env files!** Use .env.example as template only.

🔐 **Generate strong secrets:**
```bash
# JWT_SECRET
openssl rand -base64 32

# DB_PASSWORD
openssl rand -base64 24

# API Keys
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment guides.
