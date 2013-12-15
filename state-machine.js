/*jshint laxbreak:true, nonew:false, asi:true */
/*global Raphael */

"use strict"

var icons = {
    plus: 'M25.979,12.896 19.312,12.896 19.312,6.229 12.647,6.229 12.647,12.896 5.979,12.896 5.979,19.562 12.647,19.562 12.647,26.229 19.312,26.229 19.312,19.562 25.979,19.562z',
    chain: 'M16.45,18.085l-2.47,2.471c0.054,1.023-0.297,2.062-1.078,2.846c-1.465,1.459-3.837,1.459-5.302-0.002c-1.461-1.465-1.46-3.836-0.001-5.301c0.783-0.781,1.824-1.131,2.847-1.078l2.469-2.469c-2.463-1.057-5.425-0.586-7.438,1.426c-2.634,2.637-2.636,6.907,0,9.545c2.638,2.637,6.909,2.635,9.545,0l0.001,0.002C17.033,23.511,17.506,20.548,16.45,18.085zM14.552,12.915l2.467-2.469c-0.053-1.023,0.297-2.062,1.078-2.848C19.564,6.139,21.934,6.137,23.4,7.6c1.462,1.465,1.462,3.837,0,5.301c-0.783,0.783-1.822,1.132-2.846,1.079l-2.469,2.468c2.463,1.057,5.424,0.584,7.438-1.424c2.634-2.639,2.633-6.91,0-9.546c-2.639-2.636-6.91-2.637-9.545-0.001C13.967,7.489,13.495,10.451,14.552,12.915zM18.152,10.727l-7.424,7.426c-0.585,0.584-0.587,1.535,0,2.121c0.585,0.584,1.536,0.584,2.121-0.002l7.425-7.424c0.584-0.586,0.584-1.535,0-2.121C19.687,10.141,18.736,10.142,18.152,10.727z',
    arrow: 'M5,-0 L14,7 L5,14 L5,9 L0,9 L0,5 L5,5 L5,-0 z',
    close: 'M11.3,0 L14,2.7 L9.7,7 L14,11.3 L11.3,14 L7,9.7 L2.7,14 L0,11.3 L4.3,7 L0,2.7 L2.7,0 L7,4.3 z',
    lock: 'M5,0 C6.817,0.019 8.419,1.227 8.874,3 C8.959,3.33 8.991,3.661 9,4 L9,7 L10,7 L10,14 L0,14 L0,7 L1,7 L1,4 C1.008,2.476 1.889,1.057 3.266,0.394 C3.766,0.154 4.247,0.061 4.794,0.005 z M5,2 C4.271,2.013 3.592,2.399 3.241,3.047 C3.078,3.348 3.017,3.662 3,4 L3,7 L7,7 L7,4 C6.987,3.271 6.601,2.592 5.953,2.241 C5.642,2.073 5.548,2.08 5.204,2.01 z'
};

function makeIcon(path, x, y, w, h){
    var icon = placeIcon(paper.path(path), x, y, w, h);
    return icon;
}

function placeIcon(icon, x, y, w, h){
    var bounds = icon.getBBox(),
        t = "T" + (x - bounds.x) + "," + (y - bounds.y);
    if( w && h ){
        t += ",s" + Math.min(w/bounds.width, h/bounds.height);
    }
    // console.log(bounds, t);
    icon.transform(t);
    return icon;
}

function forAll(array, fn){
    for( var idx = 0; idx < array.length; idx++ ){
        fn.call(array[idx], idx);
    }
}

function forAllSatisfying(array, filterFn, fn){
    var a = [];
    forAll(array, function(idx){
        if( filterFn.call(this, idx) ){
            a.push(this);
        }
    });
    forAll(a, fn);
}

