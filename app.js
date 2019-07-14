//require('dotenv').config();

var express = require('express');
var request = require('request');
const RC = require('ringcentral');


//const PORT= process.env.PORT;
//const REDIRECT_HOST= process.env.REDIRECT_HOST;
//const CLIENT_ID = process.env.CLIENT_ID;
//const CLIENT_SECRET = process.env.CLIENT_SECRET;
//const RINGCENTRAL_ENV= process.env.RINGCENTRAL_ENV;

const PORT=4390;
const REDIRECT_HOST= 'https://0186ba4c.ngrok.io';
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
//code='U0pDMTFQMDFQQVMwMHxBQUFIV0l3RnYzZ2RFbjFfMmZvWnJBT0E5MVJSSHhIUlZaRmlFbzBsQmNPcnhadUpZZGZvUDA0R3ZMUDJLSkVCd2dWNF9QWWRPMEVYNENYQjd4dmJsWHJoRlZ2VjB0dWdmS0k4RWFEc3FFZ0lVUDhHU1o3S005NU9yMWZ3N25fMjE0S2xUU0NJUHR1SWhQNU8tVjlac28ta1FsVE9YTHBDM0pyR01BTEhnMXR2eGM1MFpVVUFQM2hxN3FWa1JOamxaRktJNlcxVW5sdktDS2ZnZGpPWVVFOWJ8d1MwZzB3fFhnX3pyUng5Q1g4amdaSnIwWllBbkF8QUE'
app.post('/oauth', function (req, res) {
	console.log("Query Code "+req.query.code);
    if(req.query.code){
        res.status(200);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    }else {
        platform.login({
            code : req.query.code,
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
	console.log("Query Code "+req.query.code);
    if(req.query.code){
        res.status(200);
        res.send({"Error": "Looks like we're not getting code."});
        console.log("Looks like we're not getting code.");
    }else {
        platform.login({
            code : req.query.code,
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
