
var
  express = require('express'),
  app = express.createServer(express.logger());

//  home page

app.get('/', function(req, res) {
  res.send("Favoritize api is running...");
});

var port = process.env.PORT || 3000;
app.listen(port, function(){
  console.log("Listening on " + port);
});
