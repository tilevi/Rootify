<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <title>fuckin around</title>
        <script type="text/javascript" src="d3/d3.js"></script>
        <style type="text/css">
            
        </style>
    </head>
    <body>

        <p>BUTTON</p>

        <script type="text/javascript">

            var trackinfo = {
              popularity: 73, //0-100
              danceability: 0.7, //0-1
              energy: 0.8, //0-1
              valence: 0.6, //0-1
              key: 7, // 0-11
              mode: 0 //0 or 1
            };

            var pitchclass = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

            //Width and height
            var w = 500;
            var h = 500;
            var barPadding = 2;
            var barBorder = 8;
            var datanames = ["popularity", "danceability", "energy", "valence", "key", "mode"];

            //colors for the bars
            var colorscheme = ["178, 34, 34", "253, 116, 0", "225, 225, 26", "190, 219, 57", "31, 138, 112", "0, 67, 88"];

            var dataset = []; //temporary container
            //populate dataset with object info
            for(var i = 0; i < 6; i++){
              dataset[i] = trackinfo[datanames[i]];
            }

            var greyrects = [0, 1, 2, 3, 4, 5];

            var rectHeight = h / dataset.length; //of border rect

            var xScale = d3.scaleLinear()
                .domain([0, 1])
                .range([barBorder, w - (barBorder * 2)]); //starts at 100 to allow space for names

            var svg = d3.select("body")
                  .append("svg")
                  .attr("width", w)
                  .attr("height", h);

            var background = svg.append("rect")
              .attr("width", "100%")
              .attr("height", "100%")
              .attr("fill", "white");

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
              .attr("width", w)
              .attr("height", function(d, i) {
                return (rectHeight) - barPadding;
              })
              .attr("fill", "rgb(220, 220, 220)");

              //xanex bars
            svg.selectAll("rect.bar")
               .data(dataset)
               .enter()
               .append("rect")
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
                    return w - (barBorder * 2);
                  }
               })
               .attr("height", rectHeight - (barBorder * 2) - barPadding)
               .attr("fill", function(d, i) {
                return "rgb("+ colorscheme[i] +")";
               });
               
            svg.selectAll("text")
               .data(dataset)
               .enter()
               .append("text")
               .text(function(d, i) {
                  if(i == 0){
                    return datanames[i] + " (" + Math.floor(d) + "%)";
                  }else if(i > 0 && i < 4){
                    return datanames[i] + " (" + Math.floor(d * 100) + "%)";
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
               //.attr("text-anchor", "middle")
               .attr("x", barBorder * 2)
               .attr("y", function(d, i) {
                  return i * rectHeight + (rectHeight / 2) ;
               })
               .attr("font-family", "sans-serif")
               .attr("font-size", "14px")
               .attr("fill", "white");

               //transitioning to a new dataset
               //button
               d3.select("p")
                .on("click", function() {

                  //for right now creates random sets of data
                    var dataset2 = [];
                    for (var i = 0; i < 6; i++) {
                                var newNumber = Math.random();
                                dataset2.push(newNumber);
                            }

                    svg.selectAll("rect.bar")
                        .data(dataset)
                        .transition()
                        .delay(function(d, i) {
                            return i * 100;
                        })
                        .duration(500)
                        .ease(d3.easeLinear)
                        .attr("width", function(d, i) {
                          if(i == 0){
                            return xScale(d/100);
                          }else if(i > 0 && i < 4){
                            return xScale(d);
                          }else{
                            return w - (barBorder * 2);
                          }
                       });

                    svg.selectAll("text")
                         .data(dataset)
                         .transition()
                         .text(function(d, i) {
                            if(i == 0){
                              return datanames[i] + " (" + Math.floor(d) + "%)";
                            }else if(i > 0 && i < 4){
                              return datanames[i] + " (" + Math.floor(d * 100) + "%)";
                            }else if(i == 4){
                              return "key: " + pitchclass[d];
                            }else if(i == 5){
                              if(d == 0){
                                return "minor";
                              }else{
                                return "major";
                              }
                            }
                         });

                });

        </script>
    </body>
</html>