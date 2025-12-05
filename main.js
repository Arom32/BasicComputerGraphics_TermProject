import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

// 기본 설정
let camera, scene, renderer, sunLight, ambientLight, raycast;
const h_scr = window.innerWidth;
const v_scr = window.innerHeight;
let clock = new THREE.Clock(true);

// 오브젝트 그룹 
const basicObject = new THREE.Group(); // plane같은 기본 오브젝트
const objectsDepthLv0 = new THREE.Group(); // depth Lv0  근거리
const objectsDepthLv1 = new THREE.Group(); // depth Lv1  중거리
const objectsDepthLv2 = new THREE.Group(); // depth Lv2  원거리

// 오브젝트 로드
const glfLoader = new GLTFLoader();

//이벤트 관련 함수
let mouse = new THREE.Vector2(); 
let isFoggy = false;
let isSnowing = false;
let isWalking = false;

// 카메라 회전 관련 상수
const DAMPING_SPEED = 0.05; // 원위치로 회귀 speed
const INVALID_MOVING_AREA = 0.9; // 마우스 움직임 반영하지 않는 내부 비율. 
const ROTATE_SPEED = 0.005; // 카메라 회전 speed
const MAX_ROTATE_ANGLE = THREE.MathUtils.degToRad(10);
const NEAR_ZERO = 0.001; // 카메라 회전 복귀시, 0 근접 판정 값

// light 관련 변수
const buildingLights = []; // treverse 최소화를 위한 배열
const streetLights = [];
let sunLightIntensity = 0.1;

//movnig 관련 변수
let buildingsLenght ; // 모든 빌딩이 배치된 총 길이
let streetLightLength ; // 가로등 배치 총 길이
let mountainLenght ;
let  moveSpeed = 1.5;
const MAX_SPEED  = 2.0 ;
const MiN_SPEED = 1.0 ;

// 색상 상수
const COLOR = {
    dayColor : new THREE.Color(60, 40, 40),
    nightColor : new THREE.Color(0,10,20),
    streetBulbDayColor :  new THREE.Color(0x000000),
    streetBulbNightColor :  new THREE.Color(0xffffaa),
    ambientDayColor : new THREE.Color(0xaa0000),
    ambientNightColor : new THREE.Color(0x333355),
    dayFogColor : new THREE.Color(0xcccccc),
    nightFogColor :  new THREE.Color(0x3d404a),
    daySkyColor : new THREE.Color(0xA6DAF4), 
    nightSkyColor : new THREE.Color(0x23262e)
}

// time 관련 변수
const DAYDURATiON = 60; // 하루 주기 sec
let shouldUpdateBuildingLight = false;
let updatingBuildingTime = 0;
let isNight = false;
let deltaT;
let worldTime = 0; // 런타임에 종속적 문제 해결을 위한 변수

// 눈 관련 변수
let snow, snowPoints;
const RAIN_COUNT = 2000;

// ui
const textElement = document.createElement('div');

// [기본 설정]
function init() {
    clock.start();
    scene = new THREE.Scene();
    scene.background = COLOR.daySkyColor.clone();

    camera = new THREE.PerspectiveCamera( 80, h_scr/v_scr, 0.1, 1000 );
    camera.position.set(0, 0, 0.2); 
    camera.lookAt(0,0,0); 

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setSize( h_scr, v_scr ); 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement); 

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(COLOR.sunLightColor, sunLightIntensity); 
    sunLight.position.set(50,50,30);
    sunLight.castShadow = true;
    sunLight.target.position.set(0,0,0);
    scene.add(sunLight);

    raycast = new THREE.Raycaster();

    setObject(); // 오브젝트 생성

    addEventListener("mousemove", onMouseMove);
    addEventListener("mousedown", onMouseDown);
    addEventListener("keydown", onKeyDown);

    setGuideText();
    renderer.setAnimationLoop(animation);
}

// [오브젝트 생성, 관리]
function setObject(){
    setBasicObject();   
    scene.add(basicObject);
    
    setObjectDepthLv0();
    scene.add(objectsDepthLv0);
    objectsDepthLv0.position.set(-8, -2, -3);

    setObjectDepthLv1();  
    scene.add(objectsDepthLv1);
    objectsDepthLv1.position.set(-50, -2, -20); 

    setObjectDepthLv2();
    scene.add(objectsDepthLv2);
    objectsDepthLv2.position.set(-180, -2, -80)
}

