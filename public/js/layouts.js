// Either "short" or "long" 
// Indicates if we want to view short-term or long-term
var mode = "short";
var inTransition = true;

// Initial tree data
var treeData = { "name": "", "root": true };

// Initial Spotify user profile data
var me = { "url": "" };

// Used for assigning IDs to our nodes
var i = 0;
var j = 0;

// Duration of our transitions
var duration = 700;

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
    Our initial tree layout
*/
var tree = d3.layout.tree()
    .size([viewerHeight, viewerWidth]);

/*
    This is our path generator which creates an elbow shape.
*/
function elbow(d, i) {
    return "M" + d.source.x + "," + ( d.source.y + ((d.source.root) ? 55 : 42))
    + "H" + d.target.x + "V" + ( d.target.y - 25 );
}

/*
    We use this to sort our tree.
    Top tracks and artists appear left to right.
    
    In other words, the track or artist you listen to more are on the left.
*/
function sortTree() {
    tree.sort(function(a, b) {
        return a.index - b.index;
    });
}

// Initially, sort the tree.
sortTree();

// This variable holds what our scale is, default is 1.
var globalScale = 1;

/*
    This code handles our zoom.
    It transforms our SVG 'g' (or group) element.
    
    If we put the root at the top left, the translation is [0, 0].
*/
function zoom() {
    var translate = d3.event.translate;
    var scale = d3.event.scale;
    
    svgGroup.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    globalScale = scale;
}

// Our zoom listener
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

// Our base SVG
var baseSvg = d3.select("svg").call(zoomListener);

/*
    Our clip paths.
    
    One is for our avatar (bigger radius), another is for the nodes (smaller radii).
*/


baseSvg.append("defs")
    .append("clipPath")
        .attr("id", "clip-root")
        .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 32);

baseSvg.append("defs")
    .append("clipPath")
        .attr("id", "clip")
        .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 25);

/*
    This a helper function that converts an element's position in the SVG to its relative position to the SVG.
    
    Therefore, we can figure out if a node is visible.
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

    d3.select('g').transition()
        .duration(duration)
    y = y * scale + viewerHeight / 8;
    
    var dur = duration;
    
    if (first) {
        dur = 0;
    }
    
     d3.select('g')
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
    
    if (d._children) {
        // Here, we store a collapsed node's children in _children if it was opened previously.
        d.children = d._children;
        d._children = null;

        var pan = update(d);
        centerNode(d, false, pan);
    } else if (d.aid && !d.children) {
        
        // Grab related artists based on the artist we just selected.
        spotifyApi.getArtistRelatedArtists(d.aid, function(err, data) {
            
            if (!err) {

                var count = 0;
                var i = 0;
                d.children = [];

                while ( (i < data.artists.length) && (count < d3.min([3, data.artists.length])) ) {

                    var artist = data.artists[i];

                    var artistID = artistID_short;

                    if (mode == "long") {
                        artistID = artistID_long;
                    }

                    if (artistID.indexOf(artist.id) === -1) {

                        d.children.push( { "rank": i, "name": artist.name, "aid": artist.id, url: artist.images.length > 0 ? artist.images[artist.images.length-1].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png"} );

                        artistID.push(artist.id);
                        count++;
                    }

                    i++;
                }

                d._children = null;

                var pan = update(d);
                centerNode(d, false, pan);
            }
        });

    } else if (d.tid && !d.children) {
        
        spotifyApi.getRecommendations(
        {
            "limit": 3,
            "seed_tracks": ("" + d.tid)
        }, 
        function(err, data) {
            
            if (!err) {
                
                var count = 0;
                var i = 0;
                d.children = [];
                
                var trackID = trackID_short;
                var tracks = [];
                
                if (mode == "long") {
                    trackID = trackID_long;
                }
                
                while ( (i < data.tracks.length) && (count < d3.min([3, data.tracks.length])) ) {

                    var track = data.tracks[i];
                    
                    if (trackID.indexOf(track.id) === -1) {
                        
                        tracks.push(track.id);
                        
                        d.children.push( { "index": i, "name": track.name, "tid": track.id, url: track.album.images.length > 1 ? track.album.images[1].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png"} );

                        trackID.push(track.id);
                        count++;
                    }
                    
                    i++;
                }

                d._children = null;

                var pan = update(d);
                centerNode(d, false, pan);
                
                /*spotifyApi.getAudioFeaturesForTracks(
                tracks, 
                function(err, data) {
                    if (!err) {
                        //console.log(data);
                    }
                });*/
            }
        });
        
    } else if (d.children) {
        d._children = d.children;
        d.children = null;

        var pan = update(d);
        centerNode(d, false, pan);
    }
}

/*
    When we click on a node, this fucntion is called.
    We don't allow toggling if a transition is occuring or we clicked on the root node.
*/
function click(d) {
    
    if (inTransition || d.root) {
        return;
    }
    
    toggleChildren(d);
}

