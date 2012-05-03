var

  restify = require('restify'),
  mongoose = require('mongoose'),
  crypto = require('crypto'),
  troop = require('mongoose-troop'),
  mongooseTypes = require("mongoose-types"),

  /** Yay, out application name. */
  app_name = "Favoritize",

  // server

  server = restify.createServer({
    name: app_name,
    version: "0.1.0"
  }),

  // helpers

  /** Create random md5 hash. */
  createRandomHash = function () {
    return crypto.createHash('md5').update(
      Math.round((new Date().valueOf() * Math.random())) + '').digest('hex');
  },

  /** Check auth method, used in each restify request. */
  checkAuth = function (req, res, next) {
    var authorization = req.authorization, invalidCredentials = new restify.InvalidCredentialsError(
      'User authentication failed due to invalid authentication values');
    console.log("Check authorization request: %j", authorization);
    if (authorization.scheme === "Basic") {
      UserModel.findOne({ email: authorization.basic.username }, function(err, user) {
        if (err) {
          return next(err);
        }
        if (user) {
          user.authenticate(authorization.basic.password, function (erro, auth) {
            if (erro) {
              return next(erro);
            }
            if (auth === true) {
              // yay, valid user store at request
              req.user = { email: user.email };
              return next();
            }
            return next(invalidCredentials);
          });
        } else {
          return next(invalidCredentials);
        }
      });
    } else {
      // bad schema
      return next(invalidCredentials);
    }
  },

  /** Check if app running in development mode, only for especial methods. */
  checkDevelopmentMode = function (req, res, next) {
    if (process.env['NODE_ENV'] !== "production") {
      // yay, valid execution
      return next();
    }
    // resource not found simulation ^^
    return next(new restify.ResourceNotFoundError(req.url + ' not found'));
  };

// load types

mongooseTypes.loadTypes(mongoose);

var
  Email = mongoose.SchemaTypes.Email /*,
  useTimestamps = mongooseTypes.useTimestamps */;

// database

mongoose.connect(process.env['MONGOHQ_URL'] || 'mongodb://localhost/favoritize');

// mongoose.connect("mongodb://heroku:005bb51403ad4b4d844629ec159bbc10@staff.mongohq.com:10083/app3943745");

var Schema = mongoose.Schema; //Schema.ObjectId

// Schemas

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

Images.plugin(troop.timestamp);

var Categories = new Schema({
  name: String
});

Categories.plugin(troop.timestamp);

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
  categories: [Categories]
});

Product.plugin(troop.keywords, {
  source: ['title', 'description']
});
Product.plugin(troop.timestamp);

var User = new Schema({
  email: {
    type: Email,
    index: {
      unique: true
    },
    required: true
  }
});

User.plugin(troop.basicAuth, {
  loginPath: "email"
});
User.plugin(troop.timestamp);

// FIXME: [outaTiME] must be send an email to client

/*
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

*/

var Invitation = new Schema({
  code: {
    type: String,
    index: {
      unique: true
    },
    required: true
  },
  available: {
    type: Boolean
  }
});

Invitation.plugin(troop.timestamp);

// models

var
  ProductModel = mongoose.model('Product', Product),
  UserModel =  mongoose.model('User', User),
  InvitationModel =  mongoose.model('Invitation', Invitation);

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
  hi = function (req, res, next) {
    // took user form request and deliver
    res.send(req.user);
    return next();
  }/*,
  hello = function (req, res, next) {
    res.send('hello ' + req.params.name);
    return next();
  }*/;

server.get('/hi', checkAuth, hi);
server.head('/hi', checkAuth, hi); // check valid user without output

/*
server.get('/hello/:name', checkAuth, hello);
server.head('/hello/:name', checkAuth, hello);
*/

server.get('/users', checkDevelopmentMode, function(req, res, next) {
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

server.post('/users', function (req, res, next) {
  // check valid invitation code
  InvitationModel.findOne({ code: req.params.invitation_code }, function(err, invitation) {
    if (err) {
      return next(err);
    }
    if (invitation) {
      // FIXME: [outaTiME] check user existence and mark invitation has used
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
    } else {
      return next(new restify.InvalidArgumentError("Unable to find the invitation code provided"));
    }
  });
});

server.get('/codes', checkDevelopmentMode, function(req, res, next) {
  InvitationModel.find({}, ['code'], function (err, docs) {
    if (err) {
      return next(err);
    }
    res.send(docs.map(function(d) {
      return { id: d._id, code: d.code };
    }));
    return next();
  });
});

// fixtures

server.get('/fixtures/user/:name', checkDevelopmentMode, function (req, res, next) {
  var password = createRandomHash();
  UserModel.register({
    email: req.params.name + "@gmail.com",
    password: password
  }, function (err, user) {
    if (err) {
      return next(err);
    }
    console.log("Created password for user was: %s", password);
    res.send(user);
    return next();
  });
});

server.get('/fixtures/invitation', checkDevelopmentMode, function (req, res, next) {
  var code = createRandomHash(), invitation = new InvitationModel({
    code: code
  });
  invitation.save(function (err) {
    if (err) {
      return next(err);
    }
    console.log("New invitation code: %s", code);
    res.send(invitation);
    return next();
  });
});

// launcher

server.listen(process.env.PORT || 3000, function() {
  console.log("%s API listening on port %d", app_name, server.address().port);
  // log.info('Listening: %s', server.url);
});
