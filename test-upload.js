const fs = require('fs');
const http = require('http');

async function test() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  let body = '--' + boundary + '\r\n';
  body += 'Content-Disposition: form-data; name="file"; filename="test.png"\r\n';
  body += 'Content-Type: image/png\r\n\r\n';
  body += 'fake-image-data\r\n';
  body += '--' + boundary + '\r\n';
  body += 'Content-Disposition: form-data; name="filePath"\r\n\r\n';
  body += 'SlimeTech/test.md\r\n';
  body += '--' + boundary + '--\r\n';

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': Buffer.byteLength(body)
    }
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
  });
  req.write(body);
  req.end();
}
test();
