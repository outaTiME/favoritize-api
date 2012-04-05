var
  restify = require('restify'),
  server = restify.createServer({
    name: "Favoritize",
    version: "0.1.0"
  });

// test

server.get('/', function(req, res, next) {
  res.send("Hi!");
});

// services

function respond(req, res, next) {
  res.send('hello ' + req.params.name);
}

server.get('/hello/:name', respond);
server.head('/hello/:name', respond);

// startup

server.listen(process.env.PORT || 3000, function() {
  console.log('%s listening at %s', server.name, server.url);
});
