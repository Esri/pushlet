var http  = require('http'),
    apns  = require('./notification/apple'),
    redis = require('redis'),
    qs    = require('querystring');


var redisClient = redis.createClient();
redisClient.on("error", function (err) {
  console.log("Redis Error: " + err);
});

function handlePostData (request, response, callback) {
  var body = '';

  request.on('data', function (data) {
    body += data;
  });

  request.on('end', function (){
    request.body = qs.parse(body);

    callback(request, response);
  });
}

function sendMessage(request, response) {
  var options = {
    certData: request.body.cert,
    keyData: request.body.key,
    deviceId: request.body.deviceId,
    mode: request.body.mode
  };

  apns.sendMessage(request, response, request.body.notification, options);
}

function handleExistingAuth (request, response) {
  var appId = request.body.appId,
      mode  = request.body.mode;

  redisClient.multi([ [ "mget", appId + "_" + mode + "_cert", appId + "_" + mode + "_key" ]]).exec(function (err, replies) {
    if (replies === undefined || replies.length !== 2) {
      response.end(JSON.stringify({ "response": "error", "error": "missing certificate" }));
    } else {
      request.body.cert = replies[0];
      request.body.key = replies[1];

      sendMessage(request, response);
    }
  });
}

function handleNewAuth (request, response) {
  var appId = request.body.appId,
      mode  = request.body.mode,
      cert  = request.body.cert,
      key   = request.body.key;

  redisClient.multi([ [ "mset", appId + "_" + mode + "_cert", cert, appId + "_" + mode + "_key", key ]]).exec(function (err, replies) {
    sendMessage(request, response);
  });
}

function handleMessage (request, response) {
  if (request.body === undefined) {
    response.end(JSON.stringify({ "response": "error", "error": "no data" }));
  } else {
    if (request.body.appId === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "appId required" }));
    } else if (request.body.deviceId === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "deviceId required" }));
    } else if (request.body.mode === undefined) {
      response.end(JSON.stringify({ "response": "error", "error": "mode required" }));
    } else {
      // update the certificate
      if (request.body.cert !== undefined && request.body.key !== undefined) {
        handleNewAuth(request, response);
      } else {
        handleExistingAuth(request, response);
      }
    }
  }

}


var server = http.createServer(function (request, response) {
	if (request.url === '/message' && request.method === 'POST') {
    handlePostData(request, response, handleMessage);
  } else {
    response.writeHead(404);
    response.end("not found");
  }
});

server.listen(8080);