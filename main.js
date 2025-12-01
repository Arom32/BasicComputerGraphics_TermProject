import * as THREE from 'three';
import {GLTFLoader } from 'three/examples/jsm/Addons.js';
import { Color } from 'three/webgpu';


// 기본 설정
let camera, scene, renderer, sunLight, ambientLight, raycast;
let mouse = new THREE.Vector2();
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

// 카메라 회전 관련 상수
const DAMPING_SPEED = 0.05; // 원위치로 회귀 speed
const INVALID_MOVING_AREA = 0.9; // 마우스 움직임 반영하지 않는 내부 비율. 
const ROTATE_SPEED = 0.01; // 카메라 회전 speed
const MAX_ROTATE_ANGLE = THREE.MathUtils.degToRad(10);
const NEAR_ZERO = 0.001; // 카메라 회전 복귀시, 0 근접 판정 값

// light 관련 변수
const dayColor = new Color(	60, 40, 40);
const nightColor = new Color(0,10,20);
const SUN_RADIUS = 100;
let sunLightIntensity = 0.1;
let sunLightColor = dayColor.clone();

const streetBulbDayColor =  new THREE.Color(0x000000);
const streetBulbNightColor =  new THREE.Color(0xffffaa);

// time 관련 변수
const DAYDURATiON = 60; // 하루 주기 
let isNight = false;
let worldTime = 0; // 런타임에 종속적 문제 해결을 위한 변수


// [기본 설정]
function init() {
    console.log('init start');
    clock.start();
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 70, h_scr/v_scr, 0.1, 1000 );
    camera.position.set(0, -0.2, 1.5); 
    camera.lookAt(0,0,0); 

    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setSize( h_scr, v_scr ); 
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement); 

    ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(sunLightColor, sunLightIntensity); // 나중에 수정 
    sunLight.position.set(50,50,30);
    sunLight.castShadow = true;
    sunLight.target.position.set(0,0,0);
    scene.add(sunLight);

    raycast = new THREE.Raycaster();

    setObject(); // 오브젝트 생성

    addEventListener("mousemove", onMouseMove);
    addEventListener("mousedown", onMouseDown);
    addEventListener("keydown", onKeyDown);
}

// [오브젝트 생성, 관리]
function setObject(){

    setObjectDepthLv1();      
    setBasicObject();
    setObjectDepthLv0();
    scene.add(basicObject);
    
    objectsDepthLv0.position.set(-8, -2, -3);
    scene.add(objectsDepthLv0);
    scene.add(objectsDepthLv1);
    scene.add(objectsDepthLv2);
}

