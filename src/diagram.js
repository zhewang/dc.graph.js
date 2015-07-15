/**
## Diagram

The dc_graph.diagram is a dc.js-compatible network visualization component. It registers in
the dc.js chart registry and its nodes and edges are generated from crossfilter groups. It
logically derives from
[the dc.js Base Mixin](https://github.com/dc-js/dc.js/blob/master/web/docs/api-latest.md#base-mixin),
but it does not physically derive from it since so much is different about network visualization
versus conventional charting.
**/
dc_graph.diagram = function (parent, chartGroup) {
    // different enough from regular dc charts that we don't use bases
    var _chart = {};
    var _svg = null, _g = null, _nodeLayer = null, _edgeLayer = null;
    var _d3cola = null;
    var DEFAULT_NODE_RADIUS = 25;
    var _dispatch = d3.dispatch('end');

    _chart.root = property(null);
    _chart.width = property(200);
    _chart.height = property(200);
    _chart.nodeDimension = property();
    _chart.nodeGroup = property();
    _chart.edgeDimension = property();
    _chart.edgeGroup = property();
    _chart.nodeKeyAccessor = property(function(kv) {
        return kv.key;
    });
    _chart.edgeKeyAccessor = property(function(kv) {
        return kv.key;
    });
    _chart.sourceAccessor = property();
    _chart.targetAccessor = property();

    _chart.nodeRadiusAccessor = property(function() {
        return DEFAULT_NODE_RADIUS;
    });
    _chart.nodeStrokeWidthAccessor = property(function() {
        return '1';
    });
    _chart.nodeStrokeAccessor = property(function() {
        return 'black';
    });
    _chart.nodeFillAccessor = property(function() {
        return 'white';
    });
    _chart.nodePadding = property(6);
    _chart.nodeLabelAccessor = property(function(kv) {
        return kv.value.label || kv.value.name;
    });

    _chart.edgeStrokeAccessor = property(function() {
        return 'black';
    });
    _chart.edgeStrokeWidthAccessor = property(function() {
        return '1';
    });
    _chart.edgeOpacityAccessor = property(function() {
        return '1';
    });

    _chart.transitionDuration = property(500);
    _chart.constrain = property(function(nodes, edges) {
        return [];
    });
    _chart.initLayoutOnRedraw = property(false);
    _chart.modLayout = property(function(layout) {});
    _chart.showLayoutSteps = property(true);

    function initLayout() {
        _d3cola = cola.d3adaptor()
            .avoidOverlaps(true)
            .size([_chart.width(), _chart.height()]);
        if(_chart.modLayout())
            _chart.modLayout()(_d3cola);
    }

    function original(accessor) {
        return function(x) {
            return accessor(x.orig);
        };
    }

    var _nodes = {}, _edges = {};

    _chart.redraw = function () {
        var nodes = _chart.nodeGroup().all();
        var edges = _chart.edgeGroup().all();
        if(_d3cola)
            _d3cola.stop();

        var key_index_map = nodes.reduce(function(result, value, index) {
            result[_chart.nodeKeyAccessor()(value)] = index;
            return result;
        }, {});
        var nodes1 = nodes.map(function(v) {
            if(!_nodes[v.key]) _nodes[v.key] = {};
            var v1 = _nodes[v.key];
            v1.orig = v;
            v1.width = _chart.nodeRadiusAccessor()(v)*2 + _chart.nodePadding();
            v1.height = _chart.nodeRadiusAccessor()(v)*2 + _chart.nodePadding();
            return v1;
        });
        var edges1 = edges.map(function(e) {
            if(!_edges[e.key]) _edges[e.key] = {};
            var e1 = _edges[e.key];
            e1.orig =  e;
            e1.source = key_index_map[_chart.sourceAccessor()(e)];
            e1.target = key_index_map[_chart.targetAccessor()(e)];
            return e1;
        }).filter(function(e) {
            return e.source!==undefined && e.target!==undefined;
        });

        // console.log("diagram.redraw " + nodes1.length + ',' + edges1.length);

        var edge = _edgeLayer.selectAll('.edge')
                .data(edges1, original(_chart.edgeKeyAccessor()));
        var edgeEnter = edge.enter().append('svg:path')
                .attr('class', 'edge')
                .attr('stroke', original(_chart.edgeStrokeAccessor()))
                .attr('stroke-width', original(_chart.edgeStrokeWidthAccessor()))
                .attr('opacity', original(_chart.edgeOpacityAccessor()));

        var edgeExit = edge.exit();

        edgeExit.remove();

        var node = _nodeLayer.selectAll('.node')
                .data(nodes1, original(_chart.nodeKeyAccessor()));
        var nodeEnter = node.enter().append('g')
                .attr('class', 'node');
        nodeEnter.append('circle');
        nodeEnter.append('text')
            .attr('class', 'nodelabel');
        node.select('circle')
            .attr('r', original(_chart.nodeRadiusAccessor()))
            .attr('stroke', original(_chart.nodeStrokeAccessor()))
            .attr('stroke-width', original(_chart.nodeStrokeWidthAccessor()))
            .attr('fill', original(_chart.nodeFillAccessor()));
        node.select('text')
            .text(original(_chart.nodeLabelAccessor()));
        var nodeExit = node.exit();
        var constraints = _chart.constrain()(nodes1, edges1);
        nodeExit.remove();

        if(_chart.initLayoutOnRedraw())
            initLayout();

        _d3cola.on('tick', _chart.showLayoutSteps() ? function() {
            draw(node, edge);
        } : null);

        _d3cola.nodes(nodes1)
            .links(edges1)
            .constraints(constraints)
            .start(10,20,20)
            .on('end', function() {
                if(!_chart.showLayoutSteps())
                    draw(node,edge);
                _dispatch.end();
            });
        return this;
    };

    function draw(node, edge) {
        edge.attr("d", function (d) {
            var deltaX = d.target.x - d.source.x,
                deltaY = d.target.y - d.source.y,
                dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
                normX = deltaX / dist,
                normY = deltaY / dist,
                sourcePadding = _chart.nodeRadiusAccessor()(d.source.orig)-1,
                targetPadding = _chart.nodeRadiusAccessor()(d.target.orig)-1,
                sourceX = d.source.x + (sourcePadding * normX),
                sourceY = d.source.y + (sourcePadding * normY),
                targetX = d.target.x - (targetPadding * normX),
                targetY = d.target.y - (targetPadding * normY);
            return 'M' + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
        }).attr("width", function (d) {
            var dx = d.source.x - d.target.x, dy = d.source.y - d.target.y;
            return Math.sqrt(dx * dx + dy * dy);
        });

        node.attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        });
    }

    _chart.render = function () {
        if(!_chart.initLayoutOnRedraw())
            initLayout();
        _chart.resetSvg();
        _g = _svg.append('g');
        _edgeLayer = _g.append('g');
        _nodeLayer = _g.append('g');
        return _chart.redraw();
    };

    _chart.on = function(event, f) {
        _dispatch.on(event, f);
        return this;
    };

    // copied from dc's baseMixin because there is a lot of stuff we don't
    // want from there (like dimension, group)
    _chart.select = function (s) {
        return _chart.root().select(s);
    };

    _chart.resetSvg = function () {
        _chart.select('svg').remove();
        return generateSvg();
    };

    function generateSvg() {
        _svg = _chart.root().append('svg')
            .attr('width', _chart.width())
            .attr('height', _chart.height());
        return _svg;
    }

    _chart.root(d3.select(parent));

    dc.registerChart(_chart, chartGroup);
    return _chart;
};