//[오브젝트 _ 기본 오브젝트 그룹]
function setBasicObject(){
    // 바닥 1
    let floor = new THREE.Mesh( new THREE.PlaneGeometry( 200 , 100 ),
                    new THREE.MeshLambertMaterial( {color: 0x68656e} ) );
    floor.position.set(0,-2,0);
    floor.rotation.x = Math.PI * -0.5;

    let texture = new THREE.TextureLoader().load( 'asset/floor2.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 30, 30 );
    floor.material.map = texture;
    floor.receiveShadow = true;
    basicObject.add( floor );

    //바닥 2 보도
    floor = new THREE.Mesh( new THREE.PlaneGeometry( 200 , 10 ),
                    new THREE.MeshLambertMaterial( {color: 0xc0c0c0} ) );
    floor.position.set(0,-1.99,0);
    floor.rotation.x = Math.PI * -0.5;

    texture = new THREE.TextureLoader().load( 'asset/floor.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 60, 4 );
    floor.material.map = texture;
    floor.receiveShadow = true;
    basicObject.add( floor );

    createSnow();
}

//[눈 효과 초기 설정] ai 도움 받았습니다
function createSnow(){
    const positions = [];
    const velocities = []; 

    for (let i = 0; i < RAIN_COUNT; i++) {
        positions.push(
            THREE.MathUtils.randFloat(-60, 60), 
            THREE.MathUtils.randFloat(0, 60),   
            THREE.MathUtils.randFloat(-40, 0)  
        );
        velocities.push(THREE.MathUtils.randFloat(0.01, 0.2));
    }

    snow = new THREE.BufferGeometry();
    snow.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    snow.userData = { velocities: velocities };

    const rainMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.2,    
        transparent: true,
        opacity: 0.8,
    });

    snowPoints = new THREE.Points(snow, rainMaterial);
    snowPoints.visible = false; 
    scene.add(snowPoints);
}

// [ 근거리 obj 생성 - 가로등 ] 모델 import 관련해 ai 도움 받았습니다
async function setObjectDepthLv0(){
    const STREETLIGHT_COUNT = 5;
    const STREETLIGHT_SPACE = 4; // m 가로등 간격
    let objPosX = 0;

    const model = await glfLoader.loadAsync('asset/StreetLight.glb');
    
    const frameMaterial = new THREE.MeshPhongMaterial({
        color: 0x3f3f3f,
        side: THREE.DoubleSide,
    });
    
    const bulbMaterial = frameMaterial.clone();
    bulbMaterial.color.setHex(0xffffff);
    bulbMaterial.emissive = COLOR.streetBulbDayColor;

    // 여기서 scene은 가로등 모델 자체를 의미, 가로등 기본 설정
    model.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = frameMaterial;
                child.castShadow = true;
                if(child.name !== "frame"){
                    child.name = "streetLightBulb"; 
                    // 모델 내부의 전등 역할을 하는 모델은 Ligjt1, 2로 명명 되어 있어, 내부에서 통일
                    // 이후 클릭 이벤트 발생 시, 탐색을 위한 명명
                }
                else {
                child.material = frameMaterial;
                }
            }
        });

    
    // 가로등 생성
    for (let i = 0; i < STREETLIGHT_COUNT; i++){
        const object = model.scene.clone();

        object.position.x = objPosX;
        object.rotation.y = Math.PI/6 ;
        
        object.traverse((child) => {
            if (child.isMesh && child.name === "streetLightBulb") {
                child.material = child.material.clone(); 
            }
            streetLights.push(child); // 해당 배열을 기준으로 raycasting 검사
        });

        const light = new THREE.SpotLight(COLOR.streetBulbNightColor, 15, 15, Math.PI/6);
        light.name = "streetSpotLight";
        light.penumbra = 0.3;
        light.position.set(0, 5, 0.1);
        light.visible = false;

        object.add(light);
        object.add(light.target); // 해당 구문이 없으면, 0,0,0 절대 위치로 고정, 부모 위치의 0,0,0을 바라보도록

        objectsDepthLv0.add(object);

       objPosX += STREETLIGHT_SPACE; 
    }
    streetLightLength = objPosX;
}

