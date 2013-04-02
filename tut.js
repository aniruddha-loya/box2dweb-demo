/* Developed by Aniruddha Loya
** www.aplus1games.com
*/

var context, screenW, screenH, world, drawDebug;
var stage, gameLayer, images = {};
var walls = [], tiles = []; // The two containers for corresponding box2d and KineticJS objects to quickly access them

// bunch of variables required for various box2d objects
var   b2Vec2 = Box2D.Common.Math.b2Vec2
,  b2AABB = Box2D.Collision.b2AABB
,	b2BodyDef = Box2D.Dynamics.b2BodyDef
,	b2Body = Box2D.Dynamics.b2Body
,	b2FixtureDef = Box2D.Dynamics.b2FixtureDef
,	b2Fixture = Box2D.Dynamics.b2Fixture
,	b2World = Box2D.Dynamics.b2World
,	b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
,	b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
,	b2DebugDraw = Box2D.Dynamics.b2DebugDraw
;

// A function to preload required images.
// For details read: http://aniruddhaloya.blogspot.com/2012/03/how-to-ensure-images-are-loaded-before.html
function loadImages(sources, callback) {
    var loadedImages = 0;
    var numImages = 0;
    for (var src in sources) {
        numImages++;
    }
    for (var src in sources) {
        images[src] = new Image();
        images[src].onload = function(){
            if (++loadedImages >= numImages)
                    callback();
        };
        images[src].src = sources[src];
    }
}

// When the page completes loading, the init event is called to start loading our game script
function init() {
// Specify all the required images to be preloaded before we start to manipulate them.
	var sources = {
		gameBg: "images/background.png",
		w: "images/wall1.png",
	};
	loadImages(sources,loadCanvas);
}

