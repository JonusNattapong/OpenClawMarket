# 🦞 OpenClawMarket

A modern, secure marketplace platform built with Next.js 16, Prisma ORM, and SQLite. Features real-time trading, authentication, wallet management, and comprehensive security measures.

## 🚀 Features

- **🔐 Secure Authentication** - JWT-based session management with rate limiting
- **💰 Digital Wallet** - Deposit, withdraw, and transaction tracking
- **📦 Marketplace** - Buy/sell digital goods with categories and tags
- **🛡️ Security First** - Input sanitization, XSS protection, SQL injection prevention
- **⚡ Real-time** - Live updates and instant transactions
- **🎨 Modern UI** - Responsive design with Tailwind CSS
- **📊 Analytics** - Transaction history and seller reputation

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** SQLite (development), PostgreSQL (production)
- **Styling:** Tailwind CSS
- **Security:** DOMPurify, Rate Limiting, Security Headers

## 📋 Prerequisites

- Node.js 18+
- npm or yarn

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/JonusNattapong/OpenClawMarket.git
   cd OpenClawMarket
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed with demo data
   npm run db:seed
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   ```
   http://localhost:7070
   ```

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:seed      # Seed database
npm run db:studio    # Open Prisma Studio
npm run db:reset     # Reset database

# Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking
npm run security:audit  # Security audit
```

## 🔒 Security Features

- **Input Sanitization** - All user inputs are sanitized with DOMPurify
- **Rate Limiting** - API endpoints protected against abuse (10 req/min)
- **Security Headers** - XSS protection, CSRF prevention, content security
- **SQL Injection Prevention** - Prisma ORM with parameterized queries
- **Authentication** - Secure JWT tokens with httpOnly cookies
- **Password Security** - Strong password requirements and hashing

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── listings/     # Marketplace endpoints
│   │   └── wallet/       # Wallet management
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── context/               # React contexts
├── lib/                   # Utility libraries
│   ├── auth.ts           # Authentication utilities
│   ├── db.ts             # Database client
│   ├── rate-limit.ts     # Rate limiting
│   └── validation.ts     # Input validation
└── data/                  # Static data and types

prisma/
├── schema.prisma         # Database schema
└── seed.ts              # Database seeding
```

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="file:./dev.db"

# Security
JWT_SECRET="your-super-secret-jwt-key"
NODE_ENV="development"

# App
NEXT_PUBLIC_APP_URL="http://localhost:7070"
```

## 🚨 Security Notice

**⚠️ IMPORTANT:** Before deploying to production:

1. **Change JWT_SECRET** to a strong, random secret
2. **Switch to PostgreSQL** for production database
3. **Enable HTTPS** and secure cookies
4. **Configure CORS** properly
5. **Set up monitoring** and logging
6. **Run security audits** regularly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Database powered by [Prisma](https://prisma.io)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Secured with [DOMPurify](https://github.com/cure53/DOMPurify)

---

**🦞 Happy Trading on OpenClawMarket!**
