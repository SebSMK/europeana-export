
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
        //db.close();
      });
    }

    MongoDB.prototype.disconnect = function(){
       if (this.db !== undefined)
        this.db.close();
    }
    
    return MongoDB;
})();

module.exports = MongoDB;



