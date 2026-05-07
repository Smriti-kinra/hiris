const fetch = require('node-fetch');

async function test() {
  // 1. Login as Hiring Manager
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sartajdeep@plaksha.edu.in', password: 'password123' })
  });
  
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  console.log('Login data:', loginData);
  
  const cookie = loginRes.headers.raw()['set-cookie']?.[0]?.split(';')[0];
  console.log('Cookie:', cookie);

  if (!cookie) {
    console.error('No cookie received, cannot proceed');
    process.exit(1);
  }

  // 2. Submit JD
  const patchRes = await fetch('http://localhost:3001/api/hiring-requests/7/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie
    },
    body: JSON.stringify({
      action: 'submit_jd',
      jd_json: { title: 'Test', department: 'CS' }
    })
  });
  
  const patchData = await patchRes.text();
  console.log('\nPATCH status:', patchRes.status);
  console.log('PATCH response:', patchData);
}

test().catch(console.error);
