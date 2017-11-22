// Either "short" or "long" 
// Indicates if we want to view short-term or long-term
var mode = "short";
var switchingMode = true;

// Initial tree data
var treeData = { "name": "", "root": true, "children": [] };

// Initial Spotify user profile data
var me = { url: "", uid: "" };

// Used for assigning IDs to our nodes
var i = 0;

// Duration of our transitions
var duration = 700;

// This is used as a measure for vertical spacing between nodes
var verticalSpacing = 78;

// These will be arrays that hold the root's children for each mode.
var longChildren;
var shortChildren;

// Root initially doesn't exist.
var root = null;

/*
    All of these arrays are used to determine if a certain artist or track already exists in the tree. This is very important because if we have the same artist or track, it's redunant plus we can run into some huge visualization issues.
*/
var artistID_short = [];
var trackID_short = [];

var artistID_long = [];
var trackID_long = [];

/*
    Selected artists, tracks, genres, and nodes
*/

var selectedArtist = [];
var selectedTrack = [];
var selectedGenre = [];
var selectedNode = [];

/*
    We store the track information for nodes we've clicked.
    This allows us to display the information when a Spotify user generates a recommended playlist.
*/
var selectedTrackInfo = {};

/*
    Our initial tree layout
*/
var tree = d3.layout.tree()
    .size([viewerWidth, viewerHeight]);

/*
    This is our path generator which creates an elbow shape.
*/

function elbow(d, i) {
    var targetY = -10;
    
    if (d.target.aid) {
        var circleRadius = d.target.newSize;
        targetY = d.target.y + Math.floor(-circleRadius/2);
    } else if (d.target.tid) {
        var rectHeight = d.target.newSize;
        targetY = d.target.y + Math.floor(-rectHeight/2);
    }
    
    return "M" + d.source.x + "," + ( d.source.y + ((d.source.root) ? 55 : (verticalSpacing-13)) )
    + "H" + d.target.x + "V" + ( targetY );
}

