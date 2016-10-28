var express = require('express'),
//router = express(),
path = require('path'),
logger = require("../logging"),
config = require('../config'),
converter = require('../converter'), 
CS2EuropeanaAdapter = require('../CS2Europeana'), 
SolrConnector = require('../solr'),
iipproxy = require('../iip'),       
sprintf = require('sprintf-js').sprintf,  
Q = require('q'),
fs = require('fs'),    
Image = require('../image'),
upath = require('upath'),
request = require('request');

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');

  router.get('/export',        
   
    // loading interface and socket IO before proceeding with the route...
      function(req, res, next) {             
           res.render('chat');  
            io.on('connection', function(socket){
              console.log('io connected');                                                          
              next();        
        });               
      },
      function(req, res, next) {             
          io.sockets.emit('message', { message: 'welcome to export console ' + config.version});                                            
          next();                               
      },
      // ...real stuff starting here
      function(req, res, next) {
        
        sendInterfaceMessage('//////// start processing *******');
        //*** Export a random set of 10 images from SMK to Europeana                                         
                      
        var highreslistUri = sprintf('%s?start=%s', config.SMKAPIHighreslistUri, Math.floor((Math.random() * 4000)));
        // highreslistUri = sprintf(config.SMKAPIObjectUri, 'KMS8524');
        
        var imgUri = config.SMKAPIGetImgUri;                        
        var EuropenaUri = config.EuropenaAPIImportUri;
        
        var promise = []; 
        
        getUri(highreslistUri)
        .then(function(body){
          var result = JSON.parse(body);                          
          
          if (result.response.numFound > 0) {          
            for (i = 0; i < result.response.docs.length; i++){
                var params ={}, doc = result.response.docs[i];                
                
                params.invnumber = doc.invnumber !== undefined ? doc.invnumber : doc.id;                              
                                        
                sendInterfaceMessage(sprintf("** start processing - %s", params.invnumber));                                                                                  
                
                promise.push(                                        
                 postPayload(params.invnumber)
                  .then(function(result){
                      if(result.type === undefined){
                        sendInterfaceMessage(sprintf("PROCESSED - %s **", result ));
                      }
                      else{ 
                        throw result;
                      }
                  })
                  .catch(function (err) {                      
                    sendInterfaceMessage(sprintf("processing error: %s **", JSON.stringify(err)));                           
                  })                           
                );                                                                                                       
           }; 
            
          }else{
            throw('no results');
          }
          
          Q.allSettled(promise).then(function(result) {
            //loop through array of promises, add items  
            var tosend = []
            result.forEach(function(res) { 
              if (res.state === "fulfilled") {
                //tosend.push(res.value);
                sendInterfaceMessage("fulfilled: " + res.value);
              }                
              if (res.state === "rejected") {
                //tosend.push(res.reason);
                sendInterfaceMessage("rejected: " + res.reason);
              }                
            });     
            promise = []; //empty array, since it's global.
            //deferred.resolve(tosend);
          }); 
          //res.json(result);       
        })
        .catch(function (error) {
          sendInterfaceMessage(error);
          //res.status(error.error.code).json(error);        
        });     
  });    

  /***
 *  PRIVATE FUNCTIONS
 **/
  
  function getUri(uri) {
    var deferred = Q.defer();
    
    request.get(uri, function (error, response, body) {
      sendInterfaceMessage("GET: " + uri);    
      if (!error && response.statusCode == 200) {                                                                
          deferred.resolve(body);                                    
      }else{        
        deferred.reject(sprintf('getUri error: %s - %s', response.statusCode, error));
      }
    });     
            
    return deferred.promise;     
  }
  
  function checkImageAvailable(id){
    var SMKAPIGetImgUri = config.SMKAPIGetImgUri; 
    var SMKUri = sprintf(SMKAPIGetImgUri, id, 'thumb');
    
    var deferred = Q.defer();
    
    getUri(SMKUri)    
    .then(function(){
      deferred.resolve();                        
    })
    .catch(function (error) {      
      deferred.reject(error);           
    });              
    
    return deferred.promise;       
  }
  
  function postPayload(id){
    var SMKObjectUri = config.SMKAPIObjectUri;
    var SMKUri = sprintf(SMKObjectUri, id);
    var deferred = Q.defer();
    var doc2export; 
    
    getUri(SMKUri)
    .then(function(body){
      var result = JSON.parse(body);                          
      var subdeferred = Q.defer();
      if (result.response.numFound > 0) {  
        // Only the first result
        //for (i = 0; i < result.response.docs.length; i++){
          var params = {}, doc = result.response.docs[0];
          
          sendInterfaceMessage(doc.id, 4);                                          
          subdeferred.resolve(doc)                                                                                                   
        //}; 
        
      }else{        
        subdeferred.reject('no results');
      }
      
      return subdeferred.promise; 
      //res.json(result);       
    })
    .then(function(doc){
      // export to Europeana
      
      doc2export = doc;
      
      return checkImageAvailable(doc2export.id);                    
    })        
    .then(function(){                           
      // import to Europeana      
      var payload = createEuropeanaImportPayload(doc2export);      
      return importToEuropeana(payload);
                        
    })
    .then(function(body){
        sendInterfaceMessage(body);
        deferred.resolve(body);        
    })
    .catch(function (error) {
      sendInterfaceMessage(error);
      deferred.reject(error);
      //res.status(error.error.code).json(error);        
    });              
    
    return deferred.promise;     
  
  }
  
  function createEuropeanaImportPayload(doc){
    var csconfig = {SMKAPIGetImgUri: config.SMKAPIGetImgUri}    
    var c2e = new CS2EuropeanaAdapter(csconfig);
    var payload = c2e.convert(doc);
    
    sendInterfaceMessage(JSON.stringify(payload, 4)); 
    return payload;
  }
  
  function importToEuropeana(payload){
    var deferred = Q.defer();
    var EuropeanaUri = config.EuropenaAPIImportUri;
    var options = {
      uri: EuropeanaUri,
      method: 'POST',
      json: payload
    };
    
    request.post(options, function (error, response, body) {
              
          if (!error && response.statusCode == 200) {                                                                    
              deferred.resolve(body);                                    
          }else{            
            deferred.reject(sprintf('%s error: %s - %s', importToEuropeana, response.statusCode, error));
          }
    });
         
    return deferred.promise;  
  }  
 
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

