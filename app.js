/* jshint node: true, devel: true */
'use strict';

const 
  bodyParser = require('body-parser'),
  config = require('config'),
  crypto = require('crypto'),
  express = require('express'),
  https = require('https'),  
  request = require('request');

var app = express();
app.set('port', 5000);
app.set('view engine', 'ejs');
app.use(bodyParser.json({ verify: verifyRequestSignature}));
app.use(express.static('public'));

/*
 * Open config/default.json and set your config values before running this server.
 * You can restart the *node server* without reconfiguring anything. However, whenever 
 * you restart *ngrok* you will receive a new random url, so you must revalidate your 
 * webhook url in your App Dashboard.
 */

// App Dashboard > Dashboard > click the Show button in the App Secret field
const APP_SECRET = config.get('appSecret');

// App Dashboard > Webhooks > Edit Subscription > copy whatever random value you decide to use in the Verify Token field
const VALIDATION_TOKEN = config.get('validationToken');

// App Dashboard > Messenger > Settings > Token Generation > select your page > copy the token that appears
const PAGE_ACCESS_TOKEN = config.get('pageAccessToken');

// In an early version of this bot, the images were served from the local public/ folder.
// Using an ngrok.io domain to serve images is no longer supported by the Messenger Platform.
// Github Pages provides a simple image hosting solution (and it's free)
const IMG_BASE_PATH = 'https://rodnolan.github.io/posterific-static-images/';

// make sure that everything has been properly configured
if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Start your server
 */
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
  req.query['hub.verify_token'] === VALIDATION_TOKEN) {
  console.log("[app.get] Validating webhook");
  res.status(200).send(req.query['hub.challenge']);
  } else {
  console.error("Failed validation. Validation token mismatch.");
  res.sendStatus(403);
  }
});

app.post('/webhook', function (req, res) {
  console.log("message received!");
  var data = req.body;
  if (data.object == 'page') {
    // entries from multiple pages may be batched in one request
    data.entry.forEach(function(pageEntry) {
          // iterate over each messaging event for this page
    pageEntry.messaging.forEach(function(messagingEvent) {
      
      let propertyNames = [];
      for (var prop in messagingEvent) { propertyNames.push(prop) }
      console.log("[app.post] Webhook event props: ", propertyNames.join());

        if (messagingEvent.message) {
          processMessageFromPage(messagingEvent);
          } else {
          console.log("[app.post] not prepared to handle this message type.");
          }
      });
    });
  res.sendStatus(200);
  }
});

function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // In DEV, log an error. In PROD, throw an error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', APP_SECRET)
                        .update(buf)
                        .digest('hex');

    console.log("received  %s", signatureHash);
    console.log("exepected %s", expectedHash);
    
    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
}

/*
* called when a message is sent to your page
*
*/
function processMessageFromPage(event) {
  var senderID = event.sender.id;
  var pageID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  console.log("[processMessageFromPage] user (%d) page (%d) timestamp (%d) and message (%s)",
  senderID, pageID, timeOfMessage, JSON.stringify(message));
  // the 'message' object format varies depending on the message type
  var messageText = message.text;
  if (messageText) {
  console.log("[processMessageFromPage]: %s", messageText);
  //Buat nonaktifkan repy message di fanpage
  //sendTextMessage(senderID, messageText);
  }
}

/*
* Send a text message using the Send API.
*
*/
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
  },
  message: {
      text: messageText // utf-8, 640-character max
    }
  };
  console.log("[sendTextMessage] %s", JSON.stringify(messageData));
  callSendAPI(messageData);
}

/*
* Call the Send API. If the call succeeds, the
* message id is returned in the response.
*
*/
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
        console.log("[callSendAPI] success!");
    } else {
        console.error("[callSendAPI] Send API call failed");
    }
  });
}

app.listen(app.get('port'), function() {
  console.log('[app.listen] Node app is running on port', app.get('port'));
});

module.exports = app;