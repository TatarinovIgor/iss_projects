/**
 * @file
 * The main scene.
 */

/**
 * @file
 * The main scene.
 */

/**
 * Define constants.
 */
const TEXTURE_PATH = '../assets/textures/';

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
    rotationPoint;
var stats = new Stats();
var earthRadius = 80;

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
  rotationPoint = new THREE.Object3D();

  rotationPoint = new THREE.Object3D();
  rotationPoint.position.set(0, 0, 350);
  scene.add( rotationPoint );


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

  // Add the VR screen effect.
  effect = new THREE.StereoEffect( renderer );
  effect.setSize( window.innerWidth, window.innerHeight );
  effect.separation = 0;

  // Build the controls.
  controls = new THREE.OrbitControls( camera, element );
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.target.copy( new THREE.Vector3( 0, 0, -350 ));

  function setOrientationControls(e) {
    if (!e.alpha) {
     return;
    }

    controls = new THREE.DeviceOrientationControls(camera);
    controls.connect();

    window.removeEventListener('deviceorientation', setOrientationControls, true);
  }
  window.addEventListener('deviceorientation', setOrientationControls, true);

  // Lights
  var ambient = new THREE.AmbientLight( 0x222222 ); // soft white light
  scene.add( ambient );

  // Room Lights.
  var light = new THREE.PointLight( 0xffeecc, 3, 5000 );
  light.position.set( -400, 0, 100 );
  scene.add( light );

  // Show FPS
  stats.setMode( 0 ); // 0: fps, 1: ms, 2: mb

  // align top-left
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0';
  stats.domElement.style.top = '0';

  // Add the Earth sphere model.
  var geometry = new THREE.SphereGeometry( earthRadius, 64, 64 );

  // Create the Earth materials.
  var materialJSON;
  loadJSON(TEXTURE_PATH + "earth/earth.json", function( response ) {
    materialJSON = JSON.parse( response );

    loader = new THREE.TextureLoader();
    var texture = loader.load( materialJSON.image );
    texture.anisotropy = renderer.getMaxAnisotropy();
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( materialJSON.sizeX, materialJSON.sizeY );

    var bump = null;
    bump = loader.load( materialJSON.bump );
    bump.anisotropy = renderer.getMaxAnisotropy();
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set( materialJSON.sizeX, materialJSON.sizeY );

    var spec = null;
    spec = loader.load( materialJSON.spec );
    spec.anisotropy = renderer.getMaxAnisotropy();
    spec.wrapS = spec.wrapT = THREE.RepeatWrapping;
    spec.repeat.set( materialJSON.sizeX, materialJSON.sizeY );

    var material = new THREE.MeshPhongMaterial({
      color: materialJSON.color,
      shininess: parseInt(materialJSON.shininess),
      map: texture,
      specularMap: spec,
      specular: "#666666",
      bumpMap: bump,
    });

    sphere = new THREE.Mesh( geometry, material );
    sphere.position.set(0, 0, 0);
    scene.add( sphere );
  });

  // Add the Earth sphere model.
  var geometryCloud = new THREE.SphereGeometry( earthRadius + 1, 64, 64 );

  loader = new THREE.TextureLoader();
  var alpha = loader.load( "../assets/textures/earth/alphaMap.jpg" );
  alpha.anisotropy = renderer.getMaxAnisotropy();
  alpha.wrapS = alpha.wrapT = THREE.RepeatWrapping;
  alpha.repeat.set( 1, 1 );

  var materialCloud = new THREE.MeshPhongMaterial({
    alphaMap: alpha,
  });

  materialCloud.transparent = true;

  sphereCloud = new THREE.Mesh( geometryCloud, materialCloud );
  sphereCloud.position.set( 0, 0, 0 );
  scene.add( sphereCloud );

  // Create glow effect. I got this from http://stemkoski.github.io/Three.js/Simple-Glow.html.
  var spriteMaterial = new THREE.SpriteMaterial({
    map: new THREE.ImageUtils.loadTexture( '../assets/textures/earth/glow.png' ),
    color: 0x0099ff,
    transparent: false,
    blending: THREE.AdditiveBlending
  });
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.set(earthRadius * 2.5, earthRadius * 2.5, 1.0);
  sphereCloud.add(sprite);

  // Add the skymap.
  var urlPrefix = "../assets/skymap/";
  var urls = [
    urlPrefix + 'top.jpg', // right
    urlPrefix + 'bottom.jpg', // left
    urlPrefix + 'left.jpg', // top
    urlPrefix + 'right.jpg', // bottom
    urlPrefix + 'front.jpg', // front
    urlPrefix + 'back.jpg', // back

  ];

  var cubemap = THREE.ImageUtils.loadTextureCube(urls); // load textures
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
    new THREE.CubeGeometry(2000, 1000, 1000),
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
  effect.setSize(window.innerWidth, window.innerHeight);
}

/**
 * Updates to apply to the scene while running.
 */
function update() {
  camera.updateProjectionMatrix();
  controls.update();
  sphere.rotation.y += 0.00025;
  sphereCloud.rotation.y += 0.0005;

}

/**
 * Render the scene.
 */
function render() {
  effect.render(scene, camera);
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
