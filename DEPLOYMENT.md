# Deployment Guide

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

**Easiest & Most Reliable**

1. Push code to GitHub
2. Visit https://vercel.com/new
3. Import "JonusNattapong/OpenClawMarket"
4. Add environment variables:
   - DATABASE_URL (use Vercel Postgres)
   - JWT_SECRET
   - STRIPE_PUBLISHABLE_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
5. Set webhook URL: `https://yourproject.vercel.app/api/webhooks/stripe`
6. Deploy!

**Setup Stripe Webhook:**
- Dashboard → Settings → Webhooks
- Add URL: `https://your-project.vercel.app/api/webhooks/stripe`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### Option 2: AWS (Flexible & Scalable)

**Architecture:**
- ECS Fargate (containers)
- RDS PostgreSQL (database)
- ALB (load balancer)
- CloudFront CDN

**Quick Steps:**
1. Create RDS PostgreSQL database
2. Create ECR repository
3. Build & push Docker image
4. Create ECS cluster & service
5. Configure ALB and Route 53
6. Set up SSL with Certificate Manager

### Option 3: DigitalOcean (Affordable & Simple)

**Quick Setup:**
1. Create Droplet (Ubuntu 22.04)
2. Install Node.js & PostgreSQL
3. Clone repo
4. Configure .env.production
5. Use PM2 for process management
6. Configure Nginx as reverse proxy
7. Setup HTTPS with Let's Encrypt

### Option 4: Docker Deployment

**Any Cloud Provider Supporting Containers:**

```bash
# Build image
docker build -t openclawmarket:2.0.0 .

# Run with environment
docker run -d \
  --name openclawmarket \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="your-secret" \
  openclawmarket:2.0.0
```

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker guide.

## Pre-Deployment Checklist

### Application
- [ ] `npm run build` succeeds
- [ ] `npm run lint` has no errors
- [ ] `npm run type-check` passes
- [ ] All tests passing
- [ ] No console errors

### Configuration
- [ ] DATABASE_URL set for production PostgreSQL
- [ ] JWT_SECRET is strong (32+ characters)
- [ ] All payment keys configured (if using Stripe)
- [ ] CORS origins configured correctly
- [ ] Email SMTP configured (if sending notifications)

### Security
- [ ] SSL/HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input validation enabled
- [ ] No hardcoded secrets in code

### Database
- [ ] PostgreSQL configured
- [ ] Migrations run successfully
- [ ] Backups configured
- [ ] Connection pooling set up

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Logging configured
- [ ] Uptime monitoring configured
- [ ] Performance monitoring configured

### DNS & Domain
- [ ] Domain registered
- [ ] DNS records configured
- [ ] SSL certificate valid
- [ ] Email records (SPF, DKIM, DMARC) configured

## Post-Deployment Verification

### Test APIs

```bash
# App is running
curl https://your-domain.com/api/auth/me

# Database connection works
# Check application logs

# Static assets load
curl https://your-domain.com
```

### Security Checks

```bash
# HTTPS enforced
curl -I http://your-domain.com  # Should redirect to HTTPS

# Security headers present
curl -I https://your-domain.com | grep "strict-transport-security"
```

### Functional Tests

- [ ] User registration works
- [ ] User login works
- [ ] Wallet deposit works
- [ ] Stripe payment completes
- [ ] Listing creation works
- [ ] Purchase completion works
- [ ] Transaction history displays

## Environment Variables Reference

See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) for complete variable list.

**Required:**
- DATABASE_URL
- JWT_SECRET

**Payment:**
- STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET

## Scaling Considerations

### When Traffic Increases

1. **Database:**
   - Add read replicas
   - Enable connection pooling
   - Optimize slow queries

2. **Application:**
   - Load balance across instances
   - Cache frequently accessed data (Redis)
   - Use CDN for static assets

3. **Infrastructure:**
   - Auto-scaling groups
   - Regional deployment
   - Regional databases

## Support Resources

- Next.js Deployment: https://nextjs.org/docs/deployment
- Vercel Docs: https://vercel.com/docs
- Docker Documentation: https://docs.docker.com/
- AWS Documentation: https://docs.aws.amazon.com/
- DigitalOcean: https://docs.digitalocean.com/

## Troubleshooting

### Application Won't Start
- Check environment variables
- Check logs: `vercel logs` or `docker logs`
- Ensure database is accessible
- Run `npm run build` locally to test

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check firewall rules
- Ensure database service is running
- Test connection with `psql` command

### Payment Processing Issues
- Verify Stripe keys are correct
- Check webhook URL is accessible
- Review Stripe webhook delivery logs
- Test with Stripe test cards

### High Memory Usage
- Check for memory leaks in logs
- Increase available memory
- Scale horizontally (more instances)
