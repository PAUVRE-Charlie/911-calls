const { MongoClient } = require('mongodb');
const csv = require('csv-parser');
const fs = require('fs');
const { mainModule } = require('process');

const MONGO_URL = 'mongodb://localhost:27017/';
const DB_NAME = '911-calls';
const COLLECTION_NAME = 'calls';

const insertCalls = async function (db, callback) {
  const collection = db.collection(COLLECTION_NAME);
  await dropCollectionIfExists(db, collection);

  const calls = [];
  fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', data => {

      const call = {
        "lat": data.lat,
        "lng": data.lng,
        "location": [parseFloat(data.lng), parseFloat(data.lat)],
        "desc": data.desc,
        "zip": data.zip,
        "title": data.title.split(":")[1].slice(1),
        "category": data.title.split(":")[0],
        "timeStamp": data.timeStamp,
        "monthYear": data.timeStamp.slice(0, 7),
        "twp": data.twp,
        "addr": data.addr,
        "e": data.e
      };

      calls.push(call);
    })
    .on('end', () => {
      collection.insertMany(calls, (err, result) => {
        callback(result)
      });
    });
}

MongoClient.connect(MONGO_URL, {
  useUnifiedTopology: true
}, (err, client) => {
  if (err) {
    console.error(err);
    throw err;
  }
  const db = client.db(DB_NAME);
  insertCalls(db, result => {
    console.log(`${result.insertedCount} calls inserted`);
    client.close();
  });
});

async function dropCollectionIfExists(db, collection) {
  const matchingCollections = await db.listCollections({name: COLLECTION_NAME}).toArray();
  if (matchingCollections.length > 0) {
    await collection.drop();
  }
}
