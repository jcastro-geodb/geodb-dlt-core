const Datastore = require("nedb-promises");
const collections = require("./collections.json");
// export default collection => {
//   return new Promise((resolve, reject) => {
//     let db = Datastore.create(collection); // Instantiate local database
//     db.load()
//       .then(() => resolve(db))
//       .catch(error => reject(error));
//   });
// };

class Database {
  constructor(collections) {
    for (let i = 0; i < collections.length; i++) {
      this[collections[i].key] = collections[i].value;
    }
  }

  static getInstance() {
    let instances = [];

    for (let i = 0; i < collections.length; i++) {
      const collectionName = collections[i];

      instances.push(
        new Promise((resolve, reject) => {
          try {
            const collection = Datastore.create(collectionName);
            collection
              .load()
              .then(() => resolve({ key: collectionName, value: collection }))
              .catch(error => reject(error));
          } catch (error) {
            reject(error);
          }
        })
      );
    }

    return Promise.all(instances).then(collections => {
      return new Database(collections);
    });
  }
}

export default Database;
