//Project 2, Johnathon Hoste, 4/22/15
var OFFSCREEN_WIDTH = 2048, OFFSCREEN_HEIGHT = 2048;
var LIGHT_X = -5, LIGHT_Y = 5, LIGHT_Z = 20; // Position of the light source
var xzeye = 0;
var yeye = 0;

var xzinc = 0.02;
var yinc = 0.02;

var xtrans = 0;
var ztrans = 0;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = WebGLUtils.setupWebGL( canvas );
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Initialize shaders for generating a shadow map
  var shadowProgram = initShaders(gl, "SHADOW_VSHADER_SOURCE", "SHADOW_FSHADER_SOURCE");
  shadowProgram.a_Position = gl.getAttribLocation(shadowProgram, 'a_Position');
  shadowProgram.u_MvpMatrix = gl.getUniformLocation(shadowProgram, 'u_MvpMatrix');
  if (shadowProgram.a_Position < 0 || !shadowProgram.u_MvpMatrix) {
    console.log('Failed to get the storage location of attribute or uniform variable from shadowProgram'); 
    return;
  }

  // Initialize shaders for regular drawing
  var normalProgram = initShaders(gl, "VSHADER_SOURCE", "FSHADER_SOURCE");
  normalProgram.a_Position = gl.getAttribLocation(normalProgram, 'a_Position');
  normalProgram.a_Color = gl.getAttribLocation(normalProgram, 'a_Color');
  normalProgram.u_MvpMatrix = gl.getUniformLocation(normalProgram, 'u_MvpMatrix');
  normalProgram.u_MvpMatrixFromLight = gl.getUniformLocation(normalProgram, 'u_MvpMatrixFromLight');
  normalProgram.u_ShadowMap = gl.getUniformLocation(normalProgram, 'u_ShadowMap');
  if (normalProgram.a_Position < 0 || normalProgram.a_Color < 0 || !normalProgram.u_MvpMatrix ||
      !normalProgram.u_MvpMatrixFromLight || !normalProgram.u_ShadowMap) {
    console.log('Failed to get the storage location of attribute or uniform variable from normalProgram'); 
    return;
  }

  // Set the vertex information
  var piece = initVertexBuffersForPiece(gl);
  var board = initVertexBuffersForBoard(gl);
  if (!piece || !board) {
    console.log('Failed to set the vertex information');
    return;
  }

  // Initialize framebuffer object (FBO)  
  var fbo = initFramebufferObject(gl);
  if (!fbo) {
    console.log('Failed to initialize frame buffer object');
    return;
  }
  gl.activeTexture(gl.TEXTURE0); // Set a texture object to the texture unit
  gl.bindTexture(gl.TEXTURE_2D, fbo.texture);

  // Set the clear color and enable the depth test
  gl.clearColor(0.4, 0.2, 0.3, 1);
  gl.enable(gl.DEPTH_TEST);

