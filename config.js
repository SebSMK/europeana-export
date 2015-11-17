
var config = {

    version :  '000.001.039',
    
    // Import parameters        
    dummy: false,
    maxFileSize:  2000000000,   
    solrParamsImportAll: {
                //'q': 'invnumber%3Akms*+AND+(type%3A".tif"+OR+type%3A".jpg")',
                //'q': 'invnumber:kms* AND (type:".tif" OR type:".jpg")',
                'q': '*:*',
                                
                'rows': 0,
                'wt': 'json',
                'indent': 'true',
                'facet': 'true',
                'facet.mincount': 1,
                
                'facet.field': 'invnumber',
                'f.invnumber.facet.sort': 'index',                
                'json.nl': 'map',
                                
                'facet.limit': 20
                //'fq': 'invnumber:kms*',
                //'q': 'invnumber%3Akms5957'
                
            },
    
    // Metadata values
    attribution : "SMK Photo/Skou-Hansen/Buccarella", /*max 32 bytes!*/
    oldAttribution : 'Hans Petersen',
    copyrightDefault : 'Public Domain (CC0)',
    webStatementNoRights : 'http://www.smk.dk/en/copyright/creative-commons/',
    webStatementRights : 'http://www.smk.dk/en/copyright/',
    city : 'Copenhagen',
    country : 'Denmark',
    photo : 'Photographers at SMK',
    smk : 'Statens Museum for Kunst',

    // Solr corpus
    solrHost : '172.20.1.73',
    solrPort : 8080,
    solrCore : '/solr/prod_SQL_full_export/select',
    
    // Solr dam
    solrDAMHost : '172.20.1.159',
    solrDAMPort : 8180,
    solrDAMCore : '/solr-example/dev_DAM/',
    
    // Solr tag
    solrTagHost : '172.20.1.94',
    solrTagPort : 8080,
    solrTagCore : '/solr-h4dk/prod_search_pict/',

    // IIP
    IIPHost : '172.20.1.203',
    IIPPath : '/iipsrv/iipsrv.fcgi',
    IIPImageSize:{
              thumb: 100,
              medium: 200,
              large: 500    
    },    

    smkInventoryNumber : 'Iptc.Application2.ObjectName',
    originalCopyright : 'Iptc.Application2.Copyright',
    tempFilePath : '/tmp/',
    root : '/mnt/fotoII/',
    port : 4000,
    
    // Mounts
    mnt: {fotoI: '/mnt/fotoI/',
          fotoII: '/mnt/fotoII/'}
        
    // MongoDB
    //mongoURL: 'mongodb://localhost:27017/DAM_PYR',
    
}

module.exports = config;