/*
    We use this to sort our tree.
    Top tracks and artists appear left to right.
    
    In other words, the track or artist you listen to more are on the left.
*/
function sortTree() {
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
function doesNotMeetCap() {
    return ((1 + selectedArtist.length + selectedTrack.length + selectedGenre.length) > 5);
}

/*
    Populate children array with tracks.
*/

var loadTopArtists = function() {}
var doneLoading = function() {}

var getAudioFeatures = function(err, data, source) {
    var tracks = [];
    var audioFeatures = {};
    
    var j = 0;
    
    while (j < data.length) {
        tracks.push(data[j].id);
        j++;
    }
    
    spotifyApi.getAudioFeaturesForTracks(tracks, function(err, tdata) {
        if (!err) {
            j = 0;
            while (j < tdata.audio_features.length) {
                var item = tdata.audio_features[j];
                if (item != null) {
                    audioFeatures[item.id] = { "energy": item.energy, "dance": item.danceability, "valence": item.valence, "tonic": item.key, "mode": item.mode }
                }
                j++;
            }
            if (source == root) {
                populateChildrenArray(err, data, root, "track", audioFeatures);
            } else {
                populateChildrenArray(err, data, source, "track", audioFeatures);
            }
        }
    });
}

// This variable stores a reference to our last selected node.
var lastSelected = null;

/*
    Sets/Loads track or artist details (for the 'Details' tab)
*/
var loadDetailsTabForNode = function(node, typ, isGenerateTab) {
    if (lastSelected != null) {
        var color = (selectedNode.indexOf(lastSelected) == -1) ? "none" : "#4B9877";
        var parNode = d3.select(lastSelected.parentNode);
        var parCircle = parNode.select("circle"); 
        if (parCircle[0][0] != null) {
            parCircle.style("stroke", color);
        } else {
            parNode.select("rect").style("stroke", color);
        }
    }
    
    if (node != null) {
        d3.select(node.parentNode).select((typ == "track" ? "rect" : "circle"))
                                    .style("stroke", "#FF8C00");

        lastSelected = node;
        
        if (isGenerateTab) {
            selectedNode.push(node);
        }

        var d = d3.select(node).datum();

        if (d.aid) {
            if (d.tracks) {
                loadSpotifyTracks(d.tracks);
            } 
            else {
                getArtistTopTracks(d, function() { loadSpotifyTracks(d.tracks); });
            }

            if (barManager.artistNotLoaded(d.aid)) {                        
                var trackInfo = {
                    Popularity: d.popularity,
                    Danceability: 0,
                    Energy: 0,
                    Positivity: 0,
                    Key: { key: 0, mode: 0 }
                };
                
                var obj = { id: d.aid, typ: "artist" };
                
                if (isGenerateTab) {
                    barManager.setTrackInfo(trackInfo, obj);
                } else {
                    barManager.showBars(trackInfo, obj);
                }
            }
        } else {
            loadSpotifyTracks([d.tid]);

            if (barManager.trackNotLoaded(d.tid)) {                    
                var trackInfo = {
                    Popularity: d.popularity,
                    Danceability: d.dance,
                    Energy: d.energy,
                    Positivity: d.valence,
                    Key: { key: d.tonic, mode: d.mode },
                };

                var obj = { id: d.tid, typ: "track" };
                
                if (isGenerateTab) {
                    barManager.setTrackInfo(trackInfo, obj);
                } else {
                    
                    // Resize the <div>
                    barManager.showBars(trackInfo, obj, true);
                }
            }  
        }

        if (typ == "artist") {
            d3.select("#headerImage")
                    .style("display", "block")
                    .style("height", "200px")
                    .style("width","100")
                    .style("font-size", "1.5em")
                    .style("font-family", "Arial, Helvetica, sans-serif")
                    .style("line-height", "90%")
                    .style("padding", "6%")
                    .style("vertical-align", "middle;")
                    .text(d.name);
            
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
        } else {
                // Hide the artist header image and associated genres.
                d3.select("#headerImage").style("display", "none");
                d3.select("#detailsGenres").style("display", "none");
            }
        }
}

var handleSelection = function(node, typ, id, name, artistName) {
     if (node != null) {
        if (generateTabIsActive) {
            var selectedArr = (typ == "artist" ? selectedArtist : selectedTrack);
            
            // If the selected artist is not in the selected artist array
            if (selectedArr.indexOf(id) == -1) {
                // If we exceed a maximum combination of 5 artists, tracks and genres, return.
                if (doesNotMeetCap()) { return; }

                var selectType = typ == "artist" ? "#selectedArtists" : "#selectedTracks";
                d3.select(selectType)
                        .append("div")
                        .attr("id", "selected_" + id)
                        .attr("class", "trackBox")
                        .attr("font-family", "sans-serif")
                        .attr("font-size", "10px")
                        .html(name + (artistName != null ? ("<br/>" + artistName) : ""))
                        .append("div").attr("id", "closeButton").html("&times").on("click", function() {               
                            var parNode = d3.select(node.parentNode);
                            var parCircle = parNode.select("circle"); 
                            if (parCircle[0][0] != null) {
                                parCircle.style("stroke", "none");
                            } else {
                                parNode.select("rect").style("stroke", "none");
                            }
                            
                            // Remove the selected node
                            var selNodeIndex = selectedNode.indexOf(node);
                            if (selNodeIndex != -1) {
                                selectedArr.splice(selectedArr.indexOf(id), 1);
                                selectedTrackInfo[id] = null;
                                selectedNode.splice(selNodeIndex, 1);
                                d3.select("#selected_" + id).remove();
                            }
                        });
                
                selectedArr.push(id);
                if (selectedArr == selectedTrack) {
                    selectedTrackInfo[id] = name + " <br/>" + artistName;
                }
                
                loadDetailsTabForNode(node, typ, true);
            } else {
                // Removes the track box
                d3.select("#selected_" + id).remove();
                selectedArr.splice(selectedArr.indexOf(id), 1);
                selectedTrackInfo[id] = null;

                var parNode = d3.select(node.parentNode);
                var parCircle = parNode.select("circle"); 
                if (parCircle[0][0] != null) {
                    parCircle.style("stroke", "none");
                } else {
                    parNode.select("rect").style("stroke", "none");
                }

                // Remove the selected node
                var selNodeIndex = selectedNode.indexOf(node);
                if (selNodeIndex != -1) {
                    selectedNode.splice(selNodeIndex, 1);
                }
            }
        } else {
            loadDetailsTabForNode(node, typ, false);
        }
     }
    
    if (node == null) {
        // Reset all selected artists and tracks (for the 'Generate' tab)
        selectedArtist = [];
        selectedTrack = [];
        selectedTrackInfo = {};
        
        // Clear the contents in the 'Generate' tab
        d3.select("div.trackBox").remove();
        d3.select("#selectedArtists").html("");
        d3.select("#selectedTracks").html("");
        d3.select("#generatedPlaylistTracks").style("display", "none");
        
        // Clear the contents in the 'Details' tab
        d3.select("#headerImage").style("display", "none");
        d3.select("#spotifyTracks").html("");
        d3.select("#at-container").style("display", "none");
        d3.select("#detailsGenres").style("display", "none");
        
        /*
            Remove the green/orange strokes from the last selected node, 
            and also every selected node.
            
            Note: We can push the last selected name into the selectedNode array 
            because we are going to empty it right after.
        */
        selectedNode.forEach(function(d) {
            var parNode = d3.select(d.parentNode);
            var parCircle = parNode.select("circle"); 
            if (parCircle[0][0] != null) {
                parCircle.style("stroke", "none");
            } else {
                parNode.select("rect").style("stroke", "none");
            }
        });
        
        selectedNode = [];
        lastSelected = null;
    }
}

var loadSpotifyTracks = function(trackArr) {
    var numberOfTracks = trackArr.length;
    var height = (numberOfTracks <= 1) ? 355 : 75;
    var html = "";
    
    // Loop through each track and display its Spotify widget
    for (var i = 0; i < numberOfTracks; i++) {
        var trackID = trackArr[i];
        html = html + "<iframe src='https://open.spotify.com/embed/track/" + trackID + "' width='100%' height='" + height + "' frameborder='0' allowtransparency='true'></iframe><br/>";
    }
    
    d3.select("#spotifyTracks").html(html);
}

var getArtistTopTracks = function(source, callback) {
    spotifyApi.getArtistTopTracks(source.aid, "US", {}, function(err, data) {
        if (!err) {
            var j = 0;
            var count = 0;
            source.tracks = [];
            
            while (j < data.tracks.length && count < 3) {
                var item = data.tracks[j];
                if (item != null) {
                    source.tracks.push(item.id);
                    count++;
                }
                j++;
            }
            
            callback();
        }
    });
}

var populateChildrenArray = function(err, data, source, typ, audioFeatures) {
    if (!err) {
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
        }
        
        // We only want to start at index 6 if we're a root node populating our top artists
        var baseIndex = (nonRootNode || typ == "track") ? 0 : 6;
        var maxChildren = (nonRootNode) ? 3 : 5;
        
        var i = 0;
        var count = 0;
        
        while ( (i < data.length) && (count < d3.min([maxChildren, data.length])) ) {
            var obj = data[i];
            
            if (obj != null && blacklist.indexOf(obj.id) === -1) {
                if (typ == "track") {
                    var audioFeat = audioFeatures[obj.id];
                    source.children.push({
                        index: baseIndex + i, 
                        name: obj.name, 
                        artist: obj.artists.length > 0 ? obj.artists[0].name : "N/A", 
                        tid: obj.id, 
                        url: obj.album.images.length > 1 ? obj.album.images[1].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png", 
                        popularity: obj.popularity / 100, 
                        energy: audioFeat.energy, 
                        dance: audioFeat.dance, 
                        valence: audioFeat.valence, 
                        tonic: audioFeat.tonic, 
                        mode: audioFeat.mode 
                    });
                } else {
                   source.children.push({
                       index: baseIndex + i, 
                       name: obj.name, 
                       aid: obj.id, 
                       url: obj.images.length > 2 ? obj.images[2].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png", 
                       popularity: obj.popularity / 100, 
                       genres: obj.genres
                   }); 
                }
                blacklist.push(obj.id);
                count++;
            }
            i++;
        }
        
        if (nonRootNode) {
            source._children = null;
            
            var pan = update(source);
            centerNode(source, false, pan);
            
            source.clicked = false;   
        } else if (typ == "track") {
            source.children.push
            ({
                index: count, 
                spacer: true 
            });
            blacklist.push("INVALID");
            count = count + 1;
            
            loadTopArtists(count);
        } else {
             doneLoading();
        }
    }
}

