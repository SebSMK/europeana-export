var Q = require('q'),
    solr = require('solr-client'),
    sprintf = require('sprintf-js').sprintf;

var connector_pictures_DAM = {

    config: {
        id: 'pictures_DAM',
        connector: connector_pictures_DAM,
        host: 'csdev-seb-02',
        port: 8983,
        path: '/solr/dev_DAM_PIC',
        query:{
          def:{                                    
            //'fq': 'value:[* TO *]',
            'fl': '*, score',                        
            'wt': 'json',
            'indent': true,
            'json.nl': 'map'             
          },
          fixed:{
            'q': "&q=(({!join from=invnumber to=invnumber fromIndex=dev_TAGS_PIC score=max}{!edismax qf=prev_q v='%1$s'} OR {!join to=invnumber from=id_lower fromIndex=dev_DAM_SAFO score=max}{!edismax qf='collectorExact1^150 collectorExact2^30 collectorExact3^20 collector1^20 collector2^15 collector3^10 collector4^5'}%1$s))"            
          }
        }
    },
    
    queryhandler: function(params, use_def_query){
       var query = {};
       if (use_def_query) {                   
            
            // set variables elements of the query
            query = JSON.parse(JSON.stringify(this.config.query.def)); // cloning JSON            
            for (var p in params){              
              query[p] = params[p];                                                                         
            } 
            
            // set fixed elements of the query            
            for (var f in this.config.query.fixed){              
              switch(f) {
                case 'q':
                  query[f] = sprintf(this.config.query.fixed[f], params[f].toString());
                  break;
                default:
                  query[f] = this.config.query.fixed[f];                                                  
              }                                                           
            } 
                                     
        } else {
            query = params;
        }            
        return query;
    },
        
    queryhandler_old: function(params, use_def_query){
       var query = {};
       if (use_def_query) {                   
            query = JSON.parse(JSON.stringify(this.config.def_query)); // cloning JSON
            
            for (var p in params){
              //var paramPrefix = p.split('.')[0]; 
              
              switch(p) {
                case 'q':
                  query['q'] = sprintf(query['q'], params[p].toString());
                  break;                  
                default:
                  query[p] = params[p];                      
              }                                                           
            }                          
        } else {
            query = params;
        }            
        return query;
    },

    handler: function(params, use_def_query, queryhandler) {
        var deferred = Q.defer();
        var client = this.client(this.config);
        var res = {},
            query = {};
        var self = this;
       
        var getquery = queryhandler !== undefined ? queryhandler : self.queryhandler; 
        query = getquery.call(self, params, use_def_query);

        client.get('select', query, function(err, obj) {

            if (err) {
                res[self.config.id] = err;
                deferred.reject(res);
            } else { 
                res[self.config.id] = obj;
                deferred.resolve(res);
            }
        });
        return deferred.promise;
    },   

    client: function(config) {
        return solr.createClient(config.host, config.port, '', config.path);
    },
    
    setconfig: function(config) {
        this.config = config || this.config;
    },
    
    getconfig: function(){
        return this.config;
    }  
}

module.exports = connector_pictures_DAM;