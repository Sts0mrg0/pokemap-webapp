(function (exports) {
'use strict';

var POKE = exports.POKE = {};

POKE.DEFAULT_INTERVAL = 1000;
POKE.DEFAULT_LOGIN_URL = "/api/com.pokemon.go/login";
POKE.DEFAULT_HEARTBEAT_URL = "/raw_data"; // "/api/com.pokemon.go/heartbeat";

POKE.login = function (deps, creds, cb) {
  deps.request({
    url: deps.loginUrl || POKE.DEFAULT_LOGIN_URL
  , method: 'POST'
  , data: JSON.stringify({
      username: creds.username
    , password: creds.password
    , provider: creds.provider
    })
  , headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  , dataType: "json"
  }).then(function (sess) {
    sess.accessToken = sess.accessToken || sess.access_token;

    if (!sess.accessToken) {
      cb(sess.error || new Error("missing access token"));
      return;
    }

    sess.username = creds.username;
    // TODO encrypt with a passcode or something?
    //sess.password = creds.password;
    sess.provider = creds.provider;
    cb(null, sess);
  });
};

POKE.heartbeat = function (deps, sess, cb) {
  if (!sess.latitude || !sess.longitude) {
    console.log('heartbeat ignored - waiting for lat/lng update');
    return;
  }

  deps.request({
      url: deps.heartbeatUrl || POKE.DEFAULT_HEARTBEAT_URL
    , method: 'GET'
    , data: {
        'latitude': sess.latitude
      , 'longitude': sess.longitude
      , 'pokemon': sess.showPokemon
      , 'pokestops': sess.showPokestops
      , 'gyms': sess.showGyms
        // this is moot when the client is in control, as it should be
      , 'scanned': sess.showScanned
      }
    , headers: {
        'Authorization': 'Bearer ' + sess.accessToken
      }
    , dataType: "json"
  }).done(function(result) {
    cb(null, result);
  });
};

POKE.startHeartbeat = function (deps, sess, interval, bcb, cb) {
  // note: this is part of window or global, not javascript
  clearInterval(sess.heartbeatInterval);
  sess.heartbeatInterval = setInterval(function () {
    bcb();
    POKE.heartbeat(deps, sess, cb);
  }, interval);
};

POKE.stopHeartbeat = function (deps, sess) {
  // note: this is part of window or global, not javascript
  clearInterval(sess.heartbeatInterval);
};

POKE.setLocation = function (deps, sess, lat, lng) {
// function updateLoc(lat, lng);
  if (lat && lng && 'number' === typeof lat && 'number' === typeof lng) {
    if (lat !== sess.latitude || lng !== sess.longitude) {
      sess.latitude = lat;
      sess.longitude = lng;
    }
  }
};

POKE.create = function (deps) {

  /*
   *  deps = {
   *    request: $.ajax
   *  , onHeartbeat: function () { ... }
   *  , heartbeatInterval: 1000
   *  }
   */

  return {
    login: function (creds, cb) {
      return POKE.login(deps, creds, cb);
    }
  , heartbeat: function (sess, cb) {
      return POKE.heartbeat(deps, sess, cb);
    }
  , setLocation: function (sess, lat, lng) {
      return POKE.setLocation(deps, sess, lat, lng);
    }
  , startHeartbeat: function (sess, bcb, cb) {
      return POKE.startHeartbeat(deps, sess, deps.heartbeatInterval || POKE.DEFAULT_INTERVAL, bcb, cb);
    }
  , stopHeartbeat: function (sess) {
      return POKE.stopHeartbeat(deps, sess);
    }
  };
};

}(window));
