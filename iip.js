var Q = require('q'),
    fs = require('fs'),
    request = require('request'),
    http = require('http'),
    sprintf = require('sprintf-js').sprintf, 
    logger = require("./logging");


IIPProxy = (function(){

     /**
     * Constructor
     **/
    function IIPProxy (host, path, imgsize) {        
        logger.info("IIPProxy Constructor:", host + path);
        logger.info("IIPProxy Constructor - image size:", imgsize);
        this.host = host;      
        this.path = path;
        this.imgsize = imgsize;
    }
  
    
    IIPProxy.prototype.getImageByFilePath = function(filepath) {
        var wid = this.imgsize !== undefined ? sprintf('&WID=%s', this.imgsize) : '';
        var req = sprintf('FIF=%s%s&CVT=jpeg', filepath, wid);
        var uri = sprintf('http://%s%s?%s', this.host, this.path, req);
        var deferred = Q.defer();

        logger.info("IIPProxy requested uri", uri);
        
        request.get(uri, function (error, response, body) {
              
              if (!error && response.statusCode == 200) {                  
                  logger.info('IIPProxy response OK - content-type:', response.headers['content-type']);                                    
                  deferred.resolve(request(uri));                                    
              }else{
                logger.error("IIPProxy error", error);
                deferred.reject(sprintf('IIPProxy error: %s - %s', response.statusCode, error));
              }
        });        
        
        return deferred.promise;       
    } 
    
    return IIPProxy;
})();

module.exports = IIPProxy;



