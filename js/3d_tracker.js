// UPDATED 05/07/2021 - touch controls

/**********************************************
* UTILS
**********************************************/
const fetchData = async (endpoint) => {
  const res = await fetch(endpoint);

  if (res.ok) {
    const data = await res.json();
    return data;
  }

  throw new Error('unexpected status', response);
};

const applyMaterialTextures = (textures, material, assetPrefix = 'root', cb) => {
  let count = 0;
  Object.entries(textures).forEach(([property, url], i, l) => {
    const asset = new pc.Asset(`${assetPrefix}-${property}`, 'texture', { url });
    app.assets.add(asset);
    app.assets.load(asset);
    asset.ready(() => {
      count++;
      material[property] = asset.resource;
      if (count === l.length) {
        if (typeof cb === 'function') cb(material);
      }
    });
  });
};

/**********************************************
* SETUP
* ---------------------------------------------
* create canvas and add it to the DOM
* create app and attach canvas and inputs
* enable crossorigin asset loading
* setup window resize listeners
* setup canvasFillMode, canvasResolution
* load slighly higher res sphere model
**********************************************/
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const app = new pc.Application(canvas, {
  elementInput: new pc.ElementInput(canvas),
  keyboard: new pc.Keyboard(canvas),
  mouse: new pc.Mouse(canvas),
  touch: 'ontouchstart' in window ? new pc.TouchDevice(canvas) : null,
});
app.start();
app.loader.getHandler('texture').crossOrigin = 'anonymous';

app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

window.addEventListener('resize', function () {
  app.resizeCanvas(canvas.width, canvas.height);
});

app.scene.ambientLight = new pc.Color(0.1529, 0.1529, 0.1529);
app.scene.gammaCorrection = pc.GAMMA_SRGB;
app.scene.toneMapping = pc.TONEMAP_ACES;
app.scene.lightmapMaxResolution = 2048
app.scene.lightmapMode = pc.BAKE_COLORDIR;
app.scene.lightmapSizeMultiplier = 16;

const SPHERE_MODEL = 'https://s.halvves.com/sphere.json';
const sphereModel = new pc.Asset('sphere', 'model', { url: SPHERE_MODEL });
app.assets.add(sphereModel);
app.assets.load(sphereModel);

/**********************************************
* SCRIPT: LOADING MANAGER
* ---------------------------------------------
* rotate entity based on a speed attribute
**********************************************/
const LoadingManager = pc.createScript('loading-manager');

LoadingManager.prototype.initialize = function() {
  this.skyboxIntensity = 0;

  this.loadedMaterials = [];
  this.matOpacity = 0;
  this.targetOpacity = 0;

  this.main = null;
  this.mainScale = new pc.Vec3(0.001, 0.001, 0.001);
  this.mainTargetScale = new pc.Vec3().copy(this.mainScale);

  this.app.on('material:loaded', this.handleMaterialLoad, this);
  this.app.once('skymap:loaded', this.handleSkymapLoad, this);
  this.app.once('register:main', this.registerMain, this);
};

LoadingManager.prototype.update = function(dt) {
  if (this.targetOpacity > 0 && this.matOpacity < 1) {
    this.matOpacity = pc.math.lerp(this.matOpacity, this.targetOpacity, dt);
    this.loadedMaterials.forEach(mat => mat.setParameter('material_opacity', this.matOpacity));
  }

  if (this.skyboxIntensity > 0 && app.scene.skyboxIntensity < 1) {
    app.scene.skyboxIntensity = pc.math.lerp(
      app.scene.skyboxIntensity,
      this.skyboxIntensity,
      0.1 * dt
    );
  }

  if (this.main && this.mainTargetScale.x === 1) {
    this.mainScale.lerp(this.main.getLocalScale(), this.mainTargetScale, 2 * dt);
    this.main.setLocalScale(this.mainScale);
  }
};

LoadingManager.prototype.handleMaterialLoad = function(mat) {
  this.loadedMaterials.push(mat);

  if (this.loadedMaterials.length === 3) {
    setTimeout(() => this.mainTargetScale.set(1, 1, 1), 2000);
    setTimeout(() => this.targetOpacity = 1, 2500);
  }
}

LoadingManager.prototype.handleSkymapLoad = function() {
  this.skyboxIntensity = 1;
};

LoadingManager.prototype.registerMain = function(main) {
  this.main = main;
};

