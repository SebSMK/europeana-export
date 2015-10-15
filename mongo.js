
var MongoClient = require('mongodb').MongoClient, 
assert = require('assert'),
logger = require("./logging"),
config = require('./config');


MongoDB = (function(){

     /**
     * Constructor
     **/
    function MongoDB () {
        logger.info("instantiate Mongo", config.mongoURL);
        this.url = config.mongoURL;
    }

    MongoDB.prototype.connect = function(){
      MongoClient.connect(this.url, function(err, db) {
        assert.equal(null, err);
        console.log("Connected correctly to server");      
        this.db = db;
        console.log("Disconnected correctly from server"); 
        db.close();
      });
    }    
    
    MongoDB.prototype.insertDocuments = function(doc, callback) {
       MongoClient.connect(this.url, function(err, db) {
        assert.equal(null, err);
        console.log("insertDocuments - Connected correctly to server");
        console.log(doc);
        // Get the documents collection 
        var collection = db.collection('documents');
        
        // Insert some documents 
        collection.insert(doc, function(err, result) {
          console.log("insertDocuments - starting insert");
          assert.equal(null, err);
          console.log("insertDocuments - Connected correctly to server");
          assert.equal(3, result.result.n);
          assert.equal(3, result.ops.length);
          console.log("Inserted documents into the document collection");
          
            db.close(); 
            console.log("insertDocuments - Disconnected correctly from server");  
          callback(result);
        })      
      });            
    }
    
    MongoDB.prototype.findDocuments = function(query, collection, callback) {
      MongoClient.connect(this.url, function(err, db) {
           // Get the documents collection 
          var collection = db.collection(collection);
          // Find some documents 
          collection.find(query).toArray(function(err, docs) {
            console.log("findDocuments - start reading");
            console.log("Found the following records");
            console.dir(JSON.stringify(docs));
            db.close();
            console.log("findDocuments - Disconnected correctly from server"); 
            callback(docs);
          });
         
      });
     
    }
    
    return MongoDB;
})();

module.exports = MongoDB;



