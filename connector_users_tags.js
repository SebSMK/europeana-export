
var Q = require('q'),
solr = require('solr-client');

var connector_users_tags = {

    config: {
	id: 'users_tags',
          connector: connector_users_tags,
          host: 'solr-02.smk.dk',
          port: 8080,
          path: '/solr-h4dk/prod_search_pict',
          def_query: {
            'q': '{!join from=picture_url to=picture_url}prev_q:',
            'facet': true,
            'facet.field':['prev_q'],
            'facet.mincount':1,
            'facet.limit':-1,
            'rows':'0', 
            'wt':'json',
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
          	query['q'] += params;	
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

module.exports = connector_users_tags;

