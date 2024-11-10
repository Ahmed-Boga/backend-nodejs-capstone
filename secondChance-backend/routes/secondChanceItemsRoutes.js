const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const UPLOAD_DIRECTORY = path.join(__dirname, '../public/images');

// Ensure the directory exists
if (!fs.existsSync(UPLOAD_DIRECTORY)) {
  fs.mkdirSync(UPLOAD_DIRECTORY, { recursive: true });
}

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIRECTORY); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage }).single('file');

// Utility function to get the current timestamp
const getCurrentTimestamp = () => Math.floor(new Date().getTime() / 1000);

// Get all secondChanceItems
router.get('/', async (req, res, next) => {
  logger.info('GET / called');
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const secondChanceItems = await collection.find({}).toArray();
    res.status(200).json(secondChanceItems);
  } catch (error) {
    logger.error('Error fetching items', error);
    next(error);
  }
});

// Add a new item
router.post('/', async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      logger.error('File upload error', err);
      return res.status(400).json({ error: 'File upload failed' });
    }

    try {
      const db = await connectToDatabase();
      const collection = db.collection('secondChanceItems');
      let secondChanceItem = req.body;

      // Fetch the last item ID and increment it for the new item
      const lastItem = await collection.find().sort({ id: -1 }).limit(1).next();
      secondChanceItem.id = lastItem ? (parseInt(lastItem.id) + 1).toString() : '1';

      // Set additional attributes
      secondChanceItem.date_added = getCurrentTimestamp();

      // Insert the new item
      const result = await collection.insertOne(secondChanceItem);
      res.status(201).json(result.ops[0]);
    } catch (error) {
      logger.error('Error adding new item', error);
      next(error);
    }
  });
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const secondChanceItem = await collection.findOne({ id });

    if (!secondChanceItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json(secondChanceItem);
  } catch (error) {
    logger.error('Error fetching item by ID', error);
    next(error);
  }
});

// Update an existing item
router.put('/:id', async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');

    // Validate if the item exists
    const existingItem = await collection.findOne({ id });
    if (!existingItem) {
      logger.error('Item not found for update');
      return res.status(404).json({ error: 'Item not found' });
    }

    updates.age_years = Number((updates.age_days / 365).toFixed(1));
    updates.updatedAt = new Date();

    const updatedItem = await collection.findOneAndUpdate(
      { id },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (updatedItem.value) {
      res.status(200).json({ message: 'Update successful', item: updatedItem.value });
    } else {
      res.status(400).json({ error: 'Update failed' });
    }
  } catch (error) {
    logger.error('Error updating item', error);
    next(error);
  }
});

// Delete an existing item
router.delete('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const db = await connectToDatabase();
    const collection = db.collection('secondChanceItems');
    const deletedResult = await collection.deleteOne({ id });

    if (deletedResult.deletedCount === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting item', error);
    next(error);
  }
});

module.exports = router;
