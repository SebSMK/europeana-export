
var Q = require('q'),
solr = require('solr-client');

var connector_pictures_DAM = {

    config: null,
    
    init: function(config){
        this.config = config;       
    },

    handler: function(query){      
      var deferred = Q.defer();
      var client = this.client(this.config);
      client.get('select', query, function(err, obj){
          
        	if(err){
        		//logger.info(err);
            deferred.reject(err);
            /*
            res.writeHead(500, 'Server intern error');
            res.write('solrProxy says: ' + err);
            res.end();*/
            
        	}else{
        		//logger.info(obj);    
            deferred.resolve({'user_tags': obj});
            //deferred.resolve(obj);    
            /*res.jsonp(obj);*/                      
        	}                      
      });                
      return deferred.promise;
    },
    client: function(config){
        return solr.createClient(config.host, config.port, '', config.path);    
    }      
 
}

module.exports = connector_pictures_DAM;

