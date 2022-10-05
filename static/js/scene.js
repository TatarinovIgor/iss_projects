
const TEXTURE_PATH = '/static/assets/textures/';

/**
 * Create the animation request.
 */
if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (function() {
    return window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    function (callback, element) {
      // 60 FPS
      window.setTimeout(callback, 1000 / 60);
    };
  })();
}

/**
 * Set our global variables.
 */
var camera,
    scene,
    renderer,
    effect,
    controls,
    element,
    container,
    sphere,
    sphereCloud,
    rotationPoint,
    iss;
var degreeOffset = 90;
var issXX = issXY = issY = 0;
var stats = new Stats();
var earthRadius = 80;
var issRadius = earthRadius + 20;

var getEarthRotation = function() {
  // Get the current time.
  var d = new Date();
  var h = d.getUTCHours();
  var m = d.getUTCMinutes();

  // Calculate total minutes.
  var minutes = h * 60;
  minutes += m;

  // Turn minutes into degrees.
  degrees = minutes/3.9907;

  // Add an offset to match UTC time.
  degrees += degreeOffset;
  return degrees;
}

function localGetJSON(url, success) {
    var soil = new XMLHttpRequest();
    soil.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
    data = JSON.parse(this.responseText)
      result = {
	    "iss_position": {
		    "latitude": parseFloat(data.iss_position.latitude),
		    "longitude": parseFloat(data.iss_position.longitude),}}
      success(result);
      }
    };
   soil.open("GET", url, false);
   soil.send(null);
}

// Set the initial ISS position.
var setISSPosition = function() {
  localGetJSON("https://request-iss-data.herokuapp.com/", function( result ) {

    // Set the latitude position.
    issXX = issRadius * Math.cos(result.iss_position.latitude * Math.PI/180);
    issXY = issRadius * Math.sin(result.iss_position.latitude * Math.PI/180);

    // Set the longitude position.
    if (result.iss_position.longitude < 0) {
      issY = 360 + result.iss_position.longitude;
    } else {
      issY = result.iss_position.longitude;
    }

    // Convert the degrees to radians.
    issY = issY * (Math.PI/180);
  });
}

var degrees = getEarthRotation();
setISSPosition();

// Calculate Earth's rotation position.
setInterval(function() {
  // Get the current time.
  var d = new Date();
  var h = d.getUTCHours();
  var m = d.getUTCMinutes();

  // Calculate total minutes.
  var minutes = h * 60;
  minutes += m;

  // Turn minutes into degrees.
  degrees = minutes/3.9907;

  // Add an offset to match UTC time.
  degrees += degreeOffset;
}, 60000);

init();
animate();

/**
 * Initializer function.
 */
