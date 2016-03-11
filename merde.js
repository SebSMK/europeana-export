// grab the packages we need
var express = require('express');
var app = express();
var port = 4004;

// routes will go here

 
// This route receives the posted form.
// As explained above, usage of 'body-parser' means
// that `req.body` will be filled in with the form elements
var bodyParser = require('body-parser');

app.use(bodyParser.json());
//var jsonParser = bodyParser.json();

// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/merde', function(req, res){
  // The form's action is '/' and its method is 'POST',
  // so the `app.post('/', ...` route will receive the
  // result of our form
  var html = '<form action="/merde" method="post" enctype="application/x-www-form-urlencoded">' +
               'Enter your name:' +
               '<input type="text" name="userName" placeholder="..." />' +
               '<br>' +
               '<button type="submit">Submit</button>' +
            '</form>';
               
  res.send(html);
});

app.post('/merde', function(req, res){
  console.log(req.body); 
}); 

// start the server
app.listen(port);
console.log('Server started! At http://localhost:' + port);