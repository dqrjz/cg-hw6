"use strict"


const VERTEX_SIZE = 8; // EACH VERTEX CONSISTS OF: x,y,z, ny,ny,nz, u,v


 //////////////////////////////////////////////////////////////////
//                                                                //
//  FOR HOMEWORK, YOU CAN ALSO TRY DEFINING DIFFERENT SHAPES,     //
//  BY CREATING OTHER VERTEX ARRAYS IN ADDITION TO cubeVertices.  //
//                                                                //
 //////////////////////////////////////////////////////////////////

let createCubeVertices = () => {
   let v = [];
   let addVertex = a => {
      for (let i = 0 ; i < a.length ; i++)
         v.push(a[i]);
      v.push(0);
      v.push(0);
   }

   // EACH SQUARE CONSISTS OF TWO TRIANGLES.

   let addSquare = (a,b,c,d) => {
      addVertex(c);
      addVertex(b);
      addVertex(a);

      addVertex(b);
      addVertex(c);
      addVertex(d);
   }

   // VERTEX DATA FOR TWO OPPOSING SQUARE FACES. EACH VERTEX CONSISTS OF: x,y,z, nx,ny,nz

   let P = [[-1,-1,-1, 0,0,-1],[ 1,-1,-1, 0,0,-1],[-1, 1,-1, 0,0,-1],[ 1, 1,-1, 0,0,-1],
            [-1,-1, 1, 0,0, 1],[ 1,-1, 1, 0,0, 1],[-1, 1, 1, 0,0, 1],[ 1, 1, 1, 0,0, 1]];

   // LOOP THROUGH x,y,z. EACH TIME ADD TWO OPPOSING FACES, THEN PERMUTE COORDINATES.

   for (let n = 0 ; n < 3 ; n++) {
      addSquare(P[0],P[1],P[2],P[3]);
      addSquare(P[4],P[5],P[6],P[7]);
      for (let i = 0 ; i < P.length ; i++)
         P[i] = [P[i][1],P[i][2],P[i][0], P[i][4],P[i][5],P[i][3]];
   }

   return v;
}


//////////////// callback functions ////////////////
// sphere
function uvToSphere(u, v) {
  let theta = 2. * Math.PI * u;
  let phi = Math.PI * v - Math.PI / 2;

  let x = Math.cos(theta) * Math.cos(phi);
  let y = Math.sin(theta) * Math.cos(phi);
  let z = Math.sin(phi);
  return [x, y, z,
          x, y, z];
}

// torus
function uvToTorus(u, v) {
  let theta = 2. * Math.PI * u;
  let phi = 2. * Math.PI * v;

  let r = 0.12;

  let x = Math.cos(theta) * (1. + r * Math.cos(phi));
  let y = Math.sin(theta) * (1. + r * Math.cos(phi));
  let z = r * Math.sin(phi);

  let nx = Math.cos(theta) * Math.cos(phi);
  let ny = Math.sin(theta) * Math.cos(phi);
  let nz = Math.sin(phi);
  return [ x,  y,  z,
          nx, ny, nz];
}

// tube
function uvToTube(u, v) {
  let theta = 2. * Math.PI * u;

  let x = Math.cos(theta);
  let y = Math.sin(theta);
  let z = 2. * v - 1.;
  return [x, y, z,
          x, y, theta];
}

// cylinder
function uvToCylinder(u, v) {
  let theta = 2. * Math.PI * u;

  let c = Math.cos(theta);
  let s = Math.sin(theta);
  let z = Math.max(-1., Math.min(1., 10. * v - 5.));

  switch (Math.floor(5.001 * v)) {
    case 0: case 5: return [0, 0, z, 0, 0, z]; // center of back/front end cap
    case 1: case 4: return [c, s, z, 0, 0, z]; // perimeter of back/front end cap
    case 2: case 3: return [c, s, z, c, s, 0]; // back/front of cylindrical tube
  }
}