app.root.addComponent('script');
app.root.script.create(LoadingManager.__name);

/**********************************************
* SCENE: SKYBOX
**********************************************/
const SKYMAP_ASSETS = [
  'https://s.halvves.com/TychoSkymapII.t3_08192x04096_80_mx.jpg',
  'https://s.halvves.com/TychoSkymapII.t3_08192x04096_80_px.jpg',
  'https://s.halvves.com/TychoSkymapII.t3_08192x04096_80_my.jpg',
  'https://s.halvves.com/TychoSkymapII.t3_08192x04096_80_py.jpg',
  'https://s.halvves.com/TychoSkymapII.t3_08192x04096_80_pz.jpg',
  'https://s.halvves.com/TychoSkymapII.t3_08192x04096_80_mz.jpg'
];

const skymapAsset = new pc.Asset('skymap', 'cubemap', null, {
  'textures': SKYMAP_ASSETS.map((url, i) => {
    const asset = new pc.Asset(`skymap-${i}`, 'texture', { url });
    app.assets.add(asset);
    app.assets.load(asset);
    return asset.id;
  }),
  'magFilter': 1,
  'minFilter': 5,
  'anisotropy': 1,
  'name': 'skymap',
});
app.scene.skyboxIntensity = 0;
app.assets.add(skymapAsset);
app.assets.load(skymapAsset);
skymapAsset.ready(() => {
  app.scene.skyboxMip = 1;
  app.scene.setSkybox(skymapAsset.resources);
  app.fire('skymap:loaded');
});


/**********************************************
* SCRIPT: ORBIT CAMERA
* ---------------------------------------------
*
**********************************************/
var Camera = pc.createScript('camera');

Camera.attributes.add('maxElevation', {
  type: 'number',
  title: 'Max Elevation',
  default: 70
});

// initialize code called once per entity
Camera.prototype.initialize = function() {
  this.prevTouch = {};
  this.prevPinch = 0;
  this.viewPos = new pc.Vec3();
  this.targetViewPos = new pc.Vec3();
  this.tempVec = new pc.Vec3();

  this.distance = 5;
  this.targetDistance = 5;

  this.rotX = 180;
  this.rotY = -15;
  this.targetRotX = 25;
  this.targetRotY = 15;
  this.quatX = new pc.Quat();
  this.quatY = new pc.Quat();

  this.transformStarted = false;

  this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
  this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
  if (this.app.touch) {
    this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStart, this);
    this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
    this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchEnd, this);
  }
};

Camera.prototype.dolly = function (movez) {
  this.targetDistance = Math.max(this.targetDistance + movez, 1.8);
};

Camera.prototype.orbit = function (movex, movey) {
  this.targetRotX += movex;
  this.targetRotY += movey;
  this.targetRotY = pc.math.clamp(this.targetRotY, -this.maxElevation, this.maxElevation);
};

Camera.prototype.onMouseWheel = function (event) {
  event.event.preventDefault();
  this.dolly(event.wheel * -0.25);
};

Camera.prototype.onMouseMove = function (event) {
  if (event.buttons[pc.MOUSEBUTTON_LEFT])
    this.orbit(event.dx * 0.2, event.dy * 0.2);
};

Camera.prototype.updatePrevTouch = function (event) {
  event.touches.forEach(touch => {
    this.prevTouch[touch.id] = {
      x: touch.x,
      y: touch.y
    }
  })
}

Camera.prototype.getPinch = function (event) {
  if (event.touches.length === 2) {
    const [a, b] = event.touches;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
    return d;
  } else {
    return 0;
  }
}

Camera.prototype.onTouchStart = function (event) {
  this.updatePrevTouch(event);
  this.prevPinch = this.getPinch(event);
}

Camera.prototype.onTouchMove = function (event) {
  if (event.touches.length === 1) {
    const [touch] = event.touches;
    const prev = this.prevTouch[touch.id];
    const dx = touch.x - prev.x;
    const dy = touch.y - prev.y;
    this.orbit(dx * 0.2, dy * 0.2);
  } else if (event.touches.length === 2) {
    const d = this.getPinch(event);
    const move = d - this.prevPinch;
    this.dolly(move * -.0125);
    this.prevPinch = d;
  }

  this.updatePrevTouch(event);
}

