#!/usr/bin/env node

/**
 * Simple LinguaLink Platform Test
 * Tests basic functionality without external dependencies
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

async function testInvoiceCreation() {
  log('\n🧪 Testing: Invoice Creation', 'blue');
  
  try {
    const invoiceData = {
      clientId: TEST_CLIENT_ID,
      amount: 250.00,
      status: 'draft',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [
        {
          description: 'Translation Services - English to French',
          quantity: 1,
          unitPrice: 200.00,
          total: 200.00
        }
      ],
      notes: 'Test invoice for validation'
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
  log('🚀 LinguaLink Platform - Simple Test Suite', 'bold');
  console.log('============================================================');

  const results = {
    health: false,
    invoiceCreation: false,
    invoiceList: false
  };

  // Test 1: Health Check
  results.health = await testHealthCheck();

  if (results.health) {
    // Test 2: Invoice Creation
    const invoiceId = await testInvoiceCreation();
    results.invoiceCreation = !!invoiceId;

    // Test 3: Invoice List
    results.invoiceList = await testInvoiceList();
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
  } else {
    logError('Some tests failed. Please check the implementation.');
  }
}

// Run the tests
runTests().catch(console.error); 