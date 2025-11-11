/**
 * 电影级相机系统
 * 提供震撼的相机移动和镜头效果
 */

import { THREE_LIB as THREE } from '../core/DependencyManager.js';

class CinematicCameraSystem {
    constructor(camera, scene) {
        this.camera = camera;
        this.scene = scene;
        this.isAnimating = false;
        
        // 相机参数
        this.params = {
            focusDistance: 400,
            smoothness: 0.1,
            transitionDuration: 2000
        };
        
        // 轨迹点
        this.pathPoints = [];
        this.currentPathIndex = 0;
        
        console.log('[CinematicCameraSystem] 初始化完成');
    }
    
    /**
     * 电影级聚焦到目标（带轨迹动画）
     */
    async focusOnTarget(targetPosition, targetName = '') {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        
        try {
            console.log('[CinematicCameraSystem] 开始聚焦到:', targetName);
            
            // 阶段1：计算轨迹
            const trajectory = this.calculateCinematicTrajectory(targetPosition);
            
            // 阶段2：执行轨迹移动
            await this.executeTrajectory(trajectory);
            
            // 阶段3：最终聚焦
            await this.finalFocus(targetPosition);
            
            console.log('[CinematicCameraSystem] 聚焦完成');
            
        } catch (error) {
            console.error('[CinematicCameraSystem] 聚焦失败:', error);
        } finally {
            this.isAnimating = false;
        }
    }
    
    /**
     * 计算电影级轨迹
     */
    calculateCinematicTrajectory(targetPosition) {
        const currentPosition = this.camera.position.clone();
        const targetDistance = targetPosition.length();
        
        // 创建贝塞尔曲线轨迹
        const midPoint = new THREE.Vector3().addVectors(currentPosition, targetPosition).multiplyScalar(0.5);
        
        // 添加曲线偏移，创造优雅的弧线
        const offset = new THREE.Vector3(
            (Math.random() - 0.5) * targetDistance * 0.3,
            (Math.random() - 0.5) * targetDistance * 0.3,
            (Math.random() - 0.5) * targetDistance * 0.3
        );
        
        midPoint.add(offset);
        
        // 生成轨迹点
        const points = [];
        const segments = 50;
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = this.quadraticBezier(
                currentPosition,
                midPoint,
                targetPosition,
                t
            );
            points.push(point);
        }
        
        return points;
    }
    
    /**
     * 二次贝塞尔曲线
     */
    quadraticBezier(p0, p1, p2, t) {
        const x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
        const y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
        const z = (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z;
        
        return new THREE.Vector3(x, y, z);
    }
    
    /**
     * 执行轨迹移动
     */
    executeTrajectory(points) {
        return new Promise((resolve) => {
            let currentIndex = 0;
            const totalPoints = points.length;
            const duration = this.params.transitionDuration;
            const interval = duration / totalPoints;
            
            const animate = () => {
                if (currentIndex >= totalPoints) {
                    resolve();
                    return;
                }
                
                const targetPoint = points[currentIndex];
                
                // 平滑移动到目标点
                if (window.TWEEN) {
                    new TWEEN.Tween(this.camera.position)
                        .to({
                            x: targetPoint.x,
                            y: targetPoint.y,
                            z: targetPoint.z
                        }, interval)
                        .easing(TWEEN.Easing.Quadratic.Out)
                        .onUpdate(() => {
                            // 相机始终看向球心
                            this.camera.lookAt(0, 0, 0);
                        })
                        .onComplete(() => {
                            currentIndex++;
                            setTimeout(animate, 10);
                        })
                        .start();
                } else {
                    this.camera.position.copy(targetPoint);
                    this.camera.lookAt(0, 0, 0);
                    currentIndex++;
                    setTimeout(animate, interval);
                }
            };
            
            animate();
        });
    }
    
    /**
     * 最终聚焦
     */
    finalFocus(targetPosition) {
        return new Promise((resolve) => {
            // 计算最终相机位置（在目标外侧）
            const direction = targetPosition.clone().normalize();
            const finalPosition = direction.multiplyScalar(targetPosition.length() * 1.3);
            
            if (window.TWEEN) {
                new TWEEN.Tween(this.camera.position)
                    .to({
                        x: finalPosition.x,
                        y: finalPosition.y,
                        z: finalPosition.z
                    }, 800)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onUpdate(() => {
                        this.camera.lookAt(0, 0, 0);
                    })
                    .onComplete(() => {
                        // 添加轻微晃动效果（手持相机感）
                        this.addCameraShake();
                        resolve();
                    })
                    .start();
            } else {
                this.camera.position.copy(finalPosition);
                this.camera.lookAt(0, 0, 0);
                resolve();
            }
        });
    }
    
    /**
     * 添加相机晃动（模拟手持）
     */
    addCameraShake() {
        const originalPosition = this.camera.position.clone();
        const shakeIntensity = 2;
        const shakeDuration = 300;
        const shakeCount = 10;
        
        let currentShake = 0;
        
        const shake = () => {
            if (currentShake >= shakeCount) {
                this.camera.position.copy(originalPosition);
                return;
            }
            
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity,
                (Math.random() - 0.5) * shakeIntensity
            );
            
            this.camera.position.copy(originalPosition).add(offset);
            this.camera.lookAt(0, 0, 0);
            
            currentShake++;
            setTimeout(shake, shakeDuration / shakeCount);
        };
        
        shake();
    }
    
    /**
     * 创建聚焦特效（光环、粒子）
     */
    createFocusEffects(targetPosition) {
        // 光环效果
        const ringGeometry = new THREE.RingGeometry(50, 60, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(targetPosition);
        ring.lookAt(0, 0, 0);
        this.scene.add(ring);
        
        // 光环动画
        if (window.TWEEN) {
            new TWEEN.Tween(ring.scale)
                .to({ x: 3, y: 3, z: 3 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    this.scene.remove(ring);
                    ring.geometry.dispose();
                    ring.material.dispose();
                })
                .start();
            
            new TWEEN.Tween(ring.material)
                .to({ opacity: 0 }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    }
}

export default CinematicCameraSystem;