//const elasticsearch = require('elasticsearch');
const csv = require('csv-parser');
const fs = require('fs');
const { Client } = require('@elastic/elasticsearch');

const ELASTIC_SEARCH_URI = 'http://localhost:9200';
const INDEX_NAME = '911-calls';

async function run() {
  const client = new Client({ node: ELASTIC_SEARCH_URI});

  // Drop index if exists
  await client.indices.delete({
    index: INDEX_NAME,
    ignore_unavailable: true
  });

  await client.indices.create({
    index: INDEX_NAME,
    body : {
      "mappings": {
      "properties": {
        "location": {
          "type": "geo_point"
        }
      }
    }
    }
  });

  let calls = [];

  fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', data => {
      const call = { 
        lat: data.lat,
        lng: data.lng,
        location: [parseFloat(data.lng), parseFloat(data.lat)],
        desc: data.desc,
        zip: data.zip,
        title: data.title.split(":")[1].slice(1),
        category: data.title.split(":")[0],
        timeStamp: data.timeStamp,
        monthYear: data.timeStamp.slice(0, 7),
        date: data.timeStamp.slice(0, 10),
        twp: data.twp,
        addr: data.addr,
        e: data.e
      };
      // TODO créer l'objet call à partir de la ligne
      calls.push(call);
    })
    .on('end', async () => {
      console.log(calls.length);
      // TODO insérer les données dans ES en utilisant l'API de bulk https://www.elastic.co/guide/en/elasticsearch/reference/7.x/docs-bulk.html
      client.bulk(createBulkInsertQuery(calls), (err, resp) => {
      if (err) console.trace(err.message);
      else console.log(`Inserted ${resp.body.items.length} calls`);
      client.close();
    });
    });
  
function createBulkInsertQuery(calls) {
  const body = calls.reduce((acc, call) => {
    const { lat,
        lng,
        location,
        desc,
        zip,
        title,
        category,
        timeStamp,
        monthYear,
        date,
        twp,
        addr,
        e} = call;
    acc.push({ index: { _index: INDEX_NAME, _type: '_doc', _id: call.desc } })
    acc.push({ lat,
        lng,
        location,
        desc,
        zip,
        title,
        category,
        timeStamp,
        monthYear,
        date,
        twp,
        addr,
        e })
    return acc
  }, []);

  return { body };

}
}

run().catch(console.log);

