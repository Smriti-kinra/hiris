require('dotenv').config();
const http = require('http');

const data = JSON.stringify({
  email: 'gracy.tanna@hiris.demo',
  password: 'hiris2026'
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  const cookie = res.headers['set-cookie'];
  console.log('Login status:', res.statusCode);
  
  if (!cookie) {
    console.error('No cookie received!');
    process.exit(1);
  }

  const patchData = JSON.stringify({
    action: 'approve'
  });

  const req = http.request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/hiring-requests/7/status',
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(patchData),
      'Cookie': cookie[0]
    }
  }, (patchRes) => {
    let body = '';
    patchRes.on('data', d => body += d);
    patchRes.on('end', () => {
      console.log('Status code:', patchRes.statusCode);
      console.log('Response:', body);
    });
  });
  
  req.write(patchData);
  req.end();
});

loginReq.write(data);
loginReq.end();
