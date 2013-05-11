var apns = require('apn'),
    uuid = require('node-uuid'),
    log  = require('../log').logger,
    redis = require('redis');

var config = require('../config.json');


// set up redis
var port = config.redis.port || 6379,
    host = config.redis.host || 'localhost';

var redisClient = redis.createClient(port, host);
redisClient.on("error", function (err) {
  log.error("Redis Error: " + err);
});

// place to hold status for open connections
var status = { };

var connections = { };

var errorMap = {
  1: "Processing Error",
  2: "Missing Device Token",
  3: "Missing Topic",
  4: "Missing Payload",
  5: "Invalid Token Size",
  6: "Invalid Topic Size",
  7: "Invalid Payload Size",
  8: "Invalid Token",
  23: "Bad Certificate",
  255: "Unknown Error"
};


// get a connection from the pool if possible, otherwise create a new connection
function getConnection (name, options, uuid) {
  var connection = connections[name];

  // if there is no connection, create a new one
  if (connection === undefined) {
    options.name = name;

    log.debug("Establishing new connection for "+options.name);

    connection = new apns.Connection(options);

    connection.on('disconnected', function () {
      log.info(this.options.name + " disconnected");
      // remove the connection from the connection pool
      if (this.options && this.options.name) {
        connections[this.options.name] = undefined;
        errorCallback("disconnected", {uuid: uuid, errorDescription: "APNS disconnected the socket! Most likely this is due to a bad or expired certificate, or trying to use a sandbox certificate on the production APNS servers."});
      }
    });

    connection.on('error', function () {
      log.warn("Connection error for "+this.options.name);
      // remove the connection from the connection pool
      if (this.options && this.options.name) {
        connections[this.options.name] = undefined;
        errorCallback("error", {uuid: uuid, errorDescription: "Unknown connection error"});
      }
    });

    connection.on('notificationError', function () {
      log.warn("Connection error for "+this.options.name);
      // remove the connection from the connection pool
      if (this.options && this.options.name) {
        connections[this.options.name] = undefined;
      }
    });

    // This error is returned when Apple closes the connection in the middle of sending a push notification
    // Most often it's due to a malformed payload sent to Apple, or because of an invalid device ID
    connection.on('transmissionError', function () {
      log.warn("Transmission error for "+this.options.name);
      // remove the connection from the connection pool
      if (this.options && this.options.name) {
        connections[this.options.name] = undefined;

        var errorDescription = "An unknown error occurred while trying to send the push notification. Most often this is caused by a malformed payload or invalid device ID.";
        if (arguments[0] && errorMap[arguments[0]] !== undefined) {
          errorDescription = errorMap[arguments[0]];
        }

        errorCallback("transmissionError", {uuid: uuid, errorDescription: errorDescription});
      }
    });

    connection.on('socketError', function () {
      console.dir(arguments);
      log.warn("Socket error for "+this.options.name);
      // remove the connection from the connection pool
      if (this.options && this.options.name) {
        connections[this.options.name] = undefined;
        errorCallback("socketError", {uuid: uuid});
      }
    });



    connections[name] = connection;
  } else {
    log.debug("Found existing connection for "+name);
  }

  return connection;
}


// callback from sendMesage error callback, known error state
function errorCallback(err, options) {
  if (options === undefined) {
    log.warn("errorCallback called but no options passed", err);
    return;
  }
  var connection = status[options.uuid];

  if (connection === undefined) {
    log.info("errorCallback called but no connection was active. uuid: " + options.uuid);
    return;
  }

  var response = connection.response;

  if (err) {
    // check for bad certificate, set it to our known error if it is the case
    if (err.toString().indexOf("PEM") !== -1) {
      err = 23;
    }

    // known error state, handle it normally
    var errResponse = errorMap[err];
    if (errorMap[err] === undefined) {
      errResponse = err.toString();
    }
    response.end(JSON.stringify({ response: "error", error: errResponse, error_description: options.errorDescription }));
  } else {
    // whoa, something weird happened, log it and return a result
    log.warn("errorCallback returned with unknown error: " + err);
    response.end(JSON.stringify({ response: "error", error: "Unknown" }));
  }
  status[options.id] = undefined;
}