//////////////// create mesh ////////////////
function createMesh(M, N, callback) {
  // M column, N row
  if (M == 1 || N == 1) throw "Wrong column or row!";
  let vertices = [];
  let addVertex = (u, v) => {
    let a = callback(u, v);
    for (let i = 0 ; i < a.length ; i++)
      vertices.push(a[i]);
    vertices.push(u);
    vertices.push(v);
  }

  let du = 1. / (M - 1);
  let dv = 1. / (N - 1);
  for (let row = 0; row < N - 1; row++) {
    let u0 = row % 2 == 0 ? 1 : 0;
    let sign = row % 2 == 0 ? -1 : 1;
    let vBot = row * dv;
    let vTop = (row + 1) * dv;
    if (row == 0) addVertex(u0, vBot);
    addVertex(u0, vTop);
    // let numSteps = M - 1;
    for (let col = 1; col < M; col++) {
      let u = u0 + sign * col * du;
      addVertex(u, vBot);
      addVertex(u, vTop);
    }
  }
  return vertices;
}

//////////////// create vertices ////////////////
let sphereVertices = createMesh(50, 50, uvToSphere);
let cubeVertices = createCubeVertices();
let torusVertices = createMesh(40, 40, uvToTorus);
let cylinderVertices = createMesh(40, 40, uvToCylinder);


////// DEBUG ///////
// let round = v => {
//   let ret = [];
//   for (let i = 0; i < v.length; i++)
//     ret.push(Math.round(v[i]));
//   return ret;
// }
// let M = 5, N = 3;
// let arrayLength = (1 + (2 * M - 1) * (N - 1)) * VERTEX_SIZE;
// console.log("arrayLength = " + arrayLength);
// let sphereVerticesTest = round(createMesh(M, N, uvToSphere));
// console.log("sphereVerticesTest.length = " + sphereVerticesTest.length);
// for (let i = 0; i < sphereVerticesTest.length; i+=VERTEX_SIZE) {
//   console.log(sphereVerticesTest.slice(i, i+6));
// }
////// DEBUG ///////


async function setup(state) {
    hotReloadFile(getPath('week6.js'));

    state.m = new Matrix();

    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },
        {
            key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true
        },      
    ]);

    if (!libSources) {
        throw new Error("Could not load shader library");
    }

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];

                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get("pnoise");

                    for (let i = 0; i < 2; i += 1) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        
                        /*
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + "\n#line 1 1\n" + 
                                    libCode + "\n#line " + (hdr.split('\n').length) + " 0\n" + 
                                    stageCode.substring(hdrEndIdx + 1);
                        console.log(output[i]);
                        */
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        
                        output[i] = hdr + "\n#line 2 1\n" + 
                                    "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                            stageCode.substring(hdrEndIdx + 1);

                        //console.log(output[i]);
                    }
                }

                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                state.program = program;

                gl.useProgram(program);

                state.uColorLoc        = gl.getUniformLocation(program, 'uColor');
                state.uCursorLoc       = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');

                state.cameraLoc           = gl.getUniformLocation(program, 'camera');

                var NL = 2;
                state.uLightsLoc = [];
                for (var i = 0; i < NL; i++) {
                    state.uLightsLoc[i] = {};
                    state.uLightsLoc[i].src = gl.getUniformLocation(program, 'uLights['+i+'].src');
                    state.uLightsLoc[i].col = gl.getUniformLocation(program, 'uLights['+i+'].col');
                }

                var NS = 1;
                state.uMaterialsLoc = [];
                for (var i = 0; i < NS; i++) {
                    state.uMaterialsLoc[i] = {};
                    state.uMaterialsLoc[i].ambient    = gl.getUniformLocation(program, 'uMaterials['+i+'].ambient');
                    state.uMaterialsLoc[i].diffuse    = gl.getUniformLocation(program, 'uMaterials['+i+'].diffuse');
                    state.uMaterialsLoc[i].specular   = gl.getUniformLocation(program, 'uMaterials['+i+'].specular');
                    state.uMaterialsLoc[i].power      = gl.getUniformLocation(program, 'uMaterials['+i+'].power');
                    state.uMaterialsLoc[i].reflect    = gl.getUniformLocation(program, 'uMaterials['+i+'].reflect');
                    state.uMaterialsLoc[i].transparent= gl.getUniformLocation(program, 'uMaterials[' + i + '].transparent');
                    state.uMaterialsLoc[i].indexOfRefraction = gl.getUniformLocation(program, 'uMaterials[' + i + '].indexOfRefraction');
                }
            } 
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            foldDefault : {
                vertex   : true,
                fragment : false
            }
        }
    );

    state.cursor = ScreenCursor.trackCursor(MR.getCanvas());

    if (!shaderSource) {
        throw new Error("Could not load shader");
    }

    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);

 ///////////////////////////////////////////////////////////
