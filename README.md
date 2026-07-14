# MechBazar

MechBazar is a quick-commerce mobile and web platform for purchasing automotive spare parts.

## Folder Structure
- `apps/customer-app`: React Native Mobile App for customers.
- `apps/delivery-app`: React Native Mobile App for delivery partners.
- `apps/admin-panel`: React + Vite web dashboard for admins.
- `apps/vendor-panel`: React + Vite web dashboard for vendors.
- `backend`: Node.js + Express + Prisma + Socket.io.
- `shared`: Shared TypeScript types and utilities.

## Prerequisites
- Node.js v16+
- Docker & Docker Compose
- PostgreSQL and Redis (can be spun up via Docker Compose)

## Setup and Running
1. Run `docker-compose up -d` to start database services.
2. Run `npm install` at the root directory to install workspaces.
3. Configure `.env` in `backend` based on template.
4. Run migrations: `npm run db:migrate`
5. Seed database: `npm run db:seed`
6. Start backend: `npm run dev:backend`
7. Start dashboards: `npm run dev:admin` / `npm run dev:vendor`