// update code called every frame
Camera.prototype.update = function(dt) {
  // Implement a delay in camera controls by lerping towards a target
  this.viewPos.lerp(this.viewPos, this.targetViewPos, dt / 0.1);
  this.distance = pc.math.lerp(this.distance, this.targetDistance, dt / 0.2);
  this.rotX = pc.math.lerp(this.rotX, this.targetRotX, dt / 0.2);
  this.rotY = pc.math.lerp(this.rotY, this.targetRotY, dt / 0.2);

  // Calculate the camera's rotation
  this.quatX.setFromAxisAngle(pc.Vec3.RIGHT, -this.rotY);
  this.quatY.setFromAxisAngle(pc.Vec3.UP, -this.rotX);
  this.quatY.mul(this.quatX);

  // Set the camera's current position and orientation
  this.entity.setPosition(this.viewPos);
  this.entity.setRotation(this.quatY);
  this.entity.translateLocal(0, 0, this.distance);
};


/**********************************************
* ENTITY: CAMERA
**********************************************/
const camera = new pc.Entity();
camera.addComponent('camera', { clearColor: new pc.Color(0, 0, 0) });
camera.setPosition(0, 0, 3);
camera.addComponent('script');
camera.script.create(Camera.__name);
app.root.addChild(camera);

/**********************************************
* SCRIPT: ROTATE
* ---------------------------------------------
* rotate entity based on a speed attribute
**********************************************/
const Rotate = pc.createScript('rotate');

Rotate.attributes.add('speed', { type: 'number', default: 1 });

Rotate.prototype.update = function(dt) {
  this.entity.rotateLocal(0, dt * this.speed, 0);
};

/**********************************************
* SCRIPT: EARTHTIME
* ---------------------------------------------
* rotate entity based on time on earth
**********************************************/
const ROTATION_AT_MIDNIGHT = -60; // rough estimation for this model
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const EarthTime = pc.createScript('earth-time');

EarthTime.prototype.update = function(dt) {
  const progress = (Date.now() % DAY_IN_MS) / DAY_IN_MS;
  const rotation = progress * 360 + ROTATION_AT_MIDNIGHT;
  this.entity.setEulerAngles(0, rotation, 0);
};

/**********************************************
* ENTITY: MAIN
**********************************************/
const main = new pc.Entity();
main.setLocalScale(0.001, 0.001, 0.001);
main.addComponent('script');
main.script.create(EarthTime.__name);
app.root.addChild(main);
app.fire('register:main', main);

/**********************************************
* ENTITY: EARTH
**********************************************/
const EARTH_ASSETS = {
  diffuseMap: 'https://s.halvves.com/earth_diffuse_map.jpg',
  specularMap: 'https://s.halvves.com/earth_specular_map.jpg',
  normalMap: 'https://s.halvves.com/earth_normal_map.png',
  emissiveMap: 'https://s.halvves.com/earth_emissive_map.jpg',
};

const EARTH_EMISSIVE_SHADER = `
uniform sampler2D texture_emissiveMap;

vec3 getEmission() {
  // dot the world space normal with the world space directional light vector
  float nDotL = dot(dNormalW, light0_direction);
  // clamp it between zero and one
  float factor = clamp(nDotL, 0.0, 1.0);
  // scale the emissive map by the 'nighttime' factor
  return $texture2DSAMPLE(texture_emissiveMap, $UV).$CH * factor;
}`;

const earth = new pc.Entity();
earth.setLocalScale(50, 50, 50);
earth.addComponent('model', { type: 'asset' });

const earthMaterial = new pc.StandardMaterial();

earthMaterial.blendType = pc.BLEND_NORMAL;
earthMaterial.opacity = 0;
earthMaterial.specular = new pc.Color(0.3608, 0.3608, 0.3608);
earthMaterial.specularTint = true;
earthMaterial.shininess = 38.38;
earthMaterial.emissiveIntensity = 1;
earthMaterial.bumpiness = 1;

applyMaterialTextures(EARTH_ASSETS, earthMaterial, 'earth', mat => {
  mat.chunks.emissivePS = EARTH_EMISSIVE_SHADER;
  mat.update();
  app.fire('material:loaded', mat);
});

sphereModel.ready(() => {
  earth.model.asset = sphereModel;
  earth.model.model.meshInstances[0].material = earthMaterial;
});

main.addChild(earth);

