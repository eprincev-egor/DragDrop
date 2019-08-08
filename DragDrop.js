"use strict";
import f from "funcs";
import $ from "jquery";
import Events from "events";
import "plugin-hasChild";


    var objs = {};
    // jQuery объекты, над которыми проходит курсор
    var overElems = [];
    var index = 0;
    
    class StartEvent {
        constructor(e, $elem, dragDrop) {
            this._data = {};
            this.point = f.getMousePoint(e);
            this.x = this.point.x;
            this.y = this.point.y;
            this.$elem = $elem;
            this.target = e.target;
            this.$target = $(e.target);
            this.$event = e;
            this._moved = false;
            this.event = e.originalEvent;
            this.dragDrop = dragDrop;
            
            $elem.data("plugin.DragDrop." + dragDrop.id + "." + f.getClassName(this), this);
        }
        
        get(key) {
            return this._data[key];
        }
        
        set(key, value) {
            this._data[key] = value;
        }
        
        cancel() {
            this.dragDrop._cancel(this.$elem);
        }
    }
    
    class MoveEvent extends StartEvent {
        constructor(e, $elem, dragDrop) {
            super(e, $elem, dragDrop);
            
            this.start = $elem.data("plugin.DragDrop."+ dragDrop.id +".StartEvent");
            this.firstMove = $elem.data("plugin.DragDrop."+ dragDrop.id +".FirstMoveEvent");
            
            this.dx = this.x - this.start.x;
            this.dy = this.y - this.start.y;
            this._moved = true;
    
            if ( this.dx !== 0 || this.dy !== 0 ) {
                this.start._moved = true;
            }
        }
    }
    
    class EndEvent extends MoveEvent {}
    class FirstMoveEvent extends MoveEvent {}
    
    class DragOverEvent extends StartEvent {
        constructor(e, $elem, dragDrop) {
            super(e, $elem, dragDrop);
            
            var activeDragDrops = getActiveDragDrops();
            var startDragDrop = activeDragDrops[0];
            var $startElem = startDragDrop._activeElems[0];
            
            this.start = $startElem.data("plugin.DragDrop." + startDragDrop.id + ".StartEvent");
        }
    }
    
    class DragOutEvent extends DragOverEvent {}
    class DropEvent extends DragOverEvent {}
    class DropEndEvent extends MoveEvent {}
    
    // ===========
    
    class DragDrop extends Events{
        constructor() {
            super();
            
            this._elems = [];
            this._activeElems = [];
            this.id = ++index;
            objs[this.id] = this;
            
            // элемент, который перетаскиваем, 
            // он закрывает другие элементы, 
            // поэтому мы будем его скрывать
            this.$mover = null; 
        }
        
        // если вы хотите перетаскивать иконки с области на область,
        // то нужно передать элемент, который будете перетаскивать
        setMover($mover) {
            this.$mover = $mover;
        }
        
        addElem($el) {
            $el = f.checkElem($el);
            $el.data("plugin.DragDrop", this);
            this._elems.push($el);
        }
        
        _cancel($el) {
            for (var i=0, n=this._activeElems.length; i<n; i++) {
                if ( this._activeElems[i][0] != $el[0] ) {
                    continue;
                }
                this._activeElems.splice(i, 1);
                i--;
                n--;
            }
        }
        
        destroy() {
            for (var i=0, n=this._elems.length; i<n; i++) {
                this._elems[i].data("plugin.DragDrop."+ this.id +".StartEvent", null);
                this._elems[i].data("plugin.DragDrop."+ this.id +".MoveEvent", null);
                this._elems[i].data("plugin.DragDrop."+ this.id +".EndEvent", null);
                this._elems[i].data("plugin.DragDrop", null);
            }
            delete objs[this.id];
            this.clearEvents();
        }
        
        _document_onStart(e) {
            var target = e.target,
                $elem, elem;
    
            for (var i=0, n=this._elems.length; i<n; i++) {
                $elem = this._elems[i];
                elem = $elem[0];
    
                if ( !$elem.hasChild(target) && elem != target ) {
                    continue;
                }
                
                this.start(e, $elem);
            }
        }
        
        _document_onMove(e) {
            if ( this._activeElems.length === 0 ) {
                return;
            }
    
            var $elem, elem;
            for (var i=0, n=this._activeElems.length; i<n; i++) {
                $elem = this._activeElems[i];
                elem = $elem[0];
                
                this.move(e, $elem);
            }
        }
        
        _document_onEnd(e) {
            if ( this._activeElems.length === 0 ) {
                return;
            }
    
            var $elem;
            var elems = this._activeElems.slice();
            for (var i=0, n=elems.length; i<n; i++) {
                $elem = elems[i];
    
                this.end(e, $elem);
            }
            this._activeElems = [];
        }
        
        _hasActiveElem() {
            return this._activeElems.length > 0;
        }
        
        start(e, $elem, options) {
            var startEvent = new StartEvent(e, $elem, this);
            this._activeElems.push($elem);
            this.trigger("start", startEvent, options);
        }
        
        move(e, $elem, options) {
            var moveEvent = new MoveEvent(e, $elem, this);
            if ( !moveEvent.start._firstMove ) {
                moveEvent.start._firstMove = new FirstMoveEvent(e, $elem, this);
                moveEvent.firstMove = moveEvent.start._firstMove;
                this.trigger("firstMove", moveEvent.start._firstMove, options);
            }
            this.trigger("move", moveEvent, options);
        }
        
        end(e, $elem, options) {
            var endEvent = new EndEvent(e, $elem, this);
            this.trigger("end", endEvent, options);
            this.$mover = null;
            
            for (var i=0, n=this._activeElems.length; i<n; i++) {
                if ( this._activeElems[i][0] == $elem[0] ) {
                    this._activeElems.splice(i, 1);
                    n--;
                    i--;
                }
            }
        }
        
        dragover(e, $elem, options) {
            var dragOverEvent = new DragOverEvent(e, $elem, this);
            this.trigger("dragover", dragOverEvent, options);
        }
        
        dragout(e, $elem, options) {
            var dragOutEvent = new DragOutEvent(e, $elem, this);
            this.trigger("dragout", dragOutEvent, options);
        }
        
        createDropEvent(e, $elem) {
            return new DropEvent(e, $elem, this);
        }
        
        decorateDrop(dropEvent, $elem) {
            this.trigger("decorateDrop", dropEvent);
        }
        
        drop(dropEvent) {
            this.trigger("drop", dropEvent);
        }
        
        dropEnd(e, $elem) {
            var dropEndEvent = new DropEndEvent(e, $elem, this);
            this.trigger("dropEnd", dropEndEvent);
        }
        
        // самое обычное перемещение элемента
        movingElem($elem) {
            this.addElem($elem);
            
            this.on("start", function(e) {
                var x = parseInt( $elem.css("left") ),
                    y = parseInt( $elem.css("top") );
                
                e.set("x", x);
                e.set("y", y);
            });
            
            this.on("move", function(e) {
                $elem.css({
                    top: e.start.get("y") + e.dy + "px",
                    left: e.start.get("x") + e.dx + "px"
                });
            });
        }
        
        // перетаскивание активно?
        hadDrag() {
            return this._activeElems.length > 0;
        }
    }
    
    // ============
    // helpers::
    function getActiveDragDrops() {
        var activeDragDrops = [], dragDrop;
        var id;
        for (id in objs) {
            dragDrop = objs[id];
            
            if ( dragDrop._hasActiveElem() && "decorateDrop" in dragDrop._events ) {
                activeDragDrops.push(dragDrop);
            }
        }
        return activeDragDrops;
    }
    
    function hideMovers(activeDragDrops) {
        activeDragDrops.forEach(function(dragDrop) {
            var $mover = dragDrop.$mover;
            if ( !$mover ) {
                return;
            }
            
            var display = $mover.css("display");
            var style = $mover.attr("style");
            if ( /display\s*:/i.test(style) ) {
                dragDrop._prev_display = display;
            } else {
                dragDrop._prev_display = "";
            }
            $mover.css("display", "none");
        });
        
    }
    
    function showMovers(activeDragDrops) {
        activeDragDrops.forEach(function(dragDrop) {
            var $mover = dragDrop.$mover;
            if ( !$mover ) {
                return;
            }
            
            $mover.css("display", dragDrop._prev_display);
        });
    }
    
    // ============
    // global listners
    $(document).on("mousedown touchstart", function(e) {
        var hasActiveElem = false;
        if ( e.type == "mousedown" && e.which != 1 ) {
            return;
        }

        for (var id in objs) {
            objs[id]._document_onStart(e);
            if ( objs[id]._hasActiveElem() ) {
                hasActiveElem = true;
            }
        }

        if ( hasActiveElem ) {
            $(document.body).addClass("no-select");
        }
    });
    
    $(document).on("mousemove touchmove", function(e) {
        var newOvers = [];
        
        var dragDrop, id;
        for (id in objs) {
            dragDrop = objs[id];
            dragDrop._document_onMove(e);
        }
        
        var activeDragDrops = getActiveDragDrops();
        
        if ( !activeDragDrops.length ) {
            return;
        }
        
        hideMovers(activeDragDrops);
        var target = f.getCurrentTarget(e),
            $target = $(target);
        showMovers(activeDragDrops);
        
        overElems.forEach(function($elem) {
            var dragDrop = $elem.data("plugin.DragDrop");
            
            if ( $elem[0] != target && !$elem.hasChild($target) ) {
                dragDrop.dragout(e, $elem);
            } else {
                newOvers.push($elem);
            }
        });
        
        var $elem;
        for (id in objs) {
            dragDrop = objs[id];
            if ( 
                "*" in dragDrop._events ||
                "dragover" in dragDrop._events ||
                "dragout" in dragDrop._events 
            ) {
                for(var i=0, n=dragDrop._elems.length; i<n; i++) {
                    $elem = dragDrop._elems[0];
                    
                    if ( 
                         overElems.indexOf($elem) == -1 && 
                         ($elem[0] == target || $elem.hasChild($target)) 
                    ) {
                        newOvers.push($elem);
                        dragDrop.dragover(e, $elem);
                    }
                }
            }
        }
        
        overElems = newOvers;
    });
    
export default DragDrop;
