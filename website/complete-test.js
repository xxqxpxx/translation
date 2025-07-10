#!/usr/bin/env node

/**
 * Complete LinguaLink Platform Test
 * Tests with proper test data setup
 */

const http = require('http');

// Simple UUID generation for testing
function generateTestUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const BASE_URL = 'http://localhost:3001';
const TEST_CLIENT_ID = generateTestUUID();
const TEST_USER_EMAIL = `testuser_${Date.now()}@example.com`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

// Simple HTTP request function
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testHealthCheck() {
  log('\n🧪 Testing: Server Health Check', 'blue');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/health',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    
    if (response.status === 200) {
      logSuccess('Server is healthy and responding');
      return true;
    } else {
      logError(`Health check failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
    return false;
  }
}

async function createTestUser() {
  log('\n🧪 Testing: Create Test User', 'blue');
  
  try {
    const userData = {
      email: TEST_USER_EMAIL,
      firstName: 'Test',
      lastName: 'User',
      role: 'client',
      clerkUserId: `clerk_${generateTestUUID()}`,
      phoneNumber: '+1234567890'
    };

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(userData))
      }
    };

    const response = await makeRequest(options, userData);
    
    if (response.status === 201 && response.data.data) {
      logSuccess(`Test user created successfully: ${response.data.data.id}`);
      return response.data.data.id;
    } else {
      logError(`Test user creation failed with status: ${response.status}`);
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    logError(`Test user creation failed: ${error.message}`);
    return null;
  }
}

async function testInvoiceCreation(clientId) {
  log('\n🧪 Testing: Invoice Creation', 'blue');
  
  try {
    const invoiceData = {
      clientId: clientId,
      amount: 250.00,
      status: 'draft',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          description: 'Translation Services - English to French',
          quantity: 1,
          unitPrice: 200.00,
          total: 200.00
        },
        {
          description: 'Rush Fee',
          quantity: 1,
          unitPrice: 50.00,
          total: 50.00
        }
      ],
      notes: 'Test invoice for comprehensive validation'
    };

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/admin/invoices',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(invoiceData))
      }
    };

    const response = await makeRequest(options, invoiceData);
    
    if (response.status === 201 && response.data.data) {
      logSuccess(`Invoice created successfully: ${response.data.data.id}`);
      return response.data.data.id;
    } else {
      logError(`Invoice creation failed with status: ${response.status}`);
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    logError(`Invoice creation failed: ${error.message}`);
    return null;
  }
}

async function testInvoiceRetrieval(invoiceId) {
  log('\n🧪 Testing: Invoice Retrieval', 'blue');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/admin/invoices/${invoiceId}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    
    if (response.status === 200 && response.data.data.id === invoiceId) {
      logSuccess('Invoice retrieved successfully');
      return true;
    } else {
      logError(`Invoice retrieval failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Invoice retrieval failed: ${error.message}`);
    return false;
  }
}

async function testInvoiceStatusUpdate(invoiceId) {
  log('\n🧪 Testing: Invoice Status Update', 'blue');
  
  try {
    const statusData = { status: 'issued' };

    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1/admin/invoices/${invoiceId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify(statusData))
      }
    };

    const response = await makeRequest(options, statusData);
    
    if (response.status === 200 && response.data.data.status === 'issued') {
      logSuccess('Invoice status updated successfully');
      return true;
    } else {
      logError(`Invoice status update failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Invoice status update failed: ${error.message}`);
    return false;
  }
}

async function testInvoiceList() {
  log('\n🧪 Testing: Invoice List', 'blue');
  
  try {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/admin/invoices',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response = await makeRequest(options);
    
    if (response.status === 200 && Array.isArray(response.data.data)) {
      logSuccess(`Retrieved ${response.data.data.length} invoices`);
      return true;
    } else {
      logError(`Invoice list failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    logError(`Invoice list failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('============================================================');
  log('🚀 LinguaLink Platform - Complete Test Suite', 'bold');
  console.log('============================================================');

  const results = {
    health: false,
    userCreation: false,
    invoiceCreation: false,
    invoiceRetrieval: false,
    invoiceStatusUpdate: false,
    invoiceList: false
  };

  // Test 1: Health Check
  results.health = await testHealthCheck();

  if (results.health) {
    // Test 2: Create Test User
    const userId = await createTestUser();
    results.userCreation = !!userId;

    if (results.userCreation) {
      // Test 3: Invoice Creation
      const invoiceId = await testInvoiceCreation(userId);
      results.invoiceCreation = !!invoiceId;

      if (results.invoiceCreation) {
        // Test 4: Invoice Retrieval
        results.invoiceRetrieval = await testInvoiceRetrieval(invoiceId);

        // Test 5: Invoice Status Update
        results.invoiceStatusUpdate = await testInvoiceStatusUpdate(invoiceId);
      }

      // Test 6: Invoice List
      results.invoiceList = await testInvoiceList();
    }
  }

  // Summary
  console.log('\n============================================================');
  log('📊 Test Results Summary', 'bold');
  console.log('============================================================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.padEnd(20)} : ${status}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    logSuccess('All tests passed! 🎉');
    log('\n📋 Implementation Status Summary:', 'bold');
    log('✅ Phase 5: Payment Processing (Invoice Management) - COMPLETE');
    log('✅ Backend APIs working correctly');
    log('✅ Database schema and relationships working');
    log('✅ CRUD operations functioning properly');
    log('✅ Status management workflow operational');
  } else {
    logError('Some tests failed. Please check the implementation.');
  }
}

// Run the tests
runTests().catch(console.error); 