function State(name, x, y, locked){
    if( !State.all ){
        State.all = [];
    }
    State.all.push(this);
    this.name = name;
    this.x = x || 200;
    this.y = y || 200;
    this.locked = !!locked;
    this.rect = paper.rect(this.x,this.y,100,60,6);
    this.rect._state = this;
    this.caption = paper.text(this.x + 50, this.y + 8, this.name)
                        .attr('font-family', "Helvetica,Arial,Sans-serif")
                        .attr('font-size','13px');
    this.makeLink();
    this.makeLock();
    
    this.caption.node.classList.add('state-caption');
    this.rect.node.classList.add('state');
    
    var self = this;
    // TODO: change so that a placeholder is dragged ???
    this.rect.drag(function(dx,dy,x,y,evt){
        self.move( x - self._dx, y - self._dy );
    },function(x,y,evt){
        self._dx = x - self.x;
        self._dy = y - self.y;
    });
    
    this.rect.dblclick( function(){
        self.edit();
    });
    
    return this;
}

State.prototype.move = function(x,y){
    if( this.locked ){
        return;
    }
    this.x = x;
    this.y = y;
    this.rect.attr('x',x)
             .attr('y',y);
    this.caption.attr('x',x+50)
                .attr('y',y+8);
    this.makeLink();
    this.makeLock();
    
    var self = this;
    forAllSatisfying( Connection.all, function(){
        return this.fromState === self || this.toState === self;
    }, function(){
        this.update();
    });
};

State.prototype.makeLock = function(){
    if(this.lockButton){
        this.lockButton.remove();
    }
    var self = this;
    this.lockButton = makeIcon(icons.lock, this.x + 4, this.y + 42, 10, 14)
                            .mouseup(function(){
                                self.locked = !self.locked;
                                self.makeLock();
                            });
    
    this.lockButton.node.classList.add('state-lock');
    if( this.locked ){
        this.lockButton.node.classList.add('on');
    }
};

State.prototype.makeLink = function(){
    var self = this;
    function start(x,y,evt){
        self._tempConnection = new Connection(self);
    }
    function move(dx,dy,x,y,evt){
        self._tempConnection.drawTempLineTo(x, y);
    }
    function end(){
        self._tempConnection.finalize();
        delete self._tempConnection;
    }
    
    if( self.link ){
        this.link.remove();
    }
    this.link = makeIcon(icons.arrow, this.x + 82, this.y + 42, 14, 14)
                        .drag(move,start,end);
                        
    this.link.node.classList.add('state-link');
};

State.prototype.edit = function(){
    var name = prompt("Enter new name for state:", this.name);
    if(name){
        this.name = name;
        this.caption.attr('text', name);
    }
};

function Connection(fromState, toState, name){
    if(!Connection.all){
        Connection.all = [];
    }
    Connection.all.push(this);
    this.fromState = fromState;
    this.toState = toState;
    this.name = name;
    
    // setup path
    this.path = paper.path("");
    this.path.node.classList.add('connection');
    this.path._connection = this;
    var self = this;
    this.path.dblclick(function(){
        self.edit();
    });
    
    // setup caption    
    this.caption = paper.text(-1000, -1000, this.name)
                        .attr('font-family', "Helvetica,Arial,Sans-serif")
                        .attr('font-size','13px');
    this.caption.node.classList.add('connection-caption');
    
    if( toState && name ){
        this.update();
    }
    
    return this;
}

Connection.remove = function(what){
    for( var i = this.all.length - 1; i >= 0; i-- ){
        if( this.all[i] === what ){
            this.all.splice(i,1);
        }
    }
    what.path.remove();
    what.caption.remove();
};

Connection.prototype.drawTempLineTo = function(x, y){
    var bounds = this.fromState.rect.getBBox(),
        xc = bounds.x + bounds.width * 0.5,
        yc = bounds.y + bounds.height * 0.5,
        direction = (x - xc) > (y - yc) ? 'right' : 'down',
        x0 = direction === 'right' ? bounds.x2 : xc,
        y0 = direction === 'down' ? bounds.y2 : yc,
        p = connectingPath(x0, y0, x, y, direction);
    
    this._x = x;
    this._y = y;
    this.path.attr('path', p);
    
    // hide connection if we're inside the starting box
    if(this.fromState.rect.isPointInside(x,y)){
        this.path.hide();
    } else {
        this.path.show();
    }
    return this;
};

