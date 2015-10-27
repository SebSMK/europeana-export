
var Q = require('q'),    
    logger = require("./logging"),
    path = require('path'),
  config = require('./config'), 
  Solr = require('./solr'),
  iipproxy = require('./iip'),       
  sprintf = require('sprintf-js').sprintf,  
  fs = require('fs'),    
  Image = require('./image');

Converter = (function() {    
    
    /**
     * Constructor
     **/
    function Converter() {}
    
    /**
     * Instance Methods 
     **/
     
    Converter.prototype.exec = function(params) {
        var deferred = Q.defer(), 
        filePath, 
        resourcePath, 
        solrid, 
        invnumber; 
                           
        /*check params*/                      
        solrid = params.id;            
        logger.info("solrid :", solrid);
        
        invnumber = params.invnumber;            
        logger.info("invnumber :", invnumber);
        
        resourcePath = params.link;            
        logger.info("resourcePath :", resourcePath);
    
        filePath = path.join(config.root, resourcePath);
        logger.info("filePath name :", filePath);
        
        fs.exists(filePath, function(exists) {
            var image;
            if (!exists) {
                deferred.reject(sprintf('ERROR - %s not found', filePath));
            }
            try{
                logger.info("Converter processing :", filePath);
                image = new Image(filePath, solrid);
            }
            catch(ex){
                logger.error(ex);
                deferred.reject(400);
            }
            return image.process(function(data, type) {                                    
                
                var solr = new Solr(config.solrDAMHost, config.solrDAMPort, config.solrDAMCore);                
                var reqparams = [{"id": solrid, "value":{"set": data}}];
                
                solr.postjson(reqparams)
                  .then( function(solrResponse){
                     logger.info("/imgsrv/post - solr dam response :", solrResponse);
                     deferred.resolve(sprintf("/imgsrv/post - pyr image created - %s - %s - %s", invnumber, solrid, data));
                  })
                  .catch(function (err) {
                      //catch and break on all errors or exceptions on all the above methods
                      logger.error('/imgsrv/post', err);
                      deferred.reject('/imgsrv/post error: <br>' + err);
                  });                               
            },
            function(error) {
                deferred.reject(error);
            });            
        });
        
        return deferred.promise;
    }
     
    Converter.prototype.dummyexec = function(params) {
        var deferred = Q.defer(), 
        filePath, 
        resourcePath, 
        solrid, 
        invnumber; 
                           
        /*check params*/                      
        solrid = params.id;            
        logger.info("solrid :", solrid);
        
        invnumber = params.invnumber;            
        logger.info("invnumber :", invnumber);
        
        resourcePath = params.link;            
        logger.info("resourcePath :", resourcePath);
    
        filePath = path.join(config.root, resourcePath);
        logger.info("filePath name :", filePath);
        
        fs.exists(filePath, function(exists) {
            var image;
            if (!exists) {
                deferred.reject(404);
            }
            try{
                logger.info("Converter processing :", filePath);
                image = new Image(filePath, solrid);
            }
            catch(ex){
                logger.error(ex);
                deferred.reject(400);;
            }
            return image.dummyprocess(function(data, type) {                                    
                
                var solr = new Solr(config.solrDAMHost, config.solrDAMPort, config.solrDAMCore);                
                var reqparams = [{"id": solrid, "value":{"set": data}}];
                
                solr.postjson(reqparams)
                  .then( function(solrResponse){
                     logger.info("/imgsrv/post - solr dam response :", solrResponse);
                     deferred.resolve(sprintf("/imgsrv/post - pyr image created - %s - %s - %s", invnumber, solrid, data));
                  })
                  .catch(function (err) {
                      //catch and break on all errors or exceptions on all the above methods
                      logger.error('/imgsrv/post', err);
                      deferred.reject('/imgsrv/post error: <br>' + err);
                  });                               
            },
            function(error) {
                deferred.reject(error);
            });            
        });
        
        return deferred.promise;
    }

    return Converter;
})();

module.exports = Converter;
