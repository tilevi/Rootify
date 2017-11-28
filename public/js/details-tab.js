/*
    File:
            details-tab.js
    Purpose:
            This is a singleton class that manages the 'Details' tab bars.
*/
var BarManager = function() {
    // Padding is the distance between each grey bar
    var barPadding = 2;
    // Border is the margin for each colored bar
    var barBorder = 4;
    
    // The height of each grey rectangle (w/ padding!)
    var rectHeight = 34;
    
    // Holds whether the bars were initially created.
    var barsCreated = false;
    
    // Audio feature labels
    var audio_features = ["Popularity", "Danceability", "Energy", "Happiness", "Key"];
    
    // Tonic key labels
    var pitchclass = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    // Colors for the bars
    var colors = { 
        lightblue: "#1F9599", 
        blue: "#165873", 
        darkblue: "#124C59", 
        green: "#428C5C", 
        lightgreen: "#4EA64B"
    };
    
    // Computes width based on 0-1 domain
    var xScale;
    // Computes width based on 0-11 domain
    var pitchScale;
    
    // Ordinal color scale
    var colorScale = d3.scale.ordinal()
                                .domain(d3.range(0,4))
                                .range([colors.blue, colors.lightblue, colors.darkblue, colors.green, colors.lightgreen]);
    
    // Reference to the details SVG (which holds the bars)
    var svg = d3.select("#detailsSVG");
    
    // Stored width of the SVG
    var width = 0;
    
    // Object that contains data about what/who is selected
    var selected = {
        id: "",
        typ: ""
    }
    
    /*
        Handle bar selection.
    */
    var selectedTrackInfo = null;
    var selected = {
        id: null, 
        typ: null
    };
    
    this.setTrackInfo = function (trackInfo, obj) {
        var id = obj.id;
        var typ = obj.typ;
        
        selected = {id: id, typ: typ};
        selectedTrackInfo = Object.assign({}, trackInfo);
    }
    
    this.clearSelection = function() {
        selectedTrackInfo = null;
        selected = { typ: null, id: null };
    }
    
    /*
        Methods to determine if an artist or track is selected.
    */
    this.artistNotLoaded = function(id) {
        return (!(selected.typ == "artist" && selected.id == id));
    }
    
    this.trackNotLoaded = function(id) {
        return (!(selected.typ == "track" && selected.id == id));
    }
    
    /*
        Handles if we need to create the bars or just update their data.
    */
    this.showBars = function(trackInfo, obj) {
        if (barsCreated) {
            this.updateBars(trackInfo, obj);
        } else {
            this.createBars(trackInfo, obj);
        }
    }
    
    /*
        Resize the bar container before creating or updating the bars.
    */
    var resizeBarContainer = function(typ) {
         // Resize the <div> container
        var newHeight = (typ == "track" ? "170px" : "34px");
        d3.select("#at-container")
            .style("height", newHeight)
            .style("display", "block");
        d3.select("#detailsSVG")
            .style("height", newHeight);
    }
    
    // This method is called if we initially click on an artist or track.
    this.createBars = function(trackinfo, obj) {
        // Return if we already created the bars
        if (barsCreated) { return; }
        barsCreated = true;
        
        var id, typ;
        
        if (trackinfo == null) {
            id = selected.id;
            typ = selected.typ;
            trackinfo = selectedTrackInfo;
        } else {
            id = obj.id;
            typ = obj.typ;
            
            // Store the track information (for use when resizing the bars)
            selected = { id: id, typ: typ };
            selectedTrackInfo = Object.assign({}, trackinfo);
        }
        
        if (trackinfo == null) {
            return;
        }
        
        // Set the size of the bars container properly
        resizeBarContainer(typ);
        
        // Store the track information (for use when resizing)
        selectedTrackInfo = Object.assign({}, trackinfo);
        
        // Grab our SVG width
        width = document.getElementById("detailsSVG").getBoundingClientRect().width;
        
        // Re-define the xScale based on this width
        xScale = d3.scale.linear()
        .domain([0, 1])
        .range([0, width - barBorder * 2]); //starts at 100 to allow space for names
        
        // Same with pitchScale
        pitchScale = d3.scale.linear()
        .domain([0, 12])
        .range([0, width - barBorder * 2]);
        
        // We populate the artist or audio feature data into an array
        var dataset = [];
        var numberOfKeys = Object.keys(trackinfo).length;
        for (var i = 0; i < numberOfKeys; i++) {
            dataset[i] = trackinfo[audio_features[i]];
        }
        
        // Select all of the non-existent group bars
        var barDiv = svg.selectAll("g.barDiv").data(dataset, function(d, i) { return audio_features[i]; });
        
        // Bar ENTER selection
        var barEnter = barDiv.enter().append("g")
                        .attr("class", "barDiv")
                        .attr("x", 0)
                        .attr("y", 0);
        
        // Create a grey rectangle around the colored bar
        barEnter.append("rect")
            .attr("class", "greyBar")
            .attr("x", 0)
            .attr("y", function(d, i) {
                return i * rectHeight;
            })
            .attr("width", width > 0 ? width: "100px")
            .attr("height", function(d, i) {
                return rectHeight - barPadding;
            })
            .attr("fill", "#282828");
        
        // Create the color bar inside the grey rectangle
        barEnter.append("rect")
            .attr("class", "colorBar")
            .style("stroke-width", "0px")
            .attr("x", barBorder)
            .attr("y", function(d, i) {
                return (i * rectHeight) + barBorder;
            })
            .attr("width", function(d, i) {
                if (i < 4) {
                    return xScale(d);
                } else {
                    return pitchScale(d.key);
                }
            })
            .attr("height", rectHeight - (barBorder * 2) - barPadding)
            .attr("fill", function(d, i) {
                return colorScale(i);
            });
        
        // Create text inside of the colored bar
        barEnter.append("text")
            .text(function(d, i) {
                if (i < 4){
                    return audio_features[i] + " (" + Math.floor(d * 100) + "%)";
                } else {
                    return "Key: " + pitchclass[d.key] + " " + (d.mode == 0 ? "Minor" : "Major");
                }
            })
            .attr("dy", "0.5em") // Centers it vertically
            .attr("x", barBorder * 2)
            .attr("y", function(d, i) {
                return (i * rectHeight) + (rectHeight - barPadding)/2;
            })
            .attr("font-family", "sans-serif")
            .attr("font-size", "10px")
            .attr("fill", "white");
    }
    
    // Update bars code
    this.updateBars = function(trackinfo, obj) {        
        var id, typ;
        
        if (trackinfo == null) {
            id = selected.id;
            typ = selected.typ;
            trackinfo = selectedTrackInfo;
        } else {
            id = obj.id;
            typ = obj.typ;
            
            selected = {
                id: id, 
                typ: typ
            };
            // Store the track information (for use when resizing)
            selectedTrackInfo = Object.assign({}, trackinfo);
        }
        
        // If we don't know the ID or type, return.
        if (id == null || typ == null) {
            return;
        }
        
        // Set the size of the bars container properly
        resizeBarContainer(typ);
        
        // Grab our SVG width
        width = document.getElementById("detailsSVG").getBoundingClientRect().width;
        
        // Re-define the xScale based on this width
        xScale = d3.scale.linear()
                    .domain([0, 1])
                    .range([0, width - barBorder * 2]).clamp(true); //starts at 100 to allow space for names
        
        // Same with pitchScale
        pitchScale = d3.scale.linear()
        .domain([0, 12])
        .range([0, width - barBorder * 2]).clamp(true);
        
        // We populate the artist or audio feature data into an array
        var dataset = [];
        for (var i = 0; i < 5; i++) {
            dataset[i] = trackinfo[audio_features[i]];
        }
        
        // Select all of the non-existent group bars
        // Notice how the second line hides the bars if they are not "Popularity" and we selected an artist.
        var barDiv = svg.selectAll("g.barDiv")
                        .style("opacity", function(d, i) { if (i > 0 && typ == "artist") { return 0; } return 1;})
                        .data(dataset, function(d, i) { return audio_features[i]; });
        
        barDiv.select("rect.greyBar")
            .attr("width", width);
        
        barDiv.select("rect.colorBar")
            .transition()
            .delay(function(d, i) {
                return i * 200;
            })
            .duration(250)
            .attr("width", function(d, i) {
                if (i < 4) {
                    return xScale(d);
                } else {
                    return pitchScale(d.key);
                }
            });
        
        barDiv.select("text").text(function(d, i) {
            if (i < 4) {
                return audio_features[i] + " (" + Math.floor(d * 100) + "%)";
            } else {
                return "Key: " + pitchclass[d.key] + " " + (d.mode == 0 ? "Minor" : "Major");
            }
        });
    };
};