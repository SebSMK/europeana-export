var express = require('express');
var router = express();
var path = require('path'),
logger = require("../logging"),
config = require('../config'), 
Solr = require('../solr'),
iipproxy = require('../iip'),       
sprintf = require('sprintf-js').sprintf,  
Q = require('q');

router.set('views', path.join(__dirname, '../views'));
router.set('view engine', 'jade');
router.use(express.static(path.join(__dirname, 'public')));

router.get('/imgsrv/file/:fileid', function(req, res, next) {
   var solrPath = sprintf('%sselect?q=(id%%3A%s)&wt=json&fl=value', config.solrDAMCore, req.params.fileid); //'561e19ebe44bc'); 
              
   // Create a client 
   var solr = new Solr(config.solrDAMHost, config.solrDAMPort); //, config.solrDAMCore);    
    
    solr.get(solrPath)
        .then( function(solrResponse){
           if(solrResponse.response.numFound == 1){
             logger.info("solr post response :", solrResponse);
             var filePath = solrResponse.response.docs[0].value; 
             var iip = new iipproxy(config.IIPHost, config.IIPPath);
             return iip.getImageByFilePath(filePath);             
           }else{              
             logger.info("solr post response - not unique ID - ERROR :", solrResponse);
             return Q.defer().reject(solrResponse);                     
           }                                 
        }).then( function(imgstream){                
                imgstream.pipe(res);                
        })
        .catch(function (err) {
          /*catch and break on all errors or exceptions on all the above methods*/
          logger.error('solr route', err);
          res.send(version + '<br>Solr error: <br>' + err);
    });  
});


router.get('/imgsrv/artwork/:refnumber', function(req, res){     
    var solrPath = sprintf('%sselect?q=(invnumber%%3A%s)&sort=created+desc&wt=json&fl=value', config.solrDAMCore, req.params.refnumber); //'561e19ebe44bc'); 
              
   // Create a client 
   var solr = new Solr(config.solrDAMHost, config.solrDAMPort); //, config.solrDAMCore);    
    
    solr.get(solrPath)
        .then( function(solrResponse){
           if(solrResponse.response.numFound > 0){
             logger.info("solr post response :", solrResponse);
             var filePath = solrResponse.response.docs[0].value; 
             var iip = new iipproxy(config.IIPHost, config.IIPPath);
             return iip.getImageByFilePath(filePath);             
           }else{              
             logger.info("solr post response - not unique ID - ERROR :", solrResponse);
             return Q.defer().reject(solrResponse);                     
           }                                 
        }).then( function(imgstream){                
                imgstream.pipe(res);                
        })
        .catch(function (err) {
          //catch and break on all errors or exceptions on all the above methods
          logger.error('solr route', err);
          res.send(version + '<br>Solr error: <br>' + err);
    });       
});

module.exports = router;
