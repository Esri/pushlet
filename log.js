var winston  = require('winston'),
    airbrake = require('winston-airbrake').Airbrake;

var config = require('./config.json');

var transports = [ ];

if (config.logging && config.logging.type && config.logging.type.length) {
  for (var i = 0; i < config.logging.type.length; i++) {
    if (config.logging.type[i].console === true) {
      transports.push(new winston.transports.Console());
    }
  }
}

var logger = new (winston.Logger)({
  transports: transports
});

logger.add(airbrake, config.logging.airbrake);
exports.logger = logger;
