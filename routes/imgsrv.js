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
Image = require('../image');

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
             return Q.defer().reject("/imgsrv/get - image not found : " + pyrfilePath);                     
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
 *  CONVERT IMAGE TO PYR
 *  @id: can be an artwork reference number or an unique image id  
 *  
 **/ 
router.get('/imgsrv/post/:id', function(req, res) {
   var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&wt=json&fl=link,id,invnumber', config.solrDAMCore, req.params.id, req.params.id);    
   var solr = new Solr(config.solrDAMHost, config.solrDAMPort);   
    
    solr.get(solrPath)
        .then( function(solrResponse){
            
           if(solrResponse.response.numFound > 0){
             var doc, filepath;             
             logger.info("/imgsrv/post - solr says:", solrResponse);
             
             for (i = 0; i < solrResponse.response.numFound; i++) { 
                filepath += solrResponse.response.docs[i].link;                
             }                 
             
             return res.send(filepath);                                            
           }else{              
             logger.info("/imgsrv/post - image not found :", filePath);
             return Q.defer().reject("/imgsrv/post - image not found : " + filePath);                     
           }                                
        })
        .catch(function (err){
          //catch and break on all errors or exceptions on all the above methods
          logger.error('/imgsrv/post', err);          
          return res.status(500).send({error: err});
        });  
}); 


/***
 *  CONVERT IMAGE TO PYR
 *  @id: unique id for original image in Solr DAM
 *  @invnumber: inventar number of the image
 *  @link: link to original image
 *  
 **/ 

router.post('/imgsrv/post', function(req, res) {
    var params = req.body; 
    var conv = new converter();
    conv.exec(params)
    .then(function(response){
        return res.send(response);
    }) 
    .catch(function (err){
      //catch and break on all errors or exceptions on all the above methods
      logger.error('/imgsrv/post', err);
      return res.status(500).send({error: err});
    });     
    
});

/*
router.post('/imgsrv/post', function(req, res) {
    var params = req.body;        
    var filePath, 
        resourcePath, 
        solrid, 
        invnumber; 
                           
    //check params                      
    solrid = params.id;            
    logger.info("solrid :", solrid);
    
    invnumber = params.invnumber;            
    logger.info("invnumber :", invnumber);
    
    resourcePath = params.link;            
    logger.info("resourcePath :", resourcePath);

    filePath = path.join(config.root, resourcePath);
    logger.info("filePath name :", filePath);
    
    return fs.exists(filePath, function(exists) {
        var image;
        if (!exists) {
            return res.send(404);
        }
        try{
            image = new Image(filePath, solrid);
        }
        catch(ex){
            logger.error(ex);
            return res.send(400);
        }
        return image.process(function(data, type) {                                    
            
            var solr = new Solr(config.solrDAMHost, config.solrDAMPort, config.solrDAMCore);                
            var reqparams = [{"id": solrid, "value":{"set": data}}];
            
            solr.postjson(reqparams)
              .then( function(solrResponse){
                 logger.info("/imgsrv/post - solr dam response :", solrResponse);
                 return res.send(sprintf("/imgsrv/post - pyr image created - %s - %s - %s", invnumber, solrid, data));
              })
              .catch(function (err) {
                  //catch and break on all errors or exceptions on all the above methods
                  logger.error('/imgsrv/post', err);
                  return res.send('/imgsrv/post error: <br>' + err);
              });                               
        },
        function(error) {
            return res.status(500).send({error: error});
        });
    });
});

*/

module.exports = router;