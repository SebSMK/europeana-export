
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
        logger.info("Connected correctly to server");      
        this.db = db;
        logger.info("Disconnected correctly from server"); 
        db.close();
      });
    }

    MongoDB.prototype.disconnect = function(){
       if (this.db !== undefined){
          this.db.close();
          logger.info("Disconnected correctly from server"); 
       }else{
          logger.info("Not disconnected correctly");
       }        
    }
    
    MongoDB.prototype.insertDocuments = function(doc, callback) {
      // Get the documents collection 
      var collection = this.db.collection('documents');
      // Insert some documents 
      collection.insert(doc, function(err, result) {
        assert.equal(err, null);
        assert.equal(3, result.result.n);
        assert.equal(3, result.ops.length);
        logger.info("Inserted documents into the document collection");
        callback(result);
      });
    }
    
    MongoDB.prototype.findDocuments = function(callback) {
      // Get the documents collection 
      var collection = this.db.collection('documents');
      // Find some documents 
      collection.find({}).toArray(function(err, docs) {
        assert.equal(err, null);
        assert.equal(2, docs.length);
        console.log("Found the following records");
        console.dir(docs);
        //callback(docs);
      });
    }
    
    return MongoDB;
})();

module.exports = MongoDB;



