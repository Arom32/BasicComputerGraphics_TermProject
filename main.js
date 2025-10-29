// 20240789 이지현
import * as THREE from 'three';

// 기본 설정
let camera, scene, renderer, light;
let mouse = new THREE.Vector2();
const h_scr = window.innerWidth;
const v_scr = window.innerHeight;

// 오브젝트 그룹 
const basicObject = new THREE.Object3D(); // plane같은 기본 오브젝트
const depthLv1Object = new THREE.Object3D(); // depthLv1 오브젝트 근접
const depthLv2Object = new THREE.Object3D(); // depthLv2 오브젝트 중간
const depthLv3Object = new THREE.Object3D(); // depthLv3 오브젝트 원거리

// 카메라 회전 관련 상수
const DAMPING_SPEED = 0.1; // 원위치로 회귀 speed
const INVALID_MOVING_AREA = 0.9; // 마우스 움직임 반영하지 않는 내부 비율. 
const ROTATE_SPEED = 0.005; // 카메라 회전 speed
const MAX_ROTATE_ANGLE = THREE.MathUtils.degToRad(5);

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

    light = new THREE.DirectionalLight(0xFFFFFF,4); // 나중에 수정 
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

   debbugingObject();
    createBasicObject();
    scene.add(basicObject);
    scene.add(depthLv1Object);
    scene.add(depthLv2Object);
    scene.add(depthLv3Object);
}

//[오브젝트 _ 기본 오브젝트 그룹]
function createBasicObject(){
   
    const plane = new THREE.Mesh( new THREE.PlaneGeometry( 1000 , 1000 ),
                    new THREE.MeshPhongMaterial( {color: 0xf0f0f0} ) );
    plane.position.set(0,-5,0);
    plane.rotation.x = Math.PI * -0.5;
    const texture = new THREE.TextureLoader().load( 'asset/Checker.png' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set( 300, 300 );
    plane.material.map = texture;

    basicObject.add( plane );
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
    const radius = 2; // 원 운동 반지름
    
    if(e.deltaY > 0){
        theta += LIGHT_ROTATE_SPEED;
    }
    else{
        theta -= LIGHT_ROTATE_SPEED;
    }
    
    light.position.x = radius * Math.cos(theta);
    light.position.y = radius * Math.sin(theta);
    light.position.z = 5; // z축 고정

    //theta값 계산 후, 회전 제한 기능 추가.
    
    console.log("theta :" + theta);
    //console.log(e.deltaY);

}

// [ 애니메이션 _ 카메라 회전 ] 
function cameraRotate(){ 
/* 마우스 위치에 따라 카메라 회전
 * 일정 영역(INVALID_MOVING_AREA) 외부, 확실하게 움직이려는 의사가 있을때만 회전 반영
 * 일정 영역(INVALID_MOVING_AREA) 내부, 원위치(0,0,0)을 바라보도록 복귀
*/
    //상하, x축 회전
    if(Math.abs(mouse.y) >= INVALID_MOVING_AREA){ // 외부 영역
        camera.rotation.x += (mouse.y)*ROTATE_SPEED;
    }
    else{ // 내부 영역
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, 0, DAMPING_SPEED)
    }

    //좌우, y축 회전
    if(Math.abs(mouse.x) >= INVALID_MOVING_AREA){ // 외부 영역
        camera.rotation.y += -(mouse.x)*ROTATE_SPEED;
    }
    else{ // 내부 영역
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, DAMPING_SPEED)
    }

    // 최대 회전 각도 제한
    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -MAX_ROTATE_ANGLE, MAX_ROTATE_ANGLE);
    camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -MAX_ROTATE_ANGLE, MAX_ROTATE_ANGLE);
}

init();    
animation();
