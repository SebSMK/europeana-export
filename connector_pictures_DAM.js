
var Q = require('q'),
solr = require('solr-client'),
sprintf = require('sprintf-js').sprintf;

var connector_pictures_DAM = {

    config: {
	id: 'pictures_DAM',
          connector: connector_pictures_DAM,
          host: 'csdev-seb',
          port: 8180,
          path: '/solr-example/dev_DAM',
          def_query: {
            'q': 'invnumber:%1$s OR id:%1$s',
            'wt':'json',
            'rows': 10,
            'indent':true,
            'json.nl':'map'            
          }
	},
    
    setconfig: function(config){
        this.config = config || this.config;       
    },

    handler: function(params, use_def_query){      
      var deferred = Q.defer();
      var client = this.client(this.config);
	var res = {}, query = {};
	var self = this;
	if(use_def_query){
		query = JSON.parse(JSON.stringify(this.config.def_query)); // cloning JSON 
          	query['q'] = sprintf(query['q'], params.toString());	
	}else{
		query = params;
	}
		
      client.get('select', query, function(err, obj){
          
        	if(err){
        		//logger.info(err);
		res[self.config.id] = err;
            deferred.reject(res);
            /*
            res.writeHead(500, 'Server intern error');
            res.write('solrProxy says: ' + err);
            res.end();*/
            
        	}else{
        		//logger.info(obj);  
		res[self.config.id] = obj;  
            deferred.resolve(res);
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

