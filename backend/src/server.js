const express = require('express');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, '../../frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
});

app.listen(3000, () => {
  console.log('Server is listening on port 3000');
});

