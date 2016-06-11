var express = require('express');
//var favicon = require('serve-favicon');
var proxy = require( 'http-proxy' ).createProxyServer({});
var http = require('http');
//var https = require('https');

var app = express();


var config = require('./config');

//Uncomment if you don't want to redirect / and /apex to the new /ords
if (config.ords.redirectPaths.length > 0){
  for(i=0; i< config.ords.redirectPaths.length; i++){
    app.use(config.ords.redirectPaths[i],function(req, res, next){
      res.redirect(config.ords.path);
    });
  }
}

//Can store custom images in public/...
app.use(config.static.path, express.static(config.static.directory));
app.use(config.apex.images.path,express.static(config.apex.images.directory));

//Register favicon if applicable
// if (config.faviconUrl){
//   console.log('Favicon')
//   app.use(favicon(__dirname + config.faviconUrl));
// }


app.use(config.ords.path, function (req, res, next){
  proxy.web(req, res, { target: config.ords.webContainerUrl + req.baseUrl},
    function(e){
      console.log('proxy.web error: ', e);
    }
  );
});

// Make sure this is last as it will forward to APEX
app.get('/', function(req, res, next){
  res.redirect(config.ords.path);
});



// app.listen(httpPort);
server = http.createServer(app).listen(config.web.http.port);
console.log('Listening on '+config.web.http.port);
//Enable once SSL cert defined
// https.createServer(options, app).listen(config.ports.https);

var io = require('socket.io').listen(server);

io.on('connection', function(socket){

  socket.on('disconnect', function(socket){
    console.log('a user disconnected ...');
    //showSocketInfo(socket);
    console.log('socket\n',socket);
  });

  socket.on('ping', function(msg){
    //Show message from APEX
    console.log('Ping',msg);

    //Send message back to APEX
    io.emit('pong','Hello from node.js.');
  });
  
});
