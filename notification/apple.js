var apns = require('apn'),
    uuid = require('node-uuid'),
    log  = require('../log');


// place to hold status for open connections
var status = { };

var errorMap = {
  1: "Processing Error",
  2: "Missing Device Token",
  3: "Missing Topic",
  4: "Missing Payload",
  5: "Invalid Token Size",
  6: "Invalid Topic Size",
  7: "Invalid Payload Size",
  8: "Invalid Token",
  255: "Unknown Error"
};

// callback from sendMesage error callback, known error state
function errorCallback(err, options) {
  var connection = status[options.uuid];

  if (connection === undefined) {
    log.warn("errorCallback called but no connection information: " + options.uuid);
    return;
  }

  var response = connection.response;

  if (err) {
    // known error state, handle it normally
    response.end(JSON.stringify({ response: "error", error: errorMap[err] }));
  } else {
    // whoa, something weird happened, log it and return a result
    log.warn("errorCallback returned with unknown error: " + err);
    response.end(JSON.stringifu({ response: "error", error: "Unknown" }));
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
  options.cacheLength = 1;
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

  var connection = new apns.Connection(options);

  // set a timeout to check to see if an error occurred
  setTimeout(function () {
    notificationCallback(notification.uuid);
  }, request.body.timeout);

  // send the notification
  connection.sendNotification(notification);
}

exports.sendMessage = sendMessage;