dc_graph.path_selector = function(parent, reader, pathsgroup, chartgroup) {
    var highlight_paths_group = dc_graph.register_highlight_paths_group(pathsgroup || 'highlight-paths-group');
    var root = d3.select(parent).append('svg');
    var paths_ = [];
    var hovered = null, selected = null;

    // unfortunately these functions are copied from dc_graph.highlight_paths
    function contains_path(paths) {
        return function(path) {
            return paths ? paths.indexOf(path)>=0 : false;
        };
    }

    function doesnt_contain_path(paths) {
        var cp = contains_path(paths);
        return function(path) {
            return !cp(path);
        };
    }

    function toggle_paths(pathsA, pathsB) {
        if(!pathsA)
            return pathsB;
        else if(!pathsB)
            return pathsA;
        if(pathsB.every(contains_path(pathsA)))
            return pathsA.filter(doesnt_contain_path(pathsB));
        else return pathsA.concat(pathsB.filter(doesnt_contain_path(pathsA)));
    }

    // this should use the whole cascading architecture
    // and allow customization rather than hardcoding everything
    // in fact, you can't even reliably overlap attributes without that (so we don't)

    function draw_paths(diagram, paths) {
        if(paths.length === 0) return;
        // set the height of SVG accordingly
        root.attr('height', 20*(paths.length+1));

        var pathlist = root.selectAll('g.path-selector').data(paths);
        pathlist.enter()
          .append('g')
          .attr('class', 'path-selector')
          .attr("transform", function(path, i) { return "translate(0, " + i*20 + ")"; })
          .on('mouseover', function(p) {
              highlight_paths_group.hover_changed([p]);
          })
          .on('mouseout', function(p) {
              highlight_paths_group.hover_changed(null);
          })
          .on('click', function(p) {
              highlight_paths_group.select_changed(toggle_paths(selected, [p]));
          })
          .each(function(path, i) {
            var nodes = path.element_list.filter(function(d) { return d.element_type === 'node'; });
            var space = 30;
            var radius = 8;
            // line
            var line = d3.select(this).append('line');
            line.attr('x1', space)
              .attr('y1', radius+1)
              .attr('x2', space*nodes.length)
              .attr('y2', radius+1)
              .attr('stroke-width', 5)
              .attr('stroke', '#bdbdbd');

            // dots
            var path = d3.select(this).selectAll('circle').data(nodes);
            path.enter()
              .append('circle')
              .attr('cx', function(d, i) { return space*(i+1); })
              .attr('cy', radius+1)
              .attr('r', radius)
              .attr('fill', function(d) {
                // TODO path_selector shouldn't know the data structure of orignal node objects
                var regeneratedNode = {key:d.property_map.ecomp_uid, value:d.property_map};
                return diagram.nodeStroke()(regeneratedNode);
              });
          });
        pathlist.exit().transition(1000).attr('opacity', 0).remove();

        //var p2 = root.selectAll('span.path-selector').data(paths);
        //p2.enter()
            //.append('span')
            //.attr('class', 'path-selector')
            //.style({
                //'border-width': '1px',
                //'border-style': 'solid',
                //'border-color': 'grey',
                //'border-radius': '4px',
                //'display': 'inline-block',
                //padding: '4px',
                //cursor: 'pointer',
                //margin: '5px'
            //});
        //p2.exit().transition(1000).attr('opacity', 0).remove();
        //p2.text(function(p, i) {
            //return 'path ' + (i+1) + ' (' + reader.elementList.eval(p).length + ')';
        //})
            //.on('mouseover', function(p) {
                //highlight_paths_group.hover_changed([p]);
            //})
            //.on('mouseout', function(p) {
                //highlight_paths_group.hover_changed(null);
            //})
            //.on('click', function(p) {
                //highlight_paths_group.select_changed(toggle_paths(selected, [p]));
            //});
        //var no_paths = root.selectAll('span.no-paths').data(paths.length === 0 ? [0] : []);
        //no_paths.exit().remove();
        //no_paths.enter()
          //.append('span')
            //.attr('class', 'no-paths');
        //no_paths
            //.classed('error', !!selector.error_text())
            //.text(selector.error_text() || (selector.queried() ? selector.zero_text() : selector.default_text()));
    }

    function draw_hovered() {
        var is_hovered = contains_path(hovered);
        root.selectAll('span.path-selector')
            .style({
                'border-color': function(p, i) { return is_hovered(p) ? '#e41a1c' : 'grey'; },
                'border-width': function(p, i) { return (is_hovered(p) ? 2 : 1) + 'px'; },
                padding: function(p, i) { return (is_hovered(p) ? 3 : 4) + 'px'; }
            });
    }

    function draw_selected() {
        var is_selected = contains_path(selected);
        root.selectAll('span.path-selector')
            .style({
                'background-color': function(p, i) { return is_selected(p) ? '#1c1ae6' : 'white'; },
                'color': function(p, i) { return is_selected(p) ? 'white' : 'black'; }
            });
    }

    highlight_paths_group
        .on('paths_changed.selector', function(nop, eop, paths) {
            hovered = selected = null;
            paths_ = paths;
            selector.redraw();
        })
        .on('hover_changed.selector', function(hpaths) {
            hovered = hpaths;
            draw_hovered();
        })
        .on('select_changed.selector', function(spaths) {
            selected = spaths;
            draw_selected();
        });
    var selector = {
        default_text: property('Nothing here'),
        zero_text: property('No paths'),
        error_text: property(null),
        queried: property(false),
        redraw: function() {
            draw_paths(diagram, paths_);
            draw_hovered();
            draw_selected();
        },
        render: function() {
            this.redraw();
            return this;
        }
    };
    dc.registerChart(selector, chartgroup);
    return selector;
};