//[ 중거리 obj 생성 - 건물 ]  모델 import 관련해 ai 도움 받았습니다
async function setObjectDepthLv1() {
    /* 
     * 건물의 기준은 왼쪽 아래 vertex 중간에 위치
     * 건물 오브젝트의 SACLE 범위 : 4배 ~ 7배
     */
    const BUILDING_COUNT = 18;
    const BUILDING_SPACE = 0.5; // m 건물 간격

    const MAX_OBJ_SCALE = 4; 
    const MIN_OBJ_SCALE = 1.5;

    const MODEL_WIDTH = 2; //모델의 실제 크기
    const MODEL_HIGHT = 4;

    let objPos = new THREE.Vector3(0, 0, 0); 

    const model = await glfLoader.loadAsync('asset/Building.glb');

    const buildingLightMesh = new THREE.PlaneGeometry(MODEL_WIDTH-0.1, MODEL_HIGHT);

    for (let i = 0; i < BUILDING_COUNT; i++) {

        const object = model.scene.clone(); //scene은 buliding 을 감싸는 파일
        
        const greyScale = THREE.MathUtils.randFloat(0.2, 0.8);
        const buildingMaterial = new THREE.MeshLambertMaterial ({
            color: new THREE.Color(greyScale, greyScale, greyScale),
        });

        object.traverse((child) => {
            if (child.isMesh) {
                child.material = buildingMaterial;
                child.castShadow = true;
            }});

        const modelScale = THREE.MathUtils.randFloat(MIN_OBJ_SCALE, MAX_OBJ_SCALE);
        object.scale.set(modelScale, modelScale, modelScale);
        object.position.set(objPos.x, objPos.y, objPos.z);
        objPos.x += MODEL_WIDTH * modelScale + BUILDING_SPACE ;

        const buildingLightColor = new THREE.Color(
                                    THREE.MathUtils.randFloat(0, 0.7),
                                    THREE.MathUtils.randFloat(0, 0.7),
                                    THREE.MathUtils.randFloat(0, 0.7));
 
        const buildingLightMaterial = new THREE.MeshLambertMaterial( {color: buildingLightColor} );
        const buildingLight = new THREE.Mesh( buildingLightMesh, buildingLightMaterial );
        buildingLight.name = "BuildingLight";
        buildingLightMaterial.emissive = buildingLightColor;
        buildingLight.visible = false;
        buildingLight.userData = {
            delay : THREE.MathUtils.randFloat(0,1.0),
        }

        buildingLights.push(buildingLight); // 접근, 배열로 관리
        object.add(buildingLight);

        buildingLight.position.set(MODEL_WIDTH/2,MODEL_HIGHT/2,MODEL_WIDTH/3) 
        //상대위치 [해결] 
        // building 이 스케일 되면서 포지션도 자동으로 스케일 되므로, scale되기 이전의 위치를 기준으로 배치

        objectsDepthLv1.add(object);

        buildingsLenght = objPos.x;
    }
}

// [ 원거리 obj 생성 - 산 ]
function setObjectDepthLv2(){
    const mountainCount = 8;
    let objPosX = 0 ;

    const mountainMaterial = new THREE.MeshLambertMaterial({
        color: 0x2c5422, 
        flatShading: true, 
    });

    for (let i = 0; i < mountainCount; i++) {
        const radius = THREE.MathUtils.randFloat(50, 80);
        const height = THREE.MathUtils.randFloat(50, 90);
        const geometry = new THREE.ConeGeometry(radius, height, 4); 

        const mountain = new THREE.Mesh(geometry, mountainMaterial);

        mountain.position.set(
            objPosX, 
            height / 2 - 10, 
            THREE.MathUtils.randFloat(-10, 0)
        );

        mountain.rotation.y = THREE.MathUtils.randFloat(0, Math.PI/4);
        objPosX += THREE.MathUtils.randFloat(40 , 60);

        objectsDepthLv2.add(mountain);
    }
    
    mountainLenght = objPosX;
}

// [애니메이션_루프]
function animation(){
    deltaT = clock.getDelta() // 매 프레임 delta t

    updateBuildingLight();
    cameraRotate();
    dayCycle();
    updatefog();
    updateSnow();
    moveObject();
    
    renderer.render(scene, camera);
}

