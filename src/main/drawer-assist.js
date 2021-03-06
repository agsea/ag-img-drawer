/**
 * 辅助增强模块
 */

import {
    // AG_SOURCE,
    AG_TYPE, calcBoundingRect,
    calcSWByScale,
    checkIfWithinBackImg,
    updateObjectOverlays
} from "./drawer-utils";
import {showMessgae} from "./drawer-message";

// 辅助线绘制样式
const ASSIST_LINE_STYLE = {
    color: 'cyan',
    width: 1,
    polygonColor: 'blue'
};

// 辅助线显示策略
export const ASSIST_LINE_MODE = {
    always: 0,  // 常显示
    onMouseDown: 1, // 鼠标摁下显示
    hide: 2 // 不显示
};

function _drawAssLine(fCanvas, points, lineWidth, color) {
    let line = new fabric.Line(points, {
        stroke: color,
        strokeWidth: lineWidth,
        selectable: false,
        evented: false,
        agType: AG_TYPE.agAssistLine
    });
    fCanvas.add(line);
    return line;
}

export function drawAssistLine(drawer, pointer) {
    removeAssistLine(drawer);

    let coord = drawer._originCoord;
    let imgSize = drawer.backgroundImageSize;
    let ifWithin = checkIfWithinBackImg(pointer, coord, imgSize);
    let sw = calcSWByScale(ASSIST_LINE_STYLE.width, drawer.zoom);
    if(ifWithin.yWithin) {
        let hLine = _drawAssLine(drawer.canvas, [coord[0], pointer.y, coord[0] + imgSize[0], pointer.y],
            sw, ASSIST_LINE_STYLE.color);
        hLine.bringToFront();
        drawer.assistLineH = hLine;
    }
    if(ifWithin.xWithin) {
        let vLine = _drawAssLine(drawer.canvas, [pointer.x, coord[1], pointer.x, coord[1] + imgSize[1]],
            sw, ASSIST_LINE_STYLE.color);
        vLine.bringToFront();
        drawer.assistLineV = vLine;
    }
}

export function removeAssistLine(drawer) {
    if(drawer.assistLineH) {
        drawer.canvas.remove(drawer.assistLineH);
        delete drawer.assistLineH;
    }
    if(drawer.assistLineV) {
        drawer.canvas.remove(drawer.assistLineV);
        delete drawer.assistLineV;
    }
}

export function updateAssistLine(drawer) {
    let sw = calcSWByScale(ASSIST_LINE_STYLE.width, drawer.zoom);
    if(drawer.assistLineH) {
        drawer.assistLineH.set('strokeWidth', sw);
    }
    if(drawer.assistLineV) {
        drawer.assistLineV.set('strokeWidth', sw);
    }
}

function _drawPolygonAssLine(fCanvas, points, lineWidth, color) {
    let line = new fabric.Polyline(points, {
        stroke: color,
        strokeWidth: lineWidth,
        fill: null,
        selectable: false,
        evented: false,
        agType: AG_TYPE.agAssistLine
    });
    fCanvas.add(line);
    return line;
}

/**
 * 绘制多边形时的辅助线
 */
export function drawPolygonAssistLine(drawer, polygonPoints) {
    removePolygonAssistLine(drawer);

    if(polygonPoints instanceof Array && polygonPoints.length > 0) {
        let sw = calcSWByScale(ASSIST_LINE_STYLE.width, drawer.zoom);
        if(polygonPoints.length > 2) {
            // 绘制静态线
            let assiLineStatic = _drawPolygonAssLine(drawer.canvas, polygonPoints, sw, drawer.drawStyle.borderColor);
            assiLineStatic.bringToFront();
            drawer.polygonAssiLineSta = assiLineStatic;
        }

        // 绘制动态线
        let len = polygonPoints.length;
        let p1 = polygonPoints[len - 2];
        let p2 = polygonPoints[len - 1];
        let dynLinePoints = [p1.x, p1.y, p2.x, p2.y];
        let assiLineDynamic = _drawAssLine(drawer.canvas, dynLinePoints, sw, drawer.drawStyle.borderColor);
        assiLineDynamic.bringToFront();
        drawer.polygonAssiLineDyn = assiLineDynamic;
    }
}

export function removePolygonAssistLine(drawer) {
    if(drawer.polygonAssiLineSta) {
        drawer.canvas.remove(drawer.polygonAssiLineSta);
        delete drawer.polygonAssiLineSta;
    }
    if(drawer.polygonAssiLineDyn) {
        drawer.canvas.remove(drawer.polygonAssiLineDyn);
        delete drawer.polygonAssiLineDyn;
    }
}

