// Require all of our node.js modules
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var url = require('url');
const path = require('path');
const PORT = process.env.PORT || 80;

var stateKey = 'spotify_auth_state';
var app = express();

// Set the view engine to EJS
// EJS files end with .ejs (see 'views' folder)
app.set('view engine', 'ejs');

// We need this following line to allow the use of public files
// Put any external files (.css, .js) in the 'public' folder.
app.use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .use(cookieParser());

// Our main visualization page
// Please see: routes/home.js

// These fields are information from the Spotify Developer site.
// They should be kept private at all times.
var client_id = '***REMOVED***';
var client_secret = '***REMOVED***';
var redirect_uri = 'http://www.rootify.io/home'; // Your redirect uri

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
    // We need to clear our old tokens or else the tree may not load (tokens expired).
    // res.clearCookie('myToken');
    // res.clearCookie('myRefreshToken');
    
    // When logging in, we generate a random state for the Spotify login
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    
    // your application requests authorization
    var scope = 'user-top-read user-read-private playlist-modify-public playlist-modify-private';
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
    res.redirect('https://accounts.spotify.com/en/logout?continue=https%3A%2F%2Faccounts.spotify.com%2Fen%2Fauthorize%3Fresponse_type%3Dcode%26client_id%3D***REMOVED***%26scope%3Duser-read-recently-played%2520user-top-read%2520user-read-private%2520user-read-email%26redirect_uri%3Dhttp%3A%252F%252Fwww.rootify.io%3A8888%252Fhome%26state%3D' + state + '%26show_dialog%3Dtrue');
});

/*
    Error, About, and Help pages
*/
app.get('/oops', function(req, res) {
    res.render('oops');
});

app.get('/about', function(req, res) {
    res.render('about');
});

app.get('/help', function(req, res) {
    res.render('help');
});

// Callback route
// After a Spotify user logs in, this route is called.
app.get('/home', function(req, res) {
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

                // Save our token and refresh token as cookies
                // This allows the users to refresh the visualization page
                res.cookie('myToken', access_token);
                // res.cookie('myRefreshToken', refresh_token);

                var options = {
                    url: 'https://api.spotify.com/v1/me',
                    headers: { 'Authorization': 'Bearer ' + access_token },
                    json: true
                };

                res.render('home', { access_token: access_token, refresh_token: refresh_token });
            } else {
                // If there is an error or the status is not 'OK' (200),
                // Then we want to go back to the main login page.
                res.redirect('/');
            }
        });
    }
});

app.get('/refresh_token', function(req, res) {
    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: refresh_token
        },
        json: true
    };
    
    request.post(authOptions, function(error, response, body) {
        if (!error && response.statusCode === 200) {
            var access_token = body.access_token;
            res.send({
                'access_token': access_token
            });
        }
    });
});
    
// If there is an unknown route, we will just re-route to our login page
app.all('*', function(req, res) {
  res.redirect("http://www.rootify.io/");
});

// Listen on the main port
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));