var viewProjMatrixFromLight = new mat4(); // Prepare a view projection matrix for generating a shadow map
viewProjMatrixFromLight = perspective(45.0, OFFSCREEN_WIDTH/OFFSCREEN_HEIGHT, 1.0, 100.0);
viewProjMatrixFromLight = mult(viewProjMatrixFromLight, lookAt(vec3(LIGHT_X, LIGHT_Y, LIGHT_Z), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)));
  var viewProjMatrix = new mat4();
  var currentAngle = 0.0; // Current rotation angle (degrees)
  var mvpMatrixFromLight_p = new mat4(); // A model view projection matrix from light source (for triangle)
  var mvpMatrixFromLight_b = new mat4(); // A model view projection matrix from light source (for plane)
  
  var tick = function() {
    currentAngle = animate(currentAngle);



	viewProjMatrix = new mat4();      // Prepare a view projection matrix for regular drawing
	viewProjMatrix = perspective(45, canvas.width/canvas.height, 1.0, 100.0);
	viewProjMatrix = mult(viewProjMatrix, lookAt(vec3(15*Math.sin(xzeye), 20*Math.sin(yeye), 15*Math.cos(xzeye)), vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0)));
	
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);               // Change the drawing destination to FBO
    gl.viewport(0, 0, OFFSCREEN_HEIGHT, OFFSCREEN_HEIGHT); // Set view port for FBO
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);   // Clear FBO    

    gl.useProgram(shadowProgram); // Set shaders for generating a shadow map
    // Draw the piece and the board (for generating a shadow map)
    drawPiece(gl, shadowProgram, piece, currentAngle, viewProjMatrixFromLight);
    mvpMatrixFromLight_p = g_mvpMatrix; // Used later
    drawBoard(gl, shadowProgram, board, viewProjMatrixFromLight);
    mvpMatrixFromLight_b = g_mvpMatrix; // Used later

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);               // Change the drawing destination to color buffer
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    // Clear color and depth buffer

    gl.useProgram(normalProgram); // Set the shader for regular drawing
    gl.uniform1i(normalProgram.u_ShadowMap, 0);  // Pass 0 because gl.TEXTURE0 is enabledã™ã‚‹
    // Draw the piece and board ( for regular drawing)
    gl.uniformMatrix4fv(normalProgram.u_MvpMatrixFromLight, false, flatten(mvpMatrixFromLight_p));
    drawPiece(gl, normalProgram, piece, currentAngle, viewProjMatrix);
    gl.uniformMatrix4fv(normalProgram.u_MvpMatrixFromLight, false, flatten(mvpMatrixFromLight_b));
    drawBoard(gl, normalProgram, board, viewProjMatrix);

    window.requestAnimationFrame(tick, canvas);
  };
  
  	//event listeners for keyboard 
	window.onkeydown = function(event) {
		var key = String.fromCharCode(event.keyCode);
		switch (key) {			
			case "&":
				//tilt up
				if(yeye < Math.PI/2){
					yeye = yeye + yinc;
				}
				break;
			case "%":
				//move left
				if(xzeye > -Math.PI/2){
					xzeye = xzeye - xzinc;
				}
				if(xzeye == 0){
					xzeye = xzinc;
				}
				break;
			case "(":
				//tilt down
				if(yeye > 0){
					yeye = yeye - yinc;
				}
				break;
			case "'":
				//move right
				if(xzeye < Math.PI/2){
					xzeye = xzeye + xzinc;
				}
				if(xzeye == 0){
					xzeye = xzinc;
				}
				break;
			case "D":
				xtrans += 1;
				break;
			case "A":
				xtrans -= 1;
				break;
			case "W":
				ztrans -= 1;
				break;
			case "S":
				ztrans += 1;
				break;
		}
	};
  
  tick(); 
}

// Coordinate transformation matrix
var g_modelMatrix = new mat4();
var g_mvpMatrix = new mat4();
function drawPiece(gl, program, piece, angle, viewProjMatrix) {
  // Set translate angle to model matrix and draw piece
  g_modelMatrix = translate(xtrans, 0, ztrans);
  draw(gl, program, piece, viewProjMatrix);
}

function drawBoard(gl, program, board, viewProjMatrix) {
  // Set rotate angle to model matrix and draw board
  g_modelMatrix = rotate(0, 0, 0, 1);
  draw(gl, program, board, viewProjMatrix);
}

function draw(gl, program, o, viewProjMatrix) {
  initAttributeVariable(gl, program.a_Position, o.vertexBuffer);
  if (program.a_Color != undefined) // If a_Color is defined to attribute
    initAttributeVariable(gl, program.a_Color, o.colorBuffer);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.indexBuffer);

  // Calculate the model view project matrix and pass it to u_MvpMatrix
  g_mvpMatrix = viewProjMatrix ;
  g_mvpMatrix = mult(g_mvpMatrix, g_modelMatrix);
  gl.uniformMatrix4fv(program.u_MvpMatrix, false, flatten(g_mvpMatrix));

  gl.drawElements(gl.TRIANGLES, o.numIndices, gl.UNSIGNED_BYTE, 0);
}

