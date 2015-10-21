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


/***
 *  GET AN IMAGE
 *  @fileid: can be an artwork reference number or a given image id
 **/
router.get('/imgsrv/get/:fileid', function(req, res, next) {
    var redir = sprintf('/imgsrv/get/%s/original', req.params.fileid);
    res.redirect(redir);
});

router.get('/imgsrv/get/:fileid/:size', function(req, res, next) {
   var solrPath = sprintf('%sselect?q=id%%3A%s+OR+invnumber%%3A%s&sort=created+desc&wt=json&fl=value', config.solrDAMCore, req.params.fileid, req.params.fileid); //'561e19ebe44bc'); 
   var imgsize = config.IIPImageSize[req.params.size];
              
   // Create a client 
   var solr = new Solr(config.solrDAMHost, config.solrDAMPort); //, config.solrDAMCore);    
    
    solr.get(solrPath)
        .then( function(solrResponse){
           if(solrResponse.response.numFound > 0){
             logger.info("/imgsrv/get - solr says:", solrResponse);
             var filePath = solrResponse.response.docs[0].value; 
             var iip = new iipproxy(config.IIPHost, config.IIPPath, imgsize);
             return iip.getImageByFilePath(filePath);             
           }else{              
             logger.info("/imgsrv/get - id not found :", solrResponse);
             return Q.defer().reject(solrResponse);                     
           }                                 
        }).then( function(imgstream){                
                imgstream.pipe(res);                
        })
        .catch(function (err) {
          /*catch and break on all errors or exceptions on all the above methods*/
          logger.error('/imgsrv/get', err);
          res.send(version + '<br>/imgsrv/get error: <br>' + err);
    });  
});

module.exports = router;