/**********************************************
* ENTITY: CLOUDS
**********************************************/
const CLOUDS_ASSETS = {
  opacityMap: 'https://s.halvves.com/clouds_opacity_map.jpg',
};

const clouds = new pc.Entity();
clouds.setLocalScale(1.01, 1.01, 1.01);
clouds.addComponent('model', { type: 'asset' });
clouds.addComponent('script');
clouds.script.create(Rotate.__name, {
  attributes: { speed: 0.1 }
});

const cloudsMaterial = new pc.StandardMaterial();
cloudsMaterial.blendType = pc.BLEND_PREMULTIPLIED;
cloudsMaterial.opacity = 0;
cloudsMaterial.shininess = 32;
cloudsMaterial.opacityMapChannel = 'r';

applyMaterialTextures(CLOUDS_ASSETS, cloudsMaterial, 'clouds', mat => {
  mat.update();
  app.fire('material:loaded', mat);
});

sphereModel.ready(() => {
  clouds.model.asset = sphereModel;
  clouds.model.model.meshInstances[0].material = cloudsMaterial;
});

earth.addChild(clouds);

/**********************************************
* ENTITY: ATMOSPHERE
**********************************************/
const ATMOSPHERE_EMISSIVE_SHADER = `
uniform vec3 material_emissive;

vec3 getEmission() {
  // Dot the world space normal with the world space directional light vector
  float nDotL = dot(dNormalW, light0_direction);
  // fresnel factor
  float fresnel = 1.0 - max(dot(dNormalW, dViewDirW), 0.0);
  float atmosphereFactor = max(0.0, pow(fresnel * 1.5, 1.5)) - max(0.0, pow(fresnel, 15.0)) * 6.0;
  vec3 atmosphereColorDay = vec3(0.3, 0.7, 1);
  vec3 atmosphereColorDark = vec3(0, 0, 0.5);
  vec3 atmosphereColorSunset = vec3(1, 0.3, 0.1);
  vec3 atmosphereColorNight = vec3(0.05, 0.05, 0.1);

  float reflecting = max(0.0, dot(reflect(dViewDirW, dNormalW), light0_direction));

  atmosphereColorDark = mix(
    atmosphereColorDark,
    atmosphereColorSunset + atmosphereColorSunset * reflecting * 2.0,
    pow(reflecting, 16.0) * max(0.0, nDotL + 0.7)
  );

  vec3 atmosphereColor = mix(
   atmosphereColorDay,
   atmosphereColorDark,
    min(1.0, (nDotL / 2.0 + 0.6) * 1.7)
  );
  atmosphereColor = mix(
    atmosphereColor,
    atmosphereColorNight,
    min(1.0, (nDotL / 2.0 + 0.4) * 1.5)
  );
  atmosphereColor *= atmosphereFactor;

  return atmosphereColor;
}`;

const atmosphere = new pc.Entity();
atmosphere.setLocalScale(1.015, 1.015, 1.015);
atmosphere.addComponent('model', { type: 'asset' });

const atmosphereMaterial = new pc.StandardMaterial();
atmosphereMaterial.blendType = pc.BLEND_SCREEN;
atmosphereMaterial.diffuse = new pc.Color(0, 0, 0);
atmosphereMaterial.shininess = 32;
atmosphereMaterial.chunks.emissivePS = ATMOSPHERE_EMISSIVE_SHADER;
atmosphereMaterial.useGammaTonemap = false;

sphereModel.ready(() => {
  atmosphere.model.asset = sphereModel;
  atmosphere.model.model.meshInstances[0].material = atmosphereMaterial;
});

earth.addChild(atmosphere);

/**********************************************
* SCRIPT: ISS POSITION
* ---------------------------------------------
* fetch lat and lon from ISS api
* slerp positioner rotation to next api point
**********************************************/
const ISS_LOCATION_API = 'https://api.wheretheiss.at/v1/satellites/25544';
const IssPosition = pc.createScript('iss-position');

IssPosition.prototype.initialize = function() {
  this.hasPosition = false;
  this.apiPosition = new pc.Quat();
  this.scenePosition = new pc.Quat();

  this.setLatLon = this.setLatLon.bind(this);
  this.setLatLon();
  setInterval(this.setLatLon, 5000);
};

