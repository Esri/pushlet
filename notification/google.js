var gcm = require('dpush'),
    responder = require('../responder'),
    log  = require('../log').logger;

var config = require('../config.json');

function sendMessage(request, response) {
  var payload = request.body.notification;

  log.debug(JSON.stringify(payload));

  try {
    gcm.send(request.body.key, request.body.deviceId, payload, function (err, res) {
      if (err) {
        var error;

        if (err.toString().match("400")) {
          error = 'Invalid Payload';
        } else if (err.toString().match("401")) {
          error = 'Bad Key';
        } else {
          error = 'Unknown Error';
        }
        response.end(responder.err({ error: error }));
      } else {
        // we should only be sending a single id
        if (res.failure) {
          if (res.invalidIds && res.invalidIds.length) {
            response.end(responder.err({ error: "Invalid Device ID", invalidIds: res.invalidIds }));
          } else if (res.updatedIds && res.updatedIds.length) {
            response.end(responder.err({ error: "Updated Device ID", updatedIds: res.updatedIds }));
          } else {
            response.end(responder.err({ error: "Unknown Error" }));
          }
        } else {
          response.end(responder.ok());
        }
      }
    });
  } catch (majorError) {
    response.end(responder.err({ error: majorError.toString() }));
  }
}

function authCallback(err, replies, request, response, appId, mode) {
  if (replies === undefined || replies.length !== 1 || replies[0] === null) {
    log.debug("No GCM key found in Redis for "+appId+" ("+mode+")");
    response.end(responder.err({ error: "Missing Key" }));
  } else {
    log.debug("Found a GCM key in Redis for "+appId+" ("+mode+")");
    request.body.key = replies[0];

    sendMessage(request, response);
  }
}

// auth keys within the body => redis key
var authKeys = {"key": "_gcmkey"}

exports.sendMessage   = sendMessage;
exports.authKeys      = authKeys;
exports.authCallback  = authCallback;
