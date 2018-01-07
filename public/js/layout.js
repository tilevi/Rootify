/*
    File:
            layout.js
    Purpose:
            Handles the tree layout (D3.js)
*/

/*
    Global methods
*/
function generateTabSwitched() {}
function doesNotMeetCap() {}
function addToOrRemoveFromSelected() {}
function resizeNodes() {}
function filterNodes() {}
function callAPI() {}

/*
    Selected artists, tracks, genres, and nodes
*/
var selectedArtist = [];
var selectedTrack = [];
var selectedGenre = [];

var lastSelected = null;

/*
    When right-clicking, we collect the IDs to remove from the blacklist.
*/
var rightClickIDs = [];

/*
    Define the Spotify user.
*/
var me = {
    url: "", 
    uid: ""
};

/*
    We store the track information for nodes we've clicked.
    This allows us to display the information when a Spotify user generates a recommended playlist.
*/
var selectedTrackInfo = {};

(function(window, undefined){
    // Either "short" or "long" 
    // Indicates if we want to view short-term or long-term
    var mode = "short";
    var switchingMode = true;

    // Initial tree data
    var treeData = {
                        name: "",
                        root: true, 
                        children: [] 
                    };
    
    // Duration of our transitions
    var duration = 700;

    // This is used as a measure for vertical spacing between nodes
    var verticalSpacing = 80;
    
    // These will be arrays that hold the root's children for each mode.
    var longChildren = null;
    var shortChildren = null;
    
    // Root initially doesn't exist.
    var root = null;
    
    /*
        All of these arrays are used to determine if a certain artist or track already exists in the tree. This is very important because if we have the same artist or track, it's redunant plus we can run into some huge visualization issues.
    */
    
    var root_shortChildren_TrackID = [];
    var root_LongChildren_TrackID = [];
    
    var root_shortChildren_ArtistID = [];
    var root_longChildren_ArtistID = [];
    
    var artistID_short = [];
    var trackID_short = [];

    var artistID_long = [];
    var trackID_long = [];
    
    /*
        Our initial tree layout
    */
    var tree = d3.layout.tree()
        .size([viewerWidth, viewerHeight]);
    
    /*
        This is a path generator that creates an elbow shape.
    */
    var elbow = function(d, i) {
        var targetY = -10;
        var startY = (d.source.y + ((d.source.root) ? 55 : verticalSpacing)) + 0.5;
        
        if (d.target.tid || d.target.aid) {
            targetY = d.target.y;
        }
        
        /*
            There is a small problem with overlapping lines.
            Lines that overlap are darker.
            
            I tried the following solution but it didn't seem to work: 
                https://stackoverflow.com/questions/23126590/colour-issues-when-2-svg-lines-are-overlapping
            
            As a workaround, I only allow the leftmost and rightmost nodes to have long branches.
            The rest have vertical lines (or sticks).
        */
        if (d.source.root) {
            if (d.target.place && ((d.target == d.source.children[0]) || 
                (d.target == d.source.children[d.source.children.length - 1]))) {
                return ("M" + (d.source.x + 0.5) + "," + (startY) + "H" + d.target.x + "V" + (targetY));
            } else {
                return ("M" + (d.target.x) + "," + (startY + 0.5) + "H" + (d.target.x - 0.1) + "V" + (targetY));
            }
        }
        
        return ("M" + (d.source.x) + "," + (startY) + "H" + d.target.x + "V" + (targetY));
    }
    
    /*
        We use this to sort our tree.
        Top tracks and artists appear left to right.

        In other words, the track or artist you listen to more are on the left.
    */
    var sortTree = function() {
        tree.sort(function(a, b) {

            if (a.depth > 1 && a.popularity && b.popularity) {
                return b.popularity - a.popularity;
            }

            return a.index - b.index;
        });
    }

    // Initially, sort the tree.
    sortTree();

    /*
        Artist, track, and genre upper-limit.
        Returns true if the total combination of all of these exceeds 5
    */
    doesNotMeetCap = function() {
        return ((1 + selectedArtist.length + selectedTrack.length + selectedGenre.length) > 5);
    }

    /*
        Handles when we switch between the 'Details' and 'Generate' tabs.
    */
    generateTabSwitched = function(isActive) {
        generateTabIsActive = isActive;
        if (lastSelected != null) {
            var color;
            if (isActive) {
                color = (isNodeSelected(lastSelected)) ? "#4B9877" : "#282828";
            } else {
                color = "#FF8C00";
            }
            var parNode = d3.select(lastSelected.parentNode);
            var parCircle = parNode.select("circle.node"); 
            if (parCircle[0][0] != null) {
                parCircle.style("stroke", color);
            } else {
                parNode.select("rect.node").style("stroke", color);
            }
            
            // We switched to the 'Details' tab, show the previous information.
            if (!isActive) {
                setTimeout(function() {
                    barManager.showBars();
                }, 0);
            }
        }
    }

    /*
        Call Spotify Web API
    */
    callAPI = function(callback, second_pass, special) {
        if (!second_pass) {
            callback();
        } else {
            // Second pass, attempt to get a new access token
            refreshAccessToken(function() { callback(second_pass) });
        }
    }
    
    /*
        Populate children array with tracks.
    */
    var loadTopArtists = function() {}
    var doneLoading = function() {}

    var getAudioFeatures = function(data, source, second_pass) {
        var tracks = [];
        var audioFeatures = {};

        var j = 0;

        while (j < data.length) {
            tracks.push(data[j].id);
            j++;
        }

        spotifyApi.getAudioFeaturesForTracks(tracks, function(err, track_data) {
            if (!err) {
                j = 0;
                while (j < track_data.audio_features.length) {
                    var item = track_data.audio_features[j];
                    if (item != null) {
                        audioFeatures[item.id] = {
                            energy: item.energy, 
                            dance: item.danceability, 
                            valence: item.valence, 
                            tonic: item.key, 
                            mode: item.mode
                        }
                    }
                    j++;
                }

                // Populate the children array for the track node.
                populateChildrenArray(data, source, "track", audioFeatures);
            } else if (!second_pass) {
                callAPI(function() { getAudioFeatures(data, source, true) }, true);
            }
        });
    }

    var getTrackRecommendations = function(id, source, second_pass) {
        var popValues = $("#gen_pop_slider").slider("values");
        var popularityMin = popValues[0];
        var popularityMax = popValues[1];

        var danceValues = $("#gen_dance_slider").slider("values");
        var danceMin = danceValues[0];
        var danceMax = danceValues[1];

        var energyValues = $("#gen_energy_slider").slider("values");
        var energyMin = energyValues[0];
        var energyMax = energyValues[1];

        var positivityValues = $("#gen_valence_slider").slider("values");
        var positivityMin = positivityValues[0];
        var positivityMax = positivityValues[1];
        
        spotifyApi.getRecommendations(
            {
                limit: 100, 
                seed_tracks: id, 
                
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
                if (!err) {
                    
                    var new_data = [];
                    var count = 0;
                    var i = 0;
                    
                    while (count < 100 && (i < data.tracks.length)) {
                        var d = data.tracks[i];
                        if (d.available_markets.indexOf("US") != -1) {
                            new_data.push(d);
                            count++;
                        }
                        i++;
                    }
                    
                    var shuffle = new_data.sort(function() { return 0.5 - Math.random() });
                    callAPI(function() { getAudioFeatures(shuffle, source); });
                } else if (!second_pass) {
                    callAPI(function() { getTrackRecommendations(id, source, true); }, true);
                }
            }
        );
    }

    var getRelatedArtists = function(id, node, second_pass) {
        spotifyApi.getArtistRelatedArtists(id, function(err, data) {
            if (!err) {
                var popValues = $("#gen_pop_slider").slider("values");
                var popularityMin = popValues[0];
                var popularityMax = popValues[1];

                var new_data = [];
                data.artists.forEach(function(a) {
                    if (a.popularity >= popularityMin && a.popularity <= popularityMax) {
                        new_data.push(a);
                    }
                });
                
                var shuffle = new_data.sort(function() { return 0.5 - Math.random() });
                populateChildrenArray(shuffle, node, "artist");
            } else if (!second_pass) {
                callAPI(function() { getRelatedArtists(id, node, true); }, true);
            }
        });
    }

    // This variable stores a reference to our last selected node.
    lastSelected = null;

    /*
        Returns true if the node is part of the selected set.
    */
    var isNodeSelected = function(node) {
        var d = d3.select(node).datum();
        var selectArr = (d.aid != null ? selectedArtist : selectedTrack);
        var id = (d.aid != null ? d.aid : d.tid);

        return (selectArr.indexOf(id) != -1);
    }

    var deselectLastFocused = function() {
        if (lastSelected != null) {
            var color = (isNodeSelected(lastSelected)) ? "#4B9877" : "none"; //"#2F394C";
            var parNode = d3.select(lastSelected.parentNode);
            var parCircle = parNode.select("circle.node"); 

            if (parCircle[0][0] != null) {
                parCircle.style("stroke", color);
            } else {
                parNode.select("rect.node").style("stroke", color);
            }
            lastSelected = null;
        }
    }

    var clearDetailsTab = function() {
        
        d3.select("#place")
                .style("display", "none")
                .html("");
        
        d3.select("#headerImage").style("display", "none");
        d3.select("#spotifyTracks").style("display", "none");
        d3.select("#spotifyTracks2").style("display", "none");
        
        d3.select("#at-container").style("display", "none");
        barManager.clearSelection();
        
        
        d3.select("#dropdown-container").style("display", "none");
        
        d3.select("#detailsGenres").style("display", "none");
        d3.select("#artistAbout").style("display", "none");
        
        d3.select("#description").style("display", "block");
        d3.select("#donateFooter").style("display", "block");
    }
    
    var triangleSize = function(d) {
        return (7 * 7) / 2;
    }
    
    /*
        Loads an artist's bio.
    */
    var loadArtistBio = function(name) {
        d3.select("#artistAbout").style("display", "none");
        
        /* Fetch the artist's bio. */
        $.ajax({
            url: "http://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=" + name + "&api_key=9f5228be9f2d49c1700e60d8d3e02eb3&format=json", 
            success: function(result){
                
                if (lastSelected == null) {
                    return;
                } else {
                    var d = d3.select(lastSelected).datum();
                    if (d.tid) {
                        return;
                    }
                    if (d.name != name) {
                        loadArtistBio(d.name);
                        return;
                    }
                }
                
                if (result && result.artist && result.artist.bio && result.artist.bio.summary && result.artist.bio.summary.trim() != "") {
                    var bio = result.artist.bio.summary;
                    var editedBio = bio.slice(0, (bio.slice(0, bio.lastIndexOf("<a"))).lastIndexOf(".") + 1);
                    if (editedBio.trim() != "") {
                        d3.select("#artistAbout").style("display", "block").html("<h2>About</h2>" + editedBio);
                    } else {
                        d3.select("#artistAbout").style("display", "none");
                    }
                } else {
                    d3.select("#artistAbout").style("display", "none");
                }
            }
        });
    }
    
    /*
        Sets/Loads track or artist details (for the 'Details' tab)
    */
    var loadDetailsTabForNode = function(node, typ, isGenerateTab) {
        deselectLastFocused();

        if (node != null) {
            d3.select(node.parentNode).select((typ == "track" ? "rect.node" : "circle.node"))
                                        .style("stroke", "#FF8C00");
            
            lastSelected = node;
            var d = d3.select(node).datum();
            
            if (d.aid) {
                if (d.tracks) {
                    loadSpotifyTracks(d.tracks, false);
                } 
                else {
                    callAPI(function() { getArtistTopTracks(d, function() { loadSpotifyTracks(d.tracks, false); }); });
                }

                if (barManager.artistNotLoaded(d.aid)) {                        
                    var trackInfo = {
                        Popularity: d.popularity,
                        Danceability: 0,
                        Energy: 0,
                        Happiness: 0,
                        Key: { key: 0, mode: 0 }
                    };

                    var obj = { id: d.aid, typ: "artist" };

                    if (isGenerateTab) {
                        barManager.setTrackInfo(trackInfo, obj);
                    } else {
                        setTimeout(function() {
                            barManager.showBars(trackInfo, obj);
                        }, 0);
                    }
                }
            } else {
                loadSpotifyTracks([d.tid], true);

                if (barManager.trackNotLoaded(d.tid)) {                    
                    var trackInfo = {
                        Popularity: d.popularity,
                        Danceability: d.dance,
                        Energy: d.energy,
                        Happiness: d.valence,
                        Key: { key: d.tonic, mode: d.mode },
                    };

                    var obj = { id: d.tid, typ: "track" };
                    obj.typ = (d.hasAudioFeatures) ? "track" : "artist";

                    if (isGenerateTab) {
                        barManager.setTrackInfo(trackInfo, obj);
                    } else {
                        setTimeout(function() {
                            barManager.showBars(trackInfo, obj, true);
                        }, 0);
                    }
                }  
            }

            if (typ == "artist") {
                d3.select("#dropdown-container").style("display", "none");
                d3.select("#description").style("display", "none");
                d3.select("#donateFooter").style("display", "none");
                
                if (d.place != null) {
                    //var modeStr = (mode == "short") ? "Short-term" : "Long-term";
                    d3.select("#place")
                        .style("display", "block")
                        .html("<h2>#" + d.place + " Artist</h2>");
                } else {
                    d3.select("#place")
                        .style("display", "none")
                        .html("");
                }
                
                d3.select("#headerImage")
                        .style("display", "block")
                        .style("cursor", "pointer")
                        .style("height", "200px")
                        .style("width","100")
                        .style("font-size", "1.5em")
                        .style("font-family", "Arial, Helvetica, sans-serif")
                        .style("line-height", "90%")
                        .style("padding", "6%")
                        .style("vertical-align", "middle;")
                        .text(d.name)
                        .on("click", function() {
                            var win = window.open(d.uri, "_parent");
                        });
                
                d3.select("#headerImage")
                        .style("background-image", "linear-gradient(to bottom right,rgba(0,122,223, .8),rgba(0,236,188, .5)), url('" + d.url + "')")
                        .style("background-repeat", "no-repeat")
                        .style("background-size", "cover");
                
                // If there are genres for this artist, list them
                if (d.genres.length > 0) {
                    d3.select("#detailsGenres").style("display", "block").html("<b>Associated Genres:</b><br/>" + d.genres.join(", "));
                } else {
                    d3.select("#detailsGenres").style("display", "none");
                }
                
                loadArtistBio(d.name);
            } else {   
                if (d.place != null) {
                    //var modeStr = (mode == "short") ? "Short-term" : "Long-term"; 
                    d3.select("#place")
                        .style("display", "block")
                        .html("<h2>#" + d.place + " Track</h2>");
                } else {
                    d3.select("#place")
                        .style("display", "none")
                        .html("");
                }
                
                d3.select("#dropdown-container").style("display", "block");
                d3.select("#addToPlaylistBtn").html("Add to Playlist");
                
                d3.select("#description").style("display", "none");
                d3.select("#donateFooter").style("display", "none");
                
                // Hide the artist header image and associated genres.
                d3.select("#headerImage").style("display", "none");
                d3.select("#detailsGenres").style("display", "none");
                d3.select("#artistAbout").style("display", "none");
            }
        }
    }

    var findNodeFromTree = function(id, typ) {
        var notFound = true;
        var node = null;

        if (typ == "artist") {
            svgGroup.selectAll("g.node").each(function(d) {
                if (notFound && d.aid == id && lastSelected != this) {
                    node = this;
                    notFound = false;
                }
            });
        } else {
            svgGroup.selectAll("g.node").each(function(d) {
                if (notFound && d.tid == id && lastSelected != this) {
                    node = this;
                    notFound = false;
                }
            });
        }

        return node;
    }

    addToOrRemoveFromSelected = function(name, artistName, id, typ, node) {
        // Hide the description
        d3.select("#description2").style("display", "none");
        
        var selectedArr = (typ == "artist" ? selectedArtist : selectedTrack);        
        // If the selected artist is not in the selected artist array
        if (selectedArr.indexOf(id) == -1) {
            // If we exceed a maximum combination of 5 artists, tracks and genres, return.
            if (doesNotMeetCap()) { return; }
            
            var shapeTyp = (typ == "track") ? "rect.node" : "circle.node";
            var clicked = true;

            if (node == null) {
                clicked = false;
                node = findNodeFromTree(id, typ);
                if (node != null) {
                     d3.select(node).select(shapeTyp).style("stroke", "#4B9877");
                }
            }

            if (node) {
                d3.select(node).select(shapeTyp).style("stroke", "#4B9877");
            }

            var selectType = typ == "artist" ? "#selectedArtists" : "#selectedTracks";
            var trackBox = d3.select(selectType)
                    .append('div')
                    .attr("id", "selected_" + id)
                    .attr("class", "trackBox")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", "10px")
            trackBox.append('div')
                    .attr("class", "trackBoxText")
                    .html(name + (artistName != null ? (" - <br/>" + artistName) : ""))
            trackBox.append('div').attr("id", "closeButton").html("&times").on("click", function() {
                        var findNode = findNodeFromTree(id, typ);
                        if (findNode != null) {
                            d3.select(findNode).select(shapeTyp).style("stroke", "none");
                        }

                        selectedArr.splice(selectedArr.indexOf(id), 1);

                        if (typ == "track") {
                            selectedTrackInfo[id] = null;
                        }
                        d3.select("#selected_" + id).remove();
                        
                        if ((selectedTrack.length + selectedArtist.length + selectedGenre.length) <= 0) {
                            d3.select("#description2").style("display", "block");
                        }
                    });

            selectedArr.push(id);
            if (selectedArr == selectedTrack) {
                selectedTrackInfo[id] = name + " - <br/>" + artistName;
            }

            if (clicked) {
                loadDetailsTabForNode(node, typ, true);
            }
        } else {
            // Removes the track box
            d3.select("#selected_" + id).remove();
            selectedArr.splice(selectedArr.indexOf(id), 1);
            if (typ == "track") {
                selectedTrackInfo[id] = null;
            }
            
            if ((selectedTrack.length + selectedArtist.length + selectedGenre.length) <= 0) {
                d3.select("#description2").style("display", "block");
            }
            
            var parNode = d3.select(node.parentNode);
            var parCircle = parNode.select("circle.node"); 
            if (parCircle[0][0] != null) {
                parCircle.style("stroke", "none");
            } else {
                parNode.select("rect.node").style("stroke", "none");
            }
        }
    }

    /* Handle selection when a node is clicked/selected. */
    var handleSelection = function(node, typ, id, name, artistName) {
        if (node != null) {
            if (generateTabIsActive) {
                addToOrRemoveFromSelected(name, artistName, id, typ, node);
            } else {
                //if (node != lastSelected) {
                    //deselectLastFocused();
                //}

                loadDetailsTabForNode(node, typ, false);
            }
        } else {
            // Clear the contents in the 'Details' tab.
            clearDetailsTab();
            // Deselect the last focused node.
            deselectLastFocused();
        }
    }
    
    /* Loads the Spotify player widget(s) in the 'Details' tab. */
    var loadSpotifyTracks = function(trackArr, trackOnly) {
        var numberOfTracks = trackArr.length;
        var height = (numberOfTracks <= 1) ? 355 : 75;
        var html = trackOnly ? "" : "<h2>Top Tracks</h2>";
        
        // Loop through each track and display its Spotify widget
        for (var i = 0; i < numberOfTracks; i++) {
            var trackID = trackArr[i];
            if (trackOnly) {
                html = html + "<iframe src='https://open.spotify.com/embed/track/" + trackID + "' width='100%' height='" + height + "px' frameborder='0' allowtransparency='true'></iframe>";
            } else {
                html = html + "<button onclick='savedIDObj[\"myDropdown" + (i+1) + "\"] = \"" + trackID + "\"; var drop = d3.select(\"#myDropdown" + (i+1) + "\"); drop.html(\"\"); drop.append(\"a\").attr(\"class\", \"noSelect\").html(\"New Playlist\").on(\"click\", function() { clearTimeout(timeOut); newPlaylistTrackID = \"" + trackID + "\"; $(\"#playlistName2\").val(\"\"); $(\"#dialog2\").dialog(\"open\"); }); drop.append(\"hr\").style(\"margin\", \"1px 0px 1px 0px\"); fetchPlaylists(0, \"myDropdown" + (i+1) + "\", true);' class='playEnd' width='8%' height='" + height + "px'>&#x2b;</button><iframe src='https://open.spotify.com/embed/track/" + trackID + "' width='92%' height='" + height + "px' frameborder='0' allowtransparency='true'></iframe><div id=\"myDropdown" + (i+1) + "\" class=\"dropdown-content\"></div><button width=100% id='myDropdown" + (i+1) + "Box' class='dropbtn2'></button>";
            }
            
            if ((i + 1) != numberOfTracks) {
                html = html + "<div class='noSpace'><br/></div>";
            }
        }
        
        var elementID = trackOnly ? "#spotifyTracks2" : "#spotifyTracks";
        
        if (trackOnly) {
            d3.select("#iframeOverlay")
                .on("click", function() {
                    var win = window.open("spotify:track:" + trackID, "_parent");
                });
        }
        
        if (trackOnly) {
            d3.select("#iframeOverlay").style("display", "block");
            d3.select("#spotifyTracks").style("display", "none");
        } else {
            d3.select("#spotifyTracks2").style("display", "none");
        }
        
        d3.select(trackOnly ? "#spotifyTracks2" : "#spotifyTracks").style("display", "block");
        d3.select(trackOnly ? "#iframeTrack" : "#spotifyTracks").html(html);
    }
    
    var getArtistTopTracks = function(source, callback, second_pass) {
        spotifyApi.getArtistTopTracks(source.aid, "US", {}, function(err, data) {
            if (!err) {
                var j = 0;
                var count = 0;
                source.tracks = [];
                
                while (j < data.tracks.length && count < 2) {
                    var item = data.tracks[j];
                    if (item != null) {
                        source.tracks.push(item.id);
                        count++;
                    }
                    j++;
                }
                callback();
            } else if (!second_pass) {
                callAPI(function() { getArtistTopTracks(source, function() { loadSpotifyTracks(source.tracks, false); }, true); }, true);
            }
        });
    }

    /*
        Populates a node's children array.
        This method is given the tracks or artists to add to the source node.
    */
    var childIDs = [];
    var childInfo = {};
    
    var populateChildrenArray = function(data, source, typ, audioFeatures) {
        // Array of tracks/artists that we already have in our tree.
        var blacklist = null;

        if (typ == "track") {
            blacklist = (mode == "short") ? trackID_short : trackID_long;
        } else {
            blacklist = (mode == "short") ? artistID_short : artistID_long;
        }
        
        var nonRootNode = (source != root);
        if (nonRootNode || typ == "track") {
            source.children = [];
        } else {
            /*
                This branch is taken when we are operating on the root node with typ 'artist'
                If we have enough data, then we should add a spacer.
            */
            if (data.length > 0 && source.children.length > 0) {
                source.children.push
                ({
                    index: source.children.length, 
                    spacer: true 
                });
            }
        }

        // We only want to start at index 6 if we're a root node populating our top artists
        var baseIndex = (nonRootNode || typ == "track") ? 0 : 6;
        var maxChildren = (nonRootNode) ? 3 : 5;
        
        var i = 0;
        var count = 0;

        while ( (i < data.length) && (count < d3.min([maxChildren, data.length])) ) {
            var obj = data[i];
            // If the track or artist is already a child, allow it to show up again.
            if (obj != null && ((rightClickIDs.indexOf(obj.id) != -1) || (blacklist.indexOf(obj.id) === -1))) {
                if (typ == "track") {
                    var trackObj = {
                        index: baseIndex + i, 
                        name: obj.name, 
                        artist: obj.artists.length > 0 ? obj.artists[0].name : "N/A", 
                        tid: obj.id, 
                        url: obj.album.images.length > 1 ? obj.album.images[1].url : "../assets/unknown.png", 
                        popularity: obj.popularity / 100, 
                        energy: 0, 
                        dance: 0, 
                        valence: 0, 
                        tonic: 0, 
                        mode: 0, 
                        hasAudioFeatures: false, 
                        place: (nonRootNode) ? null : (i + 1)
                    };
                    
                    if (childInfo[obj.id] != null) {
                        trackObj.howTall = childInfo[obj.id].howTall;
                        trackObj.newSize = childInfo[obj.id].newSize;
                    }

                    var audioFeat = audioFeatures[obj.id];
                    var hasAudioFeatures = (audioFeat != null);

                    if (hasAudioFeatures) {
                        trackObj.energy = audioFeat.energy;
                        trackObj.dance = audioFeat.dance;
                        trackObj.valence = audioFeat.valence;
                        trackObj.tonic = audioFeat.tonic;
                        trackObj.mode = audioFeat.mode;
                        trackObj.hasAudioFeatures = true;
                        source.children.push(trackObj);
                    } else {
                        // This track doesn't have audio feature analysis.
                        source.children.push(trackObj);
                    }
                } else {
                    var trackObj = {
                        index: baseIndex + i, 
                        name: obj.name, 
                        uri: obj.uri, 
                        aid: obj.id, 
                        url: obj.images.length > 2 ? obj.images[2].url : "../assets/unknown.png", 
                        popularity: obj.popularity / 100, 
                        genres: obj.genres, 
                        place: (nonRootNode) ? null : (i + 1)
                    };
                    
                    if (childInfo[obj.id] != null) {
                        trackObj.howTall = childInfo[obj.id].howTall;
                        trackObj.newSize = childInfo[obj.id].newSize;
                    }
                    
                    source.children.push(trackObj);
                }
                blacklist.push(obj.id);
                count++;
            }
            i++;
        }
        
        if (nonRootNode) {
            var pan = update(source, true);
            centerNode(source, false, pan);
            source._children = null;
            
            // Wait for the transitions to finish before setting it to false.
            setTimeout(function() {
                switchingMode = false;
                source.clicked = false;
            }, duration);
        } else if (typ == "track") {
            callAPI(loadTopArtists);
        } else {
            doneLoading();
        }
    }

    /*
        This code handles our zoom.
        It transforms our SVG 'g' (or group) element.

        If we put the root at the top left, the translation is [0, 0].
    */
    var zoom = function() {
        var translate = d3.event.translate;
        var scale = d3.event.scale;

        svgGroup.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    }

    // Our zoom listener
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom).scale(1.5);

    // Our base SVG
    var baseSvg = d3.select("#baseSVG").call(zoomListener);
    baseSvg.on("dblclick.zoom", null);

    /*
        Our clip paths.
        One is for our avatar (bigger radius), another is for the nodes (smaller radii).
        
        We need to create clip paths for a range of radii due to the resize functionality.
    */
    for (var i = 0; i <= 15; i++) {
        baseSvg.append('defs')
            .append('clipPath')
            .attr("id", "clip-r-" + (10 + i))
            .append('circle')
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", (10 + i - 1));

        baseSvg.append('defs')
            .append('clipPath')
            .attr("id", "clip-r-resize-" + (10 + i))
            .append('circle')
                .classed("clipResize", true)
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", (10 + i - 1));
    }

    /* Clip path for the root node. */
    baseSvg.append('defs')
        .append('clipPath')
            .attr("id", "clip-root")
            .append('circle')
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", 31)
                .style("filter", "url(#drop-shadow)");

    /* drop shadow under the node */
    var defs = svg.append("defs");

    // create filter with id #drop-shadow
    var filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("height", "180%");

    // SourceAlpha refers to opacity of graphic that this filter will be applied to
    // convolve that with a Gaussian with standard deviation 3 and store result
    // in blur
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 1)
        .attr("result", "blur");

    // translate output of Gaussian blur to the right and downwards with 2px
    // store result in offsetBlur
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 1)
        .attr("dy", 2.5)
        .attr("result", "offsetBlur");
    // Control opacity of shadow filter
    var feTransfer = filter.append("feComponentTransfer");

    feTransfer.append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 0.33)

    // overlay original SourceGraphic over translated blurred opacity by using
    // feMerge filter. Order of specifying inputs is important!
    var feMerge = filter.append("feMerge");

    feMerge.append("feMergeNode")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");
    
    /*
        This a helper function that converts an element's position in the SVG to its relative position to the SVG. Therefore, we can figure out if a node is visible.

        Reference: https://stackoverflow.com/questions/18554224/getting-screen-positions-of-d3-nodes-after-transform/18561829
    */
    var getScreenCoords = function(x, y, ctm) {
        var xn = ctm.e + x*ctm.a + y*ctm.c;
        var yn = ctm.f + x*ctm.b + y*ctm.d;
        return { x: xn, y: yn };
    }

    /*
        This function centers the view of a node at in the middle of the SVG, 
        and then 1/8 from the top of the SVG.

        We pass shouldPan to indicate if we should pan the view.
        In the update() function, we do some checks for the newly entered nodes, 
        and then return shouldPan. We then call centerNode(...) with this return value as a parameter.
    */
    var centerNode = function(source, first, shouldPan) {
        // Don't pan if you're not root or if you're on the screen.
        if (!first && !shouldPan) { return; }

        scale = zoomListener.scale();
        x = -source.x0;
        y = -source.y0;

        x = x * scale + viewerWidth / 2;

        svgGroup.transition()
            .duration(duration)
        y = y * scale + viewerHeight / 8;

        var dur = duration;

        if (first) {
            dur = 0;
        }

        svgGroup
            .transition()
            .duration(dur)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");

        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }
    
    /*
        This function is used when clicking on an artist or track.
    */
    var toggleChildren = function(d) {
        if (d._children) {
            // Here, we store a collapsed node's children in _children if it was opened previously.
            d.children = d._children;
            d._children = null;
            
            var pan = update(d);
            centerNode(d, false, pan);
            
            switchingMode = false;
            d.clicked = false;
        } else if (d.aid && !d.children) {
            // Grab related artists based on the artist we just selected.
            callAPI(function() { getRelatedArtists(d.aid, d); });
        } else if (d.tid && !d.children) {
            // Grab related tracks
            callAPI(function() { getTrackRecommendations(d.tid, d); });
        } else if (d.children) {
            d._children = d.children;
            d.children = null;
            var pan = update(d);
            centerNode(d, false, pan);
            
            switchingMode = false;
            d.clicked = false;
        }
    }
    
    /*
        When we click on a node, this fucntion is called.
        We don't allow toggling if a transition is occuring or we clicked on the root node.
    */
    var click = function(d, d3This, force) {
        if (d.clicked || switchingMode) {
            return;
        }
        
        d.clicked = true;
        switchingMode = true;
        
        // The user pressed on an arrow.
        d3This.select(".triangleDown").style("fill", "#01B482");
        d3This.select(".triangleUp").style("fill", "#01B482");
        
        // collectChildInfo(d);
        
        // Turn off the green glow after a short duration.
        setTimeout(function() {
            d3This.select(".triangleDown").style("fill", "#fff");
            d3This.select(".triangleUp").style("fill", "#fff");
            
            toggleChildren(d);
        }, 100);
    }
    
    /*
        This function collects the IDs of all nodes in a sub-tree.
    */
    var recurID = function(d, not_first) {
        var childArray = (d.children ? d.children : (d._children ? d._children : null));
        
        if (childArray != null) {
            childArray.forEach(function(e) {
                recurID(e, true);
            });
        }
        
        if (not_first) {
            var id = (d.tid != null) ? d.tid : d.aid;
            
            rightClickIDs.push(id);
            childInfo[id] = {
                                howTall: d.howTall, 
                                newSize: d.newSize
                            };
        }
    }
    
    /*
        Right-click
    */
    var rightclick = function(d, d3This) {
        if (d.clicked || switchingMode) {
            return;
        }
        
        d.clicked = true;
        switchingMode = true;
        
        // The user pressed on an arrow.
        d3This.select(".triangleDown").style("fill", "#01B482");
        d3This.select(".triangleUp").style("fill", "#01B482");
        
        //
        
        rightClickIDs = [];
        childInfo = {};
        recurID(d);
        
        //
        
        d.children = null;
        d._children = null;
        
        // Turn off the green glow after a short duration.
        setTimeout(function() {
            d3This.select(".triangleDown").style("fill", "#fff");
            d3This.select(".triangleUp").style("fill", "#fff");
            
            toggleChildren(d);
        }, 100);
    }
    
    //This is the accessor function we talked about above
    var lineFunction = d3.svg.line()
                            .x(function(d) { return d.x; })
                            .y(function(d) { return d.y; })
                            .interpolate('linear');
    
    var filterNode = function(d, element) {
        if (d.root || d.spacer) { return; }
        var pass = true;

        for (var key in filterOptions) {
            var typ = filterOptions[key].typ;
            var range = filterOptions[key].values;

            var featValue = Math.floor(d[typ] * 100);
            var min = range[0];
            var max = range[1];

            if (featValue < min || featValue > max || (typ != "popularity" && !d.aid && !(min == 0 && max == 100) && !d.hasAudioFeatures)) {
                pass = false;
                break;
            }
        }

        setTimeout(function() {
            d3.select(element).select("image").style("opacity", pass ? 1 : 0.05);
        }, 0);
    }

    filterNodes = function() {
        var node = svgGroup.selectAll("g.node");

        // For each node in the set..
        node.each(function(d) {
            filterNode(d, this);
        });
    }

    var sizeScale = d3.scale.linear()
                        .domain([0.10,0.95]).range([20, 50]).clamp(true);

    var getNodeSize = function(d) {
        var num = 1;
        var features = false;

        if (d.aid || d.tid) {
            for (var key in scaleOptions) {
                var value = scaleOptions[key];
                if (value) {
                    if (key == "popCheck") {
                        num = num * d.popularity;
                    } else if (d.tid) {
                        if (key == "energyCheck") {
                            num = num * d.energy;
                        } else if (key == "danceCheck") {
                            num = num * d.dance;
                        } else if (key == "posCheck") {
                            num = num * d.valence;
                        }
                        // We are resizing by audio features.
                        features = true;
                    }
                }
            }
        }

        return {
            size: sizeScale(num), 
            features: features
        }
    }
    
    resizeNodes = function() {
        // Grab the new set
        node = svgGroup.selectAll("g.node");
        
        // For each node in the set..
        node.each(function(d) {
            // Don't resize the root node.
            if (d.root) { return; }
            
            var result = getNodeSize(d);
            var newSize = result.size;
            var audioFeatures = result.features;
            
            var d3This = d3.select(this);
            
            d.howTall = newSize/2;
            d.newSize = newSize;
            
            // If the node represents an artist..
            if (d.aid) {
                var circleRadius = Math.floor(newSize/2);
                var imageWidth = (newSize-1);
                var imageHeight = (newSize-1);
                
                d3This.select("circle.node")
                        .attr("r", circleRadius);
                
                d3This.select("circle.circleShadow")
                        .attr("r", circleRadius);
                
                d3This.select('image')
                        .attr("clip-path", "url(#clip-r-" + circleRadius + ")");
                
                d3This.select('image')
                        .attr('x', -imageWidth/2)
                        .attr('y', -imageHeight/2)
                        .attr('width', imageWidth)
                        .attr('height', imageHeight);
            } else { // Otherwise, the node must represent a track..
                var rectWidth = newSize;
                var rectHeight = newSize;

                var imageWidth = newSize - 2;
                var imageHeight = newSize - 2;

                d3This.select("rect.node")
                        .attr('x', -rectWidth/2)
                        .attr('y', -rectHeight/2)
                        .attr('width', rectWidth)
                        .attr('height', rectHeight);
                
                d3This.select("rect.rectShadow")
                        .attr('x', -imageWidth/2)
                        .attr('y', -imageHeight/2)
                        .attr('width', imageWidth)
                        .attr('height', imageHeight);
                
                d3This.select('image')
                        .attr('x', -imageWidth/2)
                        .attr('y', -imageHeight/2)
                        .attr('width', imageWidth)
                        .attr('height', imageHeight);
            }
            
            // Update the position of the vertical line (below the node)
            d3This.select("path.line1")
                    .attr("d", lineFunction(
                        [
                            {
                                x: 0,
                                y: (d.root ? 32 : (d.howTall ? (d.howTall + 2) : 26))
                            }, 
                            {
                                x: 0, 
                                y: (d.root ? 55 : (verticalSpacing - 12))
                            }
                        ]));
            
            createTextbox(d3This, 50);
            
            // Update the position of the down triangle (expand or collapse tree)
            d3This.select("path.triangleDown")
                    .attr("transform", function(d) { return "translate(" + 0 + "," + (d.howTall + 5) + ") rotate(180)"; });
        });
        
        // Once all of the nodes have been resized, reposition the tree links.
        var link = svgGroup.selectAll("path.link");
        
        // Transition links to their new positions.
        link.attr("d", elbow);
    }
    
    var createUpTriangle = function(d3This) {
        d3This.append('path')
            .classed("triangleUp", true)
            .attr("d", d3.svg.symbol().type("triangle-up").size(triangleSize))
            .attr("transform", function(d) { return "translate(" + 0 + "," + (verticalSpacing - 6) + ")"; })
            .style("fill", "white")
            .style("stroke", "#2f394c")
            .style("stroke-width", "0px")
            .style("opacity", 0)
            .on("click", function(d) { click(d, d3This); })
            .on('contextmenu', function(d) { rightclick(d, d3This); })
            .transition()
            .duration(duration)
            .style("opacity", 1);
    }
    
    var createVerticalLine = function(d3This) {
        var d = d3This.datum();
        
        d3This.append('path')
            .attr("class", "line1")
            .attr("d", lineFunction(
                [
                    {
                        x: 0,
                        y: (d.root ? 32 : (d.howTall ? (d.howTall + 2) : 26))
                    }, 
                    {
                        x: 0.01, 
                        y: (d.root ? 55 : (verticalSpacing - 12))
                    }
                ]))
            .style("stroke", "#979797")
            .style("stroke-width", "1px")
            .style("stroke-opacity", 0)
            .transition()
            .duration(duration)
            .style("stroke-opacity", 1);
    }
    
    /* Text overflow solution by user2846569 on Stack Overflow*/
    var wrap = function(d3This, maxWidth) {
        var self = d3This,
            textLength = self.node().getComputedTextLength(),
            text = self.text();
        while ((textLength > maxWidth) && text.length > 0) {
            text = text.slice(0, -1);
            self.text(text + '..');
            textLength = self.node().getComputedTextLength();
        }
    } 
    
    /* Original code by Mike Bostock. */
    var twoWrap = function(text, width, track, artistName) {
        text.each(function() {

            var breakChars = ['/', '&', '-'],
            text = d3.select(this),
            textContent = text.text(),
            spanContent;

            breakChars.forEach(char => {
                // Add a space after each break char for the function to use to determine line breaks
                textContent = textContent.replace(char, char + ' ');
            });

            var textColor = (track ? '#FFF' : '#00B685');
            var words = textContent.split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.1, // ems
            x = text.attr('x'),
            y = text.attr('y'),
            dy = parseFloat(text.attr('dy') || 0),
            tspan1 = text.text(null).append('tspan').attr("class", "tSpanText").attr('x', x).attr('y', y).attr('dy', dy + 'em').style('fill', textColor);
            
            var tspan2 = null;
            var tspan3 = null;    
            
            while (word = words.pop()) {
                if (lineNumber == 1) {
                    line = word + ' ' + words.reverse().join(' ');
                    tspan2.text(line);
                    wrap(tspan2, width);
                    
                    if (tspan1.text().trim() == "") {
                        tspan1.remove();
                        lineNumber--;
                        tspan2.attr('dy', lineNumber * lineHeight + dy + 'em');
                    }
                    break;
                }

                line.push(word);
                tspan1.text(line.join(' '));

                if (tspan1.node().getComputedTextLength() > width) {
                    line.pop();
                    spanContent = line.join(' ');
                    breakChars.forEach(char => {
                        // Remove spaces trailing breakChars that were added above
                        spanContent = spanContent.replace(char + ' ', char);
                    });

                    tspan1.text(spanContent);                
                    words.push(word);

                    tspan2 = text.append('tspan').attr("class", "tSpanText").attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').style('fill', textColor).text(null);
                }
            }
            
            if (track) {
                dy += 0.2;
                tspan3 = text.append('tspan').attr("class", "tSpanText").attr('x', x).attr('y', y).attr('dy', ++lineNumber * lineHeight + dy + 'em').style('fill', '#00B685').text(artistName);
                wrap(tspan3, width);
            }
        });
    }
    
    /* Drop shadow under the node */
    var defs = svg.append("defs");
    
    // Create filter with id #drop-shadow
    var filter = defs.append("filter")
        .attr("id", "drop-shadow")
        .attr("height", "180%");
    
    // SourceAlpha refers to opacity of graphic that this filter will be applied to
    // convolve that with a Gaussian with standard deviation 3 and store result
    // in blur
    filter.append("feGaussianBlur")
        .attr("in", "SourceAlpha")
        .attr("stdDeviation", 1)
        .attr("result", "blur");
    
    // Translate output of Gaussian blur to the right and downwards with 2px
    // Store result in offsetBlur
    filter.append("feOffset")
        .attr("in", "blur")
        .attr("dx", 1)
        .attr("dy", 3)
        .attr("result", "offsetBlur");
    
    // Control opacity of shadow filter
    var feTransfer = filter.append("feComponentTransfer");
    
    feTransfer.append("feFuncA")
        .attr("type", "linear")
        .attr("slope", 0.33)
    
    // Overlay original SourceGraphic over translated blurred opacity by using
    // feMerge filter. Order of specifying inputs is important!
    var feMerge = filter.append("feMerge");
    
    feMerge.append("feMergeNode")
    feMerge.append("feMergeNode")
        .attr("in", "SourceGraphic");
    
    /*
        Creates the text box under a node.
    */
    var createTextbox = function(d3This, newSize) {
        var d = d3This.datum();
        var imageWidth = newSize + 8;
        var imageHeight = newSize - 2;
        
        // Remove the text box labels immediately
        d3This.selectAll(".textboxLabel").remove();
        d3This.selectAll(".tSpanText").remove();
        
        var textBox = d3This.append('g')
            .attr("class", "textboxLabel")
            .attr("transform", function(d, i) { return "translate(" + (-imageWidth/2) + "," + ((imageHeight/2) + 10) + ")"; });

        var textboxRect = textBox.append('rect')
            .attr('width', imageWidth)
            .attr('height', 10)
            .attr('fill', '#2F394C');
        
        var nodeText = textBox.append('text')
            .attr("class", "noSelect")
            .attr('x', imageWidth/2)
            .attr('y', 5)
            .attr("dy", ".3em")
            .style("font-size", ".5em")
            .style("background-color", "#2f384d")
            .style("font-family", "Helvetica Neue, Helvetica, Arial, sans-serif")
            .style("line-height", "90%")
            .text(d.name)
            .style('text-anchor', 'middle');
            
        
        // Two line wrap
        twoWrap(nodeText, imageWidth, d.tid, d.artist);
        
        // Adjust the textbox height.
        textboxRect.attr('height', Math.round(nodeText.node().getBBox().height) + 2);
    }
    
    var createDownTriangle = function(d3This, d, newSize) {
        d3This.append('path')
                    .classed("triangleDown", true)
                    .attr("d", d3.svg.symbol().type("triangle-up").size(triangleSize))
                    .attr("transform", function(d) { return "translate(" + 0 + "," + (d.howTall + 5) + ") rotate(180)"; })
                    .style("fill", "white")
                    .style("stroke", "#2f394c")
                    .style("stroke-width", "0px")
                    .style("opacity", (d.children == null) ? 1 : 0)
                    .style("pointer-events", (d.children == null) ? "auto" : "none")
                    .on("click", function(d) { click(d, d3This); })
                    .on('contextmenu', function(d) { rightclick(d, d3This); })
    }
    
    var checkPan = function(source, d, This) {
        var circle = This;
        
        var cx = +circle.getAttribute('cx');
        var cy = +circle.getAttribute('cy');
        
        var ctm = circle.getCTM();
        var coords = getScreenCoords(cx, cy, ctm);
        
        // Here, we have found the node's relative position to the SVG.
        // We have to add the difference of where the node will be.
        var xDiff = (d.x - source.x0);
        var yDiff = (d.y - source.y0);
        
        var scale = zoomListener.scale();
        coords.x = coords.x + scale * xDiff;
        coords.y = coords.y + scale * yDiff;

        /*
            If the node is too far to the left or right, or too above or below, we should pan the view. I don't think the node could be too above but let's just keep that to be complete.
        */
        var padding = 80;
        
        if (((coords.x - padding) < 0 || (coords.x + padding) > viewerWidth)
            || ((coords.y - padding) < 0 || (coords.y + (padding + 30)) > viewerHeight)) {
            return true;
        }
        
        return false;
    }
    
    /*
        This function is important.
        We call this function after we update the children of certain nodes.

        It will re-layout the tree layout (which computes all of the numbers for positioning, etc.).

        We have 3 selections here:
            - Node ENTER (for each unbound data with key ID, we create our new nodes)
            - Node UPDATE (we update the positions of our nodes)
            - Node EXIT (we remove the nodes using a nice animation)

        The bottom line is that this function creates new (or removes) nodes and links, makes sure all of them are positioned, all transitions work properly.

        (Note: we also perform a check for newly entered nodes to see if we should pan the view.)

        Arguments:
            - source (the node we clicked on)
    */
    var update = function(source, switching) {
        tree = tree.nodeSize([64, 64]);
        
        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);
        
        sortTree();
        
        // Set widths between levels
        nodes.forEach(function(d) {
            // For the root, we have depth 0
            if (d.depth == 0) {
                d.y = 0;
            } else if (d.depth == 1) {
                // For the first level, we have 100px spacing
                d.y = 100;
            } else {
                // For every level after the first, we have 115px per level
                d.y = 100 + ((d.depth-1) * 110);
            }
        });
        
        /*
            Handle the ENTER links.
        */
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.tid ? ("link_t_" + d.target.tid) : ("link_a_" + d.target.aid); 
            });
        
        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .style("stroke-opacity", function(d) {
                return (d.target.aid || d.target.tid) ? 1 : 0;
            })
            .attr("d", elbow);
        
        // Enter any new nodes.
        var linkEnter = link.enter().append('path')
                            .attr("class", "link")
                            .style("stroke-opacity", 0);
        
        linkEnter.transition()
            .delay(duration * 0.3)
            .duration(duration - (duration * 0.3))
            .style("stroke-opacity", function(d) {
                if (d.target.spacer) {
                    return 0;
                }
                return 1;
            })
            .attr("d", elbow);
        
        // Transition exiting nodes to the parent's new position.
        link.exit().remove();
        
        // Grab the new set
        node = svgGroup.selectAll("g.node")
                            .data(nodes, function(d) {
                                if (d.aid) {
                                    return ("a_" + d.aid);
                                } else if (d.tid) {
                                    return ("t_" + d.tid);
                                } else if (d.root) {
                                    return "ROOT";
                                }
                                return "SPACER";
                            });
        
        // For each node in the set..
        node.each(function(d, i) {
            var d3This = d3.select(this);
            var line = d3This.select("path.line1");
            
            // If we are switching modes, then redefine the functions.
            if (switching) {
                /*
                    We need to update the buttons or collapse won't work.
                */
                d3This.select(".triangleUp")
                        .on("click", function(d) { click(d, d3This); })
                        .on('contextmenu', function(d) { rightclick(d, d3This); });

                if (d.aid) {
                    d3This.select("image").on("click", function(d) {                
                        var artistID = d.aid;
                        var artistName = d.name;

                        handleSelection(this, "artist", artistID, artistName);
                    });
                } else if (d.tid) {
                    d3This.select("image").on("click", function(d) {                    
                        var trackID = d.tid;
                        var trackName = d.name;
                        var trackArtistName = d.artist;

                        handleSelection(this, "track", trackID, trackName, trackArtistName);
                    });
                }
            }
            
            // If a node has children but not a vertical line, we need to create one.
            if (d.children) {
                if (line.length > 0 && line[0][0] == null) {
                    if (!d.root) {
                        createVerticalLine(d3This);
                    }
                    
                    // We don't want the root to be able to expand or collapse its children.
                    if (d.aid || d.tid) {
                        // Recreate its text label (to go over the vertical line).
                        createTextbox(d3This, 50);
                        
                        d3This.select(".triangleDown").style("opacity", 0).style("fill-opacity", 0)
                            .style("pointer-events", "none");

                        // This already existing node who now has children.
                        createUpTriangle(d3This);
                    }
                }
            } else { // If the node doesn't have children, ...
                // Then if it has a vertical line, remove it.
                if (line.length > 0 && line[0][0] != null) {
                    line.remove();
                }

                // If it has an up triangle, remove it and unhide its down triangle.
                d3This.select(".triangleUp").remove();
                // d3This.select(".triangleUp2").remove();
                
                // Show the down triangle
                var triDown = d3This.select(".triangleDown");
                if (triDown.length > 0 && triDown[0][0] != null) {
                    triDown.style("opacity", 1)
                            .style("pointer-events", "auto")
                            .style("fill-opacity", 1);
                }
            }
        })

        // Set the destinations of the existing nodes.
        node.transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
        
        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append('g')
                            .attr("class", "node")
                            .attr("transform", function(d) {
                                return "translate(" + source.x0 + "," + source.y0 + ")";
                            });
        
        // We will return this variable at the end of this function.
        // If this is set to true, we should pan our view.
        var shouldPan = false;
        
        nodeEnter.each(function(d, i) {
            // For each new node, we need to set its appearance and assets.
            var result = getNodeSize(d);
            var newSize = result.size;
            var audioFeatures = result.features;

            var d3This = d3.select(this);
            var regNode = (d.aid || d.tid);

            d.howTall = newSize/2;
            d.newSize = newSize;

            if (d.children) {
                // We must add this node's vertical line if it has children.
                if (!d.root) {
                    createVerticalLine(d3This);
                }
                
                if (regNode) {
                    // Recreate its text label (to go over the vertical line).
                    createTextbox(d3This, 50);
                    
                    // Create an up triangle (this new node has children).
                    createUpTriangle(d3This);
                }
            } 
                        
            /*
                All regular (artist and track) nodes should have a down triangle.
                If the node doesn't have children, show it. Otherwise, hide it.
            */
            if (d.aid) {
                var circleRadius = Math.floor(newSize/2);
                
                d3This.append('circle')
                    .attr("class", "circleShadow")
                    .attr("r", circleRadius)
                    .style("filter", "url(#drop-shadow)");
            } else if (d.tid) {
                var rectWidth = newSize;
                var rectHeight = newSize;
                
                d3This.append('rect')
                    .attr("class", "rectShadow")
                    .attr('x', -rectWidth/2)
                    .attr('y', -rectHeight/2)
                    .attr('width', rectWidth)
                    .attr('height', rectHeight)
                    .attr("stroke", "orange")
                    .attr("stroke-width", "0px")
                    .style("filter", "url(#drop-shadow)");
            }
            
            /*
                This section deals with adding the node's DOM elements.
            */
            // If the node represents an artist..
            if (d.aid) {
                var circleRadius = Math.floor(newSize/2);
                var imageWidth = (newSize-1);
                var imageHeight = (newSize-1);
                
                // Create the down triangle.
                createDownTriangle(d3This, d, newSize);
                
                d3This.append('circle')
                    .attr("class", "node")
                    .attr("r", circleRadius)
                    .attr("stroke-width", "2px")
                    .style("fill", "#282828");
            
                d3This.append('image')
                    .attr('x', -imageWidth/2)
                    .attr('y', -imageHeight/2)
                    .attr('width', imageWidth)
                    .attr('height', imageHeight)
                    .attr("xlink:href", function(d) {
                        return d.url;
                    })
                    .attr("clip-path", "url(#clip-r-" + circleRadius + ")")
                    .on("click", function(d) {                
                        var artistID = d.aid;
                        var artistName = d.name;

                        handleSelection(this, "artist", artistID, artistName);
                    });
                
                createTextbox(d3This, 50);
                
                if (selectedArtist.indexOf(d.aid) != -1) {
                    d3.select(this).select("circle.node").style("stroke", "#4B9877");
                }
            } else if (d.tid) { // Otherwise if the node represents a track, ..
                var rectWidth = newSize;
                var rectHeight = newSize;

                var imageWidth = newSize - 2;
                var imageHeight = newSize - 2;
                
                // Create the down triangle.
                // We want to create it between the rectangle and image.
                createDownTriangle(d3This, d, newSize);
                
                d3This.append('rect')
                    .attr("class", "node")
                    .attr("fill", "#282828")
                    .attr("stroke-width", "2px")
                    .attr('x', -rectWidth/2)
                    .attr('y', -rectHeight/2)
                    .attr('width', rectWidth)
                    .attr('height', rectHeight);
                
                d3This.append('image')
                    .attr('x', -imageWidth/2)
                    .attr('y', -imageHeight/2)
                    .attr('width', imageWidth)
                    .attr('height', imageHeight)
                    .attr("xlink:href", function(d) {
                        return d.url;
                    }).on("click", function(d) {                    
                        var trackID = d.tid;
                        var trackName = d.name;
                        var trackArtistName = d.artist;

                        handleSelection(this, "track", trackID, trackName, trackArtistName);
                    });

                createTextbox(d3This, 50);

                if (selectedTrack.indexOf(d.tid) != -1) {
                    d3.select(this).select("rect.node").style("stroke", "#4B9877");
                }
            } else if (d.root) { // And lastly, if the node is the root, then ...
                d3This.style("cursor", "none").style("pointer-events", "none");

                d3This.append('circle')
                    .attr('class', 'node')
                    .attr("r", 32)
                    .style("fill", function(d) {
                        return "#282828";
                    })
                    .style("filter", "url(#drop-shadow)");
                
                d3This.append('image')
                    .attr('x', -32)
                    .attr('y', -32)
                    .attr('width', 64)
                    .attr('height', 64)
                    .attr("xlink:href", function(d) {
                        return me.url;
                    })
                   .attr("clip-path", "url(#clip-root)");
                
                createVerticalLine(d3This);
            }
            
            // If shouldPan is true, a node was already detected outside of our view.
            if (!shouldPan) {
                if (checkPan(source, d, this)) {
                    shouldPan = true;
                }
            }
            
            /*
                Transition the new nodes to their correct positions, starting at their parent's old position.
            */
            d3This.transition()
                .duration(duration)
                .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            });

            /*
                Filter the nodes.
            */
            filterNode(d, this);
        });

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit();

        /*
            The below code is for node exit animation.

            If our node exit set is non-empty, we transition them properly. We make a custom clip element that resizes its radius as the transition occurs.
        */

        var exitSetEmpty = nodeExit.empty();

        if (!exitSetEmpty) {
            d3.selectAll("circle.clipResize")
                .attr("r", function(d, i) { return (i + 10); })
                .transition()
                .duration(duration)
                .attr("r", 0);
        }

        // For each unmatched node (nodes that don't have any associated data), delete it.
        nodeExit.each(function(d) {
            var d3This = d3.select(this);

            // Remove the vertical line (if it exists).
            var line = d3This.select("path.line1");
            if (line != null) {
                line.remove();
                d3This.selectAll("path").remove();
            }
            
            // Remove the shadow circles and rectangles.
            d3This.select(".circleShadow").remove();
            d3This.select(".rectShadow").remove();
            
            // Remove the text box labels immediately
            d3This.selectAll(".textboxLabel").remove();
            d3This.selectAll(".tSpanText").remove();

            // If it's an artist node, we want to set its clip path
            if (d.aid) {
                if (d.howTall != null) {
                    d3This.select('image')
                            .attr("clip-path", "url(#clip-r-resize-" + Math.floor(d.howTall-1) + ")");
                } else {
                    d3This.select('image')
                            .remove();
                }
            }
            
            // Transition the exiting node to its parent's position and then remove it.
            var exitVar = d3This
                .transition()
                .duration(duration)
                .attr("transform", function(d) {
                    return "translate(" + ( source.x + 0 ) + "," + ( source.y + 0 ) + ")";
                })
                .remove();

            // Make the album covers or artist images smaller
            if (d.aid || d.tid) {
                exitVar.select("image")
                        .attr("x", 0)
                        .attr("y", 0)
                        .attr("width", 0)
                        .attr("height", 0);
            }
            
            // Make the artist circles or track rectangles smaller.
            exitVar.selectAll("circle").attr("r", 0);
            exitVar.selectAll("rect").attr("x", 0).attr("y", 0).attr("width", 0).attr("height", 0);
        });
        
        /*
            Stash the old positions for transition.

            This is very subtle but notice that x0 and y0 contain the current parent position after this function is called.
        */
        d3.selectAll(".node").each(function(d, i) {
            if (d == source) {
                if (checkPan(source, d, this)) {
                    shouldPan = true;
                }
            }
            d.x0 = d.x;
            d.y0 = d.y;
        });
        
        var typ = (source.tid ? "track" : "artist");
        var blacklist = null;
        
        if (typ == "track") {
            blacklist = (mode == "short") ? trackID_short : trackID_long;
        } else {
            blacklist = (mode == "short") ? artistID_short : artistID_long;
        }
        
        /*
            We don't want to remove the source's childrens' IDs.
            If we do this, then there will be duplication problems.
        */
        var newCIDs = [];
        if (source.children != null) {
            source.children.forEach(function(c) {
                newCIDs.push((c.tid != null) ? c.tid : c.aid);
            });
        }
        
        if (rightClickIDs.length > 0) {
            for(var i = 0; i < blacklist.length; i++) {
                var obj = blacklist[i];
                
                if((rightClickIDs.indexOf(obj) !== -1) && (newCIDs.indexOf(obj) === -1)) {
                    blacklist.splice(i, 1);
                    i--;
                }
            }
            
            rightClickIDs = [];
            childInfo = {};
        }
        
        // Should we pan our view?
        return shouldPan;
    }
    
    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append('g');
    
    /*
        Define the root by setting its initial data.

        The structure for the tree data is simple. Each node has a name, ID, and children. Of course, the children array can be empty if we have no related artists/tracks, etc.

        We can store extra information in these nodes if we need to.
    */
    root = treeData;
    
    root.x = 0, root.x0 = 0;
    root.y = 0, root.y0 = 0;
    
    /*
        Booleans to indicate if we properly loaded our top artists and tracks.
    */
    var loadedArtists = false;
    var loadedTracks = false;
    
    /*
        This function computes the new layout for our tree and then centers the root node at the middle top (1/2 from the left and right, 1/8 from the top and 7/8 from the bottom).

        This function is called when we finally loaded the data of our top artists and tracks.
    */
    var shortTermEmpty = false;
    var longTermEmpty = false;
    
    doneLoading = function() {
        var blacklistTrack = (mode == "short") ? trackID_short : trackID_long;
        var blacklistArtist = (mode == "short") ? artistID_short : artistID_long;
        
        if (mode == "short") {
            root_shortChildren_TrackID = [];
            root_shortChildren_ArtistID = [];
        } else {
            root_longChildren_TrackID = [];
            root_longChildren_ArtistID = [];
        }
        
        blacklistTrack.forEach(function(id) {
            if (mode == "short") {
                root_shortChildren_TrackID.push(id);
            } else {
                root_longChildren_TrackID.push(id);
            }
        });
        
        blacklistArtist.forEach(function(id) {
            if (mode == "short") {
                root_shortChildren_ArtistID.push(id);
            } else {
                root_longChildren_ArtistID.push(id);
            }
        });
        
        update(root, true);
        centerNode(root, true);
        
        /*
            We need to make sure we don't display empty data.
            Otherwise, we need to either switch modes or redirect the user to an error page.
        */

        // Note: update(root) removes the children array if it's empty
        if ((root.children == null) || (root.children.length <= 0)) {
            if (mode == "short") {
                shortTermEmpty = true;
            } else if (mode == "long") {
                longTermEmpty = true;
            }

            if (shortTermEmpty && longTermEmpty) {
                // Redirect the user to an error page.
                window.location.replace('http://www.rootify.io/oops');
            } else if (shortTermEmpty) {
                switchMode("long", true);
            } else {
                switchMode("short", true);
            }
        } else {
            setTimeout(function() {
                switchingMode = false;
            }, (duration * 2));
        }
    }

    /*
        This function loads all of our top artists.
    */
    loadTopArtists = function(second_pass) {
        spotifyApi.getMyTopArtists(
        {
            limit: 5,
            time_range: mode == "long" ? "medium_term" : "short_term"
        },

        function(err, data) {
            if (!err) {
                populateChildrenArray(data.items, root, "artist");
            } else {
                // If this is our second pass and we failed again, then do nothing.
                if (!second_pass) {
                    callAPI(loadTopArtists, true);
                }
            }
        });
    }

    /*
        This function loads our top tracks.
        After we loaded our top track information, we load our top artists.
    */
    var loadTopTracks = function(second_pass) {
        // We need to make sure the root's children array is empty.
        root.children = [];

        spotifyApi.getMyTopTracks(
        {
            limit: 5,
            time_range: mode == "long" ? "medium_term" : "short_term"
        }, 
        function(err, data) {
            if (!err) {
                getAudioFeatures(data.items, root);
            } else {
                // If this is our second pass and we failed again, then do nothing.
                if (!second_pass) {
                    callAPI(loadTopTracks, true);
                }
            }
        });
    }

    /*
        This function grabs the Spotify user's information.
    */
    var loadMe = function(second_pass) {
        spotifyApi.getMe({}, function(err, data) {
            if (!err) {
                me.url = data.images.length > 0 ? data.images[0].url : "../assets/unknown.png";
                me.uid = data.id;
                callAPI(loadTopTracks);
            } else {
                // If this is our second pass and we failed again, then just redirect to home.
                if (second_pass) {
                    window.location.replace('http://www.rootify.io/');
                } else {
                    callAPI(loadMe, true);
                }
            }
        });
    }

    // Load the Spotify user's associated information
    callAPI(loadMe);

    /*
        This function switches the mode.
        The possible modes are 'short' or 'long'.
    */
    var switchMode = function(m, force) {
        // Don't switch if we're in the same mode or currently switching modes
        if (mode == m || switchingMode) {
            if (!force) {
                return;
            }
        }
        
        // There's no point to switching to a mode that doesn't have any data to load.
        if ((m == "short" && shortTermEmpty) || (m == "long" && longTermEmpty)) {
            return;
        }
        
        // We are now switching modes.
        switchingMode = true;
        
        // Deselect any nodes
        handleSelection(null, null);
        
        if (m == "long") {
            d3.select("#long-term").style("background-color", "#4B9877");
            d3.select("#short-term").style("background-color", null);

            // Save the short-term information
            shortChildren = root.children;
        } else {
            d3.select("#short-term").style("background-color", "#4B9877");
            d3.select("#long-term").style("background-color", null);

            // Save the long-term information
            longChildren = root.children;
        }
        
        // Switch the mode
        mode = m;
        
        // After our nodes exit, we check if we should switch modes.
        var childRef = null;
        if (m == "long") {
            childRef = longChildren;
        } else if (m == "short") {
            childRef = shortChildren;
        }
        
        // If we have no data, then load it.
        if (childRef == null) {
            loadTopTracks();
        } else {
            // Otherwise, set the root's children
            root.children = childRef;
            if ((root.children == null) || (root.children.length == 0)) {
                root.children = [];
            }
            
            update(root, true);
            centerNode(root, true);
            
            setTimeout(function() {
                switchingMode = false; 
            }, (2 * duration));
        }
    }
    
    /*
        These are just event listeners when a Spotify user selects on a certain mode.
    */
    document.getElementById("long-term").addEventListener("click", function() {
        switchMode("long");
    });

    document.getElementById("short-term").addEventListener("click", function() {
        switchMode("short");
    });
    
    document.getElementById("center_tree").addEventListener("click", function() {
        centerNode(root, true);
    });
    
    document.getElementById("reset_tree").addEventListener("click", function() {
        // Don't reset the tree if we're switching modes.
        if (switchingMode || root.children == null) {
            return;
        }
        
        // In a sense, we are switching modes (but not quite).
        switchingMode = true;
        
        // Clear the selection
        handleSelection(null, null);

        root.children.forEach(function(d) {
            d.children = [];
            d._children = null;
        });

        if (mode == "long") {
            longChildren = root.children;
        } else {
            shortChildren = root.children;
        }
        
        if (mode == "short") {
            
            trackID_short = [];
            artistID_short = [];
            
            root_shortChildren_TrackID.forEach(function(id) {
                trackID_short.push(id);
            });
            
            root_shortChildren_ArtistID.forEach(function(id) {
                artistID_short.push(id);
            });
        } else {
            
            trackID_long = [];
            artistID_long = [];
            
            root_longChildren_TrackID.forEach(function(id) {
                trackID_long.push(id);
            });
            
            root_longChildren_ArtistID.forEach(function(id) {
                artistID_long.push(id);
            });
        }
        
        update(root, true);
        centerNode(root, true);
        
        setTimeout(function() {
            switchingMode = false; 
        }, (2 * duration));
    });
    
    var registerLogout = function(id) {
        document.getElementById(id).addEventListener("click", function() {
            document.location.replace("http://rootify.io/logout");
            
            // We open the logout page in a separate tab and then close it.
            // To the extent of my knowledge, there is no way to add an 'onload' event listener.
            // As a workaround, we just assume the 
            /*var windowRef = window.open("http://www.rootify.io/logout");
            
            setTimeout(function() {
                windowRef.close();
                document.location.replace("http://rootify.io");
            }, 1000);*/
        });
    }
    
    registerLogout("logout-b1");
    registerLogout("logout-b2");
    
    d3.select("#short-term").style("background-color", "#4B9877");
    
    $(".chosen").on('change', function(evt, params) {
        if (params.selected) {
            selectedGenre.push(params.selected);
        } else {
            var index = selectedGenre.indexOf(params.deselected);
            if (index != -1) {
                selectedGenre.splice(index, 1);
            }
        }
        
        if ((selectedTrack.length + selectedArtist.length + selectedGenre.length) <= 0) {
            d3.select("#description2").style("display", "block");
        } else {
            d3.select("#description2").style("display", "none");
        }
    });
})(this);