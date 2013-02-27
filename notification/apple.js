var apns = require('apn'),
    uuid = require('node-uuid'),
    log  = require('../log').logger;


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
function getConnection (name, options) {
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
      }
    });

    connection.on('error', function () {
      log.warn("Connection error for "+this.options.name);
      // remove the connection from the connection pool
      if (this.options && this.options.name) {
        connections[this.options.name] = undefined;
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
  var connection = status[options.uuid];

  if (connection === undefined) {
    log.warn("errorCallback called but no connection information: " + options.uuid);
    return;
  }

  var response = connection.response;

  if (err) {
    // check for bad certificate, set it to our known error if it is the case
    if (err.toString().indexOf("PEM") !== -1) {
      err = 23;
    }

    // known error state, handle it normally
    response.end(JSON.stringify({ response: "error", error: errorMap[err] }));
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

function sendMessage(request, response, payload, options) {
  // set up the connection options
  options.enhanced = true;
  options.errorCallback = errorCallback;
  options.cacheLength = 256;
  options.debug = true;

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

  var connection = getConnection(request.body.appId + "_" + request.body.mode, options);

  // set a timeout to check to see if an error occurred
  setTimeout(function () {
    notificationCallback(notification.uuid);
  }, request.body.timeout);

  // send the notification
  connection.sendNotification(notification);
}

exports.sendMessage = sendMessage;