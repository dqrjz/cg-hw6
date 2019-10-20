"use strict"


const VERTEX_SIZE = 6; // EACH VERTEX CONSISTS OF: x,y,z, ny,ny,nz


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

let cubeVertices = createCubeVertices();


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
                    state.uLightsLoc[i].src = gl.getUniformLocation(program, 'uLights[' + i + '].src');
                    state.uLightsLoc[i].col = gl.getUniformLocation(program, 'uLights[' + i + '].col');
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

    gl.uniformMatrix4fv(state.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(state.uProjLoc, false, new Float32Array(projMat));


 //////////////////////////////////////////////////////////////////////
//                                                                    //
//  THIS IS THE EXAMPLE OF TWO WAVING ARMS THAT WE CREATED IN CLASS.  //
//  FOR HOMEWORK, YOU WILL WANT TO DO SOMETHING DIFFERENT.            //
//                                                                    //
 //////////////////////////////////////////////////////////////////////

    m.save();
    m.identity();
    m.translate(0,0,-6);
    m.rotateY(0.3*state.time);
     m.rotateY(1);
    m.save();
    gl.uniform3fv(state.uMaterialsLoc[0].ambient , [0.,.3,1.]);
    gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [0.,.3,1.]);
    gl.uniform3fv(state.uMaterialsLoc[0].specular, [0.,1.,1.]);
    gl.uniform1f (state.uMaterialsLoc[0].power   , 20.);
    gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
    gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
    gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction   , 1.5);
    m.translate(0., 0.4 + 0.5 * Math.sin(3 * state.time), -0.3);
      // head
      m.save();
          m.translate(0., .5, 0.25);
          m.scale(.3, .3, .3);
          m.rotateX(0.3 - 0.3 * Math.sin(3 * state.time));

          gl.uniformMatrix4fv(state.uModelLoc, false, m.value() );
          gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
      m.restore();
      // body
      m.save();
          m.translate(0., -0.5, 0.2);
          m.scale(.2, .6, .2);

          gl.uniformMatrix4fv(state.uModelLoc, false, m.value() );
          gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
      m.restore();

      for (let side = -1 ; side <= 1 ; side += 2) {
         let theta = Math.sin(3 * state.time) * side;
         m.save();
            m.translate(side * .3,0,0);
            m.rotateZ(theta);               // SHOULDER
            m.rotateY(-side + .8 * theta);
            m.translate(side * .3,0,0);
            m.save();
               m.scale(.3,.05,.05);
               gl.uniform3fv(state.uColorLoc, state.color0 );
               gl.uniformMatrix4fv(state.uModelLoc, false, m.value() );
               gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
            m.restore();

            m.translate(side * .3,0,0);
            m.rotateZ(theta);              // ELBOW
            m.translate(side * .3,0,0);
            m.save();
               m.scale(.3,.05,.05);
               gl.uniform3fv(state.uColorLoc, state.color0 );
               gl.uniformMatrix4fv(state.uModelLoc, false, m.value() );
               gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
            m.restore();
         m.restore();
      }

      for (let side = -1 ; side <= 1 ; side += 2) {
         let theta = Math.sin(3 * state.time) * side;
         m.save();
            m.translate(0,-1.2,0.25);
            m.translate(side * .3,0,0);
            m.rotateZ(-side * 0.9 + 0.5 * theta);               // SHOULDER
            //m.rotateY(-side + .8 * theta);
            m.translate(side * .3,0,0);

            m.save();
               m.scale(.35,.05,.05);
               gl.uniform3fv(state.uColorLoc, state.color0 );
               gl.uniformMatrix4fv(state.uModelLoc, false, m.value() );
               gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
            m.restore();

            
         m.restore();
      }
    m.restore();

    m.save();
      gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.5,.6,.3]);
      gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [.5,.6,.3]);
      gl.uniform3fv(state.uMaterialsLoc[0].specular, [0.,1.,1.]);
      gl.uniform1f (state.uMaterialsLoc[0].power   , 20.);
      gl.uniform3fv(state.uMaterialsLoc[0].reflect , [1.0,1.0,1.0]);
      gl.uniform3fv(state.uMaterialsLoc[0].transparent, [0.5,0.5,0.5]);
      gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction   , 1.5);

      m.translate(0., -2., 0.);
      m.scale(1., .05, 1.);

      gl.uniformMatrix4fv(state.uModelLoc, false, m.value() );
      gl.drawArrays(gl.TRIANGLES, 0, cubeVertices.length / VERTEX_SIZE);
    m.restore();


    m.restore();
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
