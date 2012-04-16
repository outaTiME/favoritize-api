var

  restify = require('restify'),
  mongoose = require('mongoose'),
  crypto = require('crypto'),

  /** Yay, out application name. */
  app_name = "Favoritize",

  // server

  server = restify.createServer({
    name: app_name,
    version: "0.1.0"
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
    // log.info('Authorization: %j', authz);
    if (authz.scheme !== 'Basic' || authz.basic.username !== 'admin' || authz.basic.password !== 'c%}YW34^86>7,xJ') {
      return next(new restify.NotAuthorizedError('Failed to authenticate user'));
    }
    return next();
  };

// database

mongoose.connect('mongodb://localhost/favoritize');

var Schema = mongoose.Schema; //Schema.ObjectId

// Schemas

var User = new Schema({

});

var Images = new Schema({
  kind: {
    type: String,
    "enum": ['thumbnail', 'catalog', 'detail', 'zoom'],
    required: true
  },
  url: {
    type: String,
    required: true
  }
});

var Categories = new Schema({
  name: String
});

var Product = new Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  style: {
    type: String,
    unique: true
  },
  images: [Images],
  categories: [Categories],
  modified: {
    type: Date,
    "default": Date.now
  }
});

function validatePresenceOf(value) {
  return value && value.length;
}

function toLower (v) {
  return v.toLowerCase();
}

var User = new Schema({
  'email': {
    type: String,
    validate: [validatePresenceOf, 'an email is required'],
    index: {
      unique: true
    },
    set: toLower
  },
  'hashed_password': String,
  'salt': String
});

User.virtual('id')
  .get(function() {
    return this._id.toHexString();
  });

User.virtual('password')
  .set(function(password) {
    this._password = password;
    this.salt = this.makeSalt();
    this.hashed_password = this.encryptPassword(password);
  })
  .get(function() { return this._password; });

User.method('authenticate', function(plainText) {
  return this.encryptPassword(plainText) === this.hashed_password;
});

User.method('makeSalt', function() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
});

User.method('encryptPassword', function(password) {
  return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
});

User.pre('save', function(next) {
  if (!validatePresenceOf(this.password)) {
    next(new Error('Invalid password'));
  } else {
    next();
  }
});

// models

var
  ProductModel = mongoose.model('Product', Product),
  UserModel =  mongoose.model('User', User);

// middlewares

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.bodyParser());
// server.use(restify.urlEncodedBodyParser());
server.use(restify.throttle({burst: 100, rate: 50, ip: true, overrides: {}}));

// routes

var
  ping = function (req, res, next) {
    res.send("Ok");
    return next();
  }/*,
  hello = function (req, res, next) {
    res.send('hello ' + req.params.name);
    return next();
  }*/;

server.get('/', authenticate, ping);
server.head('/', authenticate, ping);

/*
server.get('/hello/:name', authenticate, hello);
server.head('/hello/:name', authenticate, hello);
*/

/*
server.get('/users', authenticate, function(req, res, next) {
  UserModel.find({}, ['email'], function (err, docs) {
    if (err) {
      return next(err);
    }
    res.send(docs.map(function(d) {
      return { id: d._id, email: d.email };
    }));
    return next();
  });
});
*/

server.post('/users', function (req, res, next) {
  var user = new UserModel({
    email: req.params.email,
    password: req.params.password
  });
  user.save(function (err) {
    if (err) {
      return next(err);
    }
    res.send(user);
    return next();
  });
});

// launcher

server.listen(process.env.PORT || 3000, function() {
  console.log("%s API listening on port %d", app_name, server.address().port);
  // log.info('Listening: %s', server.url);
});
