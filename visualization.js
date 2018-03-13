    ////////////////////////////////////////////////
        // Embed code popup and copy to clipboard logic
        ///////////////////////////////////////////////.

        function copyTextToClipboard(text) {
            var textArea = document.createElement("textarea");
            textArea.style.position = 'fixed';
            textArea.style.top = 0;
            textArea.style.left = 0;
            textArea.style.width = '2em';
            textArea.style.height = '2em';
            textArea.style.padding = 0;
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';
            textArea.style.background = 'transparent';
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
            } catch (err) {
                console.log('Oops, unable to copy');
            }
            document.body.removeChild(textArea);
        }

        $('#copyURL').on('click touchstart', function () {
            copyTextToClipboard(window.location.href)
            $('#checkthis').attr('class', 'check');
            setTimeout("$('#checkthis').attr('class', 'hidden')", 1500);
        });

        $('#embedDialog').on('click touchstart', function () {
            copyTextToClipboard('<iframe src="' + window.location.href +
                '" style="width: 100%; height: 680px; border: 0px none;"></iframe>')
            $('#checkthat').attr('class', 'check');
            setTimeout("$('#checkthat').attr('class', 'hidden')", 1500);
        });




        /////////////////////
        // Begin Chart stuff
        /////////////////////

        var margin = {
                top: 10,
                right: 10,
                bottom: 10,
                left: 10
            },
            width = document.body.clientWidth - margin.left - margin.right,
            height = document.body.clientHeight - margin.top - margin.bottom;

        var tooltip = d3.select("body")
            .append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            //.style("z-index", "10")
            .style("opacity", 0);

        var format = d3.format(".3n")

        d3.csv("data/sankey-groups-committees.csv", function (error, csv) {

            /////////////////////////////
            // 0. Helper functions
            /////////////////////////////

            // URL key and value concatenation parse (for articles)
            function concatentateURLParameters() {
                var query = (window.location.search || '?').substr(1),
                    map = [];
                query.replace(/([^&=]+)=?([^&]*)(?:&+|$)/g, function (match, key, value) {
                    map.push(key + " " + value);
                });
                return map;
            }

            function label(nodes) {
                return nodes.name;
            }

            // Sort an array of objects naturally
            //Usage: unsortedArrayOfObjects.alphaNumObjectSort("name");
            //Test Case: var unsortedArrayOfObjects = [{name: "a1"}, {name: "a2"}, {name: "a3"}, {name: "a10"}, {name: "a5"}, {name: "a13"}, {name: "a20"}, {name: "a8"}, {name: "8b7uaf5q11"}];
            //Sorted: [{name: "8b7uaf5q11"}, {name: "a1"}, {name: "a2"}, {name: "a3"}, {name: "a5"}, {name: "a8"}, {name: "a10"}, {name: "a13"}, {name: "a20"}]

            // **Sorts in place**
            Array.prototype.alphaNumObjectSort = function (attribute, caseInsensitive) {
                for (var z = 0, t; t = this[z]; z++) {
                    this[z].sortArray = new Array();
                    var x = 0,
                        y = -1,
                        n = 0,
                        i, j;
                    while (i = (j = t[attribute].charAt(x++)).charCodeAt(0)) {
                        var m = (i == 46 || (i >= 48 && i <= 57));
                        if (m !== n) {
                            this[z].sortArray[++y] = "";
                            n = m;
                        }
                        this[z].sortArray[y] += j;
                    }
                }
                this.sort(function (a, b) {
                    for (var x = 0, aa, bb;
                        (aa = a.sortArray[x]) && (bb = b.sortArray[x]); x++) {
                        if (caseInsensitive) {
                            aa = aa.toLowerCase();
                            bb = bb.toLowerCase();
                        }
                        if (aa !== bb) {
                            var c = Number(aa),
                                d = Number(bb);
                            if (c == aa && d == bb) {
                                return c - d;
                            } else {
                                return (aa > bb) ? 1 : -1;
                            }
                        }
                    }
                    return a.sortArray.length - b.sortArray.length;
                });
                for (var z = 0; z < this.length; z++) {
                    // Here we're deleting the unused "sortArray" instead of joining the string parts
                    delete this[z]["sortArray"];
                }
            }

            // Defining collator for sorting array naturally (lot easier than
            // sorting an array of objects, see above)
            var collator = new Intl.Collator(undefined, {
                numeric: true,
                sensitivity: 'base'
            });


            /////////////////////////////////////////
            // 1. Data loading and checkbox rendering
            /////////////////////////////////////////

            // Building an array with target names
            var target_list = d3.map(csv, function (d) {
                return d.target;
            }).keys()

            // Sort target_list naturally
            target_list.sort(collator.compare);

            // Building the filter checkboxes
            d3.select("#filter")
                .selectAll("input")
                .data(target_list)
                .enter()
                .append("label")
                .append("input")
                .attr("type", "checkbox")
                .attr("class", "filter-check")
                .attr("value", function (d) {
                    return d
                })
                .attr("id", function (d) {
                    return d
                });

            d3.selectAll("label")
                .data(target_list)
                .attr("class", "checkbox")
                .append("text").text(function (d) {
                    return " " + d
                })

            // Parsing URL parameters
            // Look at the URL parameters and adjust the data accordingly
            var choices = concatentateURLParameters(window.location.href)

            // Bad URL parameter management (e.g. scrubbing .html?faultyValue=2345)
            choices = _.remove(choices, function (parameter) {
                return _.includes(target_list, parameter);
            })

            // var to tack behind the URL if needed
            var URL = choices.join('&').replace(/\s/g, "=")

            if (choices == undefined) {
                var choices = []
            } // if no parameters, change to empty array instead of undefined
            if (choices.length > 0) {
                // Set the URL in case the URL was messy
                window.history.pushState({
                    page: choices
                }, choices, window.location.pathname + "?" + URL);
                for (i = 0; i < choices.length; i++) {
                    document.getElementById(choices[i]).checked = true;
                }
                data = csv.filter(function (d, i) {
                    return _.includes(choices, d.target);
                });
            } else {
                // Set the URL in case the URL was messy
                window.history.pushState({
                    page: choices
                }, choices, window.location.pathname);
                data = csv;
            }


            ///////////////////////////////////////////////////////////////////////
            // Nodes and Links data structure, with sorting of sources and targets.
            // Sorts source by total score, sorts targets naturally
            // (e.g. Article 1, Article 2, Article 13)
            //////////////////////////////////////////////////////////////////////

            function nodesAndLinks() {

                // add sourceScoreTotal to each data point so we can sort on it
                var sourceScoreTotal = d3.nest()
                    .key(function (d) {
                        return d.source;
                    })
                    .rollup(function (v) {
                        return d3.sum(v, function (d) {
                            return d.Score;
                        });
                    })
                    .entries(data)
                    .map(function (group) {
                        return {
                            total_source: group.key,
                            total_score: group.values
                        }
                    });

                // merge the data and sourceScoreTotal arrays
                var merged = _.map(data, function (item) {
                    return _.assign(item, _.find(sourceScoreTotal, ['total_source', item.source]));
                });

                graph = {
                    "source_nodes": [],
                    "target_nodes": [],
                    "nodes": [],
                    "links": []
                };

                merged.forEach(function (d) {
                    graph.source_nodes.push({
                        "name": d.source,
                        "total_score": d.total_score
                    });
                    graph.target_nodes.push({
                        "name": d.target
                    });
                    graph.links.push({
                        "source": d.source,
                        "target": d.target,
                        "value": +d.value,
                        "score": +d['Score'],
                        "total_score": +d.total_score,
                        "full_source_name": d.full_source_name,
                        "full_target_name": d.full_target_name
                    });
                });

                // Sort All The Things!
                graph.target_nodes.alphaNumObjectSort("name") // natural sort on name
                graph.source_nodes.sort(function (a, b) {
                    return b.total_score - a.total_score;
                }); // good ol' fashioned sort on total score


                // Allow me to inelegantly push down imco, itre and cult to the bottom
                // of the source_nodes, because they're not really political groups

                var committee_array = ['IMCO', 'ITRE', 'CULT']

                committee_array.forEach(function (committee, index) {
                    var count = 0
                    graph.source_nodes.forEach(function (node, index) {
                        if (node.name == committee) {
                            count++
                        }
                    })
                    var index = graph.source_nodes.map(function (a) {
                        return a.name
                    }).indexOf(committee)

                    // This pushes down the element at the found index and repeats until
                    // all elements with the given name are at the bottom
                    for (i = 0; i < count; i++) {
                        graph.source_nodes.push(graph.source_nodes.splice(index, 1)[0])
                    }
                })


                // Putting all data together...

                graph.nodes = graph.source_nodes.concat(graph.target_nodes) // concatenate the source and target arrays

                // return only the distinct nodes
                graph.nodes = d3.keys(d3.nest()
                    .key(function (d) {
                        return d.name;
                    })
                    .map(graph.nodes));

                // loop through each link replacing text with index
                graph.links.forEach(function (d, i) {
                    graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
                    graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
                });

                // now loop through each nodes to make nodes an array of objects
                // rather than an array of strings

                graph.nodes.forEach(function (d, i) {
                    graph.nodes[i] = {
                        "name": d
                    };
                });
            };

            nodesAndLinks(); // Run function defined above


            ///////////////////////
            // Building the chart
            ///////////////////////


            var chart = d3.select("#chart").append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .call(responsivefy)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
              .attr("width", width)
                .attr("height", height - (8 * (margin.top)))
                .chart("Sankey.Path");

            var quant = d3.scale.quantile().domain(data.map(function (d) {
                return +d.Score
            })).range(['#DD412B', '#F29055', '#FDE282', '#D7F281', '#8BD154', '#489B4C']);


            // add the link titles and color the links with quant scale above
            chart
                .name(label) // node names
                // .colorNodes("lightgrey")
                .colorNodes(function (name, node, link) {
                    if (node.name == "IMCO" || node.name == "ITRE" || node.name == "CULT") {
                        return "grey"
                    } else {
                        return "lightgrey"
                    }
                })
                .colorLinks(function (d) {
                    return quant(d.score);
                })
                .nodeWidth(10) // width of node
                .nodePadding(9) // vertical space between nodes
                .spread(true) // whether to spread nodes vertically after layout
                .iterations(0) // # of layout iterations
                .draw(graph);

            //////////////////////////////////////
            // Tooltip and other mouseover stuff
            //////////////////////////////////////

            chart.on('node:mouseover', function (node) {

                // adjusted this magic number to avoid menu collision
                if (d3.event.pageY > (height - 350)) {
                    // var yvar = -80;
                    var yvar = -260;
                } else {
                    var yvar = 0;
                };

                function compare(a, b) {
                    if (a.value < b.value)
                        return 1;
                    if (a.value > b.value)
                        return -1;
                    return 0;
                };

                if (d3.event.pageX < window.innerWidth / 2) {
                    tooltip.html("");
                    tooltip.append("p").style("font-size", "15px").attr("class", "tooltip_body")
                        .text(node.sourceLinks[0].full_source_name);
                    tooltip.append("hr").attr("class", "tooltip_body")
                    for (i = 0; i < node.sourceLinks.length; i++) {
                        tooltip.append("p").attr("class", "tooltip_body")
                            // .text(node.sourceLinks[i].target.name + " (" + node.sourceLinks[i].target.value + " Amendments) → " + node.sourceLinks[i].score);
                            .text(node.sourceLinks[i].target.name + " → " + node.sourceLinks[i].score);
                    } // end for loop
                    tooltip.append("hr").attr("class", "tooltip_body")
                    tooltip.append("p").attr("class", "tooltip_body")
                        .text("Total Score: " + format(node.sourceLinks[0].total_score))
                }

                // Sort the targetlinks by score
                node.targetLinks.sort(function (a, b) {
                    return b.score - a.score;
                });

                if (d3.event.pageX > window.innerWidth / 2) {
                    tooltip.html("");
                    tooltip.append("p").style("font-size", "15px").attr("class", "tooltip_body")
                        .text(node.targetLinks[0].full_target_name);
                    tooltip.append("hr").attr("class", "tooltip_body")
                    for (i = 0; i < node.targetLinks.length; i++) {
                        tooltip.append("p").attr("class", "tooltip_body")
                            .text(node.targetLinks[i].source.name + " → " + node.targetLinks[i].score);
                    } // end for loop
                    tooltip.append("hr").attr("class", "tooltip_body")
                    tooltip.append("p").attr("class", "tooltip_body")
                        .text("Total Score: " + format(node.targetLinks[0].total_score))
                }

                tooltip.transition()
                    .duration(100)
                    .style("opacity", .9)

                // return tooltip.style("width", document.body.clientWidth * 3 / 7 + "px").style("top", d3.event
                //     .pageY + yvar + "px");

                return tooltip.style("left", (window.innerWidth / 2) - 100 + "px").style("top", 100 + "px");


            })
;

            chart.on('node:mouseout', function (node) {
                tooltip.transition()
                    .duration(100)
                    .style("opacity", 0)
            });





            ///////////////////////////////////
            // Update chart on checkbox change
            //////////////////////////////////
            var checkBox = d3.selectAll(".filter-check")
            checkBox.on("change", function () {

                ////////////////////////////
                // Manage data and URL state
                ////////////////////////////

                // When checkbox changes, refresh choices array with checked values
                var choices = []
                var checkboxes = document.querySelectorAll('input[type=checkbox]:checked')
                for (var i = 0; i < checkboxes.length; i++) {
                    choices.push(checkboxes[i].value)
                }
                // feeding data filtered from choices array
                if (choices.length > 0) {
                    data = csv.filter(function (d, i) {
                        return _.includes(choices, d.target);
                    });
                } else {
                    data = csv; // so that no boxes checked shows all data
                }
                // update url with help of new choices array
                var URL = choices.join('&').replace(/\s/g, "=")
                if (choices.length > 0) {
                    window.history.pushState({
                        page: choices
                    }, choices, window.location.pathname + "?" + URL);
                }
                // remove ? at end of URL if checkboxes are empty again
                else {
                    window.history.pushState({
                        page: choices
                    }, choices, window.location.pathname);
                }

                /////////////////////////////////////////////////////////////////////
                // Rebuild Nodes and Links data structure with new data from checkboxes
                /////////////////////////////////////////////////////////////////////

                nodesAndLinks();


                ///////////////////////
                // Building the chart
                ///////////////////////

                var score_list_data = data.map(function (d) {
                    return +d.Score
                })

                chart
                    .name(label) // node names
                    .colorNodes(function (name, node, link) {
                        return "IMCO" == node.name  || "ITRE" == node.name || "CULT" == node.name ? "grey" : "lightgrey" })
                    .colorLinks(function (d) {
                        return quant(d.score);
                    })
                    .nodeWidth(10) // width of node
                    .nodePadding(8) // vertical space between nodes
                    .spread(true) // whether to spread nodes vertically after layout
                    .iterations(0) // # of layout iterations
                    .draw(graph);

            }); ////////////// //////////////////////////
            // End on checkbox change update function
            /////////////////////////////////////////







            ///////////////////////////////
            // Making the chart responsive
            ///////////////////////////////

            function responsivefy(svg) {
                var container = d3.select(svg.node().parentNode),
                    width = parseInt(svg.style("width")),
                    height = parseInt(svg.style("height")),
                    aspect = width / height;

                svg.attr("viewBox", "0 0 " + width + " " + height)
                    .attr("perserveAspectRatio", "xMinYMid")
                    .call(resize);

                d3.select(window).on("resize." + container.attr("#graphic"), resize);

                function resize() {
                    var targetWidth = parseInt(container.style("width"));
                    svg.attr("width", targetWidth);
                    svg.attr("height", Math.round(targetWidth / aspect));
                }
            }


        });