/*
    This function is VERY important.
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
            d.y = 100 + ((d.depth-1) * 75);
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
        
        var line = d3.select(this).select("line");
        
        if (d.children) {
            
            if (line.length > 0 && line[0][0] == null) {
                d3.select(this).append("line")
                    .attr("x1", 0)
                    .attr("y1", 25)
                    .attr("x2", 0)
                    .attr("y2", (d.root ? 55 : 42))
                    .style("stroke", "#ccc")
                    .style("stroke-width", 0)
                    .transition()
                    .duration(duration)
                    .style("stroke-width", 3)
                    .style("stroke", "#ccc");
                
                if (!d.root) {
                    
                    d3.select(this).select(".triangleDown").style("opacity", 0).style("fill-opacity", 0);

                    d3.select(this).append('path')
                        .classed("triangleUp", true)
                        .attr("d", d3.svg.symbol().type("triangle-up").size(50))
                        .attr("transform", function(d) { return "translate(" + 0 + "," + 36 + ")"; })
                        .style("fill", "white")
                        .attr("stroke", "black")
                        .attr("stroke-width", "1px")
                        .style("opacity", 1)
                        .on("click", click);
                }
            }
        } else {
            if (line.length > 0 && line[0][0] != null) {
                
                line.remove();
            }
            
            var triUp = d3.select(this).select(".triangleUp");
            if (triUp.length > 0 && triUp[0][0] != null) {
                triUp.remove();

                var triDown = d3.select(this).select(".triangleDown");
                if (triDown.length > 0 && triDown[0][0] != null) {
                    console.log("Attempting to set opacity back.");
                    triDown.style("opacity", 1);
                    triDown.style("fill-opacity", 1);
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
        
        if (d.children) {
            
            d3.select(this).append("line")
                .attr("x1", 0)
                .attr("y1", 25)
                .attr("x2", 0)
                .attr("y2", (d.root) ? 55 : 42)
                .style("stroke", "#ccc")
                .style("stroke-width", 0)
                .transition()
                .duration(duration)
                .style("stroke-width", 3)
                .style("stroke", "#ccc");
            
            if (d.aid || d.tid) {
                d3.select(this).append('path')
                    .classed("triangleUp", true)
                    .attr("d", d3.svg.symbol().type("triangle-up").size(50))
                    .attr("transform", function(d) { return "translate(" + 0 + "," + 36 + ")"; })
                    .style("fill", "white")
                    .attr("stroke", "black")
                    .attr("stroke-width", "1px")
                    .style("opacity", 1)
                    .on("click", click);
            }
            

        } if (!d.root && !d.spacer) {
            
            d3.select(this).append('path')
                .classed("triangleDown", true)
                .attr("d", d3.svg.symbol().type("triangle-down").size(150))
                .attr("transform", function(d) { return "translate(" + 0 + "," + 27 + ")"; })
                .style("fill", "white")
                .attr("stroke", "black")
                .attr("stroke-width", "1px")
                .style("opacity", d.children == null ? 1 : 0)
                .on("click", click);
        }
        
        if (d.aid) {
            
            d3.select(this).append('circle')
                .attr("r", 25)
                .style("fill", "lightblue");

            d3.select(this).append('image')
                .attr('x', -25)
                .attr('y', -25)
                .attr('width', 50)
                .attr('height', 50)
                .attr("xlink:href", function(d) {
                    return d.url;
                })
               .attr("clip-path", "url(#clip)");
        }
        else if (d.root) {

            d3.select(this).append("circle")
                .attr('class', 'nodeCircle')
                .attr("r", 32)
                .style("fill", function(d) {
                    return d._children ? "lightsteelblue" : "#fff";
                });
            
            d3.select(this).append('image')
                .attr('x', -32)
                .attr('y', -32)
                .attr('width', 64)
                .attr('height', 64)
                .attr("xlink:href", function(d) {
                    return me.url;
                })
               .attr("clip-path", "url(#clip-root)");
        }
        else if (!d.spacer) {
            
            d3.select(this).append('rect')
                .attr('x', -25)
                .attr('y', -25)
                .attr('width', 50)
                .attr('height', 50)
                .attr('rx', 6)
                .attr('ry', 6);
            
            d3.select(this).append('image')
                .attr('x', -22)
                .attr('y', -22)
                .attr('width', 44)
                .attr('height', 44)
                .attr("xlink:href", function(d) {
                    return d.url;
                });
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
            
            coords.x = coords.x + globalScale * xDiff;
            coords.y = coords.y + globalScale * yDiff;
            
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
        inTransition = true;
        
        d3.select(this).transition()
            .duration(duration)
            .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }).each("end", function() { inTransition = false; });
    });
    
    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit();
    
    /*
        The below code is for node exit animation.
        
        If our node exit set is non-empty, we transition them properly. I make a custom clip element that resizes its radius as the transition occurs.
    */
    if (!nodeExit.empty()) {
        
        inTransition = true;
        
        // This custom clip should 
        var customClip = baseSvg.append("defs")
                    .append("clipPath")
                    .attr("id", "clip" + (source.id))
                        .append("circle")
                        .attr("cx", 0)
                        .attr("cy", 0)
                        .attr("r", 25)
                        .transition()
                        .duration(duration)
                        .attr("r", 0)
                        .each("end", function() {
                            // At the end of the transition, remove the dynamic clip path.
                            d3.select("#clip" + (source.id)).remove();
                            inTransition = false;
                            
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
                        });
    }
    
    nodeExit.each(function(d) {
        
        var line = d3.select(this).select("line");
        if (line != null) {
            line.remove();
            d3.select(this).selectAll("path").remove();
        }
        
        var exitVar = d3.select(this)
            .transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + ( source.x + 0 ) + "," + ( source.y + 0 ) + ")";
            })
            .remove();
        
        if (!d.tid) {
            exitVar.select("image")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("width", 0)
                    .attr("height", 0)
                    .attr("clip-path", "url(#" + "clip" + (source.id) + ")");
        } else {
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
            return d.target.aid ? d.target.aid : d.target.tid;
        });
    
    var linkEnter = link.enter().append("path")
                        .classed("link", true);
    
    linkEnter.each(function(d) {
        if (d.target.spacer) { d3.select(this).style("opacity", 0); }
    });
    
    // Transition links to their new position.
    link.transition()
        .duration(duration)
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
root.x0 = 0;
root.y0 = 0;

