
// Require all of our node.js modules

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var url = require('url'); 

var stateKey = 'spotify_auth_state';
var app = express();

// Set the view engine to EJS
// EJS files end with .ejs (see 'views' folder)
app.set('view engine', 'ejs');

// We need this following line to allow the use of public files
// Put any external files (.css, .js) in the 'public' folder.
app.use(express.static(__dirname + '/public'))
   .use(cookieParser());

// Our main visualization page
// Please see: routes/home.js
var homepage = require('./routes/home');
app.use('/home', homepage);

// These fields are information from the Spotify Developer site

var client_id = '8d9483d3d91b4031b96286a03fd88478';
var client_secret = '6fbb0ed701a145cdb406c3ca6d05b572';
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

// Generates a random string
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

// Login route
app.get('/login', function(req, res) {
    
    // When logging in, we generate a random state for the Spotify login
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    
    // your application requests authorization
    var scope = 'user-read-recently-played user-top-read user-read-private user-read-email';
    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        show_dialog : true
    }));
});

// Logout
app.get('/logout', function(req, res) {
    
    // When logging out and then in again, we generate a random state for the Spotify login
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    
    // Logout and present a new login screen
    res.redirect('https://accounts.spotify.com/en/logout?continue=https%3A%2F%2Faccounts.spotify.com%2Fen%2Fauthorize%3Fresponse_type%3Dcode%26client_id%3D8d9483d3d91b4031b96286a03fd88478%26scope%3Duser-read-recently-played%2520user-top-read%2520user-read-private%2520user-read-email%26redirect_uri%3Dhttp%3A%252F%252Flocalhost%3A8888%252Fcallback%26state%3D' + state + '%26show_dialog%3Dtrue');
});

// Callback route
// After a Spotify user logs in, this route is called.
app.get('/callback', function(req, res) {
    
    var state = req.query.state || null;
    var code = req.query.code || null;
    
    // Here, we are basically doing an extra check to make sure this 
    // user actually logged in and didn't just guess our callback URI.
    
    // More information: https://developer.spotify.com/web-api/authorization-guide/
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    
    if (state === null || state !== storedState) {
        
        res.redirect('/');
    } else {
        
        // Clear the state cookie.
        res.clearCookie(stateKey);
        
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            form: {
                code: code,
                redirect_uri: redirect_uri,
                grant_type: 'authorization_code'
            },
            headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            },
            json: true
        };
        
        // Perform a POST request to the Spotify API
        // This will grab our new access token.
        request.post(authOptions, function(error, response, body) {
            
            if (!error && response.statusCode === 200) {
                
                var access_token = body.access_token,
                refresh_token = body.refresh_token;
                
                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };
                
                // Here, we choose to pass the access token to the client browser.
                // This allows the client to use the Spotify Web API JS wrapper.
                res.redirect(url.format({
                    // Our main visaulization page will be located at /home
                    pathname:"/home",
                    // These will be query variables passed at the end of the URL
                    query: {
                        "access_token": access_token,
                        "refresh_token": refresh_token
                    }
                }));
            } else {
                
                // If there is an error or the status is not 'OK' (200),
                // Then we want to go back to the main login page.
                res.redirect('/');
            }
        });
    }
});

// If there is an unknown route, we will just re-route to our login page
app.all('*', function(req, res) {
  res.redirect("http://localhost:8888/");
});

// Listen on the port 8888
console.log('Listening on 8888');
app.listen(8888);
