var express = require('express'),
router = express(),
path = require('path'),
logger = require("../logging"),
config = require('../config'),
converter = require('../converter'), 
Solr = require('../solr'),
iipproxy = require('../iip'),       
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
fs = require('fs'),    
Image = require('../image'),
upath = require('upath'),
request = require('request');

router.set('views', path.join(__dirname, '../views'));
router.set('view engine', 'jade');

router.get('/test/imgsrv/add/:id', function(req, res, next) {                
    var promise = [];                     
    var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&wt=json&fl=link,id,invnumber', config.solrDAMCore, req.params.id, req.params.id);    
    var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
    var deferred = Q.defer();
    
    deferred.notify('starting!');
    
      
    solr.get(solrPath)
        .then(        
        function(tosend){
            res.render('chat');                              
        })        
        .then( function(solrResponse){
             
            // find artwork(s) in solrdam 
             if(solrResponse.response.numFound > 0){                            
               logger.info("/imgsrv/post - solr says:", solrResponse);
               
                // convert artwork(s)
               for (i = 0; i < solrResponse.response.numFound; i++){
                    var pyrconv = new converter(); 
                    var params = {}, doc = solrResponse.response.docs[i];
                    params.id = doc.id;
                    params.link = pathConv2Unix(doc.link);
                    params.invnumber = doc.invnumber;      
                               
                    promise.push(pyrconv.dummyexec(params));                            
               };                 
                                                          
             }else{              
               logger.info("/imgsrv/post - image not found :" + solrResponse);
               deferred.reject({error: "/imgsrv/post - image not found : " + JSON.stringify(solrResponse)});                     
             }          
                                 
             Q.allSettled(promise).then(function(result) {
              //loop through array of promises, add items  
              var tosend = []
              result.forEach(function(res) { 
                if (res.state === "fulfilled") {
                  tosend.push(res.value);
                }                
                if (res.state === "rejected") {
                  tosend.push(res.reason);
                }                
              });     
              promise = []; //empty array, since it's global.
              deferred.resolve(tosend);
            }); 
            
            return deferred.promise;
                
        })
        .then(
        // processing output
        function(tosend){
            res.done(); 
        },
        function(err){
            throw err;        
        },
        function(notify){
            //res.send(notify);                              
        })
        .catch(function (err){
          //catch and break on all errors or exceptions on all the above methods
          logger.error('/imgsrv/post', err);          
          return res.status(500).send({error: err});
        });     
});


/***
 *  PRIVATE FUNCTIONS
 **/
 
function pathConv2Unix(windowsPath){
  var unixPath = upath.toUnix(windowsPath);
  return unixPath.replace('F:/FotoII/', '');  
};

module.exports = router;
