// 20240789 이지현
import * as THREE from 'three';

// 
const h_scr = window.innerWidth;
const v_scr = window.innerHeight;
const scene = new THREE.Scene();
const camera = createCamera(h_scr/v_scr); 
const renderer = createRenderer(h_scr, v_scr);


const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshPhongMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
cube.position.set(0,0,0);

// animate_camera 상수
const cursor = {
        x : 0,
        y : 0
    };
const dampingSpeed = 0.1; // 원위치로 회귀 speed
const invalidMovePos = 0.9; // 마우스 움직임 반영하지 않는 내부 비율. 
const rotationSpeed = 0.005; // 카메라 회전 speed
const MAX_ANGLE_RAD = THREE.MathUtils.degToRad(5);

function start() {
    console.log('main start');
    scene.background = new THREE.Color( 0xffffff );

    const light = new THREE.DirectionalLight(0xFFFFFF,1); // 나중에 수정 
    light.position.set(-1, 2, 4);
    scene.add(light);

    scene.add( cube );

}

function setMouseControl(){
    // 카메라 움직임
    function cursorMove(e) {
        cursor.x = e.clientX/h_scr*2 -1;
        cursor.y = e.clientY/v_scr*(-2) +1;

        console.log("x : " +cursor.x +", y : " +cursor.y)
    }

    // function click(e){

    // }

    addEventListener("mousemove", cursorMove)
    // addEventListener("mousedown", click)
}

function animation(){
    requestAnimationFrame(animation);

    cameraRotate();
    cube.rotateX(0.03);  
    cube.rotateY(0.01); 

    renderer.render(scene, camera);
}

function cameraRotate(){
            //상하, x축 회전
    if(Math.abs(cursor.y) >= invalidMovePos){ //
        camera.rotation.x += (cursor.y)*rotationSpeed;
    }
    else{
        camera.rotation.x = THREE.MathUtils.lerp(camera.rotation.x, 0, dampingSpeed)
    }
    //좌우, y축 회전
    if(Math.abs(cursor.x) >= invalidMovePos){
        camera.rotation.y += -(cursor.x)*rotationSpeed;
    }
    else{
        camera.rotation.y = THREE.MathUtils.lerp(camera.rotation.y, 0, dampingSpeed)
    }

    camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
    camera.rotation.y = THREE.MathUtils.clamp(camera.rotation.y, -MAX_ANGLE_RAD, MAX_ANGLE_RAD);
}

function createRenderer(h_scr,v_scr){ // 렌더러 객체 생성 후 리턴
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( h_scr, v_scr );       
    document.body.appendChild(renderer.domElement); 
    return renderer;
}

function createCamera(aspectRatio) { // 카메라 생성 , 카메라 객체 리턴
    const camera = new THREE.PerspectiveCamera( 25, aspectRatio, 0.1, 1000 );
    camera.position.set(0, 0, 10);
    camera.lookAt(0,0,0); 
    // 카메라 객체가 position 0,0,0을 바라보도록 설정
    return camera; 
}


start();    
setMouseControl();
animation();
