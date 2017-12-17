// Require all of our node.js modules
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var url = require('url');
const path = require('path');
const PORT = process.env.PORT || 80;

var app = express();

// Set the view engine to EJS
// EJS files end with .ejs (see 'views' folder)
app.set('view engine', 'ejs');

// We need this following line to allow the use of public files
// Put any external files (.css, .js) in the 'public' folder.
app.use(express.static(path.join(__dirname, 'public')))
    .use(cookieParser())
    .set('views', path.join(__dirname, 'views'));

// Our main visualization page
// Please see: routes/home.js

// These fields are information from the Spotify Developer site.
// They should be kept private at all times.
var client_id = '***REMOVED***';
var client_secret = '***REMOVED***';

//var redirect_uri = 'http://localhost:5000/home'; // Your redirect uri
var redirect_uri = 'http://rootify.io:80/home';

// Generates a random string
var generateRandomString = function(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};

var setAndGetState = function(res) {
    var ranStateKey = generateRandomString(20);
    
    // This state cookie is used to protect against attacks.
    res.clearCookie('spotify_auth_state');
    res.cookie('spotify_auth_state', ranStateKey, {
        domain: 'rootify.io', 
        path: '/home', 
        maxAge: 3600000, 
        httpOnly: true
    });
    
    return ranStateKey;
}

// Login route
app.get('/login', function(req, res) {
    var state = setAndGetState(res);
    
    var scope = 'user-top-read user-read-private playlist-modify-public playlist-modify-private';
    res.redirect('https://accounts.spotify.com/authorize?' + 
    querystring.stringify({
        response_type: 'code', 
        client_id: client_id, 
        scope: scope, 
        state: state, 
        redirect_uri: redirect_uri, 
        show_dialog : true
    }));
});

// Logout
app.get('/logout', function(req, res) {
    var state = setAndGetState(res);
    
    // Logout and present a new login screen
    res.redirect('https://accounts.spotify.com/en/logout?continue=https%3A%2F%2Faccounts.spotify.com%2Fen%2Fauthorize%3Fresponse_type%3Dcode%26client_id%3D***REMOVED***%26scope%3Duser-read-recently-played%2520user-top-read%2520user-read-private%2520user-read-email%26redirect_uri%3Dhttp%3A%252F%252Frootify.io%3A80%252Fhome%26state%3D' + state + '%26show_dialog%3Dtrue');
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
    var code = req.query.code || null;
    var state = req.query.state || null;
    
    if (code == null || state == null || state != req.cookies['spotify_auth_state']) {
        res.redirect('/');
    } else {
        if (req.cookies['myToken'] != null) {
            res.render('home', {
                access_token: req.cookies['myToken'], 
                refresh_token: req.cookies['myRefreshToken']
            });
        } else {
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
                    
                    res.cookie('myToken', access_token);
                    res.cookie('myRefreshToken', refresh_token);
                    
                    var options = {
                        url: 'https://api.spotify.com/v1/me',
                        headers: {
                            'Authorization': 'Bearer ' + access_token
                        },
                        json: true
                    };
                    res.render('home', {
                        access_token: access_token, 
                        refresh_token: refresh_token
                    });
                } else {
                    // If there is an error or the status is not 'OK' (200),
                    // Then we want to go back to the main login page.
                    res.redirect('/');
                }
            });
        }
    }
});

app.get('/refresh_token', function(req, res) {
    // requesting access token from refresh token
    var refresh_token = req.query.refresh_token;
    var authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        headers: {
            'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
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
    res.redirect('/');
});

// Listen on the main port
app.listen(PORT, () => console.log(`Listening on ${ PORT }`));