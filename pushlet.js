var http  = require('http'),
    apns  = require('./notification/apple'),
    gcm   = require('./notification/google'),
    qs    = require('querystring'),
    log   = require('./log').logger;


var config = require('./config.json');



function handlePostData (request, response, callback) {
  var body = '';

  request.on('data', function (data) {
    body += data;
  });

  request.on('end', function (){
    try {
      request.body = JSON.parse(body);
    } catch (err) {
      response.end(JSON.stringify({ "status": "error", "error": "Bad JSON input" }));
      return;
    }

    callback(request, response);
  });
}


function handleAPNMessage (request, response) {
  if (request.body === undefined) {
    response.end(JSON.stringify({ "response": "error", "error": "no data" }));
  } else {
    if (request.body.appId === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "appId required" }));
    } else if (request.body.deviceId === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "deviceId required" }));
    } else if (request.body.mode === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "mode required" }));
    } else if (request.body.notification === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "notification required" }));
    } else {
      // if we do not have a timeout, set the default
      if (request.body.timeout === undefined) {
        request.body.timeout = config.timeout;
      }

      apns.handleMessage(request, response);
    }
  }
}

function handleGCMMessage (request, response) {
  if (request.body === undefined) {
    response.end(JSON.stringify({ "response": "error", "error": "no data" }));
  } else {
    if (request.body.appId === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "appId required" }));
    } else if (request.body.deviceId === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "deviceId required" }));
    } else if (request.body.mode === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "mode required" }));
    } else if (request.body.notification === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "notification required" }));
    } else {
      // if we do not have a timeout, set the default
      if (request.body.timeout === undefined) {
        request.body.timeout = config.timeout;
      }

      gcm.handleMessage(request, response);
    }
  }
}

function handleNotFound(response) {
  response.writeHead(404);
  response.end("not found");
}

var server = http.createServer(function (request, response) {
  if (request.method !== 'POST') {
    handleNotFound(response);
  }

  if (request.url === '/message/apn') {
    handlePostData(request, response, handleAPNMessage);
  } else if (request.url === '/message/gcm') {
    handlePostData(request, response, handleGCMMessage);
  } else {
    handleNotFound(response);
  }
});

server.listen(config.port ? config.port : 8080);
log.info("Listening on port "+config.port);

