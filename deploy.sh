#!/bin/bash

echo "🚀 ParkPass Firebase Deployment Script"
echo "========================================"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null; then
    echo "🔑 Please login to Firebase:"
    firebase login
fi

# Build the application
echo "🔨 Building application..."
if npm run build; then
    echo "✅ Build successful"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi

# Deploy to Firebase
echo "🌐 Deploying to Firebase..."
firebase deploy --only hosting

echo "✅ Deployment complete! Check Firebase Console for your live URL."