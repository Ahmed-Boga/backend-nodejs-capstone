require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pino = require('pino-http');
const logger = require('./logger');
const connectToDatabase = require('./models/db');

const app = express();
const port = process.env.PORT || 3060;

app.use(cors());
app.use(express.json());
app.use(pino({ logger }));

// Connect to MongoDB
connectToDatabase().then(() => {
    logger.info('Connected to MongoDB');
}).catch((e) => logger.error('DB connection error', e));

// Route imports
const authRoutes = require('./routes/authRoutes');
const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const searchRoutes = require('./routes/searchRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/secondchance/items', secondChanceItemsRoutes);
app.use('/api/secondchance/search', searchRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error('Internal Error', err);
    res.status(500).send('Internal Server Error');
});

app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
});