function init() {
  // Build the container
  container = document.createElement( 'div' );
  document.body.appendChild( container );

  // Create the scene.
  scene = new THREE.Scene();

  // Create a rotation point.
  worldRotationPoint = new THREE.Object3D();
  worldRotationPoint.position.set( 0, 0, 0 );
  scene.add( worldRotationPoint );

  rotationPoint = new THREE.Object3D();
  rotationPoint.position.set( 0, 0, earthRadius * 4 );
  scene.add( rotationPoint );

  // Create the ISS rotation point.
  issRotationPointX = new THREE.Object3D();
  issRotationPointX.position.set( 0, 0, 0 );
  issRotationPointX.rotation.y = -1 * ( 95 * Math.PI/180 );
  worldRotationPoint.add( issRotationPointX );

  issRotationPoint = new THREE.Object3D();
  issRotationPoint.position.set( 0, 0, 0 );
  issRotationPointX.add( issRotationPoint );

  // Create the camera.
  camera = new THREE.PerspectiveCamera(
   45, // Angle
    window.innerWidth / window.innerHeight, // Aspect Ratio.
    1, // Near view.
    10000 // Far view.
  );
  rotationPoint.add( camera );

  // Build the renderer.
  renderer = new THREE.WebGLRenderer();
  element = renderer.domElement;
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.shadowMap.enabled;
  container.appendChild( element );

  // Build the controls.
  controls = new THREE.OrbitControls( camera, element );
  controls.enablePan = true; //false;
  controls.enableZoom = true; //false;
  controls.minDistance = issRadius + 10;
  controls.maxDistance = earthRadius * 8;
  controls.target.copy( new THREE.Vector3( 0, 0, -1 * earthRadius * 4 ));

  function setOrientationControls(e) {
    if (!e.alpha) {
     return;
    }

    controls = new THREE.DeviceOrientationControls( camera );
    controls.connect();

    window.removeEventListener('deviceorientation', setOrientationControls, true);
  }
  window.addEventListener('deviceorientation', setOrientationControls, true);

  // Ambient lights
  var ambient = new THREE.AmbientLight( 0x222222 );
  scene.add( ambient );

  // The sun.
  var light = new THREE.PointLight( 0xffeecc, 1, 5000 );
  light.position.set( -400, 0, 100 );
  scene.add( light );

  // Since the sun is much bigger than a point of light, add four fillers.
  var light2 = new THREE.PointLight( 0xffffff, 0.6, 4000 );
  light2.position.set( -400, 0, 250 );
  scene.add( light2 );

  var light3 = new THREE.PointLight( 0xffffff, 0.6, 4000 );
  light3.position.set( -400, 0, -150 );
  scene.add( light3 );

  var light4 = new THREE.PointLight( 0xffffff, 0.6, 4000 );
  light4.position.set( -400, 150, 100 );
  scene.add( light4 );

  var light5 = new THREE.PointLight( 0xffffff, 0.6, 4000 );
  light5.position.set( -400, -150, 100 );
  scene.add( light5 );

  // Show FPS
  stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb

  // align top-left
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0';
  stats.domElement.style.top = '0';

  // Add the Earth sphere model.
  var geometry = new THREE.SphereGeometry( earthRadius, 128, 128 );

  // Create the Earth materials.
  var materialJSON;
  loadJSON(TEXTURE_PATH + "earth/earth.json", function( response ) {
    materialJSON = JSON.parse( response );

    loader = new THREE.TextureLoader();
    var texture = loader.load( materialJSON.image );

    var bump = null;
    bump = loader.load( materialJSON.bump );

    var spec = null;
    spec = loader.load( materialJSON.spec );

    var material = new THREE.MeshPhongMaterial({
      color: materialJSON.color,
      shininess: parseInt(materialJSON.shininess),
      map: texture,
      specularMap: spec,
      specular: "#666666",
      bumpMap: bump,
    });

    sphere = new THREE.Mesh( geometry, material );
    sphere.position.set( 0, 0, 0 );
    sphere.rotation.y = Math.PI;

    // Focus initially on the prime meridian.
    sphere.rotation.y = -1 * (8.7 * Math.PI / 17);

    // Add the Earth to the scene.
    worldRotationPoint.add( sphere );
  });

  // Add the Earth sphere model.
  var geometryCloud = new THREE.SphereGeometry( earthRadius + 0.2, 128, 128 );

  loader = new THREE.TextureLoader();
  var alpha = loader.load( "/static/assets/textures/earth/alphaMap.jpg" );

  var materialCloud = new THREE.MeshPhongMaterial({
    alphaMap: alpha,
  });

  materialCloud.transparent = true;

  sphereCloud = new THREE.Mesh( geometryCloud, materialCloud );
  scene.add( sphereCloud );

  // Create glow effect. I got this from http://stemkoski.github.io/Three.js/Simple-Glow.html.
  var spriteMaterial = new THREE.SpriteMaterial({
    map: new THREE.ImageUtils.loadTexture( '/static/assets/textures/earth/glow.png' ),
    color: 0x0099ff,
    transparent: false,
    blending: THREE.AdditiveBlending
  });
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.set( earthRadius * 2.5, earthRadius * 2.5, 1.0);
  sphereCloud.add(sprite);

  // Add the ISS.
  loader.load('/static/assets/iss/ISS.glb', function(gltf){
    iss = gltf.scene.children[0];
    scene.add(gltf.scene);
    iss.scale.set(0.5,0.5,0.5);
    iss.position.set(0,0,issRadius);
    issRotationPoint.add(iss);
  });
  /*var issGeometry = new THREE.SphereGeometry( 2, 8, 8 );
  var issMaterial = new THREE.MeshLambertMaterial({
    color: 0xff0000
  });
  iss = new THREE.Mesh( issGeometry, issMaterial );
  iss.position.set( 0, 0, issRadius );
  issRotationPoint.add(iss);
  */

  // Create a spot light and attach it to the station.
  var spotLight = new THREE.SpotLight( 0xffffff, 1, 100, 3 * Math.PI/2);
  spotLight.position.set( 0, 0, 0 );
  iss.add( spotLight );

  // Add the skymap.
  var urlPrefix = "/static/assets/skymap/";
  var urls = [
    urlPrefix + 'test.jpg', //'top.jpg', // top
    urlPrefix + 'test.jpg', //'bottom.jpg', // bottom
    urlPrefix + 'test.jpg', //'left.jpg', // left
    urlPrefix + 'test.jpg', //'right.jpg', // right
    urlPrefix + 'test.jpg', //'front.jpg', // front
    urlPrefix + 'test.jpg', //'back.jpg', // back

  ];

  var cubemap = THREE.ImageUtils.loadTextureCube( urls ); // load textures
  cubemap.format = THREE.RGBFormat;

  var shader = THREE.ShaderLib['cube']; // init cube shader from built-in lib
  shader.uniforms['tCube'].value = cubemap; // apply textures to shader

  // create shader material
  var skyBoxMaterial = new THREE.ShaderMaterial( {
    fragmentShader: shader.fragmentShader,
    vertexShader: shader.vertexShader,
    uniforms: shader.uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });

  // create skybox mesh
  var skybox = new THREE.Mesh(
    new THREE.CubeGeometry( 2000, 2000, 2000 ),
    skyBoxMaterial
  );

  scene.add(skybox);

  document.body.appendChild( stats.domElement );
  window.addEventListener('resize', onWindowResize, false);
}

/**
 * Events to fire upon window resizing.
 */
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Updates to apply to the scene while running.
 */
function update() {
  camera.updateProjectionMatrix();
  worldRotationPoint.rotation.y = degrees * Math.PI/180;
  sphereCloud.rotation.y += 0.00025;

  iss.position.set(issXX, issXY, 0);
  issRotationPoint.rotation.y = issY;
}

/**
 * Render the scene.
 */
function render() {
  renderer.render(scene, camera);
}

/**
 * Animate the scene.
 */
function animate() {
  requestAnimationFrame(animate);
  stats.begin();
  update();
  render();
  stats.end();
}

function loadJSON(file, callback) {
  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', file, true);
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value
      // but simply returns undefined in asynchronous mode.
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}


// Grab ISS position.
setInterval(function() {
  localGetJSON("https://request-iss-data.herokuapp.com/", function( result ) {

    // Set the latitude position.
    issXX = issRadius * Math.cos(result.iss_position.latitude * Math.PI/180);
    issXY = issRadius * Math.sin(result.iss_position.latitude * Math.PI/180);

    // Set the longitude position.
    if (result.iss_position.longitude < 0) {
      issY = 360 + result.iss_position.longitude;
    } else {
      issY = result.iss_position.longitude;
    }

    // Convert the degrees to radians.
    issY = issY * (Math.PI/180);
  });
}, 3000);