var express = require('express');
var favicon = require('serve-favicon');
var proxy = require( 'http-proxy' ).createProxyServer({});
var http = require('http');
//var https = require('https');

var app = express();

var config = require('./config');

var gpio = require('onoff').Gpio;
var led = new gpio(4,'out');
var btn2 = new gpio(17,'in', 'both');
var btn1 = new gpio(18,'in', 'both');
var connections = 0;
var state = 'STOPPED'; //game state: READY,RUNING,STOPPED

var LEDstate; //on,off,blink
var iv; //blink interval

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
app.use(function(req, res, next){
  res.redirect(config.ords.path);
});


// make LED blink
function blinkLED(freq) {
        freq = (freq == undefined ? 200 : freq);

				iv = setInterval(function() {
									onoff = led.readSync() ^ 1;
									led.writeSync( onoff );
						 }, freq);
}


// app.listen(httpPort);
server = http.createServer(app).listen(config.web.http.port);
console.log('listenting on',config.web.http.port);

var io = require('socket.io').listen(server);

io.on('connection', function(socket){
  console.log('a user connected. LED is ' + led.readSync());
	io.emit('LED',led.readSync());

  socket.on('disconnect', function(socket){
    console.log('a user disconnected ...');
  });

  socket.on('led', function(state){
	  LEDstate = state;
    console.log('LED state: ',state);

    if (state == 'on') {
      clearInterval(iv); //stop blinking
      led.writeSync(1); //turn LED on
    } else if (state == 'off') {
      clearInterval(iv); //stop blinking
      led.writeSync(0); //turn LED off
    } else if (state == 'blink') {
      blinkLED(); //blink LED
    }
  });
});

  btn1.watch(function (err,value){
    if(err) {
      throw err;
    }


    if (value == 1 ) {
            console.log('btn1: ', value
                      , 'connections: ',connections
                      , 'sockets: ',io.sockets.sockets.length
                      , 'led.readSync: ', led.readSync());
            //console.log('clients[0]: ',clients[0]);
            //led.writeSync(led.readSync() ^ 1);
						switch (state) {
							case 'RUNNING':
								state = 'STOPPED';
								clearInterval(iv); //stop blinking
								led.writeSync(0); //turn LED off
								break;
							case 'STOPPED':
								state = 'READY';
								blinkLED(); //blink LED
								break;
							case 'READY':
								state = 'RUNNING';
								clearInterval(iv); //stop blinking
								led.writeSync(1); //turn LED on
								break;
						}
						console.log('Game state: ',state);
            io.emit('button1',state);
    }
		io.emit('LED',value);
  });


  btn2.watch(function (err,value){
    if(err) {
      throw err;
    }

    if (value == 1 ) {
            console.log('btn2: ', value
                      , 'connections: ',connections
                      , 'sockets: ',io.sockets.sockets.length
                      , 'led.readSync: ', led.readSync());
            //console.log('clients[0]: ',clients[0]);
            led.writeSync(led.readSync() ^ 1);
            io.emit('button','Button 2: '+value);
						io.emit('LED',value);
    } else {
			io.emit('LED',value);
		}
  });
