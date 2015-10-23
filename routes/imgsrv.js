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
upath = require('upath');

router.set('views', path.join(__dirname, '../views'));
router.set('view engine', 'jade');
//router.use(express.static(path.join(__dirname, '../private')));


/***
 *  GET PYR IMAGE
 *  @id: can be an artwork reference number or an unique image id
 *  
 *  optional:
 *  @size: predefined size: thumb/medium/large/original (defaut: original)
 **/
router.get('/imgsrv/get/:id', function(req, res, next) {
    var redir = sprintf('/imgsrv/get/%s/original', req.params.id);
    res.redirect(redir);
});

router.get('/imgsrv/get/:id/:size', function(req, res, next) {
   var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&sort=created+desc&wt=json&fl=value', config.solrDAMCore, req.params.id, req.params.id); //'561e19ebe44bc'); 
   var imgsize = config.IIPImageSize[req.params.size];
   var solr = new Solr(config.solrDAMHost, config.solrDAMPort);  
    
    solr.get(solrPath)
        .then( function(solrResponse){
           if(solrResponse.response.numFound > 0){
             logger.info("/imgsrv/get - solr says:", solrResponse);
             // only the first image is converted
             var pyrfilePath = solrResponse.response.docs[0].value; 
             var iip = new iipproxy(config.IIPHost, config.IIPPath, imgsize);
             return iip.getImageByFilePath(pyrfilePath);             
           }else{              
             logger.info("/imgsrv/get - image not found :", pyrfilePath);             
             return res.status(404).send({error: "/imgsrv/get - image not found : " + pyrfilePath});                     
           }                                 
        }).then( function(imgstream){                
              imgstream.pipe(res);                
        })
        .catch(function (err) {
          //catch and break on all errors or exceptions on all the above methods
          logger.error('/imgsrv/get', err);
          res.send(version + '<br>/imgsrv/get error: <br>' + err);
    });  
});


/***
 *  CONVERT IMAGE(S) OF A GIVEN REFERENCE IN SOLR DAM TO PYR
 *  @id: can be an artwork reference number or an unique image id  
 *  
 **/ 

router.get('/imgsrv/add/:id', function(req, res, next) {                
    var promise = [];                     
    var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&wt=json&fl=link,id,invnumber', config.solrDAMCore, req.params.id, req.params.id);    
    var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
  
    
    solr.get(solrPath)
        .then( function(solrResponse){
             var deferred = Q.defer();
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
                
        }).then(function(tosend){
            res.send(tosend);        
        })
        .catch(function (err){
          //catch and break on all errors or exceptions on all the above methods
          logger.error('/imgsrv/post', err);          
          return res.status(500).send({error: err});
        });     
});

/***
 *  CONVERT POSTED DATA TO PYR IMAGES
 *  @id: unique id for original image in Solr DAM
 *  @invnumber: inventar number of the image
 *  @link: link to original image
 *  
 **/ 

router.post('/imgsrv/add', function(req, res) {
    var params = req.body; 
    var pyrconv = new converter();
    
    pyrconv.exec(params)
    .then(function(response){
        return res.send(response);
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