/*
    This code handles our zoom.
    It transforms our SVG 'g' (or group) element.
    
    If we put the root at the top left, the translation is [0, 0].
*/
function zoom() {
    var translate = d3.event.translate;
    var scale = d3.event.scale;
    
    svgGroup.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
}

// Our zoom listener
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom).scale(1.4);

// Our base SVG
var baseSvg = d3.select("#baseSVG").call(zoomListener);
baseSvg.on("dblclick.zoom", null);

/*
    Our clip paths.
    One is for our avatar (bigger radius), another is for the nodes (smaller radii).
*/

var customClip = [];
var custClipResize = [];

/*
    We need to create clip paths for a range of radii due to the resize functionality.
*/
for (var i = 0; i <= 15; i++) {
    customClip[i] = baseSvg.append("defs")
                    .append("clipPath")
                    .attr("id", "clip-r-" + (10 + i))
                    .append("circle")
                        .attr("cx", 0)
                        .attr("cy", 0)
                        .attr("r", (10 + i - 1));
    
    custClipResize[i] = baseSvg.append("defs")
                    .append("clipPath")
                    .attr("id", "clip-r-resize-" + (10 + i))
                    .append("circle")
                        .classed("clipResize", true)
                        .attr("cx", 0)
                        .attr("cy", 0)
                        .attr("r", (10 + i - 1));
}

