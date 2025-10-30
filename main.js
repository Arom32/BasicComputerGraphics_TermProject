import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/Addons.js';

// 기본 설정
let camera, scene, renderer, light;
let mouse = new THREE.Vector2();
const h_scr = window.innerWidth;
const v_scr = window.innerHeight;

// 오브젝트 그룹 
const basicObject = new THREE.Group(); // plane같은 기본 오브젝트
const objectsDepthLv0 = new THREE.Group(); // depth Lv0  근거리
const objectsDepthLv1 = new THREE.Group(); // depth Lv1  중거리
const objectsDepthLv2 = new THREE.Group(); // depth Lv2  원거리

// 오브젝트 로드
const fbxLoader = new FBXLoader();

// 카메라 회전 관련 상수
const DAMPING_SPEED = 0.1; // 원위치로 회귀 speed
const INVALID_MOVING_AREA = 0.9; // 마우스 움직임 반영하지 않는 내부 비율. 
const ROTATE_SPEED = 0.005; // 카메라 회전 speed
const MAX_ROTATE_ANGLE = THREE.MathUtils.degToRad(5);
const NEAR_ZERO = 0.001; // 카메라 회전 복귀시, 0 근접 판정 값

// light 원운동 관련 변수
const LIGHT_ROTATE_SPEED = 0.1;
let theta = 0; 

// [기본 설정]
function init() {
    console.log('init start');

    camera = new THREE.PerspectiveCamera( 110, h_scr/v_scr, 0.1, 1000 );
    camera.position.set(0, 0, 1.5);
    camera.lookAt(0,0,0); 

    scene = new THREE.Scene();

    light = new THREE.DirectionalLight(0xFFFFFF,1); // 나중에 수정 
    light.position.set(0,1,5).normalize(); 
    scene.add(light);


    renderer = new THREE.WebGLRenderer();
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setSize( h_scr, v_scr );       
    document.body.appendChild(renderer.domElement); 
    

    setObject(); // 오브젝트 생성

    addEventListener("wheel", OnMouseWheel);
    addEventListener("mousemove", onMouseMove);
}

// [오브젝트 생성, 관리]
function setObject(){
    // 디버깅용 오브젝트
    function debbugingObject(){
        let geometry = new THREE.BoxGeometry( 1, 1, 1 );
        let material = new THREE.MeshPhongMaterial( { color: 0xff0000 } );
        const cube1 = new THREE.Mesh( geometry, material );
        cube1.position.set(0,0,0);
        cube1.rotation.set(30,60,20);
        scene.add( cube1 );
        // 디버깅용 오브젝트    
        geometry = new THREE.BoxGeometry( 50, 50, 50 );
        material = new THREE.MeshPhongMaterial( { color: 0x00ffff } );
        const cube2 = new THREE.Mesh( geometry, material );
        cube2.position.set(0,5,-50);
        cube2.rotation.set(20,70,20);
        scene.add( cube2 );
    }
  //debbugingObject();

    setObjectDepthLv1();      
    setBasicObject();
    scene.add(basicObject);
    scene.add(objectsDepthLv0);
    scene.add(objectsDepthLv1);
    scene.add(objectsDepthLv2);
}

//[오브젝트 _ 기본 오브젝트 그룹]
function setBasicObject(){
   
    const plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000 , 1000 ),
                    new THREE.MeshPhongMaterial( {color: 0xf0f0f0} ) );
    plane.position.set(0,-2,0);
    plane.rotation.x = Math.PI * -0.5;
    const texture = new THREE.TextureLoader().load( 'asset/Checker.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 300, 300 );
    plane.material.map = texture;

    basicObject.add( plane );
}

function setObjectDepthLv1(){
    /*Defalut scale = 0.05
     * 블렌더 : THREE = 1 : 100
     * 건물 오브젝트의 SACLE 범위 : 4배 ~ 7배
     */
    const BUILDING_SPACE = 0.5; // m 건물 간격
    const MAX_OBJ_SCALE = 0.07;
    const MIN_OBJ_SCALE = 0.04;
    const SCALE_FACTOR = 100; // 블렌더 : THREE = 1 : 100
    let objPos = new THREE.Vector3();
    let curScale = 0;
    
    objPos = new THREE.Vector3(-80, -2, -20);
    
    for(let i=0; i<15; i++){
        fbxLoader.load('asset/Building.fbx', (object) => {

        curScale = THREE.MathUtils.randFloat(MIN_OBJ_SCALE, MAX_OBJ_SCALE);
        objPos.x += curScale * 100;

        object.scale.set(curScale, curScale, curScale);
        
        object.position.set(objPos.x, objPos.y, objPos.z);

        objectsDepthLv1.add(object); 
        
        objPos.x += curScale * SCALE_FACTOR + BUILDING_SPACE;
    });
    }
}

// [애니메이션_루프]
function animation(){
    requestAnimationFrame(animation);

    cameraRotate();
    
    // cube.rotateX(0.03);  
    // cube.rotateY(0.01); 
    //light.color.setHex(0xffffff * Math.random());
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

// [이벤트 처리 _ 마우스 휠]
function OnMouseWheel(e){
/* 마우스 휠 값에 따른, light 처리
 * e.deltaY : 휠 스크롤 값, (-_down, +_up)
 * e.deltaY 값이 양수 or 음수에 따라, light pos가 원 운동
 * ligth pos를 theta값 원 운동
 * z축은 고정한 채, x,y축만 원 운동, target (0,0,0)-> 조절 예정
*/ 
    const radius = 5; // 원 운동 반지름
    
    // 0 ~ 2π
        if(e.deltaY > 0){
            theta += LIGHT_ROTATE_SPEED;
        }
        else{
            theta -= LIGHT_ROTATE_SPEED;
        }
    
    //theta = THREE.MathUtils.clamp(theta, 0.2, 3); // theta값 제한
    
    light.position.set(radius * Math.cos(theta)
        ,1 + radius * Math.sin(theta)
        ,5)
    light.target.position.set(0,0,0);
    // light.position.x = radius * Math.cos(theta);
    // light.position.y = 1 + radius * Math.sin(theta);
    // light.position.z = 5; // z축 고정

    //console.log("theta :" + theta+ ", light position x :" + light.position.x+", y :" + light.position.y+"\n");
    
}

// [ 애니메이션 _ 카메라 회전 ] 
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
        // 0에 충분히 가까워졌음에도 계속 lerp 연산이 일어남 
        // 0에 충분히 근접 시(NEAR_ZERO 미만) 0으로 고정
        // 더 좋은 방법?
        
        if (Math.abs(camera.rotation.x ) < NEAR_ZERO) {
            camera.rotation.x = 0;
        }
        else{
            console.log("lerp x");
            camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, 0, DAMPING_SPEED);
        }
        if (Math.abs(camera.rotation.y ) < NEAR_ZERO) {
            camera.rotation.y = 0;
        }
        else{
            console.log("lerp y");
            camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, DAMPING_SPEED);
        }

    }
   
    //console.log("camera rotation x :" + camera.rotation.x + ", y :" + camera.rotation.y);
}  

init();    
animation();