Connection.prototype.update = function(){
    var fromBounds = this.fromState.rect.getBBox(),
        toBounds = this.toState.rect.getBBox(),
        dx = toBounds.x - fromBounds.x,
        dy = toBounds.y - fromBounds.y,
        outDirection = dx > dy ? 'right' : 'down',
        inDirection = dx > dy ? 'left' : 'up',
        x0 = outDirection === 'right' ? fromBounds.x2 : fromBounds.x + fromBounds.width/2,
        y0 = outDirection === 'down' ? fromBounds.y2 : fromBounds.y + fromBounds.height/2,
        x1 = inDirection === 'left' ? toBounds.x : toBounds.x + toBounds.width/2,
        y1 = inDirection === 'up' ? toBounds.y : toBounds.y + toBounds.height/2,
        textLoc;
    
    this.path.attr('path', connectingPath(x0, y0, x1, y1, outDirection, inDirection));
    textLoc = this.path.getPointAtLength( this.path.getTotalLength() * 0.25 );
    // TODO might need to optimize setting text all the time
    this.caption.attr('x', textLoc.x).attr('y', textLoc.y).attr('text',this.name);
};

Connection.prototype.finalize = function(){
    var over = paper.getElementsByPoint(this._x, this._y);
    // reverse order so we find topmost first
    for( var i = over.length - 1; i >= 0; i-- ){
        var elt = over[i];
        if(elt._state && elt._state !== this.fromState){
            var name = prompt("Enter name for connection", this.fromState.name + ' to ' + elt._state.name);
            if( name ){
                this.name = name;
                this.toState = elt._state;
                this.update();
            }
            break;
        }
    }
    
    if( !this.toState ){
        Connection.remove(this);
    }
    return this;
};

Connection.prototype.edit = function(){
    var name = prompt("Enter new name for connection:", this.name);
    if( name ){
        this.name = name;
        this.update();
    }
};

function connectingPath(x0, y0, x1, y1, outDirection, inDirection){
    var p = inDirection
            ? 'M{0},{1} C{2},{3} {4},{5} {6},{7} M{8},{9} L{6},{7} L{10},{11}'
            : 'M{0},{1} C{2},{3} {4},{5} {6},{7}',
        x0h = x0, y0h = y0, x1h = x1, y1h = y1, // bezier handles
        ax = x1 - 5, ay = y1 - 5, bx = x1 - 5, by = y1 - 5; // arrowhead
    
    // outgoing
    switch(outDirection){
        case "down":
            y0h += 100;
            break;
        case "right":
            x0h += 100;
            break;
    }
    // incoming
    switch(inDirection){
        case "up":
            bx += 10;
            y1h -= 100;
            break;
        case "left":
            by += 10;
            x1h -= 100;
            break;
    }
    return Raphael.format(p,x0,y0,x0h,y0h,x1h,y1h,x1,y1,ax,ay,bx,by);
}

var paper = Raphael("flowchart", 800, 600);

// TODO constructor function State.make() that hides new
var start = new State("Unassigned", 30, 30, true);
var middle = new State("Under Review", 300, 200);
var review = new State("Internal Review", 600, 100);
var limbo = new State("Limbo", 250, 350);
var dead = new State("Dead", 200, 500);
var end = new State("Registered", 660, 500, true);

// TODO constructor function State.connect() that accepts names
new Connection(start,middle,"Assigned to Attorney");
new Connection(middle,limbo,"Rejected");
new Connection(limbo,dead,"After 6 Months");
new Connection(limbo,review,"Appeal");
new Connection(middle,end,"Accepted");

function newState(){
    var name = prompt("Name for new state","Untitled");
    if( name ){
        new State(name);
    }
}

// TODO work around / fix bug in raphaeljs with respect to view scaling and drag coordinates
// TODO panning the view
// TODO preserve (panned) center on zoom
function zoomView(scale){
    scale = 1.0 / (scale || 1.0);
    var w = 800 * scale,
        h = 600 * scale,
        x = (800 - w) * 0.5,
        y = (600 - h) * 0.5;
    paper._origin = {x: x, y: y};
    paper._scale = scale;
    paper.setViewBox(x,y,w,h);
}

zoomView(1.0);