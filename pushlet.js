var http      = require('http'),
    apns      = require('./notification/apple'),
    gcm       = require('./notification/google'),
    qs        = require('querystring'),
    auth      = require('./auth'),
    responder = require('./responder'),
    log       = require('./log').logger;

var config = require('./config.json');

function handlePostData (request, response, handler) {
  var body = '';

  request.on('data', function (data) {
    body += data;
  });

  request.on('end', function (){
    try {
      request.body = JSON.parse(body);
    } catch (err) {
      response.end(responder.err({ error: "Bad JSON Input" }));
      return;
    }

    handleRequest(request, response, handler);
  });
}

function requireParam(request, response, param) {
  if (request.body[param] === undefined) {
    response.end(responder.err({ error: "Missing Required Field " + param }));
  }
}

function handleRequest(request, response, handler) {
  if (request.body === undefined) {
    response.end(responder.err({ error: "No Data" }));
  }

  requireParam(request, response, "appId");
  requireParam(request, response, "deviceId");
  requireParam(request, response, "mode");
  requireParam(request, response, "notification");

  // if we do not have a timeout, set the default
  if (request.body.timeout === undefined) {
    request.body.timeout = config.timeout;
  }

  log.debug("Push to " + request.body.deviceId);
  if (handler.authProvided(request)) {
    // If a certificate is provided, store it in redis
    log.debug("New auth provided in request");
    auth.handleNewAuth(request, response, handler.setAuthData, handler.sendMessage);
  } else {
    log.debug("No auth provided, attempt to look up in the cache");
    auth.handleExistingAuth(request, response, handler.getAuthData, handler.authCallback);
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

  switch (request.url) {
  case '/message/apn':
    handlePostData(request, response, apns);
    break;
  case '/message/gcm':
    handlePostData(request, response, gcm);
    break;
  default:
    handleNotFound(response);
  }
});

server.listen(config.port ? config.port : 8080);
log.info("Listening on port "+config.port);
