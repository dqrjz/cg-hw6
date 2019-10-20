#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform vec3  uColor;
uniform vec3  uCursor; // CURSOR: xy=pos, z=mouse up/down
uniform float uTime;   // TIME, IN SECONDS

in vec2 vXY;           // POSITION ON IMAGE
in vec3 vPos;          // POSITION
in vec3 vNor;          // NORMAL

out vec4 fragColor;    // RESULT WILL GO HERE

const int NL = 2;
const int NS = 1;

struct Light {
    vec3 src;
    vec3 col;
};

struct Ray {
    vec3 src;
    vec3 dir;
};

struct Material {
	vec3  ambient;
	vec3  diffuse;
	vec3  specular;
	float power;
	vec3  reflect; 			 // Reflection color. Black means no reflection.
	vec3  transparent;       // Transparency color. Black means the object is opaque.
    float indexOfRefraction; // Higher value means light will bend more as it refracts.
};

uniform vec3 camera;
uniform Light uLights[NL];
uniform Material uMaterials[NS];


Ray computeRay(vec3 src, vec3 dest) {
    Ray r;
    r.src = src;
    r.dir = normalize(dest - src);
    return r;
}

vec3 computeSurfaceNormal(vec3 P) {
    return normalize(vNor);
}

Ray reflectRay(Ray R, vec3 N) {
    Ray r;
    r.src = R.src;
    r.dir = normalize(2. * dot(N, R.dir) * N - R.dir);
    return r;
}

// PHONG SHADING
vec3 phongShading(vec3 P, int iS) {
    Material M = uMaterials[iS];
    vec3 N = computeSurfaceNormal(P);
    vec3 color = M.ambient;
    for(int i = 0;i < NL; i++) {
        Ray L = computeRay(P, uLights[i].src);
        Ray E = computeRay(P, camera); // E = -W
        Ray R = reflectRay(L, N);
        color += uLights[i].col * (M.diffuse * max(0., dot(N, L.dir)));
		float ER = dot(E.dir, R.dir);
		float spec;
        if(ER > 0.) {
            spec = max(0., exp(M.power * log(ER)));
        } else {
            spec = 0.;
        }
        color += uLights[i].col * M.specular * spec;
    }
    return color;
}

void main() {
    // vec3 lDir  = vec3(.57,.57,.57);
    // vec3 shade = vec3(.1,.1,.1) + vec3(1.,1.,1.) * max(0., dot(lDir, normalize(vNor)));
    // vec3 color = shade;
	vec3 color = phongShading(vPos, 0);

    // HIGHLIGHT CURSOR POSITION WHILE MOUSE IS PRESSED
    if (uCursor.z > 0. && min(abs(uCursor.x - vXY.x), abs(uCursor.y - vXY.y)) < .01)
          color = vec3(1.,1.,1.);

    fragColor = vec4(sqrt(color * uColor), 1.0);
}