//                                                         //
//  HINT: IF YOU WANT TO IMPLEMENT MORE THAN ONE SHAPE,    //
//  YOU MIGHT WANT TO CALL gl.bufferData()                 //
//  MULTIPLE TIMES IN onDraw() INSTEAD OF HERE,            //
//  USING OTHER ARRAY VALUES IN ADDITION TO cubeVertices.  //
//                                                         //
 ///////////////////////////////////////////////////////////

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array( cubeVertices ), gl.STATIC_DRAW);

    let bpe = Float32Array.BYTES_PER_ELEMENT;

    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 0);

    let aNor = gl.getAttribLocation(state.program, 'aNor');
    gl.enableVertexAttribArray(aNor);
    gl.vertexAttribPointer(aNor, 3, gl.FLOAT, false, bpe * VERTEX_SIZE, bpe * 3);
}


 /////////////////////////////////////////////////////////////////////
//                                                                   //
//  FOR HOMEWORK, YOU NEED TO IMPLEMENT THESE SIX MATRIX FUNCTIONS.  //
//  EACH FUNCTION SHOULD RETURN AN ARRAY WITH 16 VALUES.             //
//                                                                   //
//  SINCE YOU ALREADY DID THIS FOR THE PREVIOUS ASSIGNMENT,          //
//  YOU CAN JUST USE THE FUNCTION DEFINITIONS YOU ALREADY CREATED.   //
//                                                                   //
 /////////////////////////////////////////////////////////////////////

let identity = ()       => [1., 0., 0., 0.,
                            0., 1., 0., 0.,
                            0., 0., 1., 0.,
                            0., 0., 0., 1.];
let rotateX = t         => [1., 0., 0., 0.,
                            0., Math.cos(t), Math.sin(t), 0.,
                            0.,-Math.sin(t), Math.cos(t), 0.,
                            0., 0., 0., 1.];
let rotateY = t         => [Math.cos(t), 0.,-Math.sin(t), 0.,
                            0., 1., 0., 0.,
                            Math.sin(t), 0., Math.cos(t), 0.,
                            0., 0., 0., 1.];
let rotateZ = t         => [ Math.cos(t), Math.sin(t), 0., 0.,
                            -Math.sin(t), Math.cos(t), 0., 0.,
                            0., 0., 1., 0.,
                            0., 0., 0., 1.];
let scale = (x,y,z)     => [x , 0., 0., 0.,
                            0., y , 0., 0.,
                            0., 0., z , 0.,
                            0., 0., 0., 1.];
let translate = (x,y,z) => [1., 0., 0., 0.,
                            0., 1., 0., 0.,
                            0., 0., 1., 0.,
                            x , y , z , 1.];

let inverse = src => {
  let dst = [], det = 0, cofactor = (c, r) => {
     let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
     return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                 - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                 + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
  }
  for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
  for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
  for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
  return dst;
}

let multiply = (a, b) => {
   let c = [];
   for (let n = 0 ; n < 16 ; n++)
      c.push( a[n&3     ] * b[    n&12] +
              a[n&3 |  4] * b[1 | n&12] +
              a[n&3 |  8] * b[2 | n&12] +
              a[n&3 | 12] * b[3 | n&12] );
   return c;
}

