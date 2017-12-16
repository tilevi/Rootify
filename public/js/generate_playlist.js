/*
    File:
            generate_playlist.js
    Purpose:
            Handles showing the dialog box and calling the methods needed to create a Spotify playlist.
*/

var preventPlaylist = false;

var addTracksToPlaylist = function(playlistID, uriArr, trackInfo, second_pass) {
    spotifyApi.addTracksToPlaylist(me.uid, playlistID, uriArr, {}, function(err, data) {
        console.log(err, data);
        if (!err) {
            var genPlaylistDiv = d3.select("#recommendedTracks");
            genPlaylistDiv.html("");
            d3.select("#generatedPlaylistTracks").style("display", "block");

            trackInfo.forEach(function(d) {
                genPlaylistDiv.append('div')
                    .attr("class", "trackBox")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "10px")
                    .html(d);
            });

            document.getElementById('geneatePlaylistBtn2').innerHTML = 'PLAYLIST CREATED!';
            setTimeout(function() {
                // Close the dialog box
                $('#dialog').dialog('close');
                
                // Re-allow playlist creation
                preventPlaylist = false;
                
                // Scroll down to the recommended playlist.
                $('#generatedPlaylistTracks')[0].scrollIntoView( true );
            }, 750); 
        } else if (!second_pass) {
            callAPI(function() { addTracksToPlaylist(playlistID, uriArr, trackInfo, true); }, true);
        } else {
            preventPlaylist = false;
        }
    });
}

var createRealPlaylist = function(name, uriArr, trackInfo, maxTracks, second_pass) {
    spotifyApi.createPlaylist(me.uid, 
    {
        name: name, 
        public: true, 
    }, 
    function(err, data) {
        if (!err) {
            var playlistID = data.id;
            callAPI(function() { addTracksToPlaylist(playlistID, uriArr, trackInfo); });
        } else if (!second_pass) {
            callAPI(function() { createRealPlaylist(name, uriArr, trackInfo, maxTracks, true) }, true);
        } else {
            preventPlaylist = false;
        }
    });
}

var createPlaylist = function(name, maxTracks, second_pass) {
    // If we don't have at least 1 seed, return because we can't generate a playlist.
    if ((selectedTrack.length + selectedArtist.length + selectedGenre) <= 0) {
        return;
    }
    
    if (preventPlaylist) {
        return;
    }
    
    // Prevent the user from generating a new playlist at this time.
    preventPlaylist = true;
    
    var uriArr = [];
    var trackInfo = [];

    selectedTrack.forEach(function(d) {
        uriArr.push("spotify:track:" + d);
        trackInfo.push(selectedTrackInfo[d]);
    });

    if ((maxTracks - (selectedTrack.length)) > 0) {
        // Get the recommended tracks.
        var popValues = $("#filter_pop_slider").slider("values");
        var popularityMin = popValues[0];
        var popularityMax = popValues[1];

        var danceValues = $("#filter_dance_slider").slider("values");
        var danceMin = danceValues[0];
        var danceMax = danceValues[1];

        var energyValues = $("#filter_energy_slider").slider("values");
        var energyMin = energyValues[0];
        var energyMax = energyValues[1];

        var positivityValues = $("#filter_valence_slider").slider("values");
        var positivityMin = positivityValues[0];
        var positivityMax = positivityValues[1];

        spotifyApi.getRecommendations(
        {
            // We want to include our selected tracks, so we need to find the remainder of songs
            // There should be a maximum total of 25 tracks.
            limit: 100, //maxTracks - (selectedTrack.length),

            seed_tracks: selectedTrack, 
            seed_artists: selectedArtist, 
            seed_genres: selectedGenre, 

            min_popularity: popularityMin, 
            max_popularity: popularityMax, 

            min_danceability: danceMin / 100, 
            max_danceability: danceMax / 100, 

            min_energy: energyMin / 100, 
            max_energy: energyMax / 100, 

            min_valence: positivityMin / 100, 
            max_valence: positivityMax / 100
        }, 
        function(err, data) {
            console.log(err, data);
            if (!err) {
                
                var trackEmpty = false;
                
                if (data.tracks.length == 0) {
                    trackEmptry = true;
                }
                
                var numTracks = maxTracks - (selectedTrack.length);
                var counter = 0;
                
                data.tracks.forEach(function(d) {
                    // Make sure there can't be duplicate tracks
                    if (d.uri && uriArr.indexOf(d.uri) == -1 && d.available_markets.indexOf("US") != -1 && counter < numTracks) {
                        uriArr.push(d.uri);
                        trackInfo.push(d.name + " - <br/>" + (d.artists.length > 0 ? d.artists[0].name : "N/A"));
                        counter = counter + 1;
                    }
                });
                
                if (uriArr.length == 0 || trackEmpty) {
                     document.getElementById('geneatePlaylistBtn2').innerHTML = 'NO TRACKS FOUND!';
                    setTimeout(function() {
                        // Close the dialog box
                        $('#dialog').dialog('close');
                    }, 1000);
                    preventPlaylist = false;
                    return;
                }

                callAPI(function() { createRealPlaylist(name, uriArr, trackInfo, maxTracks); });
            } else if (!second_pass) {
                callAPI(function() { createPlaylist(name, maxTracks, true) }, true, true);
            } else {
                preventPlaylist = false;
            }
        });
    } else {
        callAPI(function() { createRealPlaylist(name, uriArr, trackInfo, maxTracks); });
    }
}

var finallyCreatePlaylist = function() {
    document.getElementById('geneatePlaylistBtn2').innerHTML = 'CREATING PLAYLIST...';
    // https://stackoverflow.com/questions/12754256/removing-invalid-characters-in-javascript
    var name = ($('#playlistName').val()).replace(/\uFFFD/g, '');
    if (name == "") {
        name = "[Rootify] Playlist";
    }
    var maxTracks = $("#max_tracks_slider").slider("value");
    createPlaylist(name, maxTracks);
}

$(function() {
    $("#dialog").dialog({
        modal: true, 
        autoOpen: false, 
        resizable: false, 
        height: 180, 
        show: {
            effect: "blind", 
            duration: 500
        },
        hide: {
            effect: "blind", 
            duration: 500
        }
    });
    
    $("#geneatePlaylistBtn").on("click", function() {
        if ((selectedTrack.length + selectedArtist.length + selectedGenre.length) > 0) {
            $("#max_tracks_slider").slider({
                min: d3.max([1, selectedTrack.length]), 
                max: 50, 
                value: 25, 
                change: function (event, ui) {
                }, 
                slide: function(event, ui) {
                    var val = ui.value;
                    $("#max_tracks_slider_text").html("Max tracks: " + val);
                }
            });

            // Reset the text (could be different).
            document.getElementById('geneatePlaylistBtn2').innerHTML = 'GENERATE PLAYLIST';
            // Set the text back to 25 (default max tracks).
            $("#max_tracks_slider_text").html("Max tracks: 25");
            $("#dialog").dialog("open");
        }
    });
});