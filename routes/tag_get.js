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

  router.get('/tag/get/:id', function(req, res, next) {     
    // SolrDAM
    var solrDAM = new Solr(config.solrDAMHost, config.solrDAMPort);
    var solrDAMPath = sprintf('%sselect?', config.solrDAMCore);
    var solrParams = {
        'q': sprintf('(id%%3A%s+OR+invnumber%%3A%s)', '"' + req.params.id + '"', '"' + req.params.id + '"'),
        'sort': 'created+desc',
        'wt': 'json',
        'indent': 'true',
        'json.nl': 'map',
        'fl': 'link,value,id,type,invnumber'
    };
    var solrDAMReq = [];

    for (var key in solrParams) {
        if (solrParams.hasOwnProperty(key)) {
            solrDAMReq.push(sprintf('%s=%s', key, solrParams[key]));
        }
    }               

    solrDAM.get(solrDAMPath + solrDAMReq.join('&'))
        .then(function(solrDAMResponse) {
            if (solrDAMResponse.response.numFound > 0) { 
                //res.send("/tag/get - solr says:" + JSON.stringify(solrResponse.response.docs[0]));
                // SolrTag    
                var solrTag = new Solr(config.solrTagHost, config.solrTagPort);
                var solrTagPath = sprintf('%sselect?', config.solrTagCore);
                solrParams = {
                    'q': sprintf('(picture_url%%3A*%s.jpg)', solrDAMResponse.response.docs[0].invnumber.toUpperCase()),
                    'facet':'true',
                    'facet.mincount': 1,
                    'facet.limit': -1,
                    'facet.field':'prev_facet',
                    'rows': '0',
                    'wt': 'json',
                    'indent': 'true',
                    'json.nl': 'map'
                };
                var solrTagReq = [];
            
                for (var key in solrParams) {
                    if (solrParams.hasOwnProperty(key)) {
                        solrTagReq.push(sprintf('%s=%s', key, solrParams[key]));
                    }
                }
                logger.info("/tag/get - start solrTagPath :", solrTagPath + solrTagReq.join('&'));     
                return solrTag.get(solrTagPath + solrTagReq.join('&'));                                  
                                                
            } else {
                logger.info("/tag/get - object not found :", req.params.id );
                throw ({error: "/tag/get - object not found : " + req.params.id });
            }
        })
        .then(function(solrTagResponse) {
            if (solrTagResponse.response.numFound > 0) {
                res.send(solrTagResponse);
            }else {
                logger.info("/tag/get tag - object not found");
                throw ({error: "/tag/get tag - object not found"});
            }
        })
        .catch(function(err) {
            //catch and break on all errors or exceptions on all the above methods
            logger.error('/tag/get', err);
            res.send(version + '<br>/tag/get error: <br>' + err);
        });
  });
  
  
  router.get('/tag/getTag/:id', function(req, res, next) {     
    // solrTag
    var solrTag = new Solr(config.solrTagHost, config.solrTagPort);
    var solrTagPath = sprintf('%sselect?', config.solrTagCore);
    solrParams = {
        'q': sprintf('(picture_url%%3A*%s.jpg)', 'KMS1'),
        'facet':'true',
        'facet.field':'prev_facet',
        'rows': '0',
        'wt': 'json',
        'indent': 'true',
        'json.nl': 'map'
    };
    var solrTagReq = [];

    for (var key in solrParams) {
        if (solrParams.hasOwnProperty(key)) {
            solrTagReq.push(sprintf('%s=%s', key, solrParams[key]));
        }
    }
    logger.info("/tag/get - start solrTagPath :", solrTagPath + solrTagReq.join('&'));
         
    solrTag.get(solrTagPath + solrTagReq.join('&')) 
        .then(function(solrDAMResponse) {
            if (solrDAMResponse.response.numFound > 0) { 
                logger.info("/tag/get - object not found :", JSON.stringify(solrDAMResponse.response.docs[0]));                                 
                                                
            } else {
                logger.info("/tag/get - object not found :", req.params.id );
                throw ({error: "/tag/get - object not found : " + req.params.id });
            }
        })
        .catch(function(err) {
            //catch and break on all errors or exceptions on all the above methods
            logger.error('/tag/get', err);
            res.send(version + '<br>/tag/get error: <br>' + err);
        });
  });



}
