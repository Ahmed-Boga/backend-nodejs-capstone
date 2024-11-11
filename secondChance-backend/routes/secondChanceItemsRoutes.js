const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const path = require('path');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Multer storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, directoryPath),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB file size limit
});

// Validation Middleware
const validateSecondChanceItem = [
    body('category').notEmpty().withMessage('Category is required'),
    body('condition').notEmpty().withMessage('Condition is required'),
    body('description').isString().withMessage('Description must be a string'),
];

// Get all secondChanceItems
router.get('/', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const items = await collection.find({}).toArray();
        res.json(items);
    } catch (e) {
        logger.error('Failed to fetch items', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const { id } = req.params;
        const item = await collection.findOne({ id });

        if (!item) return res.status(404).json({ error: 'Item not found' });
        res.json(item);
    } catch (e) {
        logger.error('Error fetching item', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add a new item
router.post('/', upload.single('file'), validateSecondChanceItem, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const lastItem = await collection.find().sort({ id: -1 }).limit(1).toArray();
        const newId = lastItem.length ? parseInt(lastItem[0].id) + 1 : 1;

        const newItem = {
            ...req.body,
            id: newId.toString(),
            date_added: Date.now(),
        };

        await collection.insertOne(newItem);
        logger.info('New item added successfully');
        res.status(201).json({ message: 'Item added successfully' });
    } catch (e) {
        logger.error('Failed to add item', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update an existing item
router.put('/:id', validateSecondChanceItem, async (req, res) => {
    const { id } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const updatedItem = await collection.findOneAndUpdate(
            { id },
            { $set: { ...req.body, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!updatedItem.value) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Item updated successfully', data: updatedItem.value });
    } catch (e) {
        logger.error('Failed to update item', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete an existing item
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems");
        const deleteResult = await collection.deleteOne({ id });

        if (deleteResult.deletedCount === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({ message: 'Item deleted successfully' });
    } catch (e) {
        logger.error('Failed to delete item', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
