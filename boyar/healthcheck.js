const http = require('http');

http.get('http://localhost:8080/status', (res) => {
  const { statusCode } = res;
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(data);
    if (statusCode == 200) process.exit(0);
    console.log('Error: HTTP status code ' + statusCode);
    process.exit(128);
  });

}).on('error', (err) => {
  console.log('Error: ' + err.message);
  process.exit(128);
});