//[오브젝트 _ 기본 오브젝트 그룹]
function setBasicObject(){
   
    const floor = new THREE.Mesh( new THREE.PlaneGeometry( 1000 , 1000 ),
                    new THREE.MeshLambertMaterial( {color: 0xf0f0f0} ) );
    floor.position.set(0,-2,0);
    floor.rotation.x = Math.PI * -0.5;

    const texture = new THREE.TextureLoader().load( 'asset/Checker.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 300, 300 );
    floor.material.map = texture;

    floor.receiveShadow = true;
    basicObject.add( floor );

    const sky = new THREE.Mesh( new THREE.PlaneGeometry(1000,1000),new THREE.MeshLambertMaterial( {color: 0xA6DAF4}));
    sky.position.set(0,0, -100);
    basicObject.add(sky);
}


//[ 근접 obj 생성 - 건물 ]  모델 import 관련해 ai 도움 받았습니다
async function setObjectDepthLv1() {
    /* 
     * 건물의 기준은 왼쪽 아래 vertex 중간에 위치
     * 건물 오브젝트의 SACLE 범위 : 4배 ~ 7배
     */
    const BUILDING_SPACE = 0.5; // m 건물 간격

    const MAX_OBJ_SCALE = 7; 
    const MIN_OBJ_SCALE = 4;

    const MODEL_WIDTH = 2; //모델의 실제 크기
    const MODEL_HIGHT = 4;

    let objPos = new THREE.Vector3(-80, -2, -55); 
    // [수정 예정] 빠른 변경을 위해 objPos 배치 확인 용으로 선언해놓았으나
    // setObject에서 ObjectDepthLv1 그룹의 위치를 지정할 예정
   

    const buildingMaterial = new THREE.MeshLambertMaterial ({
        color: 0x808080,
        side: THREE.DoubleSide
    });

    const model = await glfLoader.loadAsync('asset/Building.glb');

    model.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = buildingMaterial;
                child.castShadow = true;
            }});
 
    for (let i = 0; i < 15; i++) {

        const object = model.scene.clone();
        
        const modelScale = THREE.MathUtils.randFloat(MIN_OBJ_SCALE, MAX_OBJ_SCALE);
        object.scale.set(modelScale, modelScale, modelScale);
        object.position.set(objPos.x, objPos.y, objPos.z);
        objPos.x += MODEL_WIDTH * modelScale + BUILDING_SPACE ;

        const buildingLightColor = new THREE.Color(
                                    THREE.MathUtils.randFloat(0, 0.7),
                                    THREE.MathUtils.randFloat(0, 0.7),
                                    THREE.MathUtils.randFloat(0, 0.7));
 
        const buildingLightMaterial = new THREE.MeshLambertMaterial( {color: buildingLightColor} );
        const buildingLight = new THREE.Mesh( new THREE.PlaneGeometry(MODEL_WIDTH-0.1, MODEL_HIGHT), buildingLightMaterial);

        buildingLight.name = "BuildingLight";
        buildingLightMaterial.emissive = buildingLightColor;
        buildingLight.visible = false;

        object.add(buildingLight);
        buildingLight.position.set(MODEL_WIDTH/2,MODEL_HIGHT/2,MODEL_WIDTH/3) 
        //상대위치 [해결] 
        // building 이 스케일 되면서 포지션도 자동으로 스케일 되므로, scale되기 이전의 위치를 기준으로 배치

        objectsDepthLv1.add(object);
    }
}

// [ 최근접 obj 생성 - 가로등 ] 모델 import 관련해 ai 도움 받았습니다
async function setObjectDepthLv0(){
    const STREETLIGHT_SPACE = 4; // m 가로등 간격
    let objPosX = 0;

    const StreetLightMaterial = new THREE.MeshPhongMaterial ({
        color: 0x3f3f3f,
        side: THREE.DoubleSide,
    });
    const model = await glfLoader.loadAsync('asset/StreetLight.glb');

    model.scene.traverse((child) => {
            if (child.isMesh) {
                child.material = StreetLightMaterial;
                child.castShadow = true;
                if(child.name !== "frame"){
                    child.name = "streetLightBulb"; 
                    // 모델 내부의 전등 역할을 하는 모델은 Ligjt1, 2로 명명 되어 있어, 내부애서 통일
                }
            }
        });

    for (let i = 0; i < 4; i++){
        const object = model.scene.clone();
        object.position.x = objPosX;
        objPosX += STREETLIGHT_SPACE;
        object.rotation.y = Math.PI/6 ;
        
        object.traverse((child) => {
            if (child.isMesh && child.name === "streetLightBulb") {
                child.material = child.material.clone(); 
                child.material.color = new THREE.Color(0xffffff);
                child.material.emissive = streetBulbDayColor.clone();
            }
        });

        const light = new THREE.SpotLight(streetBulbNightColor, 15, 15, Math.PI/6);
        light.penumbra = 0.3;
        light.target.position.set(0,0,0);
        light.name = "streetSpotLight";
        light.position.set(0, 5, 0.1);
        light.visible = false;
        object.add(light);
        object.add(light.target); // 해당 구문이 없으면, 0,0,0 절대 위치로 고정

        objectsDepthLv0.add(object);
    }
    }

