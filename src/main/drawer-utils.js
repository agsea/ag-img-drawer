// 一些工具方法及其他

import DrawerMode from "./drawer-mode";

/**
 * 获取绘制边界
 */
export function getDrawBoundary(coord, imgSize) {
    return {
        minX: coord[0],
        minY: coord[1],
        maxX: coord[0] + imgSize[0],
        maxY: coord[1] + imgSize[1]
    };
}

/**
 * 限制绘制边界在图片范围内
 * @param xy
 * @param coordXy
 * @param imgWh
 * @returns {*}
 */
export function limitDrawBoundary(xy, coordXy, imgWh) {
    if (xy < coordXy) {
        xy = coordXy;
    } else if (xy > coordXy + imgWh) {
        xy = coordXy + imgWh;
    }
    return xy;
}

/**
 * 限制对象不能移出图片范围
 * @param target
 * @param coord
 * @param imgSize
 */
export function limitObjectMoveBoundary(target, coord, imgSize) {
    let l = target.left, t = target.top;
    let w = target.width, h = target.height;
    let minL = coord[0], minT = coord[1];
    let maxL = minL + imgSize[0] - w;
    let maxT = minT + imgSize[1] - h;

    if (l < minL) {
        l = minL;
    } else if (l > maxL) {
        l = maxL;
    }
    if (t < minT) {
        t = minT;
    } else if (t > maxT) {
        t = maxT;
    }
    target.set({
        left: l,
        top: t,
    }).setCoords();
}

export function checkIfWithinBackImg(point, coord, imgSize) {
    return point.x > coord[0] && point.x < coord[0] + imgSize[0] &&
        point.y > coord[1] && point.y < coord[1] + imgSize[1];
}

export function updateObjectOverlays(target) {
    let overlays = target._overlays;
    if (overlays) {
        overlays.forEach(function (item) {
            setOverlayPosition(target, item);
        });
    }
}

export function setOverlayPosition(target, ele) {
    let overlayOpt = ele.overlayOpt;

    let eleBoundRect = ele.getBoundingClientRect();
    let sw = target.strokeWidth;

    let coordTl = target.oCoords.tl;
    let coordBr = target.oCoords.br;
    let tarL, tarT;
    if (overlayOpt.position === 'top') {
        tarL = coordTl.x;
        tarT = coordTl.y - eleBoundRect.height - sw;
    } else if (overlayOpt.position === 'bottom') {
        tarL = coordTl.x;
        tarT = coordBr.y + sw;
    } else if (overlayOpt.position === 'left') {
        tarL = coordTl.x - eleBoundRect.width;
        tarT = coordTl.y;
    } else if (overlayOpt.position === 'right') {
        tarL = coordBr.x + sw;
        tarT = coordTl.y;
    }

    tarL += overlayOpt.offset[0];
    tarT += overlayOpt.offset[1];
    ele.style.left = tarL + 'px';
    ele.style.top = tarT + 'px';
}

/**
 *
 * @param {获取最小或最大值} val1
 * @param {*} val2
 * @param {*} isMin - true:最小，false:最大
 */
export function getMinOrMaxBetween(val1, val2, isMin) {
    if (isMin) {
        return (val1 > val2) ? val2 : val1;
    } else {
        return (val1 > val2) ? val1 : val2;
    }
}

export function getCursorStyle(base64) {
    return 'url("' + base64 + '"), auto';
}

export function setCanvasInteractive(fCanvas, mode) {
    fCanvas.interactive = mode !== DrawerMode.browse;
}

/**
 * 获取对象得WKT表示，序列化取左上角，右下角
 * @param object
 * @param coord
 * @param ratioX
 * @param ratioY
 * @returns {string}
 */
export function getShape(object, coord, ratioX, ratioY) {
    let l = (object.left - coord[0]) / ratioX;
    let t = (object.top - coord[1]) / ratioY;
    let w = object.width / ratioX;
    let h = object.height / ratioY;

    if(isNaN(l) || isNaN(t) || isNaN(w) || isNaN(h)) {
        throw new Error("解析对象shape失败");
    }

    let ltPoint = [l.toFixed(2), t.toFixed(2)];
    let rbPoint = [(l + w).toFixed(2), (t + h).toFixed(2)];
    return `BOX(${ltPoint.join(' ')},${rbPoint.join(' ')})`;
}

/**
 * 合并对象属性：若存在相同属性则使用后面对象的属性
 * @param obj1
 * @param obj2
 * @private
 */
export function mergeObject(obj1, obj2) {
    let result = {};
    if (typeof obj1 !== 'object' && typeof obj2 !== 'object') {
        return result;
    } else if (typeof obj1 === 'object' && typeof obj2 !== 'object') {
        return obj1;
    } else if (typeof obj1 !== 'object' && typeof obj2 === 'object') {
        return obj2;
    } else {
        for (let k in obj1) {
            if (obj1[k] !== undefined) {
                result[k] = obj1[k];
            }
        }
        for (let m in obj2) {
            if (obj2[m] !== undefined) {
                result[m] = obj2[m];
            }
        }
        return result;
    }
}

/**
 * 获取对象左上角点相对容器的坐标
 * @param object
 * @param zoom
 * @returns {{x: number, y: number}}
 */
function _getObjPointerToCon(object, zoom) {
    let l = object.left * zoom;
    let t = object.top * zoom;
    return {
        x: l,
        y: t
    };
}

export function setObjectMoveLock(objects, isLock) {
    objects.forEach((item) => {
        item.set({
            lockMovementX: isLock,
            lockMovementY: isLock
        });
    });
}