IssPosition.prototype.update = function(dt) {
    this.entity.setPosition(0, 0, 0);
    this.scenePosition.slerp(this.entity.getLocalRotation(), this.apiPosition, dt * 0.1);
    this.entity.setLocalRotation(this.scenePosition);
    this.entity.translateLocal(0, 0, 1.4);
};

IssPosition.prototype.setLatLon = async function() {
  const data = await fetchData(ISS_LOCATION_API);
  const [lat, lon] = this.getPosition(data);
  this.apiPosition.setFromEulerAngles(-lat, lon - 85, 0);

  if (!this.hasPosition) {
    this.entity.setPosition(0, 0, 0);
    this.entity.setLocalRotation(this.apiPosition);
    this.scenePosition.clone(this.apiPosition);
    this.entity.translateLocal(0, 0, 1.4);
    this.hasPosition = true;
  }
}

IssPosition.prototype.getPosition = function(data) {
  if (
    data &&
    typeof data.latitude === 'number' &&
    typeof data.longitude === 'number'
  ) {
    return [data.latitude, data.longitude]
  }

  return [0, 0];
}

/**********************************************
* ENTITY: ISS
**********************************************/
const ISS_MODEL = 'https://s.halvves.com/iss/iss.json';

const issPositioner = new pc.Entity();
issPositioner.addComponent('script');
issPositioner.script.create(IssPosition.__name);
main.addChild(issPositioner);

const iss = new pc.Entity();
app.assets.loadFromUrl(ISS_MODEL, 'model', function (err, asset) {
  iss.addComponent('model');
  iss.setLocalScale(0.01, 0.01, 0.01);
  iss.rotateLocal(45, 0, 180);

  iss.model.model = asset.resource;
  issPositioner.addChild(iss);
});

/**********************************************
* SCRIPT: BILLBOARD
* ---------------------------------------------
* plane always face camera
**********************************************/
const Billboard = pc.createScript('billboard');

Billboard.attributes.add('camera', { type: 'entity' });

Billboard.prototype.initialize = function() {
  this.ray = new pc.Ray(this.entity.getLocalPosition().clone());
  this.planet = new pc.BoundingSphere(new pc.Vec3(0, 0, 0), 1.28);
  this.entity.model.meshInstances[0].layer = 2;
};

Billboard.prototype.postUpdate = function(dt) {
  if (this.camera) {
    this.ray.direction.copy(this.camera.getLocalPosition()).sub(this.ray.origin).normalize();

    const obstructed = this.planet.intersectRay(this.ray);
    if (obstructed && this.entity.model.enabled) {
      this.entity.model.enabled = false;
    } else if (! obstructed && ! this.entity.model.enabled) {
      this.entity.model.enabled = true;
    }

    if (!obstructed) {
      const eulers = this.camera.getLocalEulerAngles();
      this.entity.setLocalEulerAngles(eulers.x, eulers.y, eulers.z);
      this.entity.rotateLocal(-90, 0, 0);
    }
  }
};

/**********************************************
* ENTITY: SUN
**********************************************/
const SUN_ASSETS = {
  emissiveMap: 'https://s.halvves.com/sun_emissive_map.png',
};

const sun = new pc.Entity();
sun.setPosition(31.419, 11.906, 31.419);
sun.setEulerAngles(75, 45, 0);
sun.setLocalScale(16, 16, 16);
sun.addComponent('model', { type: 'plane' });
sun.addComponent('script');
sun.script.create(Billboard.__name, {
  attributes: { camera }
});

const sunMaterial = new pc.StandardMaterial();
sunMaterial.blendType = pc.BLEND_ADDITIVEALPHA;
sunMaterial.opacity = 0;
sunMaterial.diffuse = new pc.Color(0, 0, 0);
sunMaterial.cull = pc.CULLFACE_FRONT;
sunMaterial.useFog = false;
sunMaterial.useGammaTonemap = false;
sunMaterial.useLighting = false;
applyMaterialTextures(SUN_ASSETS, sunMaterial, 'sun', mat => {
  mat.update();
  app.fire('material:loaded', mat);
});
sun.model.model.meshInstances[0].material = sunMaterial;

app.root.addChild(sun);

/**********************************************
* ENTITY: LIGHT
**********************************************/
const light = new pc.Entity();
light.addComponent('light', {
  type: 'directional',
  intensity: 1,
});
light.setPosition(2.732, 1.035, 2.732);
light.setEulerAngles(75, 45, 0);

app.root.addChild(light);