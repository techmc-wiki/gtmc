const fs = require('fs');
async function test() {
  const fileBuffer = Buffer.from('hello world');
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  const formData = new FormData();
  formData.append('file', blob, 'image.png');
  formData.append('filePath', 'SlimeTech/04.md');
  const res = await fetch('http://localhost:3000/api/upload', {
    method: 'POST', body: formData
  });
  const text = await res.text();
  console.log(res.status, text);
}
test();
