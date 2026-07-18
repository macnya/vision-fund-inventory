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

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('Vision Fund Inventory API running'));

app.use('/auth', authRoutes);
app.use('/assets', assetRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/employees', employeeRoutes);
app.use('/locations', locationRoutes);
app.use('/disposals', disposalRoutes);
app.use('/lost-assets', lostAssetRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));