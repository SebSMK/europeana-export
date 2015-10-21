
var MongoClient = require('mongodb').MongoClient, 
Grid = mongo.Grid,
logger = require("./logging"),
Q = require('q'),
config = require('./config');


MongoDBGrid = (function(){

     /**
     * Constructor
     **/
    function MongoDBGrid () {
        logger.info("instantiate Mongo", config.mongoURL);
        this.url = config.mongoURL;
    }
              
    MongoDBGrid.prototype.connect = function() { 
      // Connect to the db
      MongoClient.connect(this.url, function(err, db) {
        if(err) return console.dir(err);
      
        var grid = new Grid(db, 'fs');
        var buffer = new Buffer("Hello world");
        grid.put(buffer, {metadata:{category:'text'}, content_type: 'text'}, function(err, fileInfo) {
          if(!err) {
            console.log("Finished writing file to Mongo");
          }
        });
      });      
    }       
    
    return MongoDBGrid;
})();

module.exports = MongoDBGrid;



