
var treeData = { "name": "", "root": true };
var me = {"url": ""};

// Calculate total nodes, max label length
var totalNodes = 0;
var maxLabelLength = 0;

var patternDef;

// Misc. variables
var i = 0;
var duration = 750;

var root;
var artistID = [];
var trackID = [];

var tree = d3.layout.tree()
    .size([viewerHeight, viewerWidth]);

// define a d3 diagonal projection for use by the node paths later on.
var diagonal = d3.svg.diagonal()
    .projection(function(d) {
        return [d.x, d.y - 15];
    });

function elbow(d, i) {
    return "M" + d.source.x + "," + ( d.source.y + 42 )
    + "H" + d.target.x + "V" + ( d.target.y - 25 );
}


// A recursive helper function for performing some setup by walking through all nodes

function visit(parent, visitFn, childrenFn) {
    if (!parent) return;

    visitFn(parent);

    var children = childrenFn(parent);
    if (children) {
        var count = children.length;
        for (var i = 0; i < count; i++) {
            visit(children[i], visitFn, childrenFn);
        }
    }
}

// Call visit function to establish maxLabelLength
visit(treeData, function(d) {
    totalNodes++;
    maxLabelLength = Math.max(d.name.length, maxLabelLength);

}, function(d) {
    return d.children && d.children.length > 0 ? d.children : null;
});


// sort the tree according to the node names

function sortTree() {
    tree.sort(function(a, b) {
        return a.index - b.index;
    });
}
// Sort the tree initially incase the JSON isn't in a sorted order.
sortTree();

// Define the zoom function for the zoomable tree

function zoom() {
    svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}


// define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

// define the baseSvg, attaching a class for styling and the zoomListener
var baseSvg = d3.select("svg").call(zoomListener);

patternDef = baseSvg.append("defs")
                .append("clipPath")
                    .attr("id", "clip")
                    .append("circle")
                        .attr("cx", 0)
                        .attr("cy", 0)
                        .attr("r", 25);

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


// Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

function centerNode(source) {
    scale = zoomListener.scale();
    x = -source.x0;
    y = -source.y0;
    x = x * scale + viewerWidth / 2;
    y = y * scale + viewerHeight / 2;

    d3.select('g').transition()
        .duration(duration)
        .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
    zoomListener.scale(scale);
    zoomListener.translate([x, y]);
}

// Toggle children function

