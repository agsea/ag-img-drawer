// 一些工具方法及其他

import DrawerMode from './drawer-mode';
import AgMultiPolygon from './multi-polygon';

// 自定义的一些对象类型
export const AG_TYPE = {
    agBgImg: 'ag_bgImg',
    agLabel: 'ag_label',
    agRect: 'ag_rect',
    agAssistLine: 'ag_assistLine',
    agExclude: 'ag_exclude' // 要排除的对象
};

// 对象来源
export const AG_SOURCE = {
    byApi: 'api',
    byDraw: 'draw'
};

export const MOUSE_POINT = {
    x: 0,
    y: 0
};

// 检测是否是定义对象类型
export function isAgType(type) {
    for(let key in AG_TYPE) {
        if(type === AG_TYPE[key]) {
            return true;
        }
    }
    return false;
}

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
    let x = point.x > coord[0] && point.x < coord[0] + imgSize[0];
    let y = point.y > coord[1] && point.y < coord[1] + imgSize[1];
    return {
        xWithin: x,
        yWithin: y,
        within: x && y
    };
}

export function updateObjectOverlays(target, action) {
    let overlays = target._overlays;
    if (overlays) {
        if(action) {
            overlays.forEach(function (item) {
                _setOverlayPosByAction(target, item, action);
            });
        }else {
            overlays.forEach(function (item) {
                setOverlayPosition(target, item);
            });
        }
    }
}

function _setOverlayPosByAction(target, overlay, action) {
    let overlayOpt = overlay.overlayOpt;

    let eleBoundRect = overlay.getBoundingClientRect();
    let sw = target.strokeWidth;

    let coordTl = target.oCoords.tl;
    let coordBr = target.oCoords.br;

    if(action.type === 'scale') {
        if(action.corner === 'tl') {
            coordTl = action.pointer;
        }else if(action.corner === 'bl') {
            coordTl.x = action.pointer.x;
            coordBr.y = action.pointer.y;
        }else if(action.corner === 'tr') {
            coordTl.y = action.pointer.y;
            coordBr.x = action.pointer.x;
        }
        else if(action.corner === 'br') {
            coordBr = action.pointer;
        }
    }

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
    overlay.style.left = tarL + 'px';
    overlay.style.top = tarT + 'px';
}

export function setOverlayInteractive(overlay, flag) {
    if(overlay.tagName === 'INPUT' || overlay.tagName === 'TEXTAREA') {
        if(flag !== false) {
            overlay.removeAttribute('readOnly');
        }else {
            overlay.setAttribute('readOnly', true);
        }
    }

    let children = overlay.childNodes;
    if(children && children.length) {
        children.forEach((item) => {
            setOverlayInteractive(item, flag);
        });
    }
}

