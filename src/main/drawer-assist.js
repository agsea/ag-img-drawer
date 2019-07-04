/**
 * 辅助增强模块
 */

import {
    // AG_SOURCE,
    AG_TYPE,
    calcSWByScale,
    checkIfWithinBackImg
} from "./drawer-utils";

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
export function drawPolygonAssistLine(drawer, polygonPoints, pointer) {
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
    let radius = parseInt(style.anchorSize * 2 / 3);
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
            agType: AG_TYPE.agExclude
        });
        c._linkedPoint = p;
        polygon._polygonAnchors.push(c);
        drawer.canvas.add(c);
        _bindEvtForPolygonAnchor(drawer, c, polygon);
    });
}

export function updatePolygonAnchor(polygon) {
    if(!polygon || !(polygon.points instanceof Array)) return;

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

export function removePolygonAnchor(drawer, polygon) {
    if(polygon && (polygon._polygonAnchors instanceof Array)) {
        polygon._polygonAnchors.forEach((item) => {
            drawer.removeObject(item, false);
        });
        polygon._polygonAnchors = null;
        polygon._hasPolygonAnchor = false;
    }
}

function _bindEvtForPolygonAnchor(drawer, anchorObj, polygon) {
    anchorObj.on('moving', function (evt) {
        let point = evt.pointer;
        let offsetL = polygon.left - polygon.originLeft;
        let offsetT = polygon.top - polygon.originTop;
        anchorObj._linkedPoint.x = point.x - offsetL;
        anchorObj._linkedPoint.y = point.y - offsetT;
        drawer.refresh();
    });
}
