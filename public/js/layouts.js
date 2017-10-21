var mode = "short";
var inTransition = true;

var treeData = { "name": "", "root": true };
var me = { "url": "" };

// Misc. variables
var i = 0;
var duration = 750;

var longChildren;
var shortChildren;

var root = null;

var artistID_short = [];
var trackID_short = [];

var artistID_long = [];
var trackID_long = [];

var tree = d3.layout.tree()
    .size([viewerHeight, viewerWidth]);

function elbow(d, i) {
    return "M" + d.source.x + "," + ( d.source.y + ((d.source.root) ? 55 : 42))
    + "H" + d.target.x + "V" + ( d.target.y - 25 );
}


// sort the tree according to the indices

function sortTree() {
    tree.sort(function(a, b) {
        return a.index - b.index;
    });
}
// Sort the tree initially incase the JSON isn't in a sorted order.
sortTree();

// Define the zoom function for the zoomable tree

var saveTranslate = [0, 0];

function zoom() {
    var translate = d3.event.translate;
    var scale = d3.event.scale;
    
    svgGroup.attr("transform", "translate(" + translate + ")scale(" + scale + ")");
    //console.log(translate, d3.transform(svgGroup.attr("transform")).translate);
}

// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

// define the baseSvg, attaching a class for styling and the zoomListener
var baseSvg = d3.select("svg").call(zoomListener);

baseSvg.append("defs")
    .append("clipPath")
        .attr("id", "clip")
        .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 25);

baseSvg.append("defs")
    .append("clipPath")
        .attr("id", "clip-root")
        .append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 32);

// Helper functions for collapsing and expanding nodes.
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

function expand(d) {
    if (d._children) {
        d.children = d._children;
        d.children.forEach(expand);
        d._children = null;
    }
}

// The magic function.
function getScreenCoords(x, y, ctm) {
    var xn = ctm.e + x*ctm.a + y*ctm.c;
    var yn = ctm.f + x*ctm.b + y*ctm.d;
    return { x: xn, y: yn };
}



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

// Toggle children function

function toggleChildren(d) {
    
    if (d._children) {

        d.children = d._children;
        d._children = null;

        var pan = update(d);
        centerNode(d, false, pan);
    } else if (d.aid && !d.children) {

        spotifyApi.getArtistRelatedArtists(d.aid, function(err, data) {

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
        });

    } else if (d.children) {
        d._children = d.children;
        d.children = null;

        var pan = update(d);
        centerNode(d, false, pan);
    }
}

// Toggle children on click.

function click(d) {
    
    if (inTransition || d.root) {
        return;
    }
    
    toggleChildren(d);
}

function update(source, switchM) {
    
    tree = tree.nodeSize([64, 64]);
    
    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
        links = tree.links(nodes);
    
    sortTree();

    // Set widths between levels
    nodes.forEach(function(d) {
        if (d.depth == 0) {
            d.y = 0;
        } else if (d.depth == 1) {
            d.y = 100;
        } else {
            d.y = 100 + ((d.depth-1) * 75); // 75px per level
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
            }
        } else {
            if (line.length > 0 && line[0][0] != null) {
                line.remove();
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
        })
        .on('click', click);
    
    
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
        
        inTransition = true;
        
        d3.select(this).transition()
            .duration(duration)
            .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        }).each("end", function() { inTransition = false; });
        
        if (!shouldPan) {
            
            var circle = this;
            
            var cx = +circle.getAttribute('cx');
            var cy = +circle.getAttribute('cy');
            
            var ctm = circle.getCTM();
            var coords = getScreenCoords(cx, cy, ctm);
            
            var padding = 80;
            
            if (( coords.x - padding ) < 0 || ( coords.x + padding ) > viewerWidth) {
                console.log("Should pan.");
                shouldPan = true;
            }
            if (( coords.y - padding ) < 0 || ( coords.y + padding ) > viewerHeight) {
                console.log("Should pan.");
                shouldPan = true;
            }
        }
    });
    
    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit();
    var customClip = null;
    
    if (!nodeExit.empty()) {
        
        inTransition = true;
        
        customClip = baseSvg.append("defs")
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
                            
                            if (switchM == "long") {
                                
                                if (longChildren == null) {
                                    createRootChildren();
                                } else {
                                    root.children = longChildren;
                                    update(root);
                                    centerNode(root, true);
                                }
                            } else if (switchM == "short") {
                                
                               if (shortChildren == null) {
                                    createRootChildren();
                                } else {
                                    root.children = shortChildren;
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
    
    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
    
    return shouldPan;
}

// Append a group which holds all nodes and which the zoom Listener can act upon.
var svgGroup = baseSvg.append("g");

// Define the root
root = treeData;

root.x0 = 0;
root.y0 = 0;

var loadedArtists = false;
var loadedTracks = false;

function doneLoading() {
    
    if (loadedArtists && loadedTracks) {
        
        update(root);
        centerNode(root, true);
    }
}

function loadArtists(baseCount) {
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

function createRootChildren() {
    
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
            
            while ( (i < data.items.length) && (count < d3.min([5, data.items.length])) ) {

                var track = data.items[i];
                
                var trackID = trackID_short;
                
                if (mode == "long") {
                    trackID = trackID_long;
                }
                
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
            loadArtists(count);
        }
    });
    
}

spotifyApi.getMe({}, function(err, data) {
    if (!err) {
        me.url = data.images.length > 0 ? data.images[0].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png";
        createRootChildren();
    }
});

var switchMode = function(m) {
    
    if (inTransition || mode == m) {
        return;
    }
    
    if (m == "long") {
        shortChildren = root.children;
    } else {
        longChildren = root.children;
    }
    
    mode = m;
    root.children = null;
    
    update(root, m);
}

document.getElementById("long-term").addEventListener("click", function() {
    switchMode("long");
});

document.getElementById("short-term").addEventListener("click", function() {
    switchMode("short");
});
