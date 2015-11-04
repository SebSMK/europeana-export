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

module.exports = function(router, io) {
  router.set('views', path.join(__dirname, '../views'));
  router.set('view engine', 'jade');

   router.get('/imgsrv/test/add/allv1',        
   
    // loading interface and socket IO before proceeding with the route...
      function(req, res, next) {             
           res.render('chat');  
            io.on('connection', function(socket){
              console.log('io connected');                                                          
              next();        
        });               
      },
      function(req, res, next) {             
          io.sockets.emit('message', { message: 'welcome to import console ' + config.version});                                            
          next();                               
      },
      // ...real stuff starting here
      function(req, res, next) {
        
        sendInterfaceMessage('//////// start processing *******');
                        
        var promise = [];                     
        var solrPath = sprintf('%sselect?q=invnumber%%3Akms*+AND+(type%%3A".tif"+OR+type%%3A".jpg")&sort=invnumber+ASC&rows=100&wt=json&indent=true', config.solrDAMCore);    
        var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
        var deferred = Q.defer();                                        
          
        solr.get(solrPath)                    
            .then( function(solrResponse){
                 
                // find artwork(s) in solrdam 
                 if(solrResponse.response.numFound > 0){                            
                   logger.info("/imgsrv/post - solr says:", solrResponse);
                   sendInterfaceMessage("/imgsrv/post - solr says: solrResponse.response.numFound - " +  solrResponse.response.numFound);
                   
                    // convert artwork(s)
                   for (i = 0; i < solrResponse.response.docs.length; i++){
                        var pyrconv = new converter(); 
                        var params = {}, doc = solrResponse.response.docs[i];
                        params.id = doc.id;
                        params.link = pathConv2Unix(doc.link);
                        params.invnumber = doc.invnumber;                              
                                                
                        sendInterfaceMessage(sprintf("** start processing - %s - %s %s", params.invnumber, params.id, params.link ));                                                                                  
                        
                        promise.push(
                         pyrconv.exec(params)
                          .then(
                            function(result){
                              sendInterfaceMessage(sprintf("PROCESSED - %s **", result ));
                            },
                            function(err){
                              sendInterfaceMessage(sprintf("processing error - %s **", err ));
                            })                          
                        );                                                                                                       
                   };                 
                                                              
                 }else{              
                   logger.info("/imgsrv/post - image not found :" + solrResponse);
                   deferred.reject({error: "/imgsrv/post - image not found: " + JSON.stringify(solrResponse)});  
                   sendInterfaceMessage("/imgsrv/post - image not found: " +  JSON.stringify(solrResponse));                   
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
                  sendInterfaceMessage('******** processing done //////////');
                  res.end();
            },
            function(error){
                  sendInterfaceMessage('ERROR -- ' + JSON.stringify(error));
                  sendInterfaceMessage('******** processing terminating //////////');
            })
            .catch(function (err){
              //catch and break on all errors or exceptions on all the above methods
              logger.error('/imgsrv/post', err);          
              return res.status(500).send({error: err});
            });  
  });
  
router.get('/imgsrv/test/console', 
    // loading interface and socket IO before proceeding with
      function(req, res, next) {             
           res.render('chat');  
            io.on('connection', function(socket){
              console.log('io connected');                                                          
              next();        
        });               
      },
      function(req, res, next) {             
          io.sockets.emit('message', { message: 'welcome to import console ' + config.version});                                                                       
      });


router.get('/imgsrv/test/promise', 
    // loading interface and socket IO before proceeding with
      function(req, res, next) {             
           res.render('chat');  
            io.on('connection', function(socket){
              console.log('io connected');                                                          
              next();        
        });               
      },
      function(req, res, next) {             
          io.sockets.emit('message', { message: 'welcome to import console ' + config.version});  
		next();                                                                     
      },
	function(req, res){
		io.sockets.emit('message', { message: 'start loop function '}); 
		var process = function(param){
					var deferred = Q.defer();
					setTimeout(function(){ 
							io.sockets.emit('message', { message: 'loop function ' + param}); 
							return deferred.resolve(param + 1) ; 
						},1000);
					return deferred.promise;
				} 


		var files = [11,22,33];

		var readFiles = function(files) {
		  var p = Q();

		  files.forEach(function(file){
		      p = p.then(function(){ return process(file); });
		  });
		  return p;
		};

		readFiles(files).then(function(){
			io.sockets.emit('message', { message: 'stop first loop function '}); 
		});
		

/*		
		process(1)
		.then(function(param){
			return process(param);
		})
		.then(function(param){
			return process(param);
		})
		.then(function(param){
			return process(param);
		})
		.then(function(){
			io.sockets.emit('message', { message: 'stop loop function '}); 
		})*/
	}
);


  router.get('/imgsrv/test/add/all', 
    // loading interface and socket IO before proceeding with the route...
      function(req, res, next) {             
           res.render('chat');  
            io.on('connection', function(socket){
              console.log('io connected');                                                          
              next();        
        });               
      },
      function(req, res, next) {             
          io.sockets.emit('message', { message: 'welcome to import console ' + config.version});   
	io.sockets.emit('message', { message: 'starting importing all images to proto-DAM' + config.version});                                              
          next();                               
      },
      // ...real stuff starting here
      function(req, res, next) {
        
        sendInterfaceMessage('//////// start processing all images *******');
                        
        var promise = [];                      
	var solrPath = sprintf('%sselect?', config.solrDAMCore); 
	var solrParams = {
		'q': 'invnumber%3Akms*+AND+(type%3A".tif"+OR+type%3A".jpg")',
		//'sort': 'invnumber+ASC',
		'rows': 0,
		'wt': 'json',
		'indent': 'true',
		'facet': 'true',
		'facet.mincount':1,
		'facet.limit':-1,
		'facet.field':'invnumber',
		'f.invnumber.facet.sort':'index',
		'fq':'invnumber:kms*',
		'json.nl': 'map'
	};
	var solrReq = [];
	
	for (var key in solrParams) {
	  if (solrParams.hasOwnProperty(key)) {
	    solrReq.push(sprintf('%s=%s', key, solrParams[key]));
	  }
	}

	sendInterfaceMessage('solr request: ' + solrPath + solrReq.join('&'));
   
        var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
        var deferred = Q.defer();                                        
          
        solr.get(solrPath + solrReq.join('&'))                    
            .then( function(solrResponse){
                
		var maxCount = 0;
		  var objectedItems = [];
		  for (var facet in solrResponse.facet_counts.facet_fields['invnumber']) {
sendInterfaceMessage("facet: " + facet);
if (facet.indexOf(" ") >= 0) continue; // NO WHITE SPACES IN INV NUMBER FOR NOW!!!

		    var count = parseInt(solrResponse.facet_counts.facet_fields['invnumber'][facet]);
		    if (count > maxCount) {
		      maxCount = count;
		    }
		    objectedItems.push({ facet: facet, count: count });
		  }
		  objectedItems.sort(function (a, b) {
		    return a.facet < b.facet ? -1 : 1;
		  });


 
                // find artwork(s) in solrdam 
                 if(objectedItems.length > 0){                            
                   logger.info("/imgsrv/addall - solr says:", objectedItems.length);
                   sendInterfaceMessage("/imgsrv/addall - solr says:" +  objectedItems.length);
                
			var artwork2Process = [];
			for (var i = 0, l = objectedItems.length; i < l; i++) {
		                var pyrconv = new converter(); 
		                var params = {};
		                params.invnumber = objectedItems[i].facet; 
		                artwork2Process.push(params);
		         };
	       
			 var convimage = function(params){
				sendInterfaceMessage(sprintf("** start processing - %s", params.invnumber ));
				return addById(params.invnumber);
			};      

			var processing = function(artworks) {
			  var p = Q();

			  artworks.forEach(function(artwork){
			      p = p.then(function(){ return convimage(artwork); }, function(){ return convimage(artwork); });
			  });
			  return p;
			};
		
		
			processing(artwork2Process).then(
			      function(tosend){
				sendInterfaceMessage(JSON.stringify(tosend));
				  sendInterfaceMessage(sprintf('******** - processing done //////////', params.invnumber));
				  res.end();
			    },
			    function(error){
				  sendInterfaceMessage('ERROR -- ' + JSON.stringify(error));
				  sendInterfaceMessage(sprintf('******** - processing done //////////', params.invnumber));
				res.end();
		    	}); 
/*  

		var images2Process = [];
		for (i = 0; i < solrResponse.facet_counts.facet_fields.invnumber.length; i++){
                        var pyrconv = new converter(); 
                        var params = {}, doc = solrResponse.response.docs[i];
                        params.id = doc.id;
                        params.link = pathConv2Unix(doc.link);
                        params.invnumber = doc.invnumber; 
                        images2Process.push(params);
                 };
       
		 var convimage = function(params){
			sendInterfaceMessage(sprintf("** start processing - %s - %s %s", params.invnumber, params.id, params.link ));
			return pyrconv.dummyexec(params);
		};      

		var processing = function(images) {
		  var p = Q();

		  images.forEach(function(image){
		      p = p.then(function(){ return convimage(image); });
		  });
		  return p;
		};
		
		
		processing(images2Process).then(
		      function(tosend){
		          sendInterfaceMessage('******** processing done //////////');
		          res.end();
		    },
		    function(error){
		          //sendInterfaceMessage('ERROR -- ' + JSON.stringify(error));
		          sendInterfaceMessage('******** processing done //////////');
			res.end();
		    }); */
                                         
                 }else{              
                   logger.info("/imgsrv/addall - image not found :" + solrResponse);
                   deferred.reject({error: "/imgsrv/addall - image not found: " + JSON.stringify(solrResponse)});  
                   sendInterfaceMessage("/imgsrv/addall - image not found: " +  JSON.stringify(solrResponse));                   
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
            
  });

router.get('/imgsrv/test/add/:id', 
    // loading interface and socket IO before proceeding with the route...
      function(req, res, next) {             
           res.render('chat');  
            io.on('connection', function(socket){
              console.log('io connected');                                                          
              next();        
        });               
      },
      function(req, res, next) {             
          io.sockets.emit('message', { message: 'welcome to import console ' + config.version});                                            
          next();                               
      },
      // ...real stuff starting here
      function(req, res, next) {
        
        sendInterfaceMessage('//////// start processing *******');
                        
        addById(req.params.id)                    
            .then(
              // processing output
              function(tosend){
                  sendInterfaceMessage('******** processing done //////////');
                  res.end();
            },
            function(error){
                  sendInterfaceMessage('ERROR -- ' + JSON.stringify(error));
                  sendInterfaceMessage('******** processing done //////////');
            }); 
  });


  /***
 *  PRIVATE FUNCTIONS
 **/
 
 function addById(id){

	var promise = [];                     
        var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&wt=json&fl=link,id,invnumber', config.solrDAMCore, '"' + id + '"', '"' + id + '"');    
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



/*
router.get('/test/emit', 
    function(app, io, req, res, next) {
     res.render('chat');
     
     io.on('connection', function(socket){
        console.log('io connected');
        socket.emit('message', { message: 'welcome to the chat4' });
        io.sockets.emit('message', { message: 'welcome to test!!' });                    
      });    
    
});


module.exports = router;    */