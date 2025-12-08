# BeatMatch Server - Environment Variables Setup

## Required Environment Variables

To run this server, you need to create a `.env` file in the `Server` directory with the following variables:

### Cloudinary (Image/Video Storage)
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
Get these from: https://cloudinary.com/

### JWT Secret
```
JWT_SECRET=your_secret_key_for_jwt_tokens
```
Use a strong random string (e.g., generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

### MongoDB Connection
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority&appName=YourApp
```
Get this from: https://www.mongodb.com/atlas

### PayPal Configuration
```
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
PAYPAL_ENV=sandbox
```
Get these from: https://developer.paypal.com/

### Frontend URL
```
FRONTEND_URL=http://localhost:5173
```
Change this to your production URL when deploying

### Server Port
```
PORT=3000
```

## Setup Instructions

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in all the required values in `.env`

3. Make sure `.env` is in `.gitignore` (already configured)

4. Never commit `.env` file to Git!

## Security Notes

- ⚠️ Never share your `.env` file
- ⚠️ Never commit credentials to Git
- ⚠️ Use different credentials for development and production
- ⚠️ Rotate your secrets regularly