// [이벤트 처리 _ 마우스 움직임]
function onMouseMove(e) { 
/* 마우스 위치 정규화
* 마우스 좌표를 -1 ~ 1 사이의 값으로 변환
* 애니메이션 처리를 위한 mouse값 저장
*/
    mouse.x = (e.clientX/h_scr)*2 -1;
    mouse.y = (e.clientY/v_scr)*(-2) +1;

    //console.log("x : " +cursor.x +", y : " +cursor.y)
}

// [이벤트 처리 _ 마우스 클릭 ]
function onMouseDown(e){
    raycast.setFromCamera(mouse, camera)
    turnOnOffStreetLight();
}

// [ 마우스 이벤트 _ 카메라 회전 ] 
function cameraRotate(){ 
/* 마우스 위치에 따라 카메라 회전
 * 일정 영역(INVALID_MOVING_AREA) 외부, 확실하게 움직이려는 의사가 있을때만 회전 반영
 * 일정 영역(INVALID_MOVING_AREA) 내부, 원위치(0,0,0)을 바라보도록 복귀
*/
    
    if((Math.abs(mouse.y) >= INVALID_MOVING_AREA) ||( Math.abs(mouse.x) >= INVALID_MOVING_AREA)){ // 외부 영역
        //상하, x축 회전
        camera.rotation.x += (mouse.y)*ROTATE_SPEED;
        camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -MAX_ROTATE_ANGLE, MAX_ROTATE_ANGLE); // 최대 회전 각도 제한
        
        //좌우, y축 회전
        camera.rotation.y += -(mouse.x)*ROTATE_SPEED;
        camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -MAX_ROTATE_ANGLE, MAX_ROTATE_ANGLE);
    }
    else{ // 내부 영역
        // [문제] 0에 충분히 가까워졌음에도 계속 lerp 연산이 일어남 
        // [해결] 0에 충분히 근접 시(NEAR_ZERO 미만) 0으로 고정
        // 더 좋은 방법?
        
        if (Math.abs(camera.rotation.x ) < NEAR_ZERO) {
            camera.rotation.x = 0;
        }
        else{
            //console.log("lerp x");
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, 0, DAMPING_SPEED);
        }
        if (Math.abs(camera.rotation.y ) < NEAR_ZERO) {
            camera.rotation.y = 0;
        }
        else{
            //console.log("lerp y");
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, DAMPING_SPEED);
        }
    }
   
    
}  

// [ 마우스 이벤트 _ 클릭 ]
function turnOnOffStreetLight(){
    let intersects = raycast.intersectObjects( streetLights, false );  // 타겟 - 가로등 내부에 메쉬만으로 한정
    // 배열 내부만 검사하므로 recursive false

    if (intersects.length > 0) {
        const selectedMesh = intersects[0].object; // 처음으로 만나는 메쉬
        const obj = selectedMesh.parent; // 그 상위 객체, 가로등(scene)
       
        // console.log("Selected mesh name:", selectedMesh.name);
        // console.log("Containing object:", obj.name, obj);
        // obj 이름이 scene로 표시되나, 가로등 개별 메쉬를 묶는 객체 이름이 scene이므로
        // scene라는 이름과는 달리 가로등 객체 그 자체를 의미
    
        obj.traverse((child) => {
            if (child.name === "streetLightBulb") {
                const isLightOff = child.material.emissive.getHex() === COLOR.streetBulbNightColor.getHex();
                child.material.emissive = isLightOff ? COLOR.streetBulbDayColor.clone() : COLOR.streetBulbNightColor.clone();
            }   
            
            if (child.name === "streetSpotLight") {
                child.visible = !child.visible
                }
            });
        }
}        

// [이벤트 처리 _ 키보드 ]
function onKeyDown(e){
   
    switch(e.key){ 
    case '1': 
        setTime('day'); break;

    case '2': 
        setTime('sunset'); break;

    case '3':
        setTime('night'); break;

    case '4' :
        toggleFog(); break; 

    case '5':
        isSnowing = !isSnowing;
        break;

    case 'q': //주변환경 움직임
        isWalking = !isWalking; 
        break;

    case 'ArrowUp':
        moveSpeed += 0.5;
        if (moveSpeed > MAX_SPEED) moveSpeed = MAX_SPEED;
        break;
    
    case 'ArrowDown':
        moveSpeed -= 0.5;
        if (moveSpeed < MiN_SPEED) moveSpeed = MiN_SPEED;
        break;

    default:
        break;
        
    }
    updateText();
}

