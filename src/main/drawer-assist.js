/**
 * 辅助增强模块
 */

import {
    calcSWByScale
} from "./drawer-utils";

// 辅助线绘制样式
const ASSIST_LINE_STYLE = {
    color: 'cyan',
    width: 1
};

function _drawLine(fCanvas, points, lineWidth) {
    let line = new fabric.Line(points, {
        stroke: ASSIST_LINE_STYLE.color,
        strokeWidth: lineWidth,
        agType: 'ag-assistLine',
        selectable: false,
        evented: false
    });
    fCanvas.add(line);
    return line;
}

export function drawAssistLine(drawer, pointer) {
    removeAssistLine(drawer);

    let cW = drawer.originWidth;
    let cH = drawer.originHeight;
    let sw = calcSWByScale(ASSIST_LINE_STYLE.width, drawer.zoom);
    let hLine = _drawLine(drawer.canvas, [0, pointer.y, cW, pointer.y], sw);
    let vLine = _drawLine(drawer.canvas, [pointer.x, 0, pointer.x, cH], sw);
    hLine.bringToFront();
    vLine.bringToFront();
    drawer.assistLineH = hLine;
    drawer.assistLineV = vLine;
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