// [애니메이션_루프]
function animation(){
    requestAnimationFrame(animation);

    cameraRotate();
    
    dayCycle();
    
    debug();
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

function onKeyDown(e){
   
    switch(e.key){ 
    case '1': 
        setTime('day'); break
    case '2': 
        setTime('sunset') ; break
    case '3':
        setTime('night') ; break
    default:
        break;
        
    }
    
}

function setTime( setWhen ){
    if(setWhen === 'day'){
        worldTime = DAYDURATiON * 0.25;
    }
    
    if(setWhen === 'sunset'){
        worldTime = DAYDURATiON * 0.5;
    }

    if(setWhen === 'night'){
         worldTime = DAYDURATiON * 0.625; 
    }
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

function toggleDayNight(){
    console.log("isnight : "+ isNight );
    const MIN_DELAY = 10;
    const MAX_DELAY = 1000;
    
    objectsDepthLv1.children.forEach(building =>{
        const randomDelay = THREE.MathUtils.randInt(MIN_DELAY, MAX_DELAY);

        // 누적된 지연 시간 후에 조명 상태 변경 실행
        setTimeout(() => {
            building.traverse(child => {
                if (child.name === "BuildingLight") {
                    child.visible = isNight;
                }
            });
        }, randomDelay); 
    });

    objectsDepthLv0.children.forEach(streetLight => {
        streetLight.traverse(child => {
            if( child.name === "streetLightBulb"){
                child.material.emissive = isNight ? streetBulbNightColor.clone() : streetBulbDayColor.clone() ;
            }
            if( child. name === "streetSpotLight"){
                child.visible = isNight;
            }
        })
    });
}

// [ 마우스 이벤트 _ 클릭 ]
function turnOnOffStreetLight(){
    let intersects = raycast.intersectObjects( objectsDepthLv0.children ); 
    if (intersects.length > 0) {
        const selectedMesh = intersects[0].object; // 처음으로 만나는 메쉬
        let obj = selectedMesh.parent; // 그 상위 객체 
       
        console.log("Selected mesh name:", selectedMesh.name);
        console.log("Containing object:", obj.name, obj);
        // obj 이름이 scene로 표시되나, 가로등 개별 메쉬를 묶는 객체 이름이 scene이므로
        // scene라는 이름과는 달리 가로등 객체 그 자체를 의미
    
        obj.traverse((child) => {
            if (child.name === "streetLightBulb") {
                const isCheck = child.material.emissive.getHex() === streetBulbNightColor.getHex();
                child.material.emissive = isCheck ? streetBulbDayColor.clone() : streetBulbNightColor.clone();
            }   
            
            if (child.name === "streetSpotLight") {
                child.visible = !child.visible
                }
            });
        }
}        

// [ 애니메이션 _ 낮 밤 시간 변화]
function dayCycle(){
    /* 
    *  런타임 t에 따라 Intensity 변경 + 컬러 lerp
    *       sunLightIntensity = 0.0 ~ 1.0,
    *       주기 = DAYDURATiON 
    *  밤낮이 바뀌는 시점에 toggleDayNight() 호출
    */
    const deltaT = clock.getDelta()
    worldTime += deltaT  ;

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
    const ambientDayColor = new THREE.Color(0xaa0000);
    const ambientNightColor = new THREE.Color(0x333355);
    ambientLight.color.lerpColors(ambientNightColor, ambientDayColor, sunLightIntensity);
  

    sunLight.intensity = THREE.MathUtils.clamp(sunLightIntensity,0.02,0.2);
    sunLight.color.lerpColors(nightColor,dayColor, sunLightIntensity);
}

function debug(){

    // console.log("light intensity : " + sunLight.intensity);
    // console.log("theta :" + theta+ ", light position x :" + sunLight.position.x+", y :" + sunLight.position.y+"\n");
    // console.log("camera rotation x :" + camera.rotation.x + ", y :" + camera.rotation.y);
    // console.log(clock.getElapsedTime(), sunLightIntensity)
    // console.log(clock.getElapsedTime())
}

init();    
animation();
