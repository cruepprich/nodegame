var express       = require('express');
//var favicon     = require('serve-favicon');
var proxy         = require( 'http-proxy' ).createProxyServer({});
var http          = require('http');
//var https       = require('https');

var app           = express();

var config        = require('./config');

var gpio          = require('onoff').Gpio;
var led           = new gpio(4,'out');
var btn2          = new gpio(17,'in', 'both');
var btn1          = new gpio(18,'in', 'both');
var connections   = 0;
var state         = 'STOPPED'; //game state: READY,RUNING,STOPPED


var blueTeam      = 0;
var redTeam       = 0;

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

function setLED(state) {
    console.log('setLED',state);
    if (state == 'RUNNING') {
      clearInterval(iv); //stop blinking
      led.writeSync(1); //turn LED on
    } else if (state == 'STOPPED') {
      clearInterval(iv); //stop blinking
      led.writeSync(0); //turn LED off
    } else if (state == 'READY') {
      blinkLED(); //blink LED
    }
}

function showSocketInfo(socket) {
  console.log("ip: "+socket.request.connection.remoteAddress);
  console.log("user-agent: "+socket.request.headers['user-agent']);
}


// app.listen(httpPort);
server = http.createServer(app).listen(config.web.http.port);
console.log('listenting on',config.web.http.port);
console.log('Requires VM3 with Oracle/Apex running');
console.log('URL: http://carpi:3000/ords/f?p=163');
console.log('DEV: http://vm3:8080/ords/f?p=4500');
console.log('Workspce rpi, admin');

var io = require('socket.io').listen(server);


io.on('connection', function(socket){
  console.log('a user connected. LED is ' + led.readSync());
  showSocketInfo(socket);

	io.emit('LED',led.readSync());

  socket.on('disconnect', function(socket){
    console.log('a user disconnected ...');
    //showSocketInfo(socket);
    console.log('socket\n',socket);
  });

  socket.on('game', function(state){
    //Control game state
    console.log('Set game state to',state);
    //Set LED to reflect game state
    setLED(state);
    //Send socket back to app as if button were pressed
    io.emit('button1',state);
  });

  socket.on('client', function(clientInfo){
    console.log('Client',clientInfo);
  })
  

  socket.on('team', function (team) {
    if (team == 'BLUE') {
      blueTeam++;
    } else if (team == 'RED') {
      redTeam++;
    }

    console.log(team+' player joined.');
    console.log('Blue: ',blueTeam,'Red',redTeam);

  })
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
