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

// auth passed in, yay!
function handleNewAuth (request, response, setAuthData, sendMessage) {
  var appId = request.body.appId,
      mode  = request.body.mode,
      cert  = request.body.cert,
      key   = request.body.key;

  if (redisClient && redisClient.connected) {
    redisClient.multi(setAuthData(appId, mode, key, cert)).exec(function (err, replies) {
      log.debug("Saved auth in Redis");
      sendMessage(request, response);
    });
  } else {
    log.info("No Redis connection, can't store auth credentials");
    sendMessage(request, response);
  }
}

// if there is no certificate, see if one can be found
function handleExistingAuth (request, response, getAuthData, callback) {
  var appId = request.body.appId,
      mode  = request.body.mode;

  // check redis for an existing auth for this appId
  if (redisClient && redisClient.connected) {
    redisClient.multi(getAuthData(appId, mode)).exec(function(err, replies) {
      callback(err, replies, request, response, appId, mode);
    });
  } else {
    log.info("No Redis connection, can't check for existing credentials");
    response.end(responder.err({ error: "Internal Server Error" }));
  }
}

exports.handleNewAuth = handleNewAuth;
exports.handleExistingAuth = handleExistingAuth;
