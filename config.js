
var config = {

    // Metadata values
    attribution : "SMK Photo/Skou-Hansen/Buccarella", /*max 32 bytes!*/
    copyrightDefault : 'Public Domain (CC0)',
    webStatementNoRights : 'http://www.smk.dk/en/copyright/creative-commons/',
    webStatementRights : 'http://www.smk.dk/en/copyright/',
    city : 'Copenhagen',
    country : 'Denmark',
    photo : 'Photographers at SMK',
    smk : 'Statens Museum for Kunst',

    // Solr core
    solrHost : '172.20.1.73',
    solrPort : 8080,
    solrCore : '/solr/prod_SQL_full_export/select',

    smkInventoryNumber : 'Iptc.Application2.ObjectName',
    tempFilePath : '/tmp/',
    root : '/mnt/fotoarkiv/',
    port : 4000
}

module.exports = config;