// [ 키보드 이벤트 _ 안개 효과 토글]
function toggleFog() {
    if( isFoggy ){
            scene.fog = null
            isFoggy = false
        }
        else{
            scene.fog = new THREE.Fog( 0xcccccc, 0.1, 100)
            isFoggy = true
        }
}

// [ 키보드 이벤트 _ 강제 시간 변화]
function setTime( setWhen ){
    if(setWhen === 'day'){
        worldTime = DAYDURATiON * 0.25; // intensity == 1
    }
    
    if(setWhen === 'sunset'){
        worldTime = DAYDURATiON * 0.5; // intensity == 0.5
    }

    if(setWhen === 'night'){
         worldTime = DAYDURATiON * 0.625; // intensity == 0.25
    }
}

// [환경 _ 낮 밤 전환점]
function toggleDayNight(){

    // console.log("isnight : "+ isNight );
    
    updatingBuildingTime = 0;
    shouldUpdateBuildingLight = true;

    // const MIN_DELAY = 10; 
    // const MAX_DELAY = 1000;
    
    // objectsDepthLv1.children.forEach(building =>{
    //     const randomDelay = THREE.MathUtils.randInt(MIN_DELAY, MAX_DELAY);

    //     // 누적된 지연 시간 후에 조명 상태 변경 실행
    //     setTimeout(() => {
    //         building.traverse(child => {
    //             if (child.name === "BuildingLight") {
    //                 child.visible = isNight;
    //             }
    //         });
    //     }, randomDelay); 
    // }); 
    // // setTimeout 사용 대신 animation에서 다룰 수 있도록 
    // updateBuildingLight 로 따로 뺌, 여기서는 플래그만 설정

    objectsDepthLv0.children.forEach(streetLight => {
        streetLight.traverse(child => {
            if( child.name === "streetLightBulb"){
                child.material.emissive = isNight ? COLOR.streetBulbNightColor.clone() : COLOR.streetBulbDayColor.clone() ;
            }
            if( child. name === "streetSpotLight"){
                child.visible = isNight;
            }
        })
    });

}

// [환경 _건물 업데이트 ]
function updateBuildingLight(){
    if(!shouldUpdateBuildingLight) return;

    updatingBuildingTime += deltaT;
    

    buildingLights.forEach(light => {
        if ( updatingBuildingTime > light.userData.delay && light.visible !== isNight ) {
                    light.visible = isNight;
        }   
    });

    if(updatingBuildingTime > 1.1 ){
        shouldUpdateBuildingLight = false
    }

}

// [ 환경 _ 안개 ]
function updatefog(){
    if(!isFoggy){ return; }
    scene.fog.color.lerpColors(COLOR.nightFogColor, COLOR.dayFogColor, sunLightIntensity);
}

// [ 환경 _ 눈 효과 ]
function updateSnow(){
    if(!isSnowing){ snowPoints.visible = false; return}
    if (!snowPoints){ return };

    snowPoints.visible = isSnowing;
    
    const positions = snow.attributes.position.array;
    const velocities = snow.userData.velocities;

    for (let i = 0; i < RAIN_COUNT; i++) {
    
        const indexY = i * 3 + 1; //x,y,z
        
        positions[indexY] -= velocities[i]; 

        if (positions[indexY] < -1) {
            positions[indexY] = 60; //다시 위로 올리기
            
            positions[i * 3] = THREE.MathUtils.randFloat(-60, 60); //x
            positions[i * 3 + 2] = THREE.MathUtils.randFloat(-40, 20); //y
        }
    }
    snow.attributes.position.needsUpdate = true;

}

