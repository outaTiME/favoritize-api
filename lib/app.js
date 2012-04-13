var

  restify = require('restify'),
  Logger = require('bunyan'),

  // globals

  appname = 'Favoritize',

  // mainline

  log = new Logger({
    name: appname,
    level: 'trace' /*,
    src: true */
  }),

  server = restify.createServer({
    name: appname,
    version: "0.1.0",
    log: log
  }),

  // helpers

  authenticate = function (req, res, next) {
    /*

    myPretendDatabaseClient.lookup(req.username, function (err, user) {
        if (err) return next(err);

        if (user.password !== req.authorization.basic.password)
            return next(new restify.NotAuthorizedError());

        return next();
    });

    */
    var authz = req.authorization;
    log.info('Authorization: %j', authz);
    if (authz.scheme !== 'Basic' || authz.basic.username !== 'root' || authz.basic.password !== 'secret') {
      return next(new restify.NotAuthorizedError('Failed to authenticate user'));
    }
    return next();
  };


// middlewares

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(authenticate);
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.urlEncodedBodyParser());
server.use(restify.throttle({burst: 100, rate: 50, ip: true, overrides: {}}));

// slow

/* server.use(function slowHandler(req, res, next) {
  setTimeout(function() { return next(); }, 250);
}); */

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

// pre

/* server.on('after', function(req, res, name) {
  log.info('%s just finished: %d.', name, res.code);
});

server.on('NotFound', function(req, res) {
  res.send(404, req.url + ' was not found');
});

// server.on('MethodNotAllowed', function(req, res) {
//   res.send(405);
// }); */

// startup

server.listen(process.env.PORT || 3000, function() {
  log.info('Listening: %s', server.url);
});
