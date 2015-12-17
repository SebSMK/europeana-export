var express = require('express'),
path = require('path'),
logger = require("../logging"),
config = require('../config'), 
util = require('../util'),      
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
solr = require('solr-client'),
url = require('url');
 

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');  
  
  router.get('/autocomplete/get/*', function(req, res, next) {     
    var promise = [], connector, jsonResponse = {}; 
    var query = url.parse(req.url, true).query;           
    var id = query['q']; 
    var fotokey = 'collectionspace';         
        
    logger.info('ALLOWED: ' + req.method + ' ' + req.url);

    if (config.dam.hasOwnProperty(fotokey)) {
      var deferred = Q.defer();
      var invnumber;			
      
      // image connector 
      connector = config.dam[fotokey];
      
      // special query handler for image connector                     
      var queryhandler = function(params){
        
        var query_pattern = { 
          def:{                                                                              
            'facet.mincount': 1,
            'facet.limit': 5,
            'wt': 'json',
            'json.nl': 'map'             
          },         
          fixed:{            
            'q': '%s',
            'facet': true,            
            'q.op': 'AND',
            'rows': 0                           
          }
        };
        
        // set variables elements of the query
        var query = JSON.parse(JSON.stringify(query_pattern.def)); // cloning JSON            
        for (var p in params){          
          query[p] = params[p];                                                                        
        }                                                                                                         
         
            
        // set fixed elements of the query         
        //query['facet.field'] = [];
        for (var f in query_pattern.fixed){              
          switch(f) {
            case 'q':
              query[f] = sprintf(query_pattern.fixed[f], params[f].toString());
              break;           
            default:
              query[f] = query_pattern.fixed[f];                                                  
          }                                                           
        }                                   
                  
        return query;
    };
    
     // get ngram datahandler results 
    return connector.handler(query, null, queryhandler)
      .then(function(result){
        // is there a picture with this id?                                       
        var connid = connector.getconfig().id;
        res.jsonp(result[connid]);          
      })
      .catch(function (error) {
        logger.info(error);
        res.writeHead(404, 'Not found');
        res.write(sprintf('Autocomplete: %s', error));
        res.end();        
      })      
    } 
    
  });
}