// Assign the buffer objects and enable the assignment
function initAttributeVariable(gl, a_attribute, buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_attribute, buffer.num, buffer.type, false, 0, 0);
  gl.enableVertexAttribArray(a_attribute);
}

function initVertexBuffersForBoard(gl) {
  // Create a plane
  //  v1------v0
  //  |        | 
  //  |        |
  //  |        |
  //  v2------v3

  // Vertex coordinates
  var verticesL = [
    -4.5,-0.9,-4.5,  -4.5,-0.9,4.5,  4.5,-0.9,4.5,   4.5,-0.9,-4.5,    //bottom
	-4.5,-0.9,-4.5,  -4.5,-0.9,4.5,  -4.5,-0.1,4.5,  -4.5,-0.1,-4.5,   //left
	-4.5,-0.9,-4.5,   4.5,-0.9,-4.5,  4.5,-0.1,-4.5,  -4.5,-0.1,-4.5,  //back
	4.5,-0.1,-4.5,  4.5,-0.1,4.5,  -4.5,-0.1,4.5,   -4.5,-0.1,-4.5,    //top
	4.5,-0.9,-4.5,  4.5,-0.9,4.5,  4.5,-0.1,4.5,  4.5,-0.1,-4.5,   //right
	-4.5,-0.9,4.5,   4.5,-0.9,4.5,  4.5,-0.1,4.5,  -4.5,-0.1,4.5   //front
  ];
  
	//add the squares
	for(var y = -4; y < 4; y += 1){
		for(var x = -4; x < 4; x += 1){
			verticesL.push(x);
			verticesL.push(-0.09);
			verticesL.push(y);
			verticesL.push(x);
			verticesL.push(-0.09);
			verticesL.push(y+1);
			verticesL.push(x+1);
			verticesL.push(-0.09);
			verticesL.push(y+1);
			verticesL.push(x+1);
			verticesL.push(-0.09);
			verticesL.push(y);
		}
	}
  
   var vertices = new Float32Array(verticesL);
  
  // Colors
  var colorsL = [
    0.6,0.3,0.1, 0.6,0.3,0.1, 0.6,0.3,0.1, 0.6,0.3,0.1, //bottom
	0.6,0.3,0.2, 0.6,0.3,0.2, 0.6,0.3,0.2, 0.6,0.3,0.2, //left
	0.6,0.3,0.3, 0.6,0.3,0.3, 0.6,0.3,0.3, 0.6,0.3,0.3,  //back
	0.6,0.3,0.4, 0.6,0.3,0.4, 0.6,0.3,0.4, 0.6,0.3,0.4, //top
	0.6,0.3,0.5, 0.6,0.3,0.5, 0.6,0.3,0.5, 0.6,0.3,0.5, //right
	0.6,0.3,0.6, 0.6,0.3,0.6, 0.6,0.3,0.6, 0.6,0.3,0.6  //front
  ];
  
  //add the squares colors
	var isWhite = 0;
	for(var x = -4; x < 4; x += 1){
		for(var y = -4; y < 4; y += 1){
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			colorsL.push(isWhite);
			if(isWhite == 1){
				isWhite = 0;
			} else {
				isWhite = 1;
			}
		}
		if(isWhite == 1){
			isWhite = 0;
		} else {
			isWhite = 1;
		}
	}
  
     var colors = new Float32Array(colorsL);
	 
  // Indices of the vertices
  var indicesL = 				[0,1,2,    0,2,3, //bottom
								4,5,6,    4,6,7,  //left
								8,9,10,   8,10,11, //back
								12,13,14, 12,14,15,	//top
								16,17,18, 16,18,19, //right
								20,21,22, 20,22,23, //front
								];
								
	var count = 24;
	for(var x = -4; x < 4; x += 1){
		for(var y = -4; y < 4; y += 1){
			indicesL.push(count);
			indicesL.push(count+1);
			indicesL.push(count+2);
			indicesL.push(count);
			indicesL.push(count+2);
			indicesL.push(count+3);
			count = count + 4;
		}
	}
	
	var indices = new Uint8Array(indicesL);			
								
  var o = new Object(); // Utilize Object object to return multiple buffer objects together

  // Write vertex information to buffer object
  o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
  o.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
  o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
  if (!o.vertexBuffer || !o.colorBuffer || !o.indexBuffer) return null; 

  o.numIndices = indices.length;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}

