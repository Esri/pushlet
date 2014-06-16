var gcm = require('dpush'),
    responder = require('../responder'),
    log  = require('../log').logger;

var authKeys = [{"request_key": "key", "redis_key": "_gcmkey"}];

// GCM requires that all things be strings, and cannot deserialize
// numbers or boolean.  This works around that by converting all
// numbers and booleans to strings.
function workAroundGCMLimitations (input) {
  var i, output;

  // type detection
  var isObject = !!input && Object.prototype.toString.call(input) === "[object Object]";
  var isArray = Array.isArray(input);
  var isNumber = typeof input === 'number';
  var isBoolean = typeof input === 'boolean';

  if (isObject) {
    output = { };
    var keys = Object.keys(input);

    for (i = 0; i < keys.length; i++) {
      output[keys[i]] = workAroundGCMLimitations(input[keys[i]]);
    }

    return output;
  } else if (isArray) {
    output = [ ];

    for (i = 0; i < input.length; i++) {
      output[i] = workAroundGCMLimitations(input[i]);
    }

    return output;
  } else if (isNumber || isBoolean) {
    return String(input);
  } else {
    return input;
  }
}

function sendMessage(request, response) {
  var payload = workAroundGCMLimitations(request.body.notification);

  if (request.body.debug) {
    log.debug("Incoming Payload (GCM)", payload);
  }

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

        if (request.body.debug) {
          log.debug("GCM Response", err.toString());
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

exports.sendMessage   = sendMessage;
exports.authKeys      = authKeys;
