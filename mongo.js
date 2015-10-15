
var MongoClient = require('mongodb').MongoClient, 
assert = require('assert'),
logger = require("./logging"),
mp = require('mongodb-promise'),
config = require('./config');


MongoDB = (function(){

     /**
     * Constructor
     **/
    function MongoDB () {
        logger.info("instantiate Mongo", config.mongoURL);
        this.url = config.mongoURL;
    }
  
    
    MongoDB.prototype.insertDocuments = function(doc, collection, callback, error) {
        mp.MongoClient.connect(this.url)
            .then(function(db){
                return db.collection(collection)
                    .then(function(col) {
                        return col.insert(doc)
                            .then(function(result) {
                                console.log('insertDocuments - result: ' + JSON.stringify(result));
                                db.close().then(function(){
                                     console.log('insertDocuments - success');
                                     callback('insertDocuments - success: ' + JSON.stringify(result));
                                });
                                
                            })
                    })
        })
        .fail(function(err) {
            console.log('insertDocuments err: ' + err);
            error('insertDocuments err: ' + err);

         });        
    }
    
    MongoDB.prototype.findDocuments = function(query, collection, callback, error) {
        mp.MongoClient.connect(this.url)
        .then(function(db){
                return db.collection(collection)
                    .then(function(col) {
                        return col.find(query).toArray()
                            .then(function(items) {
                                console.log('findDocuments - result: ' + JSON.stringify(items));
                                db.close().then(function(){
                                     console.log('findDocuments - success');
                                     callback('findDocuments - success: ' + JSON.stringify(items));
                                });
                            })
                })
        })
        .fail(function(err) {
            console.log('findDocuments err: ' + err);
            error('insertDocuments err: ' + err);});
    }
    
    return MongoDB;
})();

module.exports = MongoDB;