export function drawPolygonAnchor(drawer, polygon) {
    if(!polygon || !(polygon.points instanceof Array) || polygon._hasPolygonAnchor) return;
    polygon._polygonAnchors = [];
    polygon._hasPolygonAnchor = true;

    let offsetL = polygon.left - polygon.originLeft;
    let offsetT = polygon.top - polygon.originTop;
    let points = polygon.points;
    let style = drawer.drawStyle;
    let radius = parseInt(style.anchorSize / 2);
    let tarRadius = calcSWByScale(radius, drawer.zoom);
    let tarSW = calcSWByScale(style.anchorStrokeWidth, drawer.zoom);
    let offset = tarRadius + tarSW / 2;
    points.forEach((p) => {
        let l = p.x - offset + offsetL;
        let t = p.y - offset + offsetT;
        let c = new fabric.Circle({
            left: l,
            top: t,
            originLeft: l,
            originTop: t,
            radius: tarRadius,
            strokeWidth: tarSW,
            fill: style.anchorColor,
            stroke: style.anchorStrokeColor,
            hasControls: false,
            hasBorders: false,
            originRadius: radius,
            originStrokeWidth: style.anchorStrokeWidth,
            agType: AG_TYPE.agAnchor
        });
        c._linkedPoint = p;
        c._linkedPolygon = polygon;
        polygon._polygonAnchors.push(c);
        drawer.canvas.add(c);
        _bindEvtForPolygonAnchor(drawer, c);
    });
}

export function updatePolygonAnchor(drawer, polygon) {
    if(!polygon || !(polygon._polygonAnchors instanceof Array)) return;

    let offsetL = polygon.left - polygon.originLeft;
    let offsetT = polygon.top - polygon.originTop;

    let anchors = polygon._polygonAnchors;
    anchors.forEach((item) => {
        let tarRadius = calcSWByScale(item.originRadius, drawer.zoom);
        let tarSW = calcSWByScale(item.originStrokeWidth, drawer.zoom);
        let offset = tarRadius + tarSW / 2;
        let linkPoint = item._linkedPoint;
        item.set({
            left: linkPoint.x - offset + offsetL,
            top: linkPoint.y - offset + offsetT,
            radius: tarRadius,
            strokeWidth: tarSW,
        }).setCoords();
    });
}

export function setPolygonAnchorVisible(polygon, visible) {
    visible = visible !== false;
    if(polygon && (polygon._polygonAnchors instanceof Array)) {
        polygon._polygonAnchors.forEach((item) => {
            item.set('visible', visible);
        });
    }
}

export function removePolygonAnchor(drawer, polygon) {
    if(polygon && (polygon._polygonAnchors instanceof Array)) {
        polygon._polygonAnchors.forEach((item) => {
            drawer.removeObject(item, false);
        });
        polygon._polygonAnchors = null;
        polygon._hasPolygonAnchor = false;
    }
}

function _bindEvtForPolygonAnchor(drawer, anchorObj) {
    // 锚点移动
    anchorObj.on('moving', function (evt) {
        var point = evt.pointer;
        let polygon = anchorObj._linkedPolygon;
        var offsetL = polygon.left - polygon.originLeft;
        var offsetT = polygon.top - polygon.originTop;
        anchorObj._linkedPoint.x = point.x - offsetL;
        anchorObj._linkedPoint.y = point.y - offsetT;
        let offset = anchorObj.radius + anchorObj.strokeWidth;
        anchorObj.set({
            left: point.x - offset,
            top: point.y - offset,
        });
        calcPolygonCoords(polygon);
        // updateObjectOverlays(polygon);
        drawer.refresh();
    });
    // 锚点选中
    anchorObj.on('selected', function (evt) {
        // console.info('锚点选中');
        anchorObj.set({
            fill: drawer.drawStyle.anchorColorActive
        });
    });
    // 锚点取消选中
    anchorObj.on('deselected', function (evt) {
        // console.info('锚点取消选中');
        anchorObj.set({
            fill: drawer.drawStyle.anchorColor
        });
    });
}

/**
 * 移除多边形对象的某个点，然后重新绘制该对象
 * @param drawer
 * @param polygon
 * @param point
 */
export function removePolygonPointByAnchor(drawer, anchor) {
    if(!anchor) return;

    let polygon = anchor._linkedPolygon;
    let points = polygon.points;
    let len = points.length;
    if(len <= 3) {
        showMessgae('多边形至少包含三个点', {
            type: 'warning',
            duration: 1500
        });
        return;
    }

    let point = anchor._linkedPoint;
    let anchors = polygon._polygonAnchors;
    for(let i = 0; i < len; i++) {
        if(point === points[i]) {
            points.splice(i, 1);
            drawer.removeObject(anchor, false);
            for(let j = 0; j < anchors.length; j++) {
                if(anchor === anchors[j]) {
                    anchors.splice(j, 1);
                    break;
                }
            }
            break;
        }
    }
    calcPolygonCoords(polygon);
    drawer.option.afterModify(polygon, true);
    drawer.refresh();
}

/**
 * 重新计算多边形对象的定位点，即最小外包矩形的四角坐标
 * @param polygon
 */
export function calcPolygonCoords(polygon) {
    let points = polygon.points;
    let bRect = calcBoundingRect(points);
    let oCoords = polygon.oCoords;
    oCoords.tl.x = bRect.minX;
    oCoords.tl.y = bRect.minY;

    oCoords.tr.x = bRect.maxX;
    oCoords.tr.y = bRect.minY;

    oCoords.bl.x = bRect.minX;
    oCoords.bl.y = bRect.maxY;

    oCoords.br.x = bRect.maxX;
    oCoords.br.y = bRect.maxY;
}
