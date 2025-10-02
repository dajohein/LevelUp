#!/usr/bin/env node

// Generate VAPID keys for PWA push notifications
// Run with: node generate-vapid-keys.js

const crypto = require('crypto');

function generateVapidKeys() {
  // Generate a key pair for VAPID
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'der'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'der'
    }
  });

  // Convert to base64url format (required for VAPID)
  const publicKeyBase64 = publicKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  const privateKeyBase64 = privateKey.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return {
    publicKey: publicKeyBase64,
    privateKey: privateKeyBase64
  };
}

console.log('🔐 Generating VAPID Keys for PWA Push Notifications...\n');

try {
  const keys = generateVapidKeys();
  
  console.log('✅ VAPID Keys Generated Successfully!\n');
  console.log('📋 Add these to your environment variables:\n');
  console.log('# .env file');
  console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
  console.log('\n🔒 Keep the private key secret and secure!');
  console.log('📱 The public key goes in your frontend app');
  console.log('🔐 The private key is used on your server for sending push notifications');
  
} catch (error) {
  console.error('❌ Error generating VAPID keys:', error.message);
  console.log('\n💡 Alternative: Use web-push library');
  console.log('npm install -g web-push');
  console.log('web-push generate-vapid-keys');
}