// [ 환경 _ 낮 밤 시간 변화]
function dayCycle(){
    /* 
    *  worldTime따라 Intensity 변경 + 컬러 lerp
    *       sunLightIntensity = 0.0 ~ 1.0,
    *       주기 = DAYDURATiON 
    *  밤낮이 바뀌는 시점에 toggleDayNight() 호출
    */
   
    worldTime += deltaT ; // 초기 값 0에 한 애니메이션 프레임 시간(delta T)를 더하며 변화

    const angle = (worldTime / DAYDURATiON) * 2.0 * Math.PI; 

    // sunLight.position.x = Math.cos(angle) * SUN_RADIUS; 
    // sunLight.position.y = Math.sin(angle) * SUN_RADIUS; 

    sunLight.position.z = 20;

    sunLightIntensity = 0.5 + Math.sin( angle )/2.0;
    
    const CurrentIsNight = sunLightIntensity < 0.2;
    
    if(isNight != CurrentIsNight){ //밤낮이 바뀌는 지점에서만 실행 
          isNight = CurrentIsNight;
          toggleDayNight();          
    } 

    ambientLight.intensity = THREE.MathUtils.mapLinear(sunLightIntensity, 0.2, 1, 0.05, 0.6);
    ambientLight.color.lerpColors(COLOR.ambientNightColor, COLOR.ambientDayColor, sunLightIntensity);
    scene.background.lerpColors(COLOR.nightSkyColor, COLOR.daySkyColor , sunLightIntensity);

    sunLight.intensity = THREE.MathUtils.clamp(sunLightIntensity,0.02,0.2);
    sunLight.color.lerpColors(COLOR.nightColor,COLOR.dayColor, sunLightIntensity);
}

//[ 환경 _ 이동 효과 ]
function moveObject(){
    if(!isWalking){ return; } 
    const moveDist = moveSpeed * deltaT;

    // 가로등
    // 물제 이동 오른쪽 / 왼쪽으로 걷는 효과
    objectsDepthLv0.children.forEach(child => {
        child.position.x += moveDist;

        if (child.position.x > (streetLightLength + 6) + objectsDepthLv0.position.x) {
            child.position.x -= streetLightLength;
        }
    });

    // 건물 이동
    objectsDepthLv1.children.forEach(child => {
        child.position.x += moveDist;

        if (child.position.x > buildingsLenght + 50 + objectsDepthLv1.position.x) {
            child.position.x -= buildingsLenght; // 맨 앞으로 이동
        }
    });

    objectsDepthLv2.children.forEach(child =>{
        child.position.x += moveDist;

        if (child.position.x > mountainLenght + 200 + objectsDepthLv2.position.x){
            child.position.x -= mountainLenght;
        }
    })

    // 바닥
    basicObject.children.forEach(mesh => {
        if (mesh.material.map) {
            mesh.material.map.offset.x -= 0.31 * moveDist ;
        }
    });
}

// [ 가이드 텍스트 _ 초기 설정 ]
function setGuideText(){
    textElement.style.position = 'absolute'; 
    textElement.style.top = '30px';  
    textElement.style.width = '100%';    
    textElement.style.textAlign = 'center'; 
    textElement.style.left = '0';       

    textElement.style.color = '#ffffff'; 
    textElement.style.fontFamily = 'Consolas, monospace'; 
    textElement.style.fontSize = '14px'; 
    textElement.style.fontWeight = 'bold';
    textElement.style.textShadow = '1px 1px 2px #000000'; 
    textElement.style.whiteSpace = 'pre'; 
    textElement.style.pointerEvents = 'none'; 

    document.body.appendChild(textElement);
    document.body.appendChild(textElement);
    updateText(); 
}

// [ 가이드 텍스트 ]
function updateText(){
    
    const guide = "키보드 버튼을 눌러 도시의 풍경을 바꿔보세요! 마우스로 가로등을 클릭해 보세요! \n\n"
    const keyGuideTime = "    [1] : 오전 " +
                        "    [2] : 오후 " + 
                        "    [3] : 저녁 " + "\n\n" ;
                        
    const keyGuideWeather = "    [4] : 안개 " + ( isFoggy ? '[V]' : '[\u00a0]')+
                        "    [5] : 눈 " + ( isSnowing ? '[V]' : '[\u00a0]') ;

    const keyGuideMoving = "    [Q] : 이동 " + ( isWalking ? '[V]' : '[\u00a0]' ) +"    [↑][↓] : 이동 속도 조절";
    textElement.innerText = guide + keyGuideTime + keyGuideWeather + keyGuideMoving;
}

init();    
animation();