let Matrix = function() {
   let topIndex = 0,
       stack = [ identity() ],
       getVal = () => stack[topIndex],
       setVal = m => stack[topIndex] = m;

   this.identity  = ()      => setVal(identity());
   this.restore   = ()      => --topIndex;
   this.rotateX   = t       => setVal(multiply(getVal(), rotateX(t)));
   this.rotateY   = t       => setVal(multiply(getVal(), rotateY(t)));
   this.rotateZ   = t       => setVal(multiply(getVal(), rotateZ(t)));
   this.save      = ()      => stack[++topIndex] = stack[topIndex-1].slice();
   this.scale     = (x,y,z) => setVal(multiply(getVal(), scale(x,y,z)));
   this.translate = (x,y,z) => setVal(multiply(getVal(), translate(x,y,z)));
   this.value     = ()      => getVal();
}

function onStartFrame(t, state) {

    state.color0 = [1,.5,.2];


    // uTime IS TIME IN SECONDS SINCE START TIME.

    if (!state.tStart)
        state.tStart = t;
    state.time = (t - state.tStart) / 1000;

    gl.uniform1f (state.uTimeLoc  , state.time);


    // uCursor WILL GO FROM -1 TO +1 IN xy, WITH z = 0 FOR MOUSE UP, 1 FOR MOUSE DOWN.

    let cursorValue = () => {
       let p = state.cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    gl.uniform3fv(state.uCursorLoc, cursorValue());


    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    // camera
    gl.uniform3fv(state.cameraLoc, [0., 0., 5.]);

    // Lights
    gl.uniform3fv(state.uLightsLoc[0].src, [2.*Math.sin(state.time), 2.*Math.cos(state.time), -.5]);  //todo
    gl.uniform3fv(state.uLightsLoc[0].col, [.8, .8, .8]);

    gl.uniform3fv(state.uLightsLoc[1].src, [-1.5*Math.cos(state.time), 0., 1.5*Math.sin(state.time)]);
    gl.uniform3fv(state.uLightsLoc[1].col, [.6, .6, .6]);
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {

    let m = state.m;
    let time = state.time;

    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));


 //////////////////////////////////////////////////////////////////////
//                                                                    //
//  THIS IS THE EXAMPLE OF TWO WAVING ARMS THAT WE CREATED IN CLASS.  //
//  FOR HOMEWORK, YOU WILL WANT TO DO SOMETHING DIFFERENT.            //
//                                                                    //
 //////////////////////////////////////////////////////////////////////
    let drawShape = (type, vertices) => {
       // gl.uniform3fv(state.uColorLoc, color);
       gl.uniformMatrix4fv(state.uModelLoc, false, m.value());
       gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
       gl.drawArrays(type, 0, vertices.length / VERTEX_SIZE);
    }
    let drawSphere   = () => drawShape(gl.TRIANGLE_STRIP, sphereVertices);
    let drawCube     = () => drawShape(gl.TRIANGLES, cubeVertices);
    let drawTorus    = () => drawShape(gl.TRIANGLE_STRIP, torusVertices);
    let drawCylinder = () => drawShape(gl.TRIANGLE_STRIP, cylinderVertices);

    m.save(); // start
    m.identity();
    m.translate(0,0,-4);
    m.rotateX(Math.PI / 10+0.1 * Math.sin(time));
    m.rotateY(0.5 * time);

    // sun
    m.save();
      m.translate(300,0,-500);
      m.scale(50,50,50);
      gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.9,.1,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.9,.1,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].specular, [.3,.3,.3]);
      gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
      gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
      gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
      gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
      drawSphere();
    m.restore();

    // center pole
    m.save();
      gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.13,.12,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.13,.12,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
      gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
      gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
      gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
      gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
      m.translate(0,0,0)
      m.scale(.05,.05,1.);
      drawCylinder();
    m.restore();

    // front torus
    m.save();
      m.translate(0,0,1.);
      m.rotateZ(0.8*time);
      // front center
      m.save();
        gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.01,.01,.01]);
        gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.01,.01,.01]);
        gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
        gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
        gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
        gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
        gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
        m.translate(0,0,.05);
        m.save();
          m.translate(0,0,.05);
          m.scale(.07,.07,0.3);
          drawTorus();
        m.restore();
        m.save();
          m.translate(0,0,.1);
          m.scale(.05,.05,0.1);
          drawTorus();
        m.restore();
        m.save();
          m.translate(0,0,-.1);
          m.scale(.1,.1,0.11);
          drawCylinder();
        m.restore();
      m.restore();
      // little cylinders
      for (let i = 0; i < 16; i++) {
        m.save();
          let theta = Math.PI/8 * i;
          m.translate(-.02*Math.cos(theta),-.02*Math.sin(theta),0.08);
          m.translate(.1*Math.cos(theta),.1*Math.sin(theta),0);
          m.rotateX(Math.PI/ 20*Math.sin(theta));
          m.rotateY(Math.PI/ 20*Math.cos(theta));
          m.scale(.01,.01,.03);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.001,.001,.001]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.001,.001,.001]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawCylinder();
        m.restore();
      }

      // two spines
      for (let i = 0; i < 10; i++) {
        m.save();
          // m.translate(0,0,0);
          m.rotateX(Math.PI/ 2);
          m.scale(.06-0.002*i,.02-0.002*i,.1 + 0.5/10*i);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.05,.05,.05]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.13,.06,.06]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawCylinder();
        m.restore();
      }
      // torus
      let deltaTorusFront = .025;
      for (let i = -1; i <= 1; i++){
        m.save();
          m.translate(0,0,i*deltaTorusFront);
          m.scale(.6,.6,.4);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.05,.05,.05]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.13,.06,.06]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawTorus();
        m.restore();
      }
      // bulges
      let numBulgeFront = 20;
      for (let i = 0; i < numBulgeFront; i++) {
        m.save();
          let theta = 2 * Math.PI/numBulgeFront * i;
          m.rotateZ(theta);
          m.translate(-.6, 0 , 0);
          m.scale(.085,.009,.085);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.004,.001,.001]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [70/255*70/255, 30/255*30/255, 27/255*27/255]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [70/255*70/255, 30/255*30/255, 27/255*27/255]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawSphere();
        m.restore();
      }
    m.restore();

    // between front and center
    m.save();
      m.translate(0,0,.7);
      m.save();
        m.translate(0,0,-.1);
        m.scale(.15,.15,0.2);
        gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.1,.1,.1]);
        gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.1,.1,.1]);
        gl.uniform3fv(state.uMaterialsLoc[0].specular, [1,1,1]);
        gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
        gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
        gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
        gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
        drawCylinder();
      m.restore();

    m.restore();


    // center part
    m.save();
      for (let i = 0; i < 3; i++) {
        let theta = 2 * Math.PI / 3 * i;
        m.save();
          m.rotateZ(theta);
          // two connections
          let delta = 0.09;
          m.save();
            m.translate(-.1,0,-delta);
            m.scale(.1,.015,.015);
            gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.07,.05,.05]);
            gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.05,.05,.05]);
            gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
            gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
            gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
            gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
            gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
            drawCube();
          m.restore()
          m.save();
            m.translate(-.1,0,delta);
            m.scale(.1,.015,.015);
            drawCube();
          m.restore()
          // main cube
          m.save();
            m.translate(-.17,0,0);
            m.scale(.05,.05,.12);
            gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.2,.2,.2]);
            gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.2,.2,.2]);
            gl.uniform3fv(state.uMaterialsLoc[0].specular, [1,1,1]);
            gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
            gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
            gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
            gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
            drawCube();
          m.restore()
        m.restore()
      }
    m.restore();

    // back torus
    m.save();
      m.translate(0,0,-.5);
      m.rotateZ(-0.7*time);
      // back center
      gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.01,.01,.01]);
      gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.01,.01,.01]);
      gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
      gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
      gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
      gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
      gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
      m.save();
        m.translate(0,0,.05);
        m.save();
          m.translate(0,0,.05);
          m.scale(.07,.07,0.3);
          drawTorus();
        m.restore();
        m.save();
          m.translate(0,0,.1);
          m.scale(.05,.05,0.1);
          drawTorus();
        m.restore();
        m.save();
          m.translate(0,0,-.05);
          m.scale(.1,.1,0.11);
          drawCylinder();
        m.restore();
      m.restore();
      gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.04,.04,.04]);
      gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.1,.1,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
      gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
      gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
      gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
      gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
      for (let i = 0; i < 16; i++) {
        m.save();
          let theta = Math.PI/8 * i;
          m.translate(-.02*Math.cos(theta),-.02*Math.sin(theta),0.08);
          m.translate(.1*Math.cos(theta),.1*Math.sin(theta),0);
          m.rotateX(Math.PI/ 20*Math.sin(theta));
          m.rotateY(Math.PI/ 20*Math.cos(theta));
          m.scale(.01,.01,.03);
          drawCylinder();
        m.restore();
      }

      // five spines
      let numSpinesBack = 5;
      for (let i = 0; i < numSpinesBack; i++) {
        let theta = 2 * Math.PI / numSpinesBack * i;
        m.save();
          m.rotateZ(theta);
          for (let i = 0; i < 7; i++) {
            m.save();
              m.translate(0.1 + 0.05*i,0,0);
              m.rotateX(Math.PI/ 2);
              m.rotateY(Math.PI/ 2);
              m.scale(.04 - 0.0015*i,.03 - 0.0015*i,.04);
              gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.05,.05,.05]);
              gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.13,.06,.06]);
              gl.uniform3fv(state.uMaterialsLoc[0].specular, [.7,.6,.5]);
              gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
              gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
              gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
              gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
              drawCylinder();
            m.restore();
          }
        m.restore()
      }
      // torus
      let deltaTorusBack = .02;
      for (let i = -2; i <= 2; i++){
        m.save();
          m.translate(0,0,i*deltaTorusBack);
          m.scale(.5,.5,.8);
          drawTorus();
        m.restore();
      }
      // bulges
      let numBulgeBack = 10;
      for (let i = 0; i < numBulgeBack; i++) {
        m.save();
          let theta = 2 * Math.PI/numBulgeBack * (i+1);
          m.rotateZ(theta);
          m.translate(-.5, 0 , 0);
          m.scale(.08,.009,.15);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.004,.001,.001]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [70/255*70/255, 30/255*30/255, 27/255*27/255]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [70/255*70/255, 30/255*30/255, 27/255*27/255]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawSphere();
        m.restore();
      }
    m.restore();


    // back engine
    m.save();
      m.translate(0,0,-.9);
      let numEngines = 6;
      for (let i = 0; i < numEngines; i++) {
        let theta = 2 * Math.PI/numEngines * i;
        m.save();
          m.rotateZ(theta);
          m.translate(-.1, 0 , 0);
          m.scale(.05,.05,.1);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.2,.2,.2]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.2,.2,.2]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [1,1,1]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawCylinder();
        m.restore();
        m.save();
          m.rotateZ(theta);
          m.translate(-.1, 0 , -.08 + 0.02*Math.sin(time));
          m.scale(.02,.02,.07);
          gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.6,.2,.1]);
          gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.6,.2,.1]);
          gl.uniform3fv(state.uMaterialsLoc[0].specular, [0,0,0]);
          gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
          gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
          gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
          gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
          drawSphere();
        m.restore();
      }

    m.restore();


    // planet
    m.save();
      m.translate(1,-12,2);
      m.scale(10,10,10);
      gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.1,.3,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.1,.3,.1]);
      gl.uniform3fv(state.uMaterialsLoc[0].specular, [.3,.3,.3]);
      gl.uniform1f (state.uMaterialsLoc[0].power   , 15.);
      gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
      gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
      gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1.5);
      drawSphere();
    m.restore();

    m.restore(); // end
}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week6',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
