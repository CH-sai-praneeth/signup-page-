# SmartClaim - AI-Powered Insurance Claims Maximization
Maximize your insurance claim payouts with AI-driven damage analysis and strategic estimates.

## Features
- **OAuth Authentication** - Login with Google, Facebook, or GitHub
- **Property Analysis** - Upload damage photos and property information
- **PDF Document Parsing** - Auto-extract property details from uploaded documents
- **PayPal Payment Integration** - Secure payment processing

## Tech Stack
**Frontend:** React, JavaScript, CSS  
**Backend:** Node.js, Express  
**Database:** MongoDB  
**Authentication:** OAuth 2.0 (Google, Facebook, GitHub), JWT  
**Payment:** PayPal API  

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/smartclaim.git
cd smartclaim
```

2. Install backend dependencies
```bash
cd backend
npm install
```

3. Install frontend dependencies
```bash
cd ../frontend
npm install
```

4. Configure environment variables
Create `backend/.env`:
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3001
MONGODB_URI=mongodb://localhost:27017/oauth
JWT_SECRET=ve4H/bmINPq0JrqKlA6sD2/2zaBuP0QsmCqsWJiDiQA=
JWT_EXPIRES_IN=3d
GOOGLE_CLIENT_ID=1007726813240-46bb13joou4dvt4e2erduiaacs71e1no.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
FACEBOOK_CLIENT_ID=1882194205666803
FACEBOOK_CLIENT_SECRET=911284fcf8a4bb0abc44072c1413a14b
GITHUB_CLIENT_ID=Ov23liNRkJYwiqQiEfLJ
GITHUB_CLIENT_SECRET=289655a6c8b79b25b08629af7c726a9225a13dca
PAYPAL_CLIENT_ID=ASGSUqeoY7OIf5WxzLKO9ph3HwYv0dVjsQ7e5SWUuMBNJUJdTOC9WjIcjP4oE3lAvaQEXCNpUfyYm8Q0 
PAYPAL_CLIENT_SECRET=ELkuUR-96_PkYC64TfUOiucT3sExHaXTjXpcWxL2jSgppMi8xe7BanYY_Z26FmuPu7e_9aUaKFvHlHeQ 
PAYPAL_MODE=sandbox 
```

Create `frontend/.env`:
```env
REACT_APP_BACKEND_URL=http://localhost:3001
```

5. Start MongoDB
```bash
mongod
```

6. Run the application
```bash
# for Backend
cd backend
npm start
# for Frontend
cd frontend
npm start

## Project Status
**Current Status:**

**Completed:**
- ✅ OAuth authentication
- ✅ Property form with PDF parsing
- ✅ PayPal payment integration
- ✅ User profile system
- ✅ Payment status notifications
