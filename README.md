# 🔒 Transaction Auth System

A secure backend service for financial transactions featuring **role-based access**, **audit trails**, and **two-factor authentication (2FA)**.

### 🚀 Quick Start

```bash
# Pull the latest image
docker pull aditiib/transactionauthsystem-app:latest

# Run the container
docker run -d -p 3000:3000 \
  -e MONGODB_URI=your_mongodb_uri \
  -e JWT_SECRET=your_jwt_secret \
  aditiib/transactionauthsystem-app:latest
```

### 📋 Features
🔑 Role-based Access Control
🔐 Two-Factor Authentication (2FA)
💸 High-value Transaction Approval
🧾 Audit Logging
🪪 JWT Security
🚦 Rate Limiting

### Tech Stack
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT
- Docker

### Run directly

```bash
docker run -d -p 3000:3000 aditiib/transactionauthsystem-app:latest
```