/* Clip path for the root node. */
baseSvg.append("defs")
    .append("clipPath")
        .attr("id", "clip-root")
        .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 31);

/*
    This a helper function that converts an element's position in the SVG to its relative position to the SVG. Therefore, we can figure out if a node is visible.
    
    Reference: https://stackoverflow.com/questions/18554224/getting-screen-positions-of-d3-nodes-after-transform/18561829
*/

function getScreenCoords(x, y, ctm) {
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

function centerNode(source, first, shouldPan) {
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
function toggleChildren(d) {
    d.clicked = true;
    
    if (d._children) {
        // Here, we store a collapsed node's children in _children if it was opened previously.
        d.children = d._children;
        d._children = null;

        var pan = update(d);
        centerNode(d, false, pan);
        
        d.clicked = false;
    } else if (d.aid && !d.children) {
        // Grab related artists based on the artist we just selected.
        spotifyApi.getArtistRelatedArtists(d.aid, function(err, data) {
            populateChildrenArray(err, data.artists, d, "artist");
        });

    } else if (d.tid && !d.children) {
        spotifyApi.getRecommendations(
            {
                limit: 3,
                seed_tracks: d.tid, 
                market: "US"
            }, 
            function(err, data) {
                getAudioFeatures(err, data.tracks, d);
            }
        );
    } else if (d.children) {
        d._children = d.children;
        d.children = null;

        var pan = update(d);
        centerNode(d, false, pan);
        
        d.clicked = false;
    }
}

/*
    When we click on a node, this fucntion is called.
    We don't allow toggling if a transition is occuring or we clicked on the root node.
*/
function click(d) {
    if (d.root || d.clicked) {
        return;
    }
    
    toggleChildren(d);
}

//This is the accessor function we talked about above
var lineFunction = d3.svg.line()
                        .x(function(d) { return d.x; })
                        .y(function(d) { return d.y; })
                        .interpolate('linear');

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
        - switchM (if specified, after node exit, we set the children and update)
*/

var sizeScale = d3.scale.linear()
                    .domain([0.10,0.95]).range([20, 50]).clamp(true);

function getNodeSize(d) {
    var num = 1;

    if (d.aid || d.tid) {
        for (var key in scaleOptions) {
            var value = scaleOptions[key];
            if (value) {
                if (key == "popCheck") {
                    num = num * d.popularity;
                }
                if (d.tid) {
                    if (key == "energyCheck") {
                        num = num * d.energy;
                    } else if (key == "danceCheck") {
                        num = num * d.dance;
                    } else if (key == "posCheck") {
                        num = num * d.valence;
                    }
                }
            }
        }
    }
    return sizeScale(num);
}

function resizeNodes() {
    // Grab the new set
    node = svgGroup.selectAll("g.node");
    
    // For each node in the set..
    node.each(function(d) {
        // Don't resize the root node.
        if (d.root) { return; }
        
        var newSize = getNodeSize(d);
        var d3This = d3.select(this);
        
        d.howTall = Math.floor(newSize/2);
        d.newSize = newSize;
        
        // If the node represents an artist..
        if (d.aid) {
            var circleRadius = Math.floor(newSize/2);
            var imageWidth = (newSize-1);
            var imageHeight = (newSize-1);
            
            d3This.select("circle")
                    .attr("r", circleRadius);
            
            d3This.select('image')
                    .attr("clip-path", "url(#clip-r-" + circleRadius + ")");
            
            d3This.select('image')
                    .attr('x', Math.floor(-imageWidth/2))
                    .attr('y', Math.floor(-imageHeight/2))
                    .attr('width', imageWidth)
                    .attr('height', imageHeight);
        } else { // Otherwise, the node must represent a track..
            var rectWidth = newSize;
            var rectHeight = newSize;
            
            var imageWidth = newSize - 2;
            var imageHeight = newSize - 2;
            
            d3This.select("rect")
                    .attr('x', Math.floor(-rectWidth/2))
                    .attr('y', Math.floor(-rectHeight/2))
                    .attr('width', rectWidth)
                    .attr('height', rectHeight);

            d3This.select('image')
                    .attr('x', Math.floor(-imageWidth/2))
                    .attr('y', Math.floor(-imageHeight/2))
                    .attr('width', imageWidth)
                    .attr('height', imageHeight);
        }
        
        // Update the position of the vertical line (below the node)
        d3This.select("path.line")
                .attr("d", lineFunction(
                    [
                        { "x": 0, "y": (d.howTall ? d.howTall : 26) }, 
                        { "x": 0, "y": (verticalSpacing - 15) }
                    ]));
        
        // Update the position of the down triangle (expand or collapse tree)
        d3This.select("path.triangleDown")
                .attr("transform", function(d) { return "translate(" + 0 + "," + (newSize*0.55) + ")"; });
    });
    
    // Once all of the nodes have been resized, reposition the tree links.
    var link = svgGroup.selectAll("path.link");
    
    // Transition links to their new positions.
    link.attr("d", elbow);
}

function update(source, switchM) {
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
            // For every level after the first, we have 75px per level
            d.y = 100 + ((d.depth-1) * 100);
        }
    });
    
    // Grab the new set
    node = svgGroup.selectAll("g.node")
                        .data(nodes, function(d) {
                            if (!d.id) {
                                d.id = ++i;
                            }
                            return d.id;
                        });
    
    // For each node in the set..
    node.each(function(d) {
        var d3This = d3.select(this);
        var line = d3This.select("path.line");
        
        // If a node has children but not a vertical line, we need to create one.
        if (d.children) {
            if (line.length > 0 && line[0][0] == null) {
                d3This.append("path")
                        .classed("line", true)
                        .attr("d", lineFunction(
                            [
                                {
                                    x: 0,
                                    y: (d.root ? 30 : (d.howTall ? d.howTall : 26)) 
                                }, 
                                {
                                    x: 0, 
                                    y: (d.root ? 55 : (verticalSpacing - 15))
                                }
                            ]))
                        .style("stroke", "#ccc")
                        .style("stroke-width", 0)
                        .transition()
                        .duration(duration)
                        .style("stroke-width", 1)
                        .style("stroke", "#ccc");
                
                // We don't want the root to be able to expand or collapse its children.
                if (!d.root) {
                    d3This.select(".triangleDown").style("opacity", 0).style("fill-opacity", 0)
                        .style("pointer-events", "none");

                    d3This.append('path')
                            .classed("triangleUp", true)
                            .attr("d", d3.svg.symbol().type("triangle-up").size(50))
                            .attr("transform", function(d) { return "translate(" + 0 + "," + (verticalSpacing-19) + ")"; })
                            .style("fill", "white")
                            .attr("stroke", "#293345")
                            .attr("stroke-width", "1px")
                            .style("opacity", 0)
                            .on("click", click)
                            .transition()
                            .duration(duration)
                            .style("opacity", 1);
                }
            }
        } else { // If the node doesn't have children, ...
            // Then if it has a vertical line, remove it.
            if (line.length > 0 && line[0][0] != null) {
                line.remove();
            }
            
            // If it has an up triangle, remove it and unhide its down triangle.
            var triUp = d3This.select(".triangleUp");
            if (triUp.length > 0 && triUp[0][0] != null) {
                triUp.remove();

                var triDown = d3This.select(".triangleDown");
                if (triDown.length > 0 && triDown[0][0] != null) {
                    triDown.style("opacity", 1)
                            .style("pointer-events", "auto")
                            .style("fill-opacity", 1);
                }
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
    var nodeEnter = node.enter().append("g")
                        .attr("class", "node")
                        .attr("transform", function(d) {
                            return "translate(" + source.x0 + "," + source.y0 + ")";
                        });
    
    // We will return this variable at the end of this function.
    // If this is set to true, we should pan our view.
    var shouldPan = false;
    
    nodeEnter.each(function(d, i) {
        // For each new node, we need to set its appearance and assets.
        var newSize = getNodeSize(d);
        var d3This = d3.select(this);
        var regNode = (d.aid || d.tid);
        
        d.howTall = Math.floor(newSize/2);
        d.newSize = newSize;
        
        if (d.children) {
            // We must add this node's vertical line if it has children.
            d3This.append("path")
                .classed("line", true)
                .attr("d", lineFunction(
                    [
                        { 
                            x: 0, 
                            y: (d.root ? 30 : (d.howTall ? d.howTall : 26))
                        }, 
                        {
                            x: 0, 
                            y: (d.root ? 55 : (verticalSpacing - 15))
                        }
                    ]))
                .style("stroke", "#ccc")
                .style("stroke-width", 0)
                .transition()
                .duration(duration)
                .style("stroke-width", 1)
                .style("stroke", "#ccc");
            
            if (regNode) {
                // Created an up triangle (this node has children)
                d3This.append('path')
                    .classed("triangleUp", true)
                    .attr("d", d3.svg.symbol().type("triangle-up").size(50))
                    .attr("transform", function(d) { return "translate(" + 0 + "," + (verticalSpacing-19) + ")"; })
                    .style("fill", "white")
                    .attr("stroke", "black")
                    .attr("stroke-width", "1px")
                    .style("opacity", 0)
                    .on("click", click)
                    .transition()
                    .duration(duration)
                    .style("opacity", 1);
            }
        } else if (regNode) { // Otherwise, we create a down triangle.
            d3This.append('path')
                .classed("triangleDown", true)
                .attr("d", d3.svg.symbol().type("triangle-down").size(50))
                .attr("transform", function(d) { return "translate(" + 0 + "," + (newSize*0.55) + ")"; })
                .style("fill", "white")
                .style("opacity", d.children == null ? 1 : 0)
                .style("pointer-events", d.children == null ? "auto" : "none")
                .on("click", click);
        }
        
        /*
            This section deals with adding the node's DOM elements.
        */
        
        // If the node represents an artist..
        if (d.aid) {
            var circleRadius = Math.floor(newSize/2);
            var imageWidth = (newSize-1);
            var imageHeight = (newSize-1);
            
            d3This.append('circle')
                .attr("r", circleRadius)
                .style("fill", "#282828");
            
            d3This.append('image')
                .attr('x', Math.floor(-imageWidth/2))
                .attr('y', Math.floor(-imageHeight/2))
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
                
                if (selectedArtist.indexOf(d.aid) != -1) {
                    d3.select(this).select("circle").style("stroke", "#4B9877");
                }
        } else if (d.tid) { // Otherwise if the node represents a track, ..
            var rectWidth = newSize;
            var rectHeight = newSize;
            
            var imageWidth = newSize - 2;
            var imageHeight = newSize - 2;
            
            d3This.append('rect')
                .attr("class", "node")
                .attr("fill", "#282828")
                .attr("stroke-width", "1px")
                .attr('x', Math.floor(-rectWidth/2))
                .attr('y', Math.floor(-rectHeight/2))
                .attr('width', rectWidth)
                .attr('height', rectHeight);
            
            d3This.append('image')
                .attr('x', Math.floor(-imageWidth/2))
                .attr('y', Math.floor(-imageHeight/2))
                .attr('width', imageWidth)
                .attr('height', imageHeight)
                .attr("xlink:href", function(d) {
                    return d.url;
                }).on("click", function(d) {                    
                    var trackID = d.tid;
                    var trackName = d.name;
                    var trackArtistName = d.artist;
                    
                    d3.select("#at-container").style("display", "block");
                    handleSelection(this, "track", trackID, trackName, trackArtistName);
                });
                
                if (selectedTrack.indexOf(d.tid) != -1) {
                    d3.select(this).select("rect").style("stroke", "#4B9877");
                }
        } else if (d.root) { // And lastly, if the node is the root, then ...
            d3This.style("cursor", "none").style("pointer-events", "none");
            
            d3This.append("circle")
                .attr('class', 'node')
                .attr("r", 32)
                .style("fill", function(d) {
                    return "#282828";
                });
            
            d3This.append('image')
                .attr('x', -32)
                .attr('y', -32)
                .attr('width', 64)
                .attr('height', 64)
                .attr("xlink:href", function(d) {
                    return me.url;
                })
               .attr("clip-path", "url(#clip-root)");
        }
        
        // If shouldPan is true, a node was already detected outside of our view.
        if (!shouldPan) {
            var circle = this;
            
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
                || ((coords.y - padding) < 0 || (coords.y + padding) > viewerHeight)) {
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
    if (!nodeExit.empty()) {
        d3.selectAll("circle.clipResize")
            .attr("r", function(d, i) { return (i + 10); })
            .transition()
            .duration(duration)
            .attr("r", 0);
        
        setTimeout(function() {
            // After our nodes exit, we check if we should switch modes.
            if (switchM) {

                var childRef = null;
                if (switchM == "long") {
                    childRef = longChildren;
                } else if (switchM == "short") {
                    childRef = shortChildren;
                }

                // If we have no data, then load it.
                if (childRef == null) {
                    loadTopTracks();
                } else {
                    // Otherwise, set the root's children
                    root.children = childRef;
                    update(root);
                    centerNode(root, true);
                }
            }
        }, duration);
    }
    
    nodeExit.each(function(d) {
        var d3This = d3.select(this);
        
        var line = d3This.select("path.line");
        if (line != null) {
            line.remove();
            d3This.selectAll("path").remove();
        }
        
        if (d.aid) {
            d3This.select('image')
                    .attr("clip-path", "url(#clip-r-resize-" + Math.floor(d.howTall-1) + ")");
        }
        
        var exitVar = d3This
            .transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + ( source.x + 0 ) + "," + ( source.y + 0 ) + ")";
            })
            .remove();
        
        if (d.aid || d.tid) {
            exitVar.select("image")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 0)
                    .attr("height", 0);
        }
        
        exitVar.select("circle").attr("r", 0);
        exitVar.select("rect").attr("x", 0).attr("y", 0).attr("width", 0).attr("height", 0);
    });
    
    /*
        Handle the ENTER links.
    */
    var link = svgGroup.selectAll("path.link")
        .data(links, function(d) {
            return d.target.aid ? ("link_" + d.target.aid) : ("link_" + d.target.tid);
        });
    
    // Transition links to their new position.
    link.transition()
                .duration(duration)
                .attr("d", elbow);
    
    // Enter any new nodes.
    var linkEnter = link.enter().append("path")
                        .classed("link", true)
                        .style("opacity", 0)
                        .transition()
                        .duration(duration)
                        .style("opacity", function(d) {

                            if (d.target.spacer) {
                                return 0;
                            }

                            return 1;
                        })
                        .attr("d", elbow);
    
    // Transition exiting nodes to the parent's new position.
    link.exit().remove();
    
    /*
        Stash the old positions for transition.
        
        This is very subtle but notice that x0 and y0 contain the current parent position after this function is called.
    */
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    // Should we pan our view?
    return shouldPan;
}

// Append a group which holds all nodes and which the zoom Listener can act upon.
var svgGroup = baseSvg.append("g");

/*
    Define the root by setting its initial data.
    
    The structure for the tree data is simple. Each node has a name, ID, and children. Of course, the children array can be empty if we have no related artists/tracks, etc.
    
    We can store extra information in these nodes if we need to.
*/

root = treeData;

root.x = 0;
root.y = 0;

root.x0 = 0;
root.y0 = 0;

/*
    Booleans to indicate if we properly loaded our top artists and tracks.
*/

var loadedArtists = false;
var loadedTracks = false;

/*
    This function computes the new layout for our tree and then centers the root node at the middle top (1/2 from the left and right, 1/8 from the top and 7/8 from the bottom).
    
    This function is called when we finally loaded the data of our top artists and tracks.
*/
doneLoading = function() {
    update(root);
    centerNode(root, true);
    switchingMode = false;
}

/*
    This function loads all of our top artists.
    
    Notice that we pass in a baseCount. This is a hacky solution but basically we need to make sure we are inserting the children of our root node properly.
    
    baseCount should be 6 because 5 of our tracks should have been loaded, including a spacer node so our tree looks clean.
*/

loadTopArtists = function() {
    spotifyApi.getMyTopArtists(
    {
        "limit": 5,
        "time_range": mode == "long" ? "medium_term" : "short_term"
    },
    
    function(err, data) {
        populateChildrenArray(err, data.items, root, "artist");
    });
}

/*
    This function loads our top tracks.
    
    After we loaded our top track information, we call loadTopArtists().
    I understand that we could have an asynchornous operation here but we could run into all sorts of problems.
    
        For example, we could have race conditions with pushing into the children array. This probably wouldn't happen as JS is apparently single-threaded.

        Another example is what if we only could load 2 top tracks and 5 top artists? Instead of using indices, we woud have to push nodes to the front of the list or append to the back.
        
        The bottom line is that we could do asynchorous operations and it would probably be fine but loading times for a Spotify user's top artists and tracks are relatively fast so the savings probably wouldn't be worth it for the design and implementation time.
*/
function loadTopTracks() {
    spotifyApi.getMyTopTracks(
    {
        "limit": 5,
        "time_range": mode == "long" ? "medium_term" : "short_term"
    },
    function(err, data) {
        getAudioFeatures(err, data.items, root);
    });
}

// If there's an error, we want to get our refresh token.
// This will be used primarily for development as our access token may expire.

// Source: http://www.the-art-of-web.com/javascript/getcookie/
function getCookie(name)
{
    var re = new RegExp(name + "=([^;]+)");
    var value = re.exec(document.cookie);
    return (value != null) ? unescape(value[1]) : null;
}

function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

/*
    This function grabs the Spotify user's information.
*/
var loadMe = function() {
    spotifyApi.getMe({}, function(err, data) {
        if (!err) {
            me.url = data.images.length > 0 ? data.images[0].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png";
            me.uid = data.id;
            loadTopTracks();
        } else {        
            var refresh_token = getCookie("myRefreshToken");
            
            $.ajax({
                url: '/refresh_token',
                data: {
                'refresh_token': refresh_token
                }
            }).done(function(data) {
                setCookie('myToken', data.access_token, 5);
                spotifyApi.setAccessToken(data.access_token);
                loadMe();
            }).fail(function(err) {
                // If the refresh token doesn't work, just re-route to our homepage.
                window.location = "http://localhost:8888";
            });
        }
    });
}

// Load the Spotify user's associated information
loadMe();

/*
    This function switches the mode.
    The possible modes are 'short' or 'long'.
*/

var switchMode = function(m) {
    // Don't switch if we're in the same mode or currently switching modes
    if (mode == m || switchingMode) {
        return;
    }
    
    // Unselect any nodes
    handleSelection(null, null);
    
    switchingMode = true;
    
    if (m == "long") {
        d3.select("#long-term").style("background-color", "#4B9877");
        d3.select("#short-term").style("background-color", null);
        
        // Save the short-term infomration
        shortChildren = root.children;
    } else {
        d3.select("#short-term").style("background-color", "#4B9877");
        d3.select("#long-term").style("background-color", null);
        
        // Save the long-term information
        longChildren = root.children;
    }
    
    // Switch the mode
    mode = m;
    // Set the root children initially to nothing
    root.children = [];
    
    // Re-layout the tree
    update(root, m);
    
    // Wait twice the duration, plus a little more, then reallow switching
    setTimeout(function() { switchingMode = false; }, duration*2 + 1000);
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

document.getElementById("reset_tree").addEventListener("click", function() {
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

    update(root);
    centerNode(root, true);
});

document.getElementById("logout-b").addEventListener("click", function() {
    deleteCookie('myToken');
    deleteCookie('myRefreshToken');
    
    window.location.href = "http://localhost:8888/logout";
});

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
});

function createPlaylist() {
    // If we don't have at least 1 seed, return because we can't generate a playlist.
    if ((selectedTrack.length + selectedArtist.length + selectedGenre) <= 0) {
        return;
    }
    
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
        "limit": 25 - (selectedTrack.length),
        
        "seed_tracks": selectedTrack, 
        "seed_artists": selectedArtist, 
        "seed_genres": selectedGenre, 
        
        "min_popularity": popularityMin, 
        "max_popularity": popularityMax, 
        
        "min_danceability": danceMin / 100, 
        "max_danceability": danceMax / 100, 
        
        "min_energy": energyMin / 100, 
        "max_energy": energyMax / 100, 
        
        "min_valence": positivityMin / 100, 
        "max_valence": positivityMax / 100, 
        
        "market": "US"
    }, 
    function(err, data) {
        if (!err) {
            
            var uriArr = [];
            var trackInfo = [];
            
            selectedTrack.forEach(function(d) {
                uriArr.push("spotify:track:" + d);
                trackInfo.push(selectedTrackInfo[d]);
            });
            
            data.tracks.forEach(function(d) {
                // Make sure there can't be duplicate tracks
                if (uriArr.indexOf(d.uri) == -1) {
                    uriArr.push(d.uri);
                    trackInfo.push(d.name + " <br/>" + (d.artists.length > 0 ? d.artists[0].name : "N/A"));
                }
            });
            
            spotifyApi.createPlaylist(me.uid, 
            {
                name: "[Rootify] Playlist", 
                public: true, 
            }, 
            function(err, data) {
                if (!err) {
                    var playlistID = data.id;
                    console.log("Playlist successfully created: " + playlistID);
                    
                    spotifyApi.addTracksToPlaylist(me.uid, playlistID, uriArr, {}, function(err, data) { if (!err) {
                        
                        var genPlaylistDiv = d3.select("#recommendedTracks");
                        genPlaylistDiv.html("");
                        d3.select("#generatedPlaylistTracks").style("display", "block");
                        
                        trackInfo.forEach(function(d) {
                            genPlaylistDiv.append("div")
                                .attr("class", "trackBox")
                                .attr("font-family", "sans-serif")
                                .attr("font-size", "10px")
                                .html(d);
                        });
                    } });
                }
            });
        }
    });
}