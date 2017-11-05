var detailsTabNS = new function() {
    // Padding is the distance between each grey bar
    var barPadding = 2;
    // Border is the margin for each colored bar
    var barBorder = 4;
    
    // The height of each grey rectangle (w/ padding!)
    var rectHeight = 34;
    
    
    // Audio feature labels
    var audio_features = ["Popularity", "Danceability", "Energy", "Positivity", "Key"];
    
    // Tonic key labels
    var pitchclass = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    // Colors for the bars
    var colors = {lightblue: "#1F9599", blue: "#165873", darkblue: "#124C59", green: "#428C5C", lightgreen: "#4EA64B"};
    
    
    // Computes width based on 0-1 domain
    var xScale;
    // Computers width based on 0-11 domain
    var pitchScale;
    
    // Ordinal color scale
    var colorScale = d3.scale.ordinal()
                                .domain(d3.range(0,4))
                                .range([colors.blue, colors.lightblue, colors.darkblue, colors.green, colors.lightgreen]);
    
    
    // Reference to the details SVG (which holds the bars)
    var svg = d3.select("#detailsSVG");
    
    // Width and height of the SVG
    var width = 0;
    var height = 0;
    
    // Object that contains data about what/who is selected
    var selected = {
        "id": "",
        "typ": ""
    }
    
    // This method returns true if we are displaying information to the user.
    this.notDisplayingInfo = function() {
        return (selected.id == "" || selected.typ == "");
    }
    
    // Return the selected item (either an artist or track)
    this.getSelected = function() {
        return selected;
    }
    
    // Initially, the bars do not exist.
    var created = false;
    
    this.barsExist = function() {
        return created;
    }
    
    // This method is called if we initially click on an artist or track.
    this.createBars = function(trackinfo, id, typ) {
        // Return if we already created the bars
        if (created) { return; }
        created = true;
        
        // Update who/what we selected.
        selected = { "id": id, "typ": typ };
        
        // Grab our SVG width
        width = document.getElementById("detailsSVG").clientWidth;
        
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
              .attr("class", "border")
              .attr("x", 0)
              .attr("y", function(d, i) {
                return i * rectHeight;
              })
              .attr("width", width)
              .attr("height", function(d, i) {
                return rectHeight - barPadding;
              })
              .attr("fill", "#282828");
        
        // Create the color bar inside the grey rectangle
        barEnter.append("rect")
                .style("stroke-width", "0px")
               .attr("class", "bar")
               .attr("x", barBorder)
               .attr("y", function(d, i) {
                  return (i * rectHeight) + barBorder;
               })
               .attr("width", function(d, i) {
                    if(i == 0){
                    return xScale(d/100);
                  }else if(i > 0 && i < 4){
                    return xScale(d);
                  }else {
                      return pitchScale(d.key);
                  }
                })
                .attr("height", rectHeight - (barBorder * 2) - barPadding)
               .attr("fill", function(d,i) {
                    return colorScale(i);
                });
            
            // Create text inside of the colored bar
            barEnter.append("text")
               .text(function(d, i) {
                  if(i == 0){
                    return audio_features[i] + " (" + Math.floor(d) + "%)";
                  }else if(i > 0 && i < 4){
                    return audio_features[i] + " (" + Math.floor(d * 100) + "%)";
                  }else {
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
    
    var showAndHideBars = function(typ) {
        // If we switched types, then hide the appropriate bars.
        if (typ != selected.typ) {
            var maxIndex = (typ == "artist" ? 0 : 4);
            svg.selectAll("g.barDiv").each(function(d, i) {
                if (i > maxIndex) {
                    d3.select(this).style("opacity", 0);
                } else {
                    d3.select(this).style("opacity", 1);
                }
            });
        }
    }
    
    // Update bars code
    this.updateBars = function(trackinfo, id, typ) {
        showAndHideBars(typ);
        
        // Update who/what we selected.
        selected = { "id": id, "typ": typ };
        
        // Grab our SVG width
        width = document.getElementById("detailsSVG").clientWidth;
        
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
        for (var i = 0; i < 5; i++) {
            dataset[i] = trackinfo[audio_features[i]];
        }
        
        // Select all of the non-existent group bars
        var barDiv = svg.selectAll("g.barDiv")
                        .data(dataset, function(d, i) { return audio_features[i]; });
        
        barDiv.select("rect.bar")
            .transition()
            .delay(function(d, i) {
                    return i * 100;
            })
            .duration(500)
            .ease("linear")
            .attr("width", function(d, i) {
                if (i == 0) {
                    return xScale(d/100);
                } else {
                    if (typ == "track") {
                        if (i < 4) {
                            return xScale(d);
                        } else {
                            return pitchScale(d.key);
                        }
                    }
                }
            });
        
        barDiv.select("text").text(function(d, i) {
            if(i == 0) {
                return audio_features[i] + " (" + Math.floor(d) + "%)";
            } else {
                if (typ == "track") {
                    if (i < 4) {
                        return audio_features[i] + " (" + Math.floor(d * 100) + "%)";
                    } else {
                        return "Key: " + pitchclass[d.key] + " " + (d.mode == 0 ? "Minor" : "Major");
                    }
                }
            }
        });
    };
};