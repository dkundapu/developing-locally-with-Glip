//require('dotenv').config();

var express = require('express');
var request = require('request');
const RC = require('ringcentral');

const util = require('util')
//const PORT= process.env.PORT;
//const REDIRECT_HOST= process.env.REDIRECT_HOST;
//const CLIENT_ID = process.env.CLIENT_ID;
//const CLIENT_SECRET = process.env.CLIENT_SECRET;
//const RINGCENTRAL_ENV= process.env.RINGCENTRAL_ENV;
const PORT=process.env.PORT || 5000;
const REDIRECT_HOST= 'https://test-bot-98271.herokuapp.com';
const CLIENT_ID = '2GW7QG_kQqmFeZYQx2IvRg';
const CLIENT_SECRET = 'iV42oWAxTR6wNiq3-gCrFQMvL_jZUmREyBaI3VMW4YAQ';
const RINGCENTRAL_ENV='https://platform.devtest.ringcentral.com';



var app = express();
var platform, subscription, rcsdk, subscriptionId, bot_token;


// Lets start our server
app.listen(PORT, function () {
    //Callback triggered when server is successfully listening. Hurray!
    console.log("Example app listening on port " + PORT);
});


// This route handles GET requests to our root ngrok address and responds with the same "Ngrok is working message" we used before
app.get('/', function(req, res) {
    res.send('Ngrok is working! Path Hit: ' + req.url);
});


rcsdk = new RC({
    server: RINGCENTRAL_ENV,
    appKey: CLIENT_ID,
    appSecret: CLIENT_SECRET
});

platform = rcsdk.platform();

//Authorization callback method.
code='U0pDMTFQMDFQQVMwMHxBQUFIV0l3RnYzZ2RFbjFfMmZvWnJBT0E5MVJSSHhIUlZaRmlFbzBsQmNPcnhadUpZZGZvUDA0R01SbXNyZmwzNkNwNF9QWWRPMEVYNENYQjd4dmJsWHJoTlpuQi04UU5XeDQ4RWFEc3FFZ0lVUDdROFFxd09WbjZOc1pMczRVZUhHV3pyaHpWcjJWeTRoUFJQOGZRdk9GV1E3dGtUVHd2cjZ2R01BTEhnMXR2eGEtdVJ2REFYR0JuN3FWa1JOamxaRkk3N2tJZDhjY1FtTVNtM3JaTTVHQWV8d1QwSjBBfDBqeHFSc0l0WU5wZmEyQ0tLcXNiaFF8QUE'
app.post('/oauth', function (req, res) {
	//console.log("Query Code/ Request "+util.inspect(req, {showHidden: false, depth: null}));
    if(req.query.code){
        res.status(200);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    }else {
        platform.login({
            code : code,
            redirectUri : REDIRECT_HOST + '/oauth'
        }).then(function(authResponse){
            var obj = authResponse.json();
            bot_token = obj.access_token;
            res.send(obj)
            subscribeToGlipEvents();
        }).catch(function(e){
            console.error(e)
            res.send("Error: " + e);
        })
    }
});

app.get('/oauth', function (req, res) {
	//console.log("Query Code/ Request "+util.inspect(req.res.code, {showHidden: false, depth: null}));
    if(req.query.code){
        res.status(200);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    }else {
        platform.login({
            code : code,
            redirectUri : REDIRECT_HOST + '/oauth'
        }).then(function(authResponse){
            var obj = authResponse.json();
            bot_token = obj.access_token;
            res.send(obj)
            subscribeToGlipEvents();
        }).catch(function(e){
            console.error(e)
            res.send("Error: " + e);
        })
    }
});

// Callback method received after subscribing to webhook
app.post('/callback', function (req, res) {
    var validationToken = req.get('Validation-Token');
    var body =[];

    if(validationToken) {
        console.log('Responding to RingCentral as last leg to create new Webhook');
        res.setHeader('Validation-Token', validationToken);
        res.statusCode = 200;
        res.end();
    } else {
        req.on('data', function(chunk) {
            body.push(chunk);
        }).on('end', function() {
            body = Buffer.concat(body).toString();
            console.log('WEBHOOK EVENT BODY: ', body);
            var obj = JSON.parse(body);
            res.statusCode = 200;
            res.end(body);
            if(obj.event == "/restapi/v1.0/subscription/~?threshold=60&interval=15"){
                renewSubscription(obj.subscriptionId);
            }
        });
    }
});

// Method to Subscribe to Glip Events.
function subscribeToGlipEvents(token){

    var requestData = {
        "eventFilters": [
            "/restapi/v1.0/glip/posts",
            "/restapi/v1.0/glip/groups",
            "/restapi/v1.0/subscription/~?threshold=60&interval=15"
        ],
        "deliveryMode": {
            "transportType": "WebHook",
            "address": REDIRECT_HOST + "/callback"
        },
        "expiresIn": 604799
    };
    platform.post('/subscription', requestData)
        .then(function (subscriptionResponse) {
            console.log('Subscription Response: ', subscriptionResponse.json());
            subscription = subscriptionResponse;
            subscriptionId = subscriptionResponse.id;
        }).catch(function (e) {
            console.error(e);
            throw e;
    });
}

function renewSubscription(id){
    console.log("Renewing Subscription");
    platform.post('/subscription/' + id + "/renew")
        .then(function(response){
            var data = JSON.parse(response.text());
            subscriptionId = data.id
            console.log("Subscription Renewal Successfull. Next Renewal scheduled for:" + data.expirationTime);
        }).catch(function(e) {
            console.error(e);
            throw e;
        });
}
