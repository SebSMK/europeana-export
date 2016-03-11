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
request = require('request'),
bodyParser = require('body-parser');

// create application/json parser
var jsonParser = bodyParser.json();

// parse application/x-www-form-urlencoded
var urlencodedParser = bodyParser.urlencoded({ extended: false });  

var url = require('url');
var proxy = require('proxy-middleware'); 

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');
  //router.set(express.static(path.join(__dirname, 'public')));

  //* proxying calls to IIP server
  router.use(config.IIPPath, proxy(url.parse(sprintf('http://%s%s', config.IIPHost,config.IIPPath))));
  
  //* proxying calls to IIP images
  router.use('/imgsrv/test/zoom/images/', proxy(url.parse(sprintf('http://localhost:%s/images/', config.port))));
  
  
  router.get('/imgsrv/test/zoom/:id',                       
      function(req, res, next) {        
        sendInterfaceMessage('//////// start zooming *******');                                
        
        getImageData(req.params.id)
        .then(function(params){
          res.render('zoom', {title: params.invnumber, invnumber: params.invnumber, path: params.path, IIPServerPath: config.IIPPath});
        })
        .catch(function (err){
          res.send(500);
        })
         
  });  
        
  router.post('/imgsrv/test/zoom', urlencodedParser,                    
      function(req, res, next) {               
        sendInterfaceMessage('//////// start post zooming *******');                                
        
        var images_received = JSON.parse(req.body.images);
        var promise = [];
        var deferred = Q.defer();                
        
        for (i = 0; i < images_received.length; i++) {            
            promise.push(getImageData(images_received[i].id));
        };
        
        Q.allSettled(promise).then(function(result) {
            //loop through array of promises, add items  
            var tosend = [] 
            var images_2zoom = [];            
            result.forEach(function(res) {
                if (res.state === "fulfilled") {
                    var tmpjs = {};
                    tmpjs["path"] = res.value.path;
                    images_2zoom.push(tmpjs);
                    images_2zoom.push(tmpjs);
                    //images_2zoom.push(res.value.path);                    
                }
                else if (res.state === "rejected") {                    
                    logger.error('LOCAL ERR:zoom:post', res.reason);
                    sendInterfaceMessage('LOCAL ERR:zoom:post: ' + res.reason);                       
                }
            });
            promise = []; //empty array, since it's global.
            
            //res.render('zoom', {title: params.invnumber, invnumber: params.invnumber, path: params.path, IIPServerPath: config.IIPPath});
            //res.render('compare', {images:JSON.stringify(images_2zoom), IIPServerPath: config.IIPPath});  
            
            //res.render('compare', {images_2zoom:JSON.stringify(images_2zoom), IIPServerPath: config.IIPPath});
            res.render('compare', {images_2zoom:JSON.stringify(images_2zoom), path:images_2zoom[0].path, IIPServerPath: config.IIPPath});
            //res.render('zoom', {path:images_2zoom[0].path, IIPServerPath: config.IIPPath});            
            
                        
        })
        .catch(function (err){
          logger.error('GENERAL ERR: zoom:post', err);
          sendInterfaceMessage('GENERAL ERR:zoom:post: ' + err);
          res.send(500);
        });
        
        /*
        getImageData(req.body.id)
        .then(function(params){
          res.render('zoom', {title: params.invnumber, invnumber: params.invnumber, path: params.path, IIPServerPath: config.IIPPath});
        })
        .catch(function (err){
          res.send(500);
        })
        */
         
  });

  /*
  router.get('/imgsrv/test/compare/*',                 
      function(req, res, next) {        
        sendInterfaceMessage('//////// start compare *******');                                
        
        var image1 = req.param('image1'), image2 = req.param('image2');                         
        
        if(util.isValidDataText(image1) && util.isValidDataText(image2)) {
          var path = [];
          getImageData(image1)
          .then(function(params){
            path.push(params.path);
            return getImageData(image2);            
          })
          .then(function(params){
            path.push(params.path);            
            res.render('compare', {title: params.invnumber, invnumber: params.invnumber, path:JSON.stringify(path), IIPServerPath: config.IIPPath});
          })
          .catch(function (err){
            res.send(500);
          })
        }                
         
  });

  /***
 *  PRIVATE FUNCTIONS
 **/
 function getImageData(id){                         
        var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&wt=json&sort=created+desc&fl=value,id,invnumber', config.solrDAMCore, '"' + id + '"', '"' + id + '"');    
        var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
        var deferred = Q.defer();                                        
        
	     sendInterfaceMessage("zoom:getImageData - solr req:" +  solrPath);
  
        return solr.get(solrPath)                    
            .then( function(solrResponse){
                 
                // find artwork(s) in solrdam 
                 if(solrResponse.response.numFound > 0){                            
                   logger.info("zoom:getImageData - solr numfound:", solrResponse);
                   sendInterfaceMessage("zoom:getImageData - numfound:" + solrResponse.response.numFound);
                   
                                          
                    var params = {}, doc = solrResponse.response.docs[0];
                    params.id = doc.id;
                    params.path = doc.value;
                    params.invnumber = doc.invnumber;                                                                                                                                                                              
                    
                    deferred.resolve(params);                                                                                                                              
                                
                                                              
                 }else{              
                   logger.info("zoom:getImageData - image not found :" + id);
                   deferred.reject({error: "zoom:getImageData - image not found: " + id});  
                   sendInterfaceMessage("zoom:getImageData - image not found: " +  id);                   
                 }          
                
                return deferred.promise;
		})
		.catch(function (err){              
      logger.error('zoom:getImageData', err);
  		sendInterfaceMessage("zoom:getImageData - error: " +  err); 
  		deferred.reject(err);
  		return deferred.promise;         
    }); 

	
	}

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
      if (io !== undefined && io != null)
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
