var querystring = require('querystring');
var request = require('request');
var fs = require('fs');
var argv = require('optimist').argv;

/**
 * Command Line Arguments
 * 
 * token - required - the APNS device token
 * cert - default cert.pem
 * key - default key.pem
 * mode - default sandbox - "sandbox" or "production"
 * timeout - default 2000 - the timeout to wait for an error to be returned
 * message - The alert text to display in the push notification
 * dozerBaseURL - default http://localhost:8080/ - The full path to the Dozer HTTP endpoint
 */

if(!argv.token) {
  console.log("Must specify an APNS device token using --token=XXXXXX");
  process.exit(1);
}

var keyfile = './key.pem';
if(argv.key)
  keyfile = argv.key;
var certfile = './cert.pem';
if(argv.cert)
  certfile = argv.cert;

console.log("Using cert: "+certfile+" and key: "+keyfile+"\n\n");

var key = fs.readFileSync(keyfile, 'utf8');
var cert = fs.readFileSync(certfile, 'utf8');

var mode = "sandbox";
if(argv.mode)
  mode = argv.mode;

var appId = "test-app";
if(argv.app)
  appId = argv.app;

var timeout = 2000;
if(argv.timeout)
  timeout = argv.timeout;

var message = "Testing push notifications!";
if(argv.message)
  message = argv.message;

var dozerBaseURL = "http://localhost:8080/";
if(argv.dozer)
  dozerBaseURL = argv.dozer;

var payload = JSON.stringify({
  appId: 'test-app',
  deviceId: argv.token,
  mode: mode,
  cert: cert,
  key: key,
  notification: {
    alert: message
  },
  timeout: timeout
});
console.log(payload);

request(dozerBaseURL+'message/apn', {
  method: 'POST',
  body: payload,
  headers: ['Content-Type: application/json']
}, function(error, response, body){
  console.log(body);
});