function initVertexBuffersForPiece(gl) {
  // Create a rectangle prism 
  //       v2        v5
  //      / |       / | 
  //     /  |      /  |
  //    /   |     /   |
  //  v0----v1  v3----v4

  // Vertex coordinates
  var vertices = new Float32Array([0.1,0,0.9,  0.1,0,0.1,  0.9,0,0.1,  0.9,0,0.9, 0.1,1.5,0.9,  0.1,1.5,0.1,  0.9,1.5,0.1, 0.9,1.5,0.9]);
  // Colors
  var colors = new Float32Array([1,0.2,0,  1,0.4,0,  1,0.6,0,  1,0.8,0,  1,0,0.2,  1,0,0.4, 1,0,0.6, 1,0,0.8]);    
  // Indices of the vertices
  var indices = new Uint8Array([0,1,2, 0,2,3, 1,2,6, 1,6,5, 0,1,5, 0,4,5, 2,3,6, 3,6,7, 3,7,4, 3,0,4, 4,5,6, 4,6,7]);
  
  var o = new Object();  // Utilize Object object to return multiple buffer objects together

  // Write vertex information to buffer object
  o.vertexBuffer = initArrayBufferForLaterUse(gl, vertices, 3, gl.FLOAT);
  o.colorBuffer = initArrayBufferForLaterUse(gl, colors, 3, gl.FLOAT);
  o.indexBuffer = initElementArrayBufferForLaterUse(gl, indices, gl.UNSIGNED_BYTE);
  if (!o.vertexBuffer || !o.colorBuffer || !o.indexBuffer) return null; 

  o.numIndices = indices.length;

  // Unbind the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  return o;
}

function initArrayBufferForLaterUse(gl, data, num, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  // Store the necessary information to assign the object to the attribute variable later
  buffer.num = num;
  buffer.type = type;

  return buffer;
}

function initElementArrayBufferForLaterUse(gl, data, type) {
  // Create a buffer object
  var buffer = gl.createBuffer();
  if (!buffer) {
    console.log('Failed to create the buffer object');
    return null;
  }
  // Write date into the buffer object
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);

  buffer.type = type;

  return buffer;
}

function initFramebufferObject(gl) {
  var framebuffer, texture, depthBuffer;

  // Define the error handling function
  var error = function() {
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    if (texture) gl.deleteTexture(texture);
    if (depthBuffer) gl.deleteRenderbuffer(depthBuffer);
    return null;
  }

  // Create a framebuffer object (FBO)
  framebuffer = gl.createFramebuffer();
  if (!framebuffer) {
    console.log('Failed to create frame buffer object');
    return error();
  }

  // Create a texture object and set its size and parameters
  texture = gl.createTexture(); // Create a texture object
  if (!texture) {
    console.log('Failed to create texture object');
    return error();
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  // Create a renderbuffer object and Set its size and parameters
  depthBuffer = gl.createRenderbuffer(); // Create a renderbuffer object
  if (!depthBuffer) {
    console.log('Failed to create renderbuffer object');
    return error();
  }
  gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, OFFSCREEN_WIDTH, OFFSCREEN_HEIGHT);

  // Attach the texture and the renderbuffer object to the FBO
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

  // Check if FBO is configured correctly
  var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (gl.FRAMEBUFFER_COMPLETE !== e) {
    console.log('Frame buffer object is incomplete: ' + e.toString());
    return error();
  }

  framebuffer.texture = texture; // keep the required object

  // Unbind the buffer object
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);

  return framebuffer;
}

var ANGLE_STEP = 40;   // The increments of rotation angle (degrees)

var last = Date.now(); // Last time that this function was called
function animate(angle) {
  var now = Date.now();   // Calculate the elapsed time
  var elapsed = now - last;
  last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle % 360;
}