function toggleChildren(d) {

    if (d._children) {

        d.children = d._children;
        d._children = null;

        update(d);
        centerNode(d);
    } else if (d.aid && !d.children) {

        spotifyApi.getArtistRelatedArtists(d.aid, function(err, data) {

            var count = 0;
            var i = 0;
            d.children = [];

            while ( (i < data.artists.length) && (count < d3.min([3, data.artists.length])) ) {

                var artist = data.artists[i];

                if (artistID.indexOf(artist.id) === -1) {

                    d.children.push( { "rank": i, "name": artist.name, "aid": artist.id, url: artist.images.length > 0 ? artist.images[artist.images.length-1].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png"} );

                    artistID.push(artist.id);
                    count++;
                }

                i++;
            }

            d._children = null;

            update(d);
            centerNode(d);
        });

    } else if (d.children) {
        d._children = d.children;
        d.children = null;

        update(d);
        centerNode(d);
    }
}

// Toggle children on click.

function click(d) {
   // if (d3.event.defaultPrevented) console.log(return; // click suppressed
    toggleChildren(d);
}

function update(source) {

    // Compute the new height, function counts total children of root node and sets tree height accordingly.
    // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
    // This makes the layout more consistent.
    var levelWidth = [1];
    var childCount = function(level, n) {

        if (n.children && n.children.length > 0) {
            if (levelWidth.length <= level + 1) levelWidth.push(0);

            levelWidth[level + 1] += n.children.length;
            n.children.forEach(function(d) {
                childCount(level + 1, d);
            });
        }
    };
    childCount(0, root);
    tree = tree.nodeSize([55, 55]);
    
    // Compute the new tree layout.
    var nodes = tree.nodes(root).reverse(),
        links = tree.links(nodes);
    sortTree();

    // Set widths between levels based on maxLabelLength.
    nodes.forEach(function(d) {
        d.y = (d.depth * 75); //500px per level.
    });

    // Update the nodes…
    node = svgGroup.selectAll("g.node")
        .data(nodes, function(d) {
            if (!d.id) {
                d.id = ++i;
            }
            return d.aid ? d.aid : d.id;
            //return d.id || (d.id = ++i);
        });
    
    node.each(function(d){
        if (d == source) {
            if (d.children) {

                d3.select(this).append("line")
                    .attr("x1", 0)
                    .attr("y1", 25)
                    .attr("x2", 0)
                    .attr("y2", 42)
                    .attr("stroke-width", 2)
                    .attr("stroke", "black");
            } else {
                
                d3.select(this).select("line").remove();
            }
        }
    })

    // Enter any new nodes at the parent's previous position.
    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + source.x0 + "," + source.y0 + ")";
        })
        .on('click', click);
    
    nodeEnter.each(function(d) {
        
        if (d == source && d.children) {
            
            d3.select(this).append("line")
                .attr("x1", 0)
                .attr("y1", 25)
                .attr("x2", 0)
                .attr("y2", 42)
                .attr("stroke-width", 2)
                .attr("stroke", "black");
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
                .attr("r", 25)
                .style("fill", function(d) {
                    return d._children ? "lightsteelblue" : "#fff";
                });
            
            d3.select(this).append('image')
                .attr('x', -25)
                .attr('y', -25)
                .attr('width', 50)
                .attr('height', 50)
                .attr("xlink:href", function(d) {
                    return me.url;
                })
               .attr("clip-path", "url(#clip)");
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
    });
    
    // Update the text to reflect whether node has children or not.
    node.select('text')
        .attr("x", function(d) {
            return 0; //d.children || d._children ? -10 : 10;
        })
        .attr("text-anchor", function(d) {
            return "middle"; //d.children || d._children ? "end" : "start";
        })
        .text(function(d) {
            return "";
        });

    // Change the circle fill depending on whether it has children and is collapsed
    node.select("circle.nodeCircle")
        .attr("r", 25)
        .style("fill", function(d) {
            return d._children ? "lightsteelblue" : "#fff";
        });

    // Transition nodes to their new position.
    var nodeUpdate = node.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.x + "," + d.y + ")";
        });

    // Fade the text in
    nodeUpdate.select("text")
        .style("fill-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    var nodeExit = node.exit();

    nodeExit.select("text").remove();

    nodeExit = nodeExit.transition()
        .attr("transform", function(d) {
            if (!d.type || d.type != "T") {
                return "translate(" + ( source.x + 0 ) + "," + ( source.y + 0 ) + ")";
            } else {
                return "translate(" + ( source.x + 25 ) + "," + ( source.y + 25 ) + ")";
            }
        })
        .duration(duration)
        .remove();

    nodeExit.select("circle")
        .attr("r", 0);

    nodeExit.select("rect")
        .attr("width", 0)
        .attr("height", 0);

    nodeExit.select("text")
        .style("fill-opacity", 0);
    
    var link = svgGroup.selectAll("path.link")
        .data(links, function(d) {
            return d.target.aid ? d.target.aid : d.target.id;
        });
    
    var linkEnter = link.enter().append("path").style("stroke", "grey");
    
    linkEnter.each(function(d) {
        
        if (d.target.spacer) { d3.select(this).style("opacity", 0); }
        
        // Enter any new links at the parent's previous position.
        d3.select(this)
            .attr("class", "link")
            .transition()
            .duration(duration)
            .attr("d", elbow);
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
}

// Append a group which holds all nodes and which the zoom Listener can act upon.
var svgGroup = baseSvg.append("g");

// Define the root
root = treeData;
root.x0 = viewerHeight / 2;
root.y0 = 0;

var loadedArtists = false;
var loadedTracks = false;

function doneLoading() {
    
    if (loadedArtists && loadedTracks) {
        
        update(root);
        centerNode(root);
    }
}

function loadArtists(baseCount) {
        spotifyApi.getMyTopArtists(
        {
            "limit": 5,
            "time_range": "long_term"
        }, 
        function(err, data) {
            if (!err) {

                var count = 0;
                var i = 0;
                
                while ( (i < data.items.length) && (count < d3.min([5, data.items.length])) ) {

                    var artist = data.items[i];

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
        "time_range": "long_term"
    },
    function(err, data) {
        if (!err) {
            
            var count = 0;
            var i = 0;
            
            root.children = [];
            
            while ( (i < data.items.length) && (count < d3.min([5, data.items.length])) ) {

                var track = data.items[i];
                
                if (trackID.indexOf(track.id) === -1) {
                    
                    root.children.push( { "index": i, "name": track.name, "tid": track.id, url: track.album.images.length > 0 ? track.album.images[0].url : "http://primusdatabase.com/images/8/83/Unknown_avatar.png"} );
                    
                    trackID.push(track.id);
                    count++;
                }

                i++;
            }
            
            root.children.push( {"index": count, "name": "SPACER", "spacer": true } );
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