require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const assetRoutes = require('./routes/assetRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const locationRoutes = require('./routes/locationRoutes');
const disposalRoutes = require('./routes/disposalRoutes');
const lostAssetRoutes = require('./routes/lostAssetRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const verificationRoutes = require('./routes/verificationRoutes');

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: 'https://vision-fund-admin.onrender.com' }));
app.use(express.json());

app.get('/', (req, res) => res.send('Vision Fund Inventory API running'));
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', time: new Date().toISOString() }));

app.use('/auth', authRoutes);
app.use('/assets', assetRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/employees', employeeRoutes);
app.use('/locations', locationRoutes);
app.use('/disposals', disposalRoutes);
app.use('/lost-assets', lostAssetRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/', verificationRoutes);

// 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Catch malformed JSON bodies and any other errors, return JSON instead of Express's default HTML page
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));