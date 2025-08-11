#!/usr/bin/env node

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');

// Generate a test JWT token
const token = jwt.sign(
  { 
    userId: 'test-admin',
    email: 'admin@test.com',
    role: 'ADMIN'
  },
  process.env.JWT_SECRET || 'test-secret-key',
  { expiresIn: '1h' }
);

async function testWhatsAppRestart() {
  const sessionId = 'cme66ra0p0000gwa6wmliggun';
  
  try {
    console.log('Testing WhatsApp restart with authentication...');
    console.log('Session ID:', sessionId);
    console.log('Token:', token.substring(0, 20) + '...');
    
    const response = await fetch(`http://localhost:3001/api/whatsapp/sessions/${sessionId}/restart`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Success!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Error:', response.status);
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('Failed to test:', error);
  }
}

testWhatsAppRestart();