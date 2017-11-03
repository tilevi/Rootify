var detailsTabNS = new function() {
    
    var c10 = d3.scale.category10();
    
    var barPadding = 2;
    var barBorder = 5;
    
    //colors for the bars
    var audio_features = ["Popularity", "Danceability", "Energy", "Happiness", "Key", "Mode"];
    
    
    var colors = { blue: "#1F9599", lightblue: "#165873", darkblue: "#124C59", green1: "#428C5C", green2: "#4EA64B", green3: "#ADD96C", green4: "#8EB259" };
    
    var colorScale = d3.scale.ordinal()
                                .domain(d3.range(0,6))
                                .range([colors.blue, colors.lightblue, colors.darkblue, colors.green1, colors.green2, colors.green4]);
    
    
    
    var pitchclass = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
    var svg = d3.select("#detailsSVG");
    
    var width = 0;
    var height = 0;
    
    var xScale;
    
    var greyrects = [0, 1, 2, 3, 4, 5];
    var rectHeight = 34; //Math.floor(100 / 6);
    
    this.createBars = function(trackinfo) {
        
        width = document.getElementById("detailsSVGDiv").clientWidth;
        
        xScale = d3.scale.linear()
        .domain([0, 1])
        .range([barBorder, width - barBorder * 2]); //starts at 100 to allow space for names
        
        var dataset = []; //temporary container
            //populate dataset with object info
            for(var i = 0; i < 6; i++){
              dataset[i] = trackinfo[audio_features[i]];
            }
            
            //grey border bars
            svg.selectAll("rect.border")
              .data(greyrects)
              .enter()
              .append("rect")
              .attr("class", "border")
              .attr("x", 0)
              .attr("y", function(d, i){
                return i * (rectHeight);
              })
              .attr("width", width)
              .attr("height", function(d, i) {
                return (rectHeight) - barPadding;
              })
              .attr("fill", "#282828");
            
              //xanex bars
            svg.selectAll("rect.bar")
               .data(dataset)
               .enter()
               .append("rect")
                .style("stroke-width", "0px")
               .attr("class", "bar")
               .attr("x", barBorder)
               .attr("y", function(d, i) {
                  return i * rectHeight + barBorder;
               })
               .attr("width", function(d, i) {
                    if(i == 0){
                    return xScale(d/100);
                  }else if(i > 0 && i < 4){
                    return xScale(d);
                  }else{
                    return xScale(1);
                  }
                })
                .attr("height", rectHeight - (barBorder * 2) - barPadding)
               .attr("fill", function(d,i) {
                    return colorScale(i);
                });
               
               
            svg.selectAll("text")
               .data(dataset)
               .enter()
               .append("text")
               .text(function(d, i) {
                  if(i == 0){
                    return audio_features[i] + " (" + Math.floor(d) + "%)";
                  }else if(i > 0 && i < 4){
                    return audio_features[i] + " (" + Math.floor(d * 100) + "%)";
                  }else if(i == 4){
                    return "key: " + pitchclass[d];
                  }else if(i == 5){
                    if(d == 0){
                      return "minor";
                    }else{
                      return "major";
                    }
                  }
                  
               })
               .attr("dy", "0.49em")
               .attr("x", barBorder * 2)
               .attr("y", function(d, i) {
                  return (i * (rectHeight)) + (rectHeight / 2);
               })
               .attr("font-family", "sans-serif")
               .attr("font-size", "10px")
               .attr("fill", "white");
    }
    
    this.updateBars = function() {
        
        // Grab SVG width and height
        width = svg.attr("width");
        height = svg.attr("height");
        
        svg.selectAll("rect.bar")
            .data(dataset)
            .transition()
            .delay(function(d, i) {
                return i * 100;
            })
            .duration(500)
            .ease(d3.easeLinear)
            .attr("width", function(d, i) {
              if (i == 0) { // This is popularity.
                return xScale(d/100);
              } else if (i > 0 && i < 4) {
                return xScale(d);
              } else {
                  // Key or major/minor
                    return w - (barBorder * 2);
              }
           });

        svg.selectAll("text")
             .data(dataset)
             .transition()
             .text(function(d, i) {
                if (i == 0) {
                  return datanames[i] + " (" + Math.floor(d) + "%)";
                } else if (i > 0 && i < 4) {
                  return datanames[i] + " (" + Math.floor(d * 100) + "%)";
                } else if(i == 4) {
                  return "key: " + pitchclass[d];
                } else if(i == 5) {
                  if(d == 0) {
                    return "minor";
                  } else {
                    return "major";
                  }
                }
             });
    };
};