// callback from setTimeout - could be anything
function notificationCallback(id) {
  // check to see if there has been a previously handled error
  var connection = status[id];

  if (connection === undefined) {
    // nothing to see here, the error handler has already
    // handled this connection
  } else {
    var response = status[id].response,
        request  = status[id].request;

    // clear it now from status
    status[id] = undefined;

    // if we have a timeout of "0", just notify that we sent it
    if (request.body.timeout === 0) {
      response.end(JSON.stringify({ response: "sent" }));
    } else {
      response.end(JSON.stringify({ response: "ok" }));
    }
  }
}

// actually attempt to send a message, finally
function sendMessage(request, response) {
  var payload = request.body.notification;

  var timeout = config.connectionTimeout || 1000;

  // set up the connection options
  var options = {
    certData:          request.body.cert,
    keyData:           request.body.key,
    deviceId:          request.body.deviceId,
    mode:              request.body.mode,
    connectionTimeout: timeout,
    enhanced:          true,
    errorCallback:     errorCallback,
    cacheLength:       256,
    debug:             true
  };

  if (request.body.mode === 'production') {
    options.gateway = 'gateway.push.apple.com';
  } else {
    options.gateway = 'gateway.sandbox.push.apple.com';
  }
 
  // set up the notification based on data passed
  var notification = new apns.Notification();

  if (payload.payload !== undefined) {
    notification.payload = payload;
  }

  if (payload.badge !== undefined) {
    notification.badge = payload.badge;
  }

  if (payload.sound !== undefined) {
    notification.sound = payload.sound;
  }

  if (payload.alert !== undefined) {
    notification.alert = payload.alert;
  }

  notification.uuid = uuid.v4();

  // stash the connection away
  status[notification.uuid] = {
    request: request,
    response: response,
    options: options
  };

  notification.device = new apns.Device(request.body.deviceId);

  var connection = getConnection(request.body.appId + "_" + request.body.mode, options, notification.uuid);

  // set a timeout to check to see if an error occurred
  setTimeout(function () {
    notificationCallback(notification.uuid);
  }, request.body.timeout);

  // send the notification
  connection.pushNotification(notification, notification.device);
}

// if there is no certificate, see if one can be found
function handleExistingAuth (request, response) {
  var appId = request.body.appId,
      mode  = request.body.mode;

  // check redis for an existing certificate for this appId
  if (redisClient && redisClient.connected) {
    redisClient.multi([ [ "mget", appId + "_" + mode + "_cert", appId + "_" + mode + "_key" ]]).exec(function (err, replies) {
      if (replies === undefined || replies.length !== 1 || replies[0].length !== 2 || replies[0][0] === null || replies[0][1] === null) {
        log.debug("No cert found in Redis for "+appId+" ("+mode+")");
        response.end(JSON.stringify({ "response": "error", "error": "missing certificate" }));
      } else {
        log.debug("Found a cert in Redis for "+appId+" ("+mode+")");
        request.body.cert = replies[0][0];
        request.body.key = replies[0][1];

        sendMessage(request, response);
      }
    });
  } else {
    log.info("No redis connection, can't check for existing certificate");
    response.end(JSON.stringify({ "status": "error", "error": "Internal server error" }));
  }
}

// certificate passed in, yay!
function handleNewAuth (request, response) {
  var appId = request.body.appId,
      mode  = request.body.mode,
      cert  = request.body.cert,
      key   = request.body.key;

  if (redisClient && redisClient.connected) {
    redisClient.multi([ [ "mset", appId + "_" + mode + "_cert", cert, appId + "_" + mode + "_key", key ]]).exec(function (err, replies) {
      log.debug("Saved cert in Redis");
      sendMessage(request, response);
    });
  } else {
    log.info("No Redis connection, can't store cert");
    sendMessage(request, response);
  }
}


// entry for the module, handle the message
function handleMessage (request, response) {
  log.debug("Push to "+request.body.deviceId);

  if (request.body.cert !== undefined && request.body.key !== undefined) {
    // If a certificate is provided, store it in redis
    log.debug("New cert provided in request");
    handleNewAuth(request, response);
  } else {
    log.debug("No cert provided, attempt to look up cert in the cache");
    handleExistingAuth(request, response);
  }
}

exports.handleMessage = handleMessage;