function loadCanvas(){
	window.onkeydown = keydown;

	// Defining our screen size
	screenW = 500, screenH = 400;

	debugDraw = true;

	//KineticJS code to create a stage and a layer. Read KineticJS documentation for more details
	stage = new Kinetic.Stage({container:"canvas", width:screenW, height:screenH});
	gameLayer = new Kinetic.Layer();

	// Adding a game background
	var gameBg = new Kinetic.Image(
	{
		image:images.gameBg,
		x:0, y:0,
		width:screenW, height:screenH
	});
	gameLayer.add(gameBg); // Add the gameBg object to our gameLayer
	stage.add(gameLayer); // And add our gameLayer to our stage

	context = gameLayer.getContext(); // initialize the context variable required for box2d draw function

    // Define the world
    world = new b2World(
               new b2Vec2(0, 10)    //gravity of 10 in downward y direction
            ,  true                 //allows objects to sleep if they are in equilibrium, indicated by change of color from Red to Grey in debugDraw mode
         );

	 // Scale is required to convert our pixel space into meters. A scale of 10 means 10px = 1m
	 var scale = 20.0;

     // Define the Ground
     // Basic properties of ground
     var fixDef = new b2FixtureDef;
     fixDef.density = 2.0;
     fixDef.friction = 0.9;
     fixDef.restitution = 0.8;

     // Ground is nothing but just a static rectangular body with its center at screenW/2 and screenH
     var bodyDef = new b2BodyDef;
     bodyDef.type = b2Body.b2_staticBody;
     bodyDef.position.x = screenW/2/scale;
     // We use screenH for y coordinate as the ground has to be at the bottom of our screen
     bodyDef.position.y = screenH/scale;

     // here we define ground as a rectangular box of width = screenW and height = 10 (just some small number to make a thin strip)
     fixDef.shape = new b2PolygonShape;
     fixDef.shape.SetAsBox(screenW/scale, 10/scale);

     // And finally add our ground object to our world
     world.CreateBody(bodyDef).CreateFixture(fixDef);

     // Left Edge - Similar to ground, we define the left edge of our simulation... your application may or may not need this
     // The edge is positioned at the left most i.e. x = 0 and y = screenH/2 as the center. width is 1 and height = screenH
     bodyDef.position.x = 0;
     bodyDef.position.y = screenH/2/scale;
     fixDef.shape = new b2PolygonShape;
     fixDef.shape.SetAsBox(1/scale, screenH/scale);
     world.CreateBody(bodyDef).CreateFixture(fixDef);

	 // Right Edge - same as left edge, positioned on the rightmost end of our canvas.
     bodyDef.position.x = screenW/scale;
     bodyDef.position.y = screenH/2/scale;
	 fixDef.shape = new b2PolygonShape;
     fixDef.shape.SetAsBox(1/scale, screenH/scale);
     world.CreateBody(bodyDef).CreateFixture(fixDef);

	// Adding objects to our simulation space.
	// The difference here being, that these are dynamic objects and are affected by forces and impulses
	bodyDef.type = b2Body.b2_dynamicBody;

	 // Unlike the previous blog, here we'll first add the KineticJS objects
	 // and then use their position to attach the corresponding box2d objects to them
	for(var i = 0; i < 5; ++i) {
		// lets create a new Image of a wall
		var w = new Kinetic.Image({
			image: images.w,
			x:Math.random() * screenW,
			y:Math.random() * screenH/4,
			width: images.w.width/4,
			height: images.w.height/4
		});
		gameLayer.add(w);

		// by default images are positioned from top-left, and box2d objects from center, so lets offset our images to be addressed from center rather than top-left
		w.setOffset(w.getWidth()/2, w.getHeight()/2);

		// now lets create the corresponding box2d object.
		// Read my previous post for box2d object details: http://aniruddhaloya.blogspot.com/2012/11/box2d-javascript-part-2.html
		fixDef.shape = new b2PolygonShape;

		var off = w.getOffset();
		fixDef.shape.SetAsBox(off.x/scale, off.y/scale); // Remember that we need to scale the canvas to box2d coordinates

		var pos = w.getAbsolutePosition();

		bodyDef.position.Set((pos.x+off.x)/scale, (pos.y+off.y)/scale); // Remember that we need to scale the canvas to box2d coordinates

		var body = world.CreateBody(bodyDef);
		body.CreateFixture(fixDef);

		// lets push the corresponding objects in their respective containers.
		walls.push(body);
		tiles.push(w);
	}

	// for fun and understanding the effect of rotation, lets change orientation of the 2 objects we just added
	walls[4].SetAngle(-Math.PI/2);
	walls[3].SetAngle(-Math.PI/2);

	// now we need to rotate all the KineticJS wall objects to match their corresponding bodies rotation.
	for(var i = 0; i < 5; i++) {
		var body = walls[i];

		var kwall = tiles[i]; // kinetic wall object
		var p = body.GetPosition();
		kwall.setRotation(body.GetAngle());
		kwall.setPosition(p.x*scale, p.y*scale);
	}
	stage.draw();

	// A callback for animation. It is widely suggested to use requestAnimFrame instead of setTimeout or setInterval for better animation performance.
	window.requestAnimFrame = (function(){
	  return  window.requestAnimationFrame       ||
			  window.webkitRequestAnimationFrame ||
			  window.mozRequestAnimationFrame    ||
			  window.oRequestAnimationFrame      ||
			  window.msRequestAnimationFrame     ||
			  function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			  };
	})();

 // Our update function
	function update() {
		world.Step(1 / 60, 3, 3); // timestep, velocityIterations, positionIterations. Read manual for more details

		var count = 0;

		// This is called after we are done with time steps to clear the forces
		world.ClearForces();

		// Traverse through all the box2d objects and update the positions and rotations of corresponding KineticJS objects
		for(var i = 0; i < walls.length; i++)
		{
			var body = walls[i];
			// A small hack to save on unnecessary redraws.
			if(!body.IsAwake())
				count++;

			var wall = tiles[i];
			var p = body.GetPosition();
			wall.setRotation(body.GetAngle());
			wall.setPosition(p.x*scale, p.y*scale);
		}
		if(drawDebug)
			world.DrawDebugData();
		else
			gameLayer.draw();

		// callback for next update
		if(count < walls.length)
			requestAnimFrame(update);
	 };

	// Starts our update / loop
	requestAnimFrame(update);

	 // The native function that draws the object for us to debug their physics and visualize interaction
	 var debugDraw = new b2DebugDraw();
		debugDraw.SetSprite(context);
		debugDraw.SetDrawScale(scale);
		debugDraw.SetFillAlpha(0.5);
		debugDraw.SetLineThickness(1.0);
		debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit | b2DebugDraw.e_centerOfMassBit);

	world.SetDebugDraw(debugDraw);
}

function keydown(e)
{
	if (e.keyCode == 68) //press 'd'
	{
		drawDebug = !drawDebug;
	}
}

window.addEventListener("load", init, true);        // insert the listener for onload event to call our init function