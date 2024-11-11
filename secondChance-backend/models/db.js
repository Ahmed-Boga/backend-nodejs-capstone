// db.js
require('dotenv').config();
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL;
const dbName = "giftdb";
let client, dbInstance;

async function connectToDatabase() {
    try {
        if (dbInstance) return dbInstance;

        client = new MongoClient(url//, {
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            
        // }
    );

        await client.connect();
        dbInstance = client.db(dbName);
        console.log(`Connected to MongoDB: ${dbName}`);
        return dbInstance;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
    }
}

module.exports = connectToDatabase;
