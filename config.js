
var config = {

    version :  '000.001.020',
    
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

    // IIP
    IIPHost : '172.20.1.203',
    IIPPath : '/iipsrv/iipsrv.fcgi',
    IIPImageSize:{
              thumb: 100,
              medium: 200,
              large: 500    
    },

    // MongoDB
    mongoURL: 'mongodb://localhost:27017/DAM_PYR',

    smkInventoryNumber : 'Iptc.Application2.ObjectName',
    originalCopyright : 'Iptc.Application2.Copyright',
    tempFilePath : '/tmp/',
    root : '/mnt/fotoII/',
    port : 4000
}

module.exports = config;

