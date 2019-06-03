/**
 * 辅助增强模块
 */

import {
    calcSWByScale,
    checkIfWithinBackImg
} from "./drawer-utils";

// 辅助线绘制样式
const ASSIST_LINE_STYLE = {
    color: 'cyan',
    width: 1
};

// 辅助线显示策略
export const ASSIST_LINE_MODE = {
    always: 0,  // 常显示
    onMouseDown: 1, // 鼠标摁下显示
    hide: 3 // 不显示
};

function _drawAssLine(fCanvas, points, lineWidth) {
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

    let coord = drawer._originCoord;
    let imgSize = drawer.backgroundImageSize;
    let ifWithin = checkIfWithinBackImg(pointer, coord, imgSize);
    let sw = calcSWByScale(ASSIST_LINE_STYLE.width, drawer.zoom);
    if(ifWithin.yWithin) {
        let hLine = _drawAssLine(drawer.canvas, [coord[0], pointer.y, coord[0] + imgSize[0], pointer.y], sw);
        hLine.bringToFront();
        drawer.assistLineH = hLine;
    }
    if(ifWithin.xWithin) {
        let vLine = _drawAssLine(drawer.canvas, [pointer.x, coord[1], pointer.x, coord[1] + imgSize[1]], sw);
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
