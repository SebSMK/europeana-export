
var MongoClient = require('mongodb').MongoClient, 
assert = require('assert'),
logger = require("./logging"),
mp = require('mongodb-promise'),
Q = require('q'),
config = require('./config');


MongoDB = (function(){

     /**
     * Constructor
     **/
    function MongoDB () {
        logger.info("instantiate Mongo", config.mongoURL);
        this.url = config.mongoURL;
    }
  
    
    MongoDB.prototype.insertDocuments = function(doc, collection) {
        var deferred = Q.defer();

        mp.MongoClient.connect(this.url)
            .then(function(db){
                return db.collection(collection)
                    .then(function(col) {
                        return col.insert(doc)
                            .then(function(result) {                                
                                db.close().then(function(){
                                     console.log('insertDocuments - success');                                     
                                      deferred.resolve('insertDocuments - result: ' + JSON.stringify(result));                                                                     
                                });
                                
                            })
                    })
        })
        .fail(function(err) {
            console.log('insertDocuments err: ' + err);
            deferred.reject('insertDocuments err: ' + err); 
                       
         });

         return deferred.promise;        
    }
    
    MongoDB.prototype.findDocuments = function(query, collection) {
        var deferred = Q.defer();

        mp.MongoClient.connect(this.url)
        .then(function(db){
                return db.collection(collection)
                    .then(function(col) {
                        return col.find(query).toArray()
                            .then(function(items) {                                
                                db.close().then(function(){
                                     console.log('findDocuments - success');                                     
                                     deferred.resolve('findDocuments - result: ' + JSON.stringify(items));                                                                       
                                });
                            })
                })
        })
        .fail(function(err) {
            console.log('findDocuments err: ' + err);
            deferred.reject('findDocuments err: ' + err);   
        });

        return deferred.promise;          
    }

     MongoDB.prototype.removeDocuments = function(query, collection) {
        var deferred = Q.defer();

        mp.MongoClient.connect(this.url)
            .then(function(db){
                 return db.collection(collection)
                    .then(function(col) {
                        return col.delete(query)
                            .then(function(result) {                                
                                db.close().then(function(){
                                     console.log('removeDocuments - success');                                     
                                     deferred.resolve('removeDocuments - result: ' + JSON.stringify(result));                                                                       
                                });
                            })
                })
        })
        .fail(function(err) {
            console.log('removeDocuments err: ' + err);
            deferred.reject('removeDocuments err: ' + err); 
                       
         });

         return deferred.promise;        
    }
    
    return MongoDB;
})();

module.exports = MongoDB;



