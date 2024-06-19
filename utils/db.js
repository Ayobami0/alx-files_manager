import { MongoClient, ObjectID } from 'mongodb';
import { env } from 'process';

class DBClient {
  constructor() {
    const host = env.DB_HOST || 'localhost';
    const port = env.DB_PORT || '27017';
    const database = env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;

    MongoClient.connect(url, { useUnifiedTopology: true }, (error, client) => {
      if (error) console.log(error);
      this.db = client.db(database);
    });
  }

  isAlive() {
    return !!this.db;
  }

  /**
  * Check if a @query matches a document in @col
  * @param { String }   col   the collection to match
  * @param { Object }   query the query to match the document
  * @param { Boolean }  true  if document is found and false if not
  */
  async exists(col, query) {
    const doc = await this.db.collection(col).findOne(query);

    if (!doc) { return false; }
    return true;
  }

  /**
  * Finds a document that matched query in collection
  * @param { String }   col   the collection to match
  * @param { Object }   query the query to match the document
  * @param { Any }      the document found or null if document doesnt exist
  */
  async findOne(col, query) {
    const doc = await this.db.collection(col).findOne(query);

    return doc;
  }

  /**
  * Finds a document that matched id in collection
  * @param { String }   col   the collection to match
  * @param { String }   id the id of the document
  * @returns { Any }      the document found or null if document doesnt exist
  */
  async findOneByID(col, id) {
    const doc = await this.db.collection(col).findOne(ObjectID(id));

    return doc;
  }

  /**
  * Finds a documents in a collection
  * @param { String }   col   the collection to match
  * @param { Object }   query the query to match the document
  * @param { Array<Any> }      the documents found or an empty if collection is empty
  */
  async findAll(col, query, page = 0, limit = 20) {
    const aggregation = [
      { $match: query },
      { $skip: page * limit },
      { $limit: limit },
    ];
    const docs = await this.db.collection(col).aggregate(aggregation);
    // const docs = await this.db.collection(col).find(query, options);

    return docs.toArray();
  }

  /**
  * insert a documents into a collection
  * @param { String }   col   the collection to match
  * @param { Object }   doc   the document to insert
  */
  async insertOne(col, doc) {
    const res = await this.db.collection(col).insertOne(doc);

    if (res) {
      return res.insertedId;
    }
    return null;
  }

  /**
  * updates a documents in a collection
  * @param { String }   col      the collection to match
  * @param { Object }   update   the field to update
  */
  async updateOne(col, id, update) {
    const res = await this.db.collection(col).updateOne({ _id: ObjectID(id) }, { $set: update });

    if (res) {
      return res;
    }
    return null;
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();

export default dbClient;