export function setOverlayPosition(target, overlay) {
    let overlayOpt = overlay.overlayOpt;

    let eleBoundRect = overlay.getBoundingClientRect();
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
    overlay.style.left = tarL + 'px';
    overlay.style.top = tarT + 'px';
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
 * @param imgRatioXY
 * @returns {string}
 */
export function getWkt(object, coord, imgRatioXY) {
    let l = (object.left - coord[0]) / imgRatioXY.x;
    let t = (object.top - coord[1]) / imgRatioXY.y;
    let w = object.width / imgRatioXY.x;
    let h = object.height / imgRatioXY.y;

    if(isNaN(l) || isNaN(t) || isNaN(w) || isNaN(h)) {
        throw new Error("解析对象shape失败");
    }

    let ltPoint = [l.toFixed(2), t.toFixed(2)];
    let rbPoint = [(l + w).toFixed(2), (t + h).toFixed(2)];
    return `BOX(${ltPoint.join(' ')},${rbPoint.join(' ')})`;
}

function _getSinglePolygonWkt(object, coord, imgRatioXY, zoom) {
    let anchors = object._polygonAnchors;
    let wktPiece = [];
    anchors.forEach((item) => {
        let tarRadius = calcSWByScale(item.originRadius, zoom);
        let tarSW = calcSWByScale(item.originStrokeWidth, zoom);
        let offset = tarRadius + tarSW / 2;
        let l = (item.left + offset - coord[0]) / imgRatioXY.x;
        let t = (item.top + offset - coord[1]) / imgRatioXY.y;
        wktPiece.push(l.toFixed(2) + ' ' + t.toFixed(2));
    });
    if(wktPiece.length) {
        wktPiece.push(wktPiece[0]);
    }
    return '((' + wktPiece.join(',') + '))';
}

export function getPolygonWkt(object, coord, imgRatioXY, zoom) {
    let shapes = [];
    if(object._groupPolygon instanceof Array && object._groupPolygon.length) {
        object._groupPolygon.forEach((item) => {
            shapes.push(_getSinglePolygonWkt(item, coord, imgRatioXY, zoom));
        });
    }else {
        shapes.push(_getSinglePolygonWkt(object, coord, imgRatioXY, zoom));
    }
    return 'MULTIPOLYGON(' + shapes.join(',') + ')';
}

function _createPolygon(points, drawer) {
    let originPos = calcBoundingRectPoit(points);
    return new fabric.Polygon(points, {
        left: originPos.x,
        top: originPos.y,
        strokeWidth: drawer.drawStyle._borderWidth,
        stroke: drawer.drawStyle.borderColor,
        fill: drawer.drawStyle.backColor,
        objectCaching: false,
        hasControls: false,
        hasBorders: false,
        // selectable: false,
        // evented: false,
    });
}

export function parsePolygonFromWkt(wkt, drawer, coord, imgRatioXY) {
    if(!wkt) return null;

    let tmpWkt = wkt.replace('MULTIPOLYGON(', '');
    tmpWkt = tmpWkt.substring(0, tmpWkt.length - 1);
    let wktPieces = [];
    let i = tmpWkt.indexOf('))');
    while (i > -1) {
        wktPieces.push(tmpWkt.substring(0, i + 2));
        tmpWkt = tmpWkt.substring(i + 3);
        i = tmpWkt.indexOf('))');
    }

    let multiPolygon = new AgMultiPolygon();
    let polygons = multiPolygon.polygons;
    let isGroup = wktPieces.length > 0;
    let groupPolygon = [];
    let groupIndex = ++drawer.groupPolyGeoIndex;
    wktPieces.forEach((wktPiece) => {
        let tmpWktPiece = wktPiece.replace(/\(\(|\)\)/g, '');
        let piecePointStrs = tmpWktPiece.split(',');
        let points = [];
        piecePointStrs.forEach((piecePStr) => {
            let tmpPoint = piecePStr.split(' ');
            points.push({
                x: parseFloat(tmpPoint[0]) * imgRatioXY.x + coord[0],
                y: parseFloat(tmpPoint[1]) * imgRatioXY.y +coord[1]
            });
        });
        points.pop();  // 去除最后一个重复的点
        let polygon = _createPolygon(points, drawer);
        if(isGroup) {
            polygon._groupPolygonIndex = groupIndex;
            groupPolygon.push(polygon);
            polygon._groupPolygon = groupPolygon;
        }
        polygons.push(polygon);
    });
    return multiPolygon;
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
        if(item instanceof fabric.Object) {
            item.set({
                lockMovementX: isLock,
                lockMovementY: isLock
            });
        }
    });
}

/**
 * 根据绘图器缩放等级计算边框大小
 * @private
 * @param originSW
 * @param scale
 */
export function calcSWByScale(originSW, scale) {
    let newSW = originSW / scale;
    if(newSW > 8) {
        newSW = 8;
    }else if(newSW < 0.1) {
        newSW = 0.1;
    }
    return newSW;
}

/**
 * 根据缩放等级获取边框宽度
 * @private
 * @param item
 * @param scale - 当前缩放比例
 */
export function setStrokeWidthByScale(item, scale) {
    if (item.agType === 'ag-label') {
        return;
    }

    if (item.isType('group')) {
        item.forEachObject(function (obj, index, objs) {
            setStrokeWidthByScale(obj, scale);
        });
    }else {
        let strokeWidth = calcSWByScale(item.originStrokeWidth, scale);
        item.set('strokeWidth', strokeWidth).setCoords();
    }
}

export function calcBoundingRectPoit(points) {
    var p = {};
    points.forEach((item) => {
        if(!p.x || item.x < p.x) {
            p.x = item.x;
        }
        if(!p.y || item.y < p.y) {
            p.y = item.y;
        }
    });
    return p;
}

export function scaleImgToSize(oImg, tarSize) {
    oImg.scaleX = tarSize[0] / oImg.width;
    oImg.scaleY = tarSize[1] / oImg.height;
}

/**
 * 将对象转为数组，数组元素为对象属性值
 * @param {*} object
 */
export function convertObjToArr(object) {
    var result = [];
    if(typeof object === 'object') {
        for(var key in object) {
            result.push(object[key]);
        }
    }
    return result;
}

/**
 * 将对象属性转为数组
 * @param {*} object
 */
export function convertObjKeyToArr(object) {
    var result = [];
    if(typeof object === 'object') {
        for(var key in object) {
            result.push(key);
        }
    }
    return result;
}
