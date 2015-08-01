// (c) 2015 Benjamin Crowell, GPL v3
// Uses sample code by Tom Campbell, http://htmlcheats.com/html/resize-the-html5-canvas-dyamically/

// Populate the canvases with IDs x_canvas, v_canvas, and a_canvas with graphs of position, velocity, and acceleration
// measuring the motion of the mouse.

(function() {

  var fake_data = false;

  function die(message) {
    throw new Error(message);
  }

  // if invoked with url like velocity.html?foo, we use the query string foo for options
  var url = window.location.href;
  var query = "";
  var match = url.match(/\?(.*)$/);
  if (match!==null) {query=match[1];}
  //console.log("query="+query);
  if (query!="") {
    var options = query.split(",");
    for (var i=0; i<options.length; i++) {
      var o = options[i];
      var match = o.match(/(.*)=(.*)/);
      var option = '';
      var value = '';
      if (match!==null) {option=match[1]; value=match[2];} else {option=o}
      var recognized = false;
      if (option=="noa") { // remove the acceleration graph
        var a_canvas = document.getElementById('a_canvas');
        a_canvas.parentNode.removeChild(a_canvas);
        recognized = true;
      }
      if (option=="fake") { // use fake data for testing
        fake_data = true;
        fake_data_type = value;
        if (value=="") {fake_data_type="sine"} // can also be 1, x, x2
        recognized = true;
      }
      if (option=="noise") {
        noise = parseFloat(value);
        recognized = true;
      }
      if (recognized) {  
        log_option(option,value);
      }
      else {
        console.log("illegal option: "+o);
      }
    }
  }

  function log_option(option,value) {
    if (value!="") {
      console.log("option "+option+" set to "+value);
    }
    else {
      console.log("option "+option+" set");
    }
  }

  function filled_array(size,fill_value) {
    // http://stackoverflow.com/a/13735425/1142217
    return Array.apply(null, Array(size)).map(Number.prototype.valueOf,fill_value);
  }

  function display_message(m) {
    document.getElementById("message").innerHTML = m;
  }
  var graphing_is_active = true;
  var interval_id = -1; // for setInterval and clearInterval

  var all_graphs = [];
  var all_buffers = [];
  function stop_graphing() {
    clock=0;
    graphing_is_active = false;
    display_message("Click in one of the graphs to erase them and make another set.");
    if (interval_id != -1) {clearInterval(interval_id);}
  }
  function start_graphing() { // called by initialize() and also when you click to restart graphing
    graphing_is_active = true;
    display_message("Put the mouse cursor in the position graph and move it up and down.");
    interval_id = setInterval(handle_interval_timer,TIME_INTERVAL);
    for (var i=0; i<all_graphs.length; i++) {
      var g = all_graphs[i];
      if (g.has_buffer()) {
        g.buffer.last = -1;
        redraw(g,true);
      }
    }
    for (var i=0; i<all_buffers.length; i++) {
      var b = all_buffers[i];
      b.clear();
    }
  }

  var TIME_INTERVAL = 3; // milliseconds; this is how often we sample the mouse's position and plot a new point

  var BUFFER_SIZE = 1024; // number of data-points to be graphed, which is smaller than the number collected, due to filtering
  var clock = 0; // shared by all Graph objects; is an index into data buffers
                 // represents how much data we've actually acquired, not how much we've graphed; these differ because
                 //         we have a moving window for filtering
                 // ranges from 0 to this.raw_buffer_size-1
                 // can be interpeted as time in time in units of TIME_INTERVAL
  var Buffer = function(args) {
    this.name = args.name;
    this.size = BUFFER_SIZE;
    if ("size" in args) {this.size=args.size}
    this.init_value = 0; // value to initialize the array with; might want to make it complex 0 in some cases
    if ("init_value" in args) {this.init_value = args.init_value}
    this.data = filled_array(this.size,this.init_value);
    this.offset = 0; // offset between where we graph the data and the raw array indices; positive means that we graph
                     // it to the right of where we would have otherwise; this doesn't need to be an integer; we need
                     // this because real-time filters require a window into the data before they can start outputting
    if ("offset" in args) {this.offset=args.offset}
    this.last = -1; // last array index containing valid data
    this.prescale = 1;
    if ("prescale" in args) {this.prescale=args.prescale}
    if ("filter" in args) {this.filter=args.filter} // optional, for use if this is a child of another buffer
    this.new_data_point_at_clock = function (raw,clock) { 
      while (this.last<clock && !this.is_full()) {
        this.new_data_point(raw); // if we've underflowed, make sure phase remains correct
      }
    };
    this.is_full = function() {
      return this.last>=this.size-1;
    };
    this.clear = function() {
      this.last = -1;
    };
    this.new_data_point = function (raw) { 
      if (this.is_full()) {return}
      var d = raw*this.prescale; // to fit on graph, d should range from -1 to 1
      this.data[++this.last] = d;
      for (var i=0; i<this.children.length; i++) {
        var child = this.children[i];
        var filter = child.filter;
        filter.update(this,child,filter.length);
      }
    };
    this.children = [];
    this.add_child = function(child) {
                      // link this buffer to another one that is computed from it by real-time filtering
                      // child should have .filter member set
      this.children.push(child);
    }
  }

  var RealTimeFilter = function(args) {
    this.update = args.update;
                // function to be used in updating child from parent; args are (parent,child,length)
    this.length = args.length;
  }

  // Holoborodko, "Smooth noise-robust differentiators," 
  // http://www.holoborodko.com/pavel/numerical-methods/numerical-derivative/smooth-low-noise-differentiators/
  // coefficients generated by holo.js
  // first derivative:
  var holo_21 = 
    [0,0.03203582763671875,0.048053741455078125,0.0443572998046875,0.029571533203125,0.0147857666015625,
     0.0055446624755859375,0.001522064208984375,0.0002899169921875,3.4332275390625e-5,1.9073486328125e-6];
  var holo_41 = [0,0.011940065487578977,0.020623749478545506,0.02421048851829255,0.022865461378387405,0.018292369102709927,0.012663947840337645,0.007660906718228944,0.004064970911713317,0.0018923140451079234,0.0007709427591180429,0.00027356033388059586,8.39332842588192e-5,2.2043084754841402e-5,4.887380782747642e-6,8.976821845863013e-7,1.3298995327204466e-7,1.5275873010978103e-8,1.2769305612891915e-9,6.912159733474255e-11,1.8189894035458565e-12];
  // second derivative:
  var holo2_21 = [-0.0370941162109375,-0.0269775390625,-0.00505828857421875,0.012451171875,0.017120361328125,0.012451171875,0.006031036376953125,0.00201416015625,0.00045013427734375,6.103515625e-5,3.814697265625e-6];
  var holo2_41 = [-0.01285853206354659,-0.011021598911611363,-0.006345769070321694,-0.0008277090091723949,0.003517763288982678,0.005628421262372285,0.005628421262372285,0.004377660981845111,0.0028142106311861426,0.0015311031020246446,0.0007116394699551165,0.00028312538051977754,9.612871872377582e-5,2.7651680284179747e-5,6.659727660007775e-6,1.3196695363149047e-6,2.0971492631360888e-7,2.5713234208524227e-8,2.2846506908535957e-9,1.3096723705530167e-10,3.637978807091713e-12];


  var update_holo_filter = function(parent,child,length) { // length should be odd
    if (length!=21 && length!=41) {die("Holoborodko filter with illegal length "+length)}
    var holo;
    if (length==21) { holo=holo_21 }
    if (length==41) { holo=holo_41 }
    var o = length-1; // offset between last data in parent and last computable piece of data in child
    var pl = parent.last;
    if (pl>child.last+o) {
      var r = (length-1)/2; // radius of window
      var norm = 0;
      var sum = 0;
      var center = pl-r;
      for (var i=pl-2*r; i<=pl; i++) {
        var s;
        if (i<center) {s=-1} else {s=1}
        var weight = s*holo[Math.abs(i-center)];
        sum = sum+weight*parent.data[i];
      }
      child.new_data_point(sum);
    }
  };

  var update_holo2_filter = function(parent,child,length) { // length should be odd
    if (length!=21 && length!=41) {die("Holoborodko filter with illegal length "+length)}
    var holo2;
    if (length==21) { holo2=holo2_21 }
    if (length==41) { holo2=holo2_41 }
    var o = length-1; // offset between last data in parent and last computable piece of data in child
    var pl = parent.last;
    if (pl>child.last+o) {
      var r = (length-1)/2; // radius of window
      var norm = 0;
      var sum = 0;
      var center = pl-r;
      for (var i=pl-2*r; i<=pl; i++) {
        var weight = holo2[Math.abs(i-center)];
        sum = sum+weight*parent.data[i];
      }
      child.new_data_point(sum);
    }
  };

  var update_triangle_filter = function(parent,child,length) { // length should be odd
    var o = length-1; // offset between last data in parent and last computable piece of data in child
    var pl = parent.last;
    if (pl>child.last+o) {
      var r = (length-1)/2; // radius of window
      var norm = 0;
      var avg = 0;
      var center = pl-r;
      for (var i=pl-2*r; i<=pl; i++) {
        var weight = Math.abs(i-center); // triangular shape
        norm = norm+weight;
        avg = avg+weight*parent.data[i];
      }
      avg = avg/norm;
      child.new_data_point(avg);
    }
  };

  var Graph = function(args) {
    this.canvas_id = args.id;
    this.canvas = document.getElementById(this.canvas_id);
    this.enabled = !(this.canvas===null);
    if (!this.enabled) {return}

    this.end_sweep = args.end_sweep; // a function to call back to when we have swept to the right edge of the screen
    this.color = args.color;
    this.line_width = args.line_width;
    this.variable = args.variable; // string to use as a label on the axis for the dependent variable
    this.buffer = args.buffer;

    this.canvas.contentEditable=true; // make it able to take keyboard focus
    this.canvas.addEventListener('mouseover',function (event) {
      event.target.focus(); // give it the focus whenever the mouse moves over it
    },false);
    this.canvas.addEventListener('mouseout',function (event) {
      event.target.blur();
    },false);

    this.context = this.canvas.getContext('2d');
    this.canvas_w = this.context.canvas.width;
    this.canvas_h = this.context.canvas.height;
    this.has_buffer = function() {
      return (typeof this.buffer != 'undefined');
    };
    this.draw_new_data_point = function () {
      // console.log("this.draw_new_data_point, clock="+clock);
      if (!graphing_is_active || !this.enabled || !this.has_buffer()) {return;}
      if (this.buffer.is_full()) { // we've reached the end of a sweep
        if (typeof this.end_sweep != 'undefined') {this.end_sweep();}
      }
      redraw(this,false);
    };
  };

  var filter_length;
  var offset;

  var filter_length = 21; 
  var offset = (filter_length-1)/2;
  var x_raw = new Buffer({name:'x_raw',prescale:1.0});
  var x_smoothed = new Buffer({name:'x_smoothed',offset:offset,
             filter:new RealTimeFilter({update:update_triangle_filter,length:filter_length})});
  x_raw.add_child(x_smoothed);

  filter_length = 41; 
  offset = (filter_length-1)/2;
  var v_holo = new Buffer({name:'v_holo',prescale:5.0,offset:offset,
             filter:new RealTimeFilter({update:update_holo_filter,length:filter_length})});
  x_raw.add_child(v_holo);


  filter_length = 41; 
  offset = (filter_length-1)/2;
  var a_holo = new Buffer({name:'a_holo',prescale:30.0,offset:offset,
             filter:new RealTimeFilter({update:update_holo2_filter,length:filter_length})});
  x_raw.add_child(a_holo);

  // not used:
  var a_holo_smoothed = new Buffer({name:'a_holo_smoothed',offset:offset*2,
             filter:new RealTimeFilter({update:update_triangle_filter,length:filter_length})});
     // ... looks cleaner on sine wave, but has triple wiggles on step function
  a_holo.add_child(a_holo_smoothed);



  all_buffers = [x_raw,x_smoothed,v_holo,a_holo,a_holo_smoothed];

  var position =     new Graph({id:'x_canvas',buffer:x_smoothed,
                           color:'blue',line_width:2,variable:"x",
                           end_sweep:function() {stop_graphing()}});
  var velocity =     new Graph({id:'v_canvas',buffer:v_holo,color:'red',line_width:2,variable:"v"});
  var acceleration = new Graph({id:'a_canvas',buffer:a_holo,color:'green',line_width:2,variable:"a"});
  all_graphs = [position,velocity,acceleration];

  var current_mouse_y = 0; // expressed such that 1.0=top of canvas, -1.0=bottom
  var t = 0;

  function attach_event_listeners_to_a_graph(graph) {
    graph.canvas.addEventListener('click',handle_click,false);
  }

  function initialize() {
    window.addEventListener('resize',handle_resize_canvas,false);
    handle_resize_canvas(); // Draw canvas border for the first time.
    position.canvas.addEventListener('mousemove',handle_mouse_move,false);
    attach_event_listeners_to_a_graph(position);
    attach_event_listeners_to_a_graph(velocity);
    start_graphing();
  }

  initialize();

  function get_data(clock) {
    if (fake_data) {
      var x;
      if (fake_data_type=="sine") {
        x = Math.sin(clock*0.06)+(Math.random()-0.5)*0.2; // simulate sine wave plus noise
        return 0.01*Math.floor(100*x); // simulate quantization
      }
      if (fake_data_type=="1") {
        return x;
      }
      if (fake_data_type=="x") {
        return clock*0.001;
      }
      if (fake_data_type=="x2") {
        x = (clock%100-50)/50;
        return x*x;
      }
    }
    else {
      return current_mouse_y;
    }
  }

  function handle_interval_timer() {
    if (clock>BUFFER_SIZE-1) {stop_graphing()}
    t = t + TIME_INTERVAL;
    var y = get_data(clock);
    x_raw.new_data_point_at_clock(y,clock);
    clock = clock+1;
    if (clock>position.raw_buffer_size-1) {clock=0}
    for (var i=0; i<all_graphs.length; i++) {
      all_graphs[i].draw_new_data_point();
    }
  }
    
  function redraw(graph,is_from_scratch) {
    if (!graph.enabled) {return;}
    graph.canvas_w = graph.context.canvas.width;
    graph.canvas_h = graph.context.canvas.height;

    if (is_from_scratch) {
      graph.context.clearRect(0, 0, graph.canvas_w, graph.canvas_h);
      // draw vertical grid lines
      graph.context.beginPath();
      graph.context.strokeStyle = '#eeeeee';
      graph.context.lineWidth = 1;
      var ngrid = 30;
      for (var i=0; i<ngrid; i++) {
        var x = graph.canvas_w*i/ngrid;
        graph.context.moveTo(x,0);
        graph.context.lineTo(x,graph.canvas_h);
        graph.context.stroke();
      }
      graph.context.font = '30px Arial'; // apparently there's no way to get around hardcoding the font name?? -- http://stackoverflow.com/questions/18092753/change-font-size-of-canvas-without-knowing-font-family
      // draw t axis
      graph.context.beginPath();
      graph.context.strokeStyle = 'black';
      graph.context.lineWidth = 1;
      graph.context.moveTo(0,0.5*graph.canvas_h);
      graph.context.lineTo(graph.canvas_w,0.5*graph.canvas_h);
      graph.context.stroke();
      graph.context.fillText("t",graph.canvas_w-20,0.5*graph.canvas_h+20);
      // draw axis for dependent variable
      graph.context.moveTo(1,0);
      graph.context.lineTo(1,graph.canvas_h);
      graph.context.stroke();
      graph.context.fillText(graph.variable,5,20);
    }
    if (!graph.has_buffer()) {return}
    var b = graph.buffer;
    graph.context.beginPath();
    var cx = graph.canvas_w/2;
    var cy = graph.canvas_h/2;
    var x_scale = graph.canvas_w/b.size;
    var y_scale = 0.5*graph.canvas_h;
    function transform_y(y) {return y_scale*(1.0-y)}
    var start_at = b.last;
    if (is_from_scratch) {start_at=1;}
    for (var i=start_at; i<=b.last; i++) {
      var x = (i+b.offset)*x_scale;
      var y1 = b.data[i-1];
      var y2 = b.data[i];
      graph.context.strokeStyle = graph.color;
	  graph.context.lineWidth = graph.line_width;
      graph.context.moveTo(x,transform_y(y1));
      graph.context.lineTo(x+x_scale,transform_y(y2));
      graph.context.stroke();
    }
  }

  function handle_resize_canvas() {
    for (var i=0; i<all_graphs.length; i++) {
      var g = all_graphs[i];
      if (g.enabled) {
        g.last_valid_time = -1;
        g.canvas.width = window.innerWidth;
        g.canvas.height = window.innerHeight/2;
        redraw(g,true);
      }
    }
  }

  function handle_click(event) {
    // console.log("got click");
    if (!graphing_is_active) {start_graphing();}
  }

  function get_mouse_y(canvas, event) {
    // Return the current y position of the mouse, expressed relative to the canvas, with -1 being the bottom and 1 the top.
    // Judging from complicated and inconclusive online discussions, this seems to be difficult to do in a browser-independent
    // and robust way. The following seems to work in firefox, chrome, and modern IE.
    var rect = canvas.getBoundingClientRect();
    var y_raw = event.clientY - rect.top;
    return 1.0-2.0*y_raw/rect.height; // force it into [-1,1] range
  }

  function handle_mouse_move(event) {
    current_mouse_y = get_mouse_y(position.canvas, event);
  }


})();
