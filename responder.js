function err(err_hash) {
  if (err_hash === undefined)
    err_hash = {};
  
  err_hash.response = "error";
  err_hash.error = err_hash.error || "Unknown error";
  
  return JSON.stringify(err_hash);
}

function ok() {
  return JSON.stringify({ response: "ok" });
}

function sent() {
  return JSON.stringify({ response: "sent" });
}

exports.err = err;
exports.ok = ok;
exports.sent = sent;
