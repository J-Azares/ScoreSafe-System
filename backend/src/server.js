const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const scoreRoutes = require('./routes/scores');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

app.use('/api/scores', scoreRoutes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

