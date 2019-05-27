// 快捷键
/*
1.选择物体：ctrl(按住) + 鼠标左键
2.拖拽画布：T
3.保存物体：Enter
4.删除物体：Delete
5.添加物体：Q/W（应支持添加附加属性，用以区分诸如缺陷框和普通物体框）
6.复制选中物体：ctrl + C
7.粘贴选中物体：ctrl + V
8.删除所有系统识别物体：ctrl + Delete（传入过滤参数？）
*/

import DrawerMode from './drawer-mode';
import {MODE_CURSOR, getCanvasModeCursor} from './mode-cursor';
import {
    limitObjectMoveBoundary,
    updateObjectOverlays,
    setCanvasInteractive,
    setStrokeWidthByScale
} from './drawer-utils';

let curDrawer;
let ctrlKey, spaceKey;

function setDrawer(drawer) {
    curDrawer = drawer;
}


function _toggleDragMode(drawer, flag) {
    setCanvasInteractive(drawer.canvas, drawer.mode);
    if(flag) {
        drawer.canvas.defaultCursor = MODE_CURSOR.grab;
    }else {
        drawer.canvas.defaultCursor = getCanvasModeCursor(drawer.mode);
    }
}

function _handleDireKeyEvt(dire, item, offsetX, offsetY, _this) {
    if (item && item.length !== 0 && !item.isEditing) {
        _moveItem(item, offsetX, offsetY, _this);
    } else {
        if (dire === 'left') {
            _this.option.afterKeydownLeft();
        } else if (dire === 'right') {
            _this.option.afterKeydownRight();
        } else if (dire === 'up') {
            _this.option.afterKeydownUp();
        } else if (dire === 'down') {
            _this.option.afterKeydownDown();
        }
    }
}

/**
 * 移动对象
 * @private
 * @param item
 * @param offsetX
 * @param offsetY
 */
function _moveItem(item, offsetX, offsetY, _this) {
    offsetX = parseInt(offsetX);
    offsetY = parseInt(offsetY);

    item.set({
        left: item.left + offsetX,
        top: item.top + offsetY
    }).setCoords();
    item.modified = true;
    item.lockScaleInDrawer = false;
    let isSingle = item.type !== 'activeSelection' && item.type !== 'group';
    _this.option.afterModify(item, isSingle);

    objectModifiedHandler(item);
    if(item.lockBoundary) {
        limitObjectMoveBoundary(item, _this._originCoord, _this.backgroundImageSize);
    }
    updateObjectOverlays(item);
}

function objectModifiedHandler(target) {
    let type = target.type;
    if (type === 'activeSelection' || type === 'group') {
        target.forEachObject(function (obj, index, objs) {
            objectModifiedHandler(obj);
        });
    } else {
        let labelObj = target._labelObject;
        if (labelObj) {
            labelObj.set({
                left: target.left,
                top: target.top - labelObj.height,
            }).setCoords();
        }
    }
}

function keydownHandler(evt) {
    if (!curDrawer) return;
    let self = curDrawer;
    if (evt.target.nodeName === 'input') return;

    let keyCode = evt.which;
    if (evt.ctrlKey) {
        ctrlKey = curDrawer.keyStatus.ctrl = true;
        //ctrl键：编辑模式下摁住可选择物体
        if (self.mode === DrawerMode.draw || (self.mode === DrawerMode.edit && !self.editDirectly)) {
            self.setExistObjectInteractive(true);
        }
    }
    // 快捷键缩放
    if (ctrlKey && evt.altKey) {
        switch (keyCode) {
            case 187:
                self.zoomIn();
                break;    //ctrl+alt+加号
            case 189:
                self.zoomOut();
                break;    //ctrl+alt+减号
        }
    }

    if (keyCode === 32) {
        spaceKey = curDrawer.keyStatus.space = true;
        _toggleDragMode(self, true);
    } else if (keyCode >= 37 && keyCode <= 40) {  //方位键
        switch (keyCode) {
            case 37:
                _handleDireKeyEvt('left', self.selectedItems, -1, 0, self);
                break;
            case 38:
                _handleDireKeyEvt('up', self.selectedItems, 0, -1, self);
                break;
            case 39:
                _handleDireKeyEvt('right', self.selectedItems, 1, 0, self);
                break;
            case 40:
                _handleDireKeyEvt('down', self.selectedItems, 0, 1, self);
                break;
        }
        self.refresh();
    } else if (keyCode === 46) {// 删除选中对象（如果是选中的对象则必须先取消选中再删除，否则无法成功删除）
        if (document.activeElement.nodeName === 'BODY') {
            let selection = self.getSelection();
            self.removeObjects(selection);
        }
    } else if (keyCode === 67 && self.mode !== DrawerMode.browse && ctrlKey) {// 复制对象：ctrl+C
        // 判断当前焦点对象是否是文本框，如果是则不执行复制对象的操作
        if (document.activeElement.nodeName === 'BODY') {
            self.copySelectedObject();
        }
    } else if (keyCode === 86 && self.mode !== DrawerMode.browse && ctrlKey) {// 粘贴对象：ctrl+V
        // 判断当前焦点对象是否是文本框，如果是则不执行粘贴对象的操作
        if (document.activeElement.nodeName === 'BODY') {
            self.pasteSelectedObject();
        }
    } else if (keyCode === 13) {// 回车
        let activeObj = self.canvas.getActiveObject();
        if (activeObj) {
            let isSingle = activeObj.type !== 'activeSelection' && activeObj.type !== 'group';
            let isModified = activeObj.modified ? activeObj.modified : false;
            self.option.afterEnter(activeObj, isSingle, isModified);
        } else {
            self.option.afterEnter(null, false, false);
        }
    } else if (keyCode === 84) {  //T键切换浏览模式
        if (self._beforeMode) {
            self.setMode(self._beforeMode);
            self._beforeMode = null;
        } else {
            self._beforeMode = self.mode;
            self.setMode(DrawerMode.browse);
        }
    } else if (keyCode === 27) {  //ESC键
        self.option.afterKeydownEsc();
    }
}

function keyupHandler(evt) {
    if (!curDrawer) return;
    let self = curDrawer;
    let keyCode = evt.which;
    if (keyCode === 17) {    //ctrl键：编辑模式下弹起取消可选择
        ctrlKey = curDrawer.keyStatus.ctrl = false;
        if (self.mode === DrawerMode.draw || (self.mode === DrawerMode.edit && !self.editDirectly)) {
            self.setExistObjectInteractive(false, false);
        }
    }else if (keyCode === 32) {
        spaceKey = curDrawer.keyStatus.space = false;
        _toggleDragMode(self, false);
    }
}

export default {
    setDrawer,
    objectModifiedHandler,
    keydownHandler,
    keyupHandler
};
