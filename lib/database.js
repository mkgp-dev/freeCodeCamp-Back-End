const { MongoClient, ServerApiVersion } = require('mongodb');

const server = process.env.MONGODB;
const client = new MongoClient(server, {
    serverAPI: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;

async function init() {
    if (db) {
        return db;
    }

    await client.connect();
    db = client.db('backend');

    // URL Shortener
    await db.collection('urls').createIndex({ domain: 1 }, { unique: true });
    await db.collection('urls').createIndex({ short_url: 1 }, { unique: true });
    //await db.collection('counters');

    // Exercise Tracker
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('exercises').createIndex({ userId: 1, date: 1 });

    return db;
}

function call() {
    if (!db) {
        throw new Error('init() function is not yet initialized.')
    }

    return db;
}

module.exports = { init, call, client };