root.x = 0;
root.y = 0;

/*
    Booleans to indicate if we properly loaded our top artists and tracks.
*/

var loadedArtists = false;
var loadedTracks = false;

/*
    This function computes the new layout for our tree and then centers the root node at the middle top (1/2 from the left and right, 1/8 from the top and 7/8 from the bottom).
    
    This function is called when we finally loaded the data of our top artists and tracks.
*/
function doneLoading() {
    
    if (loadedArtists && loadedTracks) {
        
        update(root);
        centerNode(root, true);
    }
}

/*
    This function loads all of our top artists.
    
    Notice that we pass in a baseCount. This is a hacky solution but basically we need to make sure we are inserting the children of our root node properly.
    
    baseCount should be 6 because 5 of our tracks should have been loaded, including a spacer node so our tree looks clean.
*/

function loadTopArtists(baseCount) {
        spotifyApi.getMyTopArtists(
        {
            "limit": 5,
            "time_range": mode == "long" ? "medium_term" : "short_term"
        }, 
        function(err, data) {
            if (!err) {

                var count = 0;
                var i = 0;
                
                while ( (i < data.items.length) && (count < d3.min([5, data.items.length])) ) {

                    var artist = data.items[i];
                    var artistID = artistID_short;

                    if (mode == "long") {
                        artistID = artistID_long;
                    }
                    
                    if (artistID.indexOf(artist.id) === -1) {
                        
                        root.children.push( { "index": baseCount + i, "name": artist.name, "aid": artist.id, url: artist.images.length > 0 ? artist.images[0].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png"} );

                        artistID.push(artist.id);
                        count++;
                    }

                    i++;
                }
                
                loadedArtists = true;
                doneLoading();
            }
        }
    );
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
        if (!err) {
            
            var count = 0;
            var i = 0;
            
            root.children = [];
            var trackID = trackID_short;

            if (mode == "long") {
                trackID = trackID_long;
            }
            
            while ( (i < data.items.length) && (count < d3.min([5, data.items.length])) ) {

                var track = data.items[i];
                
                if (trackID.indexOf(track.id) === -1) {
                    
                    root.children.push( { "index": i, "name": track.name, "tid": track.id, url: track.album.images.length > 0 ? track.album.images[0].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png"} );
                    
                    trackID.push(track.id);
                    count++;
                }

                i++;
            }
            
            root.children.push( {"index": count, "name": "SPACER", "tid": "spacer", "spacer": true } );
            trackID.push("INVALID_TRACK_ID1");
            count = count + 1;
            
            loadedTracks = true;
            loadTopArtists(count);
        }
    });
    
}

/*
    This function grabs the Spotify user's information.
*/

var loadMe = function() {

    spotifyApi.getMe({}, function(err, data) {
        if (!err) {

            me.url = data.images.length > 0 ? data.images[0].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png";
            loadTopTracks();
        } else {
            
            // If there's an error, we want to get our refresh token.
            // This will be used primarily for development as our access token may expire.
            
            // Source: http://www.the-art-of-web.com/javascript/getcookie/
            function getCookie(name)
            {
                var re = new RegExp(name + "=([^;]+)");
                var value = re.exec(document.cookie);
                return (value != null) ? unescape(value[1]) : null;
            }

            var refresh_token = getCookie("myRefreshToken");
            console.log(refresh_token);

            $.ajax({
                  url: '/refresh_token',
                  data: {
                    'refresh_token': refresh_token
                  }
                }).done(function(data) {
                    spotifyApi.setAccessToken(data.access_token);
                    loadMe();
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
    
    // Don't switch if we're transitioning or in the same mode
    if (inTransition || mode == m) {
        return;
    }
    
    if (m == "long") {
        // Save the short-term infomration
        shortChildren = root.children;
    } else {
        // Save the long-term information
        longChildren = root.children;
    }
    
    // Switch the mode
    mode = m;
    // Set the root children initially to nothing
    root.children = null;
    
    // Re-layout the tree
    update(root, m);
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
