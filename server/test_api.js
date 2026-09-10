import http from 'http';

http.get('http://localhost:5000/api/marks/class-summary?classId=CL001&sessionLabel=internal1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Success:', Object.keys(parsed));
    } catch(e) {
      console.error('Error parsing JSON:', data.substring(0, 100));
    }
  });
}).on('error', err => console.error(err));
