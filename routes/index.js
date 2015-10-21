var express = require('express');
var router = express();
var path = require('path');

router.set('views', path.join(__dirname, '../views'));
router.set('view engine', 'jade');
router.use(express.static(path.join(__dirname, 'public')));

router.get('/', function(req, res, next) {
  res.render('index');
});

module.exports = router;
