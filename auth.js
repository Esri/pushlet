var redis = require('redis'),
    log  = require('./log').logger;

var config = require('./config.json');

// set up redis
var port = config.redis.port || 6379,
    host = config.redis.host || 'localhost';

var redisClient = redis.createClient(port, host);
redisClient.on("error", function (err) {
  log.error("Redis Error: " + err);
});

function authKeyString(appId, mode, redis_key) {
  return appId + "_" + mode + redis_key;
}

function authProvided(request, keys) {
  for (var i in keys) {
    if (request.body[keys[i].request_key] === undefined)
      return false;
  }
  return true;
}

function getAuthData(request, keys) {
  var appId = request.body.appId,
      mode  = request.body.mode;

  var ret = [];
  for (var i in keys) {
    ret.push( [ "get", authKeyString(appId, mode, keys[i].redis_key) ] );
  }
  return ret;
}

function setAuthData(request, keys) {
  var appId = request.body.appId,
      mode  = request.body.mode;

  var ret = [];
  for (var i in keys) {
    ret.push( [ "set", authKeyString(appId, mode, keys[i].redis_key), request.body[keys[i].request_key] ] );
  }
  return ret;
}

function authenticateAndHandleRequest(request, response, handler) {
  if (authProvided(request, handler.authKeys)) {
    // If a certificate is provided, store it in redis
    log.debug("New auth provided in request");
    handleNewAuth(request, response, handler);
  } else {
    log.debug("No auth provided, attempt to look up in the cache");
    handleExistingAuth(request, response, handler);
  }
}

// auth passed in, yay!
function handleNewAuth (request, response, handler) {
  if (redisClient && redisClient.connected) {
    redisClient.multi(setAuthData(request, handler.authKeys)).exec(function (err, replies) {
      log.debug("Saved auth in Redis");
      handler.sendMessage(request, response);
    });
  } else {
    log.info("No Redis connection, can't store auth credentials");
    handler.sendMessage(request, response);
  }
}

// if there is no key or cert, see if one can be found
function handleExistingAuth (request, response, handler) {
  // check redis for an existing auth for this appId
  if (redisClient && redisClient.connected) {
    redisClient.multi(getAuthData(request, handler.authKeys)).exec(function(err, replies) {
      handler.authCallback(err, replies, request, response);
    });
  } else {
    log.info("No Redis connection, can't check for existing credentials");
    response.end(responder.err({ error: "Internal Server Error" }));
  }
}

exports.authenticateAndHandleRequest = authenticateAndHandleRequest;
