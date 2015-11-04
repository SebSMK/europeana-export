var express = require('express'),
//router = express(),
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

var url = require('url');
var proxy = require('proxy-middleware'); 

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');
  //router.set(express.static(path.join(__dirname, 'public')));

//* proxying calls to IIP server
router.use(config.IIPPath, proxy(url.parse(sprintf('http://%s%s', config.IIPHost,config.IIPPath))));

router.get('/imgsrv/test/zoom/:id',           
      function(req, res, next) {    
      //* loading socket IO 
          io.sockets.emit('message', { message: 'starting get console ' + config.version}); 
          io.sockets.emit('message', { message: 'iipserver: ' + JSON.stringify(sprintf('http://%s%s', config.IIPHost,config.IIPPath))});                                            
          next();                               
      },
      
      function(req, res, next) {
      //* checking if IIP server is available          
          sendInterfaceMessage('message', { message: 'starting request '});
          request('http://172.20.1.203/iipsrv/iipsrv.fcgi', function (error, response, body) {
              if (!error && response.statusCode == 200) {
                  sendInterfaceMessage('message' + body); // Show the HTML for the Modulus homepage.
              }else{
                  sendInterfaceMessage('iip start FAILED: ' + error);
              }
              
              sendInterfaceMessage('iip start end: ' + error);
              
              next(); 
          });                                                     
      },           
      // ...real stuff starting here
      function(req, res, next) {        
        sendInterfaceMessage('//////// start zooming *******');                        
        res.sendfile('views/zoom.html'); 
  });


  /***
 *  PRIVATE FUNCTIONS
 **/
 
 function addById(id){

	var promise = [];                     
        var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&wt=json&sort=created+desc&fl=link,id,invnumber', config.solrDAMCore, '"' + id + '"', '"' + id + '"');    
        var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
        var deferred = Q.defer();                                        
        
	sendInterfaceMessage("/imgsrv/addbyid - solr req:" +  solrPath);
  
        return solr.get(solrPath)                    
            .then( function(solrResponse){
                 
                // find artwork(s) in solrdam 
                 if(solrResponse.response.numFound > 0){                            
                   logger.info("/imgsrv/addbyid - solr says:", solrResponse);
                   sendInterfaceMessage("/imgsrv/addbyid - solr says:" +  JSON.stringify(solrResponse));
                   
                    // convert artwork(s)
                   for (i = 0; i < solrResponse.response.numFound; i++){
                        var pyrconv = new converter(); 
                        var params = {}, doc = solrResponse.response.docs[i];
                        params.id = doc.id;
                        params.link = pathConv2Unix(doc.link);
                        params.invnumber = doc.invnumber;      
                        
                        var log = function(){
                            sendInterfaceMessage(sprintf("** addbyid start processing - %s - %s %s", params.invnumber, params.id, params.link ));
                            return Q.defer().resolve('kok');
                        }
                                                
                        sendInterfaceMessage(sprintf("** addbyid start processing - %s - %s %s", params.invnumber, params.id, params.link ));                                                                                  
                        
                        promise.push(
                         pyrconv.exec(params)
                          .then(
                            function(result){
                              sendInterfaceMessage(sprintf("processed - %s **", result ));
                            },
                            function(err){
                              sendInterfaceMessage(sprintf("processing ERROR - %s **", err ));
                            })                          
                        );                                                                                                       
                   };                 
                                                              
                 }else{              
                   logger.info("/imgsrv/addbyid - image not found :" + id);
                   deferred.reject({error: "/imgsrv/addbyid - image not found: " + id});  
                   sendInterfaceMessage("/imgsrv/addbyid - image not found: " +  id);                   
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
		.catch(function (err){
              
              	logger.error('/imgsrv/addbyid', err);
		sendInterfaceMessage("/imgsrv/addbyid - error: " +  err); 
		deferred.rejected(err);
		return deferred.promise;         
            }); 

	
	};

  function pathConv2Unix(windowsPath){
    var unixPath = upath.toUnix(windowsPath);
    return unixPath.replace('F:/FotoII/', '');  
  };
  
  function sendInterfaceMessage(message){
      io.sockets.emit('message', { message: sprintf('%s -- %s', getFormatedNowDate() , message )});  
  };
  
  function getFormatedNowDate(){
       var date = new Date();
       var y = date.getFullYear();
       var M = date.getMonth();
       var d = date.getDate();
       var h = date.getHours();
       var m = date.getMinutes();
       var s = date.getSeconds();
       var ms = date.getMilliseconds();
       
       
       return sprintf('%s-%s-%sT%s:%s:%s.%s', y, M, d, h, m, s, ms);
        
  };

}
