var apns = require('apn'),
    uuid = require('node-uuid'),
    log  = require('../log');


// place to hold status for open connections
var status = { };

// callback from sendMesage error callback, known error state
function errorCallback(err, options) {
  var connection = status[options.uuid];

  if (connection === undefined) {
    log.warn("errorCallback called but no connection information: " + options.uuid);
    return;
  }

  var response = connection.response;

  response.end(JSON.stringify({ response: "error", error: err }));
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
    var response = status[id].response;

    // clear it now from status
    status[id] = undefined;

    // send the final "ok"
    response.end(JSON.stringify({ response: "ok" }));
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
    notificationCallback(options.uuid);
  }, 1000);

  // send the notification
  connection.sendNotification(notification);
}



exports.sendMessage = sendMessage;