/**
 * 基于fabric.js的Web绘图器
 * Created by aegean on 2017/5/19 0019.
 */

import DrawerEvt from './drawer-event';
import DrawerMode from './drawer-mode';
import {MODE_CURSOR} from './mode-cursor';
import {
    getDrawBoundary,
    limitDrawBoundary,
    limitObjectMoveBoundary,
    checkIfWithinBackImg,
    updateObjectOverlays,
    setOverlayPosition,
    setCanvasInteractive,
    getShape,
    mergeObject,
    setObjectMoveLock,
    calcSWByScale,
    setStrokeWidthByScale
} from './drawer-utils';

(function (global) {
    // 默认配置项
    let defaultOption = {
        width: 600,     //若要指定绘图器图片宽高，请将 backgroundInScale 设为false
        height: 560,
        margin: 0,      // 画布与容器的边距
        padding: 30,    // 图片与画布的边距
        backgroundUrl: null,    //背景图片地址
        backgroundInScale: true,   // 保持宽高比例
        loadingMask: false,  //加载动画遮罩
        lockBoundary: false, //锁定操作边界在图片范围内
        zoomWidthInLocate: 350, // 定位对象时对象缩放的最大尺寸
        afterInitialize: function () {
        },
        afterAdd: function (object) {
        },      //添加对象回调，携带一个参数为所添加的对象，添加包括所有的绘制情况
        afterDraw: function (object) {
        },     //绘制回调，携带一个参数为所绘制的对象
        afterModify: function (object, isSingle) {
        },         //修改回调，携带参数：所修改的对象、是否是单个对象
        afterEnter: function (object, isSingle, isModified) {
        },          //按回车键回调，携带参数：当前选中对象、是否是单个对象、是否修改
        beforeDelete: function (objects, ifCtrl) {
        },                //删除前回调，携带参数：将要删除的对象数组、ctrl键是否按下、方法返回false则取消删除
        afterDelete: function (objects, ifCtrl) {
        },          //删除回调createOverlay，携带参数：删除的对象数组、ctrl键是否按下
        afterClear: function (objects) {
        },           //清空回调，携带一个参数为包含所有对象的数组
        afterSelect: function (objects) {
        },          //选中物体回调，携带一个参数为所选中的对象数组
        afterCancelSelect: function () {
        },           //选中集清空时的回调
        afterObjectDeSelect: function () {
        },           //取消选中物体回调
        afterCopy: function (objects) {
        },            //复制选中对象的回调，携带参数：所复制的对象集合
        afterPaste: function (objects) {
        },           //粘贴选中对象的回调，携带一个参数为所粘贴的对象集合
        afterKeydownLeft: function () {
        },
        afterKeydownRight: function () {
        },
        afterKeydownUp: function () {
        },
        afterKeydownDown: function () {
        },
        afterKeydownEsc: function () {
        }
    };

    // 绘制类型：Rect、Circle、Circle
    let DRAWER_TYPE = {
        rect: 'Rect',
        ellipse: 'Ellipse',
        text: 'Text'
    };

    // 内部变量
    let _beforeActiveObjs = null;
    let _clipboard = null;
    let _hoverOnCanvas = false;
    let _mousePosition = {
        move: {x: 0, y: 0}
    };

    // 当前绘图器的引用
    let _curDrawer = null;


    //--------------------------------------------------------
    // AgImgDrawer: 核心
    //--------------------------------------------------------
    /**
     * 绘图器构造函数
     * @param containerId
     * @param option
     * @constructor
     */
    global.AgImgDrawer = function (containerId, option) {
        option = mergeObject(defaultOption, option);

        if (!containerId) {
            console.error('Initialize has failed,  the field "containerId" must has value.');
            return;
        }

        this.version = '3.0.0';
        this.containerId = containerId;
        this.option = option;
        this.mode = DrawerMode.browse;
        this._beforeMode = null;
        this.drawType = DRAWER_TYPE.rect;
        this.canvas = null;
        this.maskEle = null;
        this.drawingItem = null;//正在绘制的对象
        this.originWidth = null;
        this.originHeight = null;
        this.drawable = false;  //是否是可绘制状态
        this.dragDirectly = true;  //是否可以使用鼠标左键直接拖拽
        // this.selectable = true; //是否允许选择对象
        this.selectedItems = null;
        this.editDirectly = false;  //仅在编辑模式有效：是否可以直接对画布上的对象编辑，如果为false则需摁住ctrl键操作对象
        this.backgroundUrl = null;
        this.backgroundImage = null;
        this.backgroundImageSize = [0, 0];
        this.zoom = 1;
        this.loadingMask = false;
        this.drawStyle = {  // 绘制样式
            borderColor: '#f04155',
            borderColorActive: '#ffc64b',
            borderWidth: 1.5,
            _borderWidth: 2,
            backColor: 'rgba(0, 0, 0, 0)',   // 'rgba(0, 0, 0, 0.24)'
            backColorHover: 'rgba(200, 165, 89, 0.4)',
            backColorActive: 'rgba(200, 165, 89, 0.6)',
            fontFamily: 'Microsoft YaHei',
            fontSize: 14,
            fontColor: '#fff',
            fontColorActive: '#333',
            fontBackColor: 'rgba(240, 65, 85, 0.7)',
            fontBackColorActive: 'rgba(255, 198, 75, 0.7)',
            fontWeight: 'normal',
            fontStyle: 'normal',
            underline: false,
            linethrough: false,
            overline: false,
            strokeColor: '#fff',
            strokeWidth: 0
        };
        this._drawIndex = 0;
        this._originCoord = [0, 0]; // 定位坐标原点，取初始化后图片左上角点
        this.keyStatus = {
            ctrl: false,
            space: false
        };
        _initCanvasContent(this, option);
    };

    /**
     * 初始化canvas元素
     * @param option
     */
    function _initCanvasContent(drawer, option) {
        let self = drawer;

        let canvasEle = _createCanvasEle();
        self.canvasEleId = canvasEle.id;
        self.maskEle = _createMaskEle();
        self.loadingEle = _createLoadingEle();
        self.loadingMask = option.loadingMask;

        let container = document.getElementById(self.containerId);
        let conSize = _calcCanvasConSize(container, option.margin);
        option.width = conSize[0];
        option.height = conSize[1];
        self.originWidth = option.width;
        self.originHeight = option.height;

        container.style.width = option.width + 'px';
        container.style.height = option.height + 'px';
        container.appendChild(canvasEle);
        container.appendChild(self.maskEle);
        container.appendChild(self.loadingEle);

        // 创建画布（fabric.js实例）
        self.canvas = new fabric.Canvas(self.canvasEleId);
        self.canvas.setWidth(option.width);
        self.canvas.setHeight(option.height);
        self.canvas.stopContextMenu = true;
        self.canvas.defaultCursor = MODE_CURSOR.grab;
        self.canvas.FX_DURATION = 150;

        // 创建画布背景图片对象
        let backImg = new fabric.Image();
        backImg.agType = 'ag-bgImg';
        backImg.selectable = false;
        backImg.evented = false;
        self.canvas.add(backImg);
        self.backgroundImage = backImg;

        _setCanvasBackImage(self, option.backgroundUrl, true, option.backgroundInScale, () => {
            self._drawIndex = 10;
            _initDrawer(self, option);
        });
    }

    /**
     * 设置画布背景图片
     * @param drawer
     * @param url
     * @param updateSize
     * @param inScale
     * @param calc
     * @private
     */
    function _setCanvasBackImage(drawer, url, updateSize, inScale, calc) {
        if(drawer.loadingMask) {
            drawer.maskEle.style.display = 'block';
        }
        drawer.loadingEle.style.display = 'block';

        let bImg = drawer.backgroundImage;
        let opt = drawer.option;
        bImg.setSrc(url, () => {
            if(updateSize) {
                let imgSize = _calcCanvasBackImageSize(bImg, opt.width, opt.height, opt.padding, inScale);
                bImg.center();
                drawer.backgroundImageSize = imgSize;
                drawer._originCoord = _calcOringinCoordinate(opt.width, opt.height, imgSize[0], imgSize[1]);
                drawer.resetSize();
            }else {
                _scaleImgToSize(bImg, drawer.backgroundImageSize);
            }

            drawer.maskEle.style.display = 'none';
            drawer.loadingEle.style.display = 'none';
            calc instanceof Function && calc();
        });
    }

    /**
     * 初始化绘图器
     * @param drawer
     * @param option
     * @private
     */
    function _initDrawer(drawer, option) {
        let self = _curDrawer = drawer;
        //鼠标绘制相关变量
        let startX, startY, endX, endY;
        let tempLeft, tempTop, tempWidth, tempHeight;
        //是否存在选中项、是否是在画布上单击
        let hasSelect = false, hit = false;

        let canvas = self.canvas;

        _setGlobalObjectProp();
        _setGlobalControlStyle();

        //鼠标事件
        canvas.on('mouse:down', function (evt) {
            _hoverOnCanvas = true;

            if (self.keyStatus.space || self.mode === DrawerMode.browse) {
                setObjectMoveLock(self.getObjects(), true);
                this.isDragging = true;
                this.selection = false;
            }else {
                let ifCanDraw;
                if(self.option.lockBoundary) {
                    ifCanDraw = checkIfWithinBackImg(evt.absolutePointer, self._originCoord, self.backgroundImageSize);
                }else {
                    ifCanDraw = true;
                }
                if(ifCanDraw) {
                    hit = true;
                    self.drawingItem = null;
                    self.drawStyle._borderWidth = calcSWByScale(self.drawStyle.borderWidth, self.zoom);
                    startX = evt.absolutePointer.x;
                    startY = evt.absolutePointer.y;
                }
            }
        });
        canvas.on('mouse:move', function (evt) {
            _hoverOnCanvas = true;

            if (this.isDragging) {
                let e = evt.e;
                let delta = new fabric.Point(e.movementX, e.movementY);
                canvas.relativePan(delta);

                let objects = self.getObjects();
                objects.forEach((item) => {
                    updateObjectOverlays(item);
                });
                this.requestRenderAll();
            }else {
                self._pointerObjects = _getPointerObjects(self.canvas, self.getObjects(), evt);
            }

            if (_hoverOnCanvas) {
                _mousePosition.move.x = evt.offsetX / self.zoom;
                _mousePosition.move.y = evt.offsetY / self.zoom;
            }

            if (hit && self.drawable && (self.mode === DrawerMode.draw) && !hasSelect) {
                endX = evt.absolutePointer.x;
                endY = evt.absolutePointer.y;

                // 修正至图片范围内
                if (self.option.lockBoundary) {
                    endX = limitDrawBoundary(endX, self._originCoord[0], self.backgroundImageSize[0]);
                    endY = limitDrawBoundary(endY, self._originCoord[1], self.backgroundImageSize[1]);
                }

                if (self.drawingItem) {
                    canvas.remove(self.drawingItem);
                }

                tempLeft = (endX > startX) ? startX : endX;
                tempTop = (endY > startY) ? startY : endY;

                //判断绘制类型
                if (self.drawType === DRAWER_TYPE.rect) {
                    tempWidth = Math.abs(endX - startX) - self.drawStyle._borderWidth;
                    tempHeight = Math.abs(endY - startY) - self.drawStyle._borderWidth;
                    tempWidth = tempWidth < 0 ? 0 : tempWidth;
                    tempHeight = tempHeight < 0 ? 0 : tempHeight;

                    self.drawingItem = new fabric.Rect({
                        width: tempWidth,
                        height: tempHeight,
                        left: tempLeft,
                        top: tempTop,
                        fill: self.drawStyle.backColor,
                        stroke: self.drawStyle.borderColor,
                        strokeWidth: self.drawStyle._borderWidth,
                        originStrokeWidth: self.drawStyle.borderWidth
                    });
                } else if (self.drawType === DRAWER_TYPE.ellipse) {
                    tempWidth = Math.abs(endX - startX) / 2 - self.drawStyle._borderWidth / 2;
                    tempHeight = Math.abs(endY - startY) / 2 - self.drawStyle._borderWidth / 2;
                    tempWidth = tempWidth < 0 ? 0 : tempWidth;
                    tempHeight = tempHeight < 0 ? 0 : tempHeight;

                    self.drawingItem = new fabric.Ellipse({
                        rx: tempWidth,
                        ry: tempHeight,
                        left: tempLeft,
                        top: tempTop,
                        fill: self.drawStyle.backColor,
                        stroke: self.drawStyle.borderColor,
                        strokeWidth: self.drawStyle._borderWidth,
                        originStrokeWidth: self.drawStyle.borderWidth
                    });
                } else if (self.drawType === DRAWER_TYPE.text) {
                    self.drawingItem = new fabric.IText('', {
                        width: Math.abs(endX - startX),
                        left: tempLeft,
                        top: tempTop,
                        fontFamily: self.drawStyle.fontFamily,
                        fontSize: self.drawStyle.fontSize + 2,
                        fill: self.drawStyle.fontColor,
                        fontWeight: self.drawStyle.fontWeight,
                        fontStyle: self.drawStyle.fontStyle,
                        underline: self.drawStyle.underline,
                        linethrough: self.drawStyle.linethrough,
                        overline: self.drawStyle.overline,
                        stroke: self.drawStyle.strokeColor,
                        strokeWidth: self.drawStyle.strokeWidth,
                        charSpacing: 1,
                        editingBorderColor: '#0099FF',
                        selectionColor: 'rgba(255, 204, 0, 0.5)'
                    });
                }
                self.drawingItem.isNew = true;
                self.canvas.add(self.drawingItem);
                _bindEvtForObject(self.drawingItem, self);
                self.refresh();
            }
        });
        canvas.on('mouse:up', function(evt) {
            this.isDragging = false;
            this.selection = true;
            setObjectMoveLock(self.getObjects(), false);

            hit = false;
            if (self.drawingItem) {
                if (self.drawingItem.width < 3 && self.drawingItem.height < 3) {
                    canvas.remove(self.drawingItem);
                } else {
                    if (self.drawType === DRAWER_TYPE.text) {
                        let labelStr = prompt('添加标签', '');
                        if (labelStr && labelStr !== '') {
                            self.drawingItem.set('text', labelStr);
                        } else {
                            canvas.remove(self.drawingItem);
                        }
                    }

                    _setForNewObject(self.drawingItem, self);
                    option.afterAdd(self.drawingItem);
                    option.afterDraw(self.drawingItem);
                }

                self.drawingItem = null;
            }
        });
        canvas.on('mouse:over', function (evt) {
            _hoverOnCanvas = true;
        });
        canvas.on('mouse:out', function (evt) {
            this.isDragging = false;
            _hoverOnCanvas = false;
            _mousePosition.move.x = 0;
            _mousePosition.move.y = 0;
        });
        // 缩放
        canvas.on('mouse:wheel', function (evt) {
            evt.e.preventDefault();
            evt.e.stopPropagation();

            let delta = evt.e.deltaY;

            // 绘制和编辑模式下按住ctrl可以对叠加对象切换选择
            if(self.keyStatus.ctrl && self.mode !== DrawerMode.browse) {
                let pObjs = self._pointerObjects;
                if(!self._pointerObjIndex) {
                    self._pointerObjIndex = 0;
                }
                if(self._pointerObjIndex < 0) {
                    self._pointerObjIndex = pObjs.length - 1;
                }else if(self._pointerObjIndex > pObjs.length - 1) {
                    self._pointerObjIndex = 0;
                }
                self.setActiveObject(pObjs[self._pointerObjIndex]);
                self.refresh();
                if(delta > 0) {
                    self._pointerObjIndex++;
                }else {
                    self._pointerObjIndex--;
                }
            }else {
                let zoom = self.zoom;
                zoom = zoom - delta / 200;
                if (zoom > 30) zoom = 30;
                if (zoom < 0.1) zoom = 0.1;
                self.setZoom(zoom, {x: evt.e.offsetX, y: evt.e.offsetY});
            }
        });

        //对象事件
        canvas.on('object:added', function (evt) {
            if (self.drawingItem) {
                return;
            }
            _setForNewObject(evt.target, self);
        });
        canvas.on('object:modified', function (evt) {
            let target = evt.target;
            let isSingle = target.type !== 'activeSelection' && target.type !== 'group';
            target.modified = true;
            option.afterModify(target, isSingle);
            DrawerEvt.objectModifiedHandler(target);
            target.lockScaleInDrawer = false;
        });
        canvas.on('object:moving', function (evt) {
            let target = evt.target;
            DrawerEvt.objectModifiedHandler(target);
            if(target.lockBoundary) {
                limitObjectMoveBoundary(target, self._originCoord, self.backgroundImageSize);
            }
            updateObjectOverlays(target);
        });
        canvas.on('object:scaling', function (evt) {
            let target = evt.target;
            DrawerEvt.objectModifiedHandler(target);
            updateObjectOverlays(target, {
                type: 'scale',
                corner: evt.transform.corner,
                pointer: evt.pointer
            });
        });
        canvas.on('object:scaled', function (evt) {
            let target = evt.target;
            _calcObjSizeAfterScale(target, target.scaleX, target.scaleY, true);
        });

        //选择集事件
        canvas.on('selection:created', function (evt) {
            hasSelect = true;
            if (self.drawingItem) {
                return;
            }

            self.selectedItems = evt.target;
            _setObjectInteractive(evt.target, true, self);

            let aciveObjs = self.getSelection();
            option.afterSelect(aciveObjs);
            self.highlightObjects(aciveObjs);
        });
        canvas.on('selection:updated', function (evt) {
            self.selectedItems = evt.target;
            _setObjectInteractive(evt.target, true, self);

            let aciveObjs = self.getSelection();
            option.afterSelect(aciveObjs);
            self.highlightObjects(aciveObjs);
        });
        canvas.on('before:selection:cleared', function (evt) {
            self.darkenObjects(self.getSelection());
        });
        canvas.on('selection:cleared', function (evt) {
            hasSelect = false;
            self.selectedItems = null;
            _beforeActiveObjs = null;
            option.afterCancelSelect();
        });

        //键盘事件
        DrawerEvt.setDrawer(self);
        window.removeEventListener('keydown', DrawerEvt.keydownHandler, false);
        window.addEventListener('keydown', DrawerEvt.keydownHandler, false);
        window.removeEventListener('keydown', DrawerEvt.keyupHandler, false);
        window.addEventListener('keyup', DrawerEvt.keyupHandler, false);

        //初始化完成的回调：立即执行会出现获取不到drawer对象的问题
        setTimeout(function () {
            option.afterInitialize();
        }, 100);
    }

    /**
     * 设置绘图器模式
     * @param mode
     */
    global.AgImgDrawer.prototype.setMode = function (mode) {
        if (!DrawerMode[mode]) {
            console.error('Unsupported drawer mode "' + mode + '".');
            return;
        }
        this.mode = mode;
        this.cancelSelection();
        setCanvasInteractive(this.canvas, mode);

        if (mode === DrawerMode.browse) {
            this.canvas.defaultCursor = MODE_CURSOR.grab;
            this.canvas.selection = false;
            this.drawable = false;
            this.setExistObjectInteractive(false);
        } else if (mode === DrawerMode.edit) {
            this.canvas.defaultCursor = MODE_CURSOR.auto;
            this.canvas.selection = true;
            this.drawable = false;
            this.setExistObjectInteractive(this.editDirectly);
        } else if (mode === DrawerMode.draw) {
            this.canvas.defaultCursor = MODE_CURSOR.draw;
            this.canvas.selection = false;
            this.drawable = true;
            this.setExistObjectInteractive(false);
        }
    };

    /**
     * 获取绘图器模式
     * @param mode
     */
    global.AgImgDrawer.prototype.getMode = function () {
        return this.mode;
    };

    /**
     * 获取当前绘图器所挂载的fabric.Canvas画布对象
     * @return {fabric.Canvas|*}
     */
    global.AgImgDrawer.prototype.getFabricCanvas = function () {
        return this.canvas;
    };

    /**
     * 设置背景图片，并调整图片大小以适应绘图器宽高
     * @param {string} url - 图片地址
     * @param callback
     */
    global.AgImgDrawer.prototype.setBackgroundImage = function (url, calc, updateSize) {
        let opt = this.option;
        opt.backgroundUrl = url;
        updateSize = updateSize !== false;
        _setCanvasBackImage(this, url, updateSize, true, () => {
            this.refresh();
            calc instanceof Function && calc();
        });
    };

    /**
     * 设置背景图片，并更新绘图器大小
     * @param {string} url - 图片地址
     * @param callback
     */
    global.AgImgDrawer.prototype.setBackgroundImageWithUpdateSize = function (url, calc) {
        this.setBackgroundImage(url, calc, true);
    };

    /**
     * 添加一个对象
     * @deprecated
     * @param object
     */
    global.AgImgDrawer.prototype.add = function (object) {
        console.warn('The method [addObject] has been deprecated, please consider using [addObject] !');
        this.addObject(object);
    };

    /**
     * 添加一个对象
     * @param object
     */
    global.AgImgDrawer.prototype.addObject = function (object) {
        // 添加偏移
        object.set({
            left: object.left + this._originCoord[0],
            top: object.top + this._originCoord[1]
        });
        this.canvas.add(object);

        object._labelObject && this.canvas.add(object._labelObject);
        setStrokeWidthByScale(object, this.zoom);
        _bindEvtForObject(object, this);
        this.option.afterAdd(object);
    };

    /**
     * 添加多个对象
     * @param objects
     */
    global.AgImgDrawer.prototype.addObjects = function (objects) {
        for (let i = 0, len = objects.length; i < len; i++) {
            this.addObject(objects[i]);
        }
    };

    /**
     * 删除一个对象
     * @deprecated
     * @param object
     */
    global.AgImgDrawer.prototype.remove = function (object) {
        console.warn('The method [remove] has been deprecated, please consider using [removeObject] !');
        this.removeObject(object);
    };

    /**
     * 删除一个对象，对象如果被选中则必须先取消选中才能删除
     * @param object
     * @param ifExecCallback - 是否执行回调函数，默认为true
     */
    global.AgImgDrawer.prototype.removeObject = function (object, ifExecCallback) {
        ifExecCallback = ifExecCallback === false ? false : true;

        let objects = [object];
        if (ifExecCallback) {
            if (this.option.beforeDelete(objects, this.keyStatus.ctrl) === false) return;
        }

        if (object instanceof fabric.Object && this.canvas.contains(object)) {
            if (object.selected === true) this.canvas.discardActiveObject();
            this.option.afterDelete(objects, this.keyStatus.ctrl);
            this.canvas.fxRemove(object);
        }
    };

    /**
     * 删除多个对象
     * @param objects
     * @param ifExecCallback - 是否执行回调函数，默认为true
     */
    global.AgImgDrawer.prototype.removeObjects = function (objects, ifExecCallback) {
        ifExecCallback = ifExecCallback === false ? false : true;
        if (ifExecCallback) {
            if (this.option.beforeDelete(objects, this.keyStatus.ctrl) === false) return;
        }

        let success = [], tmp;
        for (let i = 0, len = objects.length; i < len; i++) {
            tmp = objects[i];
            if (tmp.selected === true) this.canvas.discardActiveObject();
            this.canvas.remove(tmp);
            success.push(tmp);
        }
        this.option.afterDelete(success, this.keyStatus.ctrl);
        this.refresh();
    };

    /**
     * 获取画布上所有对象
     * @param {object} exclude - 过滤规则（依据对象的类型），默认匹配自定义标签对象之外的所有对象
     * @return {Array[fabric.Object]}
     */
    global.AgImgDrawer.prototype.getObjects = function (exclude) {
        let result = [];
        exclude = mergeObject({
            'ag-bgImg': true,
            'ag-label': true
        }, exclude);
        this.canvas.forEachObject(function (obj, index, objs) {
            if (!exclude[obj.type] && !exclude[obj.agType]) {
                result.push(obj);
            }
        });
        return result;
    };

    /**
     * 获取所选中的对象
     * @param {object} exclude - 过滤规则，默认匹配自定义标签对象之外的所有对象
     * @return {Array[fabric.Object]}
     */
    global.AgImgDrawer.prototype.getSelection = function (exclude) {
        let result = [], tmp;
        exclude = mergeObject({
            'ag-label': true
        }, exclude);
        let activeObjs = this.canvas.getActiveObjects();
        for (let i = 0, len = activeObjs.length; i < len; i++) {
            tmp = activeObjs[i];
            if (!exclude[tmp.type] && !exclude[tmp.agType]) {
                result.push(tmp);
            }
        }
        return result;
    };

    /**
     * 取消选中的对象
     */
    global.AgImgDrawer.prototype.cancelSelection = function () {
        this.canvas.discardActiveObject();
        let activeObject = this.canvas.getActiveObject();
        activeObject && this.removeObject(activeObject);
        this.canvas.renderAll();
    };

    /**
     * 删除所选中的对象
     */
    global.AgImgDrawer.prototype.removeSelection = function () {
        this.removeObjects(this.getSelection());
    };

    /**
     * 设置选中对象
     * @param object
     */
    global.AgImgDrawer.prototype.setActiveObject = function (object) {
        object && this.canvas.setActiveObject(object);
    };

    /**
     * 设置对象显隐
     * @param object
     */
    global.AgImgDrawer.prototype.setObjectVisible = function (object, visible) {
        object.set('visible', visible);
        _setControlShow(object, visible);
        this.refresh();
    };

    /**
     * 序列化对象
     * @param object
     * @returns {string}
     */
    global.AgImgDrawer.prototype.serializeObject = function (object) {
        return getShape(object, this._originCoord, 1, 1);
    };

    /**
     * 序列化多个对象
     * @param objects
     * @returns {Array}
     */
    global.AgImgDrawer.prototype.serializeObjects = function (objects) {
        let wkts = [];
        if (objects && objects.length) {
            for (let i = 0, len = objects.length; i < len; i++) {
                wkts.push(this.serializeObject(objects[i]));
            }
        }
        return wkts;
    };

    /**
     * 序列化画布上的所有对象（不包括过滤的对象）
     * @returns {*}
     */
    global.AgImgDrawer.prototype.serializeAllObject = function() {
        let objs = this.getObjects();
        return this.serializeObjects(objs);
    };

    /**
     * 清空绘图板
     */
    global.AgImgDrawer.prototype.clear = function () {
        let objs = this.getObjects();
        objs.forEach((item) => {
            this.removeObject(item);
        });
        this.option.afterClear(objs);
    };

    /**
     * 刷新绘图器
     */
    global.AgImgDrawer.prototype.refresh = function () {
        this.canvas.renderAll();
    };

    /**
     * 定位对象至视图中央：缩放、平移
     * [先平移再缩放]
     * @param object
     */
    global.AgImgDrawer.prototype.locate = function (object) {
        this.resetSize();

        let l = object.left;
        let t = object.top;
        let w = object.width;
        let h = object.height;

        let panX = (w - this.originWidth) / 2 + l;
        let panY = (h - this.originHeight) / 2 + t;
        this.canvas.absolutePan({x: panX, y: panY});

        let zoom = Math.min(this.option.zoomWidthInLocate / w, this.option.zoomWidthInLocate / h);
        let zoomP = new fabric.Point(this.originWidth / 2, this.originHeight / 2);
        if(this.mode !== DrawerMode.browse) {
            this.setActiveObject(object);
        }
        this.setZoom(zoom, zoomP);
    };

    /**
     * 设置大小
     * @param width - 缩放后宽度
     * @param height - 缩放后高度
     * @param zoom - 缩放比例
     */
    global.AgImgDrawer.prototype.setSize = function (width, height) {
        this.resetSize();
        let zoom = width / this.originWidth;
        let zoomP = new fabric.Point(this.originWidth / 2, this.originHeight / 2);
        this.setZoom(zoom, zoomP);
    };

    /**
     * 重置绘图器大小
     */
    global.AgImgDrawer.prototype.resetSize = function () {
        this.canvas.viewportTransform[4] = 0;
        this.canvas.viewportTransform[5] = 0;
        this.setZoom(1);
    };

    /**
     * 获取绘图器缩放比例
     * @return {Number|*}
     */
    global.AgImgDrawer.prototype.getZoom = function () {
        return this.zoom;
    };

    /**
     * 设置绘图器缩放比例
     * @param zoom
     */
    global.AgImgDrawer.prototype.setZoom = function (zoom, point) {
        this.zoom = zoom;
        if(point) {
            this.canvas.zoomToPoint(point, zoom);
        }else {
            this.canvas.setZoom(zoom);
        }

        let objs = this.getObjects();
        objs.forEach((item) => {
            setStrokeWidthByScale(item, zoom);
            updateObjectOverlays(item);
        });
        this.refresh();
    };

    /**
     * 放大
     */
    global.AgImgDrawer.prototype.zoomIn = function () {
        let self = this;
        let container = document.getElementById(self.containerId);
        let conParent = container.parentNode;
        let pointer = _getEleCenterPoint(conParent);
        // AgImgLarger.zoomIn('myDrawer', pointer, function (newWidth, newHeight, scale) {
        //     self.setSize(newWidth, newHeight, scale);
        // });
    };

    /**
     * 缩小
     */
    global.AgImgDrawer.prototype.zoomOut = function () {
        let self = this;
        let container = document.getElementById(self.containerId);
        let conParent = container.parentNode;
        let pointer = _getEleCenterPoint(conParent);
        // AgImgLarger.zoomOut('myDrawer', pointer, function (newWidth, newHeight, scale) {
        //     self.setSize(newWidth, newHeight, scale);
        // });
    };

    /**
     * 获取背景图片原始大小
     */
    global.AgImgDrawer.prototype.getBackgroundOriginSize = function () {
        return this.backgroundImage.getOriginalSize();
    };

    /**
     * 获取图像base64数据
     * @param option
     * @param option.format {string} - 图片格式，‘jpeg’或‘png’
     * @param option.quality {number} - 图片质量，范围 0~1
     */
    global.AgImgDrawer.prototype.getDataURL = function (option) {
        let defaultOpt = {
            format: 'jpeg',
            quality: 0.8
        };
        option = mergeObject(defaultOpt, option);

        let dataURL;
        try {
            dataURL = this.canvas.toDataURL({
                format: option.format,
                quality: option.quality
            });
        } catch (e) {
            console.error("Canvas's background-image not belong to the current domain, so canvases may not be exported.");
        }

        return dataURL;
    };

    /**
     * 根据传入的参数对象自定义绘制样式
     * 书写形式：drawer.setDrawStyle({'backColor': '#000'});
     * @param opts {object}
     */
    global.AgImgDrawer.prototype.setDrawStyle = function (opts) {
        for (let key in opts) {
            // 兼容旧属性
            if(key === 'borderColorH') {
                this.drawStyle.borderColorActive = opts.borderColorH;
            }else if(key === 'fontColorH') {
                this.drawStyle.fontColorActive = opts.fontColorH;
            }else if(key === 'fontBackColorH') {
                this.drawStyle.fontBackColorActive = opts.fontBackColorH;
            }else {
                this.drawStyle[key] = opts[key];
            }
        }
    };

    /**
     * 设置fabric.Canvas实例的属性
     * @param opts {object}
     */
    global.AgImgDrawer.prototype.setCanvasOptions = function (opts) {
        for (let key in opts) {
            this.canvas[key] = opts[key];
        }
        this.refresh();
    };

    /**
     * 设置画布上已存在的对象是否可交互
     * @param flag {boolean}
     * @param includeActiveObj {boolean} - 当前设置是否对当前选中对象生效
     */
    global.AgImgDrawer.prototype.setExistObjectInteractive = function (flag, includeActiveObj) {
        includeActiveObj = includeActiveObj === false ? false : true;
        if (flag === true) {
            this.canvas.selection = true;
            this.canvas.forEachObject(function (obj, index, objs) {
                if (obj.agType !== 'ag-label' && obj.agType !== 'ag-bgImg') {
                    obj.selectable = true;
                    obj.evented = true;
                }
            });
        } else {
            if (includeActiveObj) {
                this.cancelSelection();
            }
            this.canvas.selection = false;
            this.canvas.forEachObject(function (obj, index, objs) {
                if (obj.agType !== 'ag-label' && obj.agType !== 'ag-bgImg' && !obj.selected) {
                    obj.selectable = false;
                    obj.evented = false;
                }
            });
        }
    };

    /**
     * 设置编辑模式下是否可直接编辑对象
     * @param flag
     */
    global.AgImgDrawer.prototype.setEditDirectly = function (flag) {
        flag = flag === true ? true : false;
        this.editDirectly = flag;
        if (this.mode === DrawerMode.edit) {
            if (flag) {
                this.setExistObjectInteractive(true, false);
            } else {
                this.setExistObjectInteractive(false, false);
            }
        }
    };

    /**
     * 移除事件监听器
     */
    global.AgImgDrawer.prototype.removeAllListener = function () {
        window.removeEventListener('keydown', DrawerEvt.keydownHandler, false);
        window.removeEventListener('keydown', DrawerEvt.keyupHandler, false);
    };


    //--------------------------------------------------------
    // 工具方法
    //--------------------------------------------------------
    /**
     * 矩形对象，继承fabric.Rect(实例继承)
     * @param option - 构造数据
     * @param text - 矩形框标签
     * @returns {*}
     */
    global.AgImgDrawer.prototype.createRect = function (option) {
        option = mergeObject({
            width: 100,
            height: 100,
            left: 0,
            top: 0,
            fill: this.drawStyle.backColor,
            stroke: this.drawStyle.borderColor,
            strokeWidth: this.drawStyle.borderWidth,
            originStrokeWidth: this.drawStyle.borderWidth
        }, option);
        let rect = new fabric.Rect(option);
        rect.agType = 'ag-rect';
        return rect;
    };

    /**
     * 标签对象，组合了fabric.Rect、fabric.Text和fabric.Group
     * @param text
     * @param left
     * @param top
     */
    global.AgImgDrawer.prototype.createLabel = function (text, left, top) {
        text = text ? text : '';
        let paddingX = 8, paddingY = 4;
        let textObj = new fabric.Text(text.toString(), {
            originX: 'center',
            originY: 'center',
            fontFamily: this.drawStyle.fontFamily,
            fontSize: this.drawStyle.fontSize,
            fill: this.drawStyle.fontColor,
            fontWeight: this.drawStyle.fontWeight,
            fontStyle: this.drawStyle.fontStyle,
            strokeWidth: 0,
            charSpacing: 1,
            editingBorderColor: '#0099FF',
            selectionColor: 'rgba(255, 204, 0, 0.5)'
        });
        let rectObj = this.createRect({
            width: textObj.width + paddingX * 2,
            height: textObj.height + paddingY * 2,
            originX: 'center',
            originY: 'center',
            fill: this.drawStyle.fontBackColor,
            strokeWidth: 0
        });
        let label = new fabric.Group([rectObj, textObj], {
            left: left,
            top: top - rectObj.height,
            _originLeft: left,
            _originTop: top - rectObj.height,
            hasBorders: true,
            hasControls: false,
            selectable: false
        });
        label.agType = 'ag-label';
        return label;
    };

    /**
     * 矩形对象，并带有标签
     * @param text - 矩形框标签
     * @param option - 构造数据
     * @param option.showLabel - 标签显示方式：true，false, auto
     * @returns {*}
     */
    global.AgImgDrawer.prototype.createRectWithLabel = function (text, option) {
        let self = this;
        let rect = self.createRect(option);
        let label = self.createLabel(text, rect.left, rect.top);
        let showMode;
        switch (option.showLabel) {
            case true:
                showMode = true;
                break;
            case false:
                showMode = false;
                break;
            default:
                showMode = 'auto';
        }
        label.hoverCursor = label.moveCursor = MODE_CURSOR.auto;
        label.targetObject = rect;
        label.showMode = showMode;
        label.set('visible', showMode !== 'auto' ? showMode : false);
        rect.agType = 'ag-rect';
        rect._labelObject = label;
        return rect;
    };

    /**
     * 为对象创建悬浮框，可悬浮于对象上下左右4个方位，并可以通过偏移微调位置
     * @param {*} option
     * @param {*} option.ele - DOM元素
     * @param {*} option.target - 目标对象
     * @param {*} option.position - 悬浮位置：top、bottom、left、right
     * @param {*} option.offset - 偏移：[0, 0]
     * @param {*} option.visible - 是否显示：true, false, auto
     */
    global.AgImgDrawer.prototype.createOverlay = function (option) {
        if (!(option instanceof Object) || !option.ele || !option.target) {
            console.error('Parameter [option.ele] or [option.target] missing.');
            return;
        }
        if (!option.target._overlays) option.target._overlays = [];
        option.offset = option.offset instanceof Array ? option.offset : [0, 0];
        option.ele.classList.add('ag-overlay');
        option.visible === undefined && (option.visible = 'auto');
        let show = option.visible === true ? true : false;
        // option.ele.style.display = option.visible ? 'block' : 'none';
        option.ele.style.visibility = show ? 'visible' : 'hidden';
        option.ele.overlayOpt = option;

        let self = this;
        let container = document.getElementById(self.containerId);
        container.appendChild(option.ele);
        setOverlayPosition(option.target, option.ele);
        option.target._overlays.push(option.ele);
    };

    /**
     * 高亮显示对象
     * @param objects
     */
    global.AgImgDrawer.prototype.highlightObjects = function (objects) {
        let self = this;
        if (_beforeActiveObjs) {
            self.darkenObjects(_beforeActiveObjs);
        }

        if (objects && objects.length) {
            _beforeActiveObjs = objects;

            let object, type;
            for (let i = 0; i < objects.length; i++) {
                object = objects[i];
                type = object.type;
                if (type === 'activeSelection' || type === 'group') {
                    object.forEachObject(function (obj, index, objs) {
                        self.highlightObjects([obj]);
                    });
                } else {
                    object.set({
                        stroke: self.drawStyle.borderColorActive,
                        backgroundColor: self.drawStyle.backColorActive
                    });
                    object.moveTo(self._drawIndex + 1);
                    let labelObj = object._labelObject;
                    if (labelObj) {
                        // 将标签对象加入选择集使其可以被一起拖动
                        if (labelObj.showMode === true) {
                            let activeObject = self.canvas.getActiveObject();
                            activeObject.type === 'activeSelection' && activeObject.add(labelObj);
                        }

                        labelObj.set({
                            left: object.left,
                            top: object.top - labelObj.height,
                        }).setCoords();
                        labelObj.item(0).set({
                            fill: this.drawStyle.fontBackColorActive
                        });
                        labelObj.item(1).set({
                            fill: this.drawStyle.fontColorActive
                        });
                        labelObj.moveTo(self._drawIndex + 1);
                    }
                }
            }
            self.refresh();
        }
    };

    /**
     * 取消对象的高亮显示
     * @param objects
     */
    global.AgImgDrawer.prototype.darkenObjects = function (objects) {
        if (objects && objects.length) {
            let self = this;
            let object, type;
            for (let i = 0; i < objects.length; i++) {
                object = objects[i];
                type = object.type;
                if (type === 'activeSelection' || type === 'group') {
                    object.forEachObject(function (obj, index, objs) {
                        self.darkenObjects([obj]);
                    });
                } else {
                    object.set({
                        stroke: self.drawStyle.borderColor,
                        backgroundColor: self.drawStyle.backColor
                    });
                    object.moveTo(object.drawIndex);
                    let labelObj = object._labelObject;
                    if (labelObj) {
                        labelObj.item(0).set({
                            fill: this.drawStyle.fontBackColor
                        });
                        labelObj.item(1).set({
                            fill: this.drawStyle.fontColor
                        });
                        object.moveTo(labelObj.drawIndex);
                    }
                }
            }
            self.refresh();
        }
    };

    /**
     *
     * @param {高亮所有对象或取消所有高亮对象} flag
     */
    global.AgImgDrawer.prototype.lightOrDarkAllObject = function (flag) {
        if (flag) {
            this.highlightObjects(this.canvas.getObjects());
        } else {
            this.darkenObjects(this.canvas.getObjects());
        }
    };

    /**
     * 复制选中的对象（除对象的基本组成属性外，仅会额外地复制带有ag前缀的属性，且不复制object和function类型，数组除外）
     */
    global.AgImgDrawer.prototype.copySelectedObject = function () {
        let source = this.canvas.getActiveObject();
        _clipboard = _copyObject(source, this);
        _clipboard.length && this.option.afterCopy(_clipboard, source);
    };

    /**
     * 粘贴选中的对象
     */
    global.AgImgDrawer.prototype.pasteSelectedObject = function () {
        if (_clipboard && _clipboard.length) {
            _setCopyObjectPosition();
            this.addObjects(_clipboard);
            this.refresh();
            this.option.afterPaste(_clipboard);
            _clipboard = _copyObject(_clipboard, this);
        }
    };

    /**
     * 清除剪贴板
     */
    global.AgImgDrawer.prototype.clearClipboard = function () {
        _clipboard = null;
    };

    /**
     * 设置与对象相关联的悬浮框的显示与隐藏
     * @param {*} ifShow
     */
    global.AgImgDrawer.prototype.setObjectOverlaysShow = function (target, ifShow) {
        _setObjectOverlaysShow(target, ifShow);
    };


    //--------------------------------------------------------
    // 内部方法
    //--------------------------------------------------------
    /**
     * 创建canvas元素
     * @private
     */
    function _createCanvasEle() {
        let canvasId = 'aegeanCanvas' + new Date().getTime();
        let cEle = document.createElement('canvas');
        cEle.id = canvasId;
        return cEle;
    }

    /**
     * 创建遮罩元素
     * @private
     */
    function _createMaskEle() {
        let divEle = document.createElement('div');
        //禁用默认的右键菜单
        divEle.oncontextmenu = function (evt) {
            evt.returnValue = false;
            return false;
        };
        divEle.className = 'aDrawer-mask dark';
        return divEle;
    }

    /**
     * 创建加载动画元素
     * @private
     */
    function _createLoadingEle() {
        let divEle = document.createElement('div');
        divEle.className = 'aDrawer-loading';
        return divEle;
    }

    /**
     * 设置对象公共属性
     * @private
     */
    function _setGlobalObjectProp() {
        // 禁用缩放翻转
        fabric.Object.prototype.lockScalingFlip = true;
    }

    /**
     * 设置全局控制框样式
     * @private
     */
    function _setGlobalControlStyle() {
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerSize = 7;
        fabric.Object.prototype.cornerStyle = 'circle';
        fabric.Object.prototype.cornerColor = '#51ef75';
        fabric.Object.prototype.cornerStrokeColor = '#f5f5f5';
        fabric.Object.prototype.hasBorders = false;

        fabric.Object.prototype.setControlVisible('ml', false);
        fabric.Object.prototype.setControlVisible('mb', false);
        fabric.Object.prototype.setControlVisible('mr', false);
        fabric.Object.prototype.setControlVisible('mt', false);
        fabric.Object.prototype.setControlVisible('mtr', false);
    }

    function _setControlShow(object, visible) {
        object.setControlVisible('tl', visible);
        object.setControlVisible('tr', visible);
        object.setControlVisible('br', visible);
        object.setControlVisible('bl', visible);
    }

    /**
     * 记录原始属性信息：如几何框的在缩放比例为1时的边框粗细
     * @private
     * @param object
     * @param opts
     */
    function _recordOriginProp(object, opts) {
        if (object.isType('group')) {
            let innerObjs = object.getObjects();
            for (let i = 0; i < innerObjs.length; i++) {
                _recordOriginProp(innerObjs[i], opts);
            }
        } else if (object.isType('rect') || object.isType('ellipse')) {
            object.originStrokeWidth = opts.strokeWidth;
            object.drawIndex = opts.drawIndex;
        } else if (object.isType('text') || object.isType('i-text')) {
            object.originFontSize = opts.fontSize;
            object.drawIndex = opts.drawIndex;
        }
    }

    /**
     * 根据容器宽高计算画布大小
     * @param conEle
     * @param padding
     * @returns {number[]}
     * @private
     */
    function _calcCanvasConSize(conEle, padding) {
        padding = padding ? padding : 0;
        let conW = conEle.scrollWidth - padding * 2;
        let conH = conEle.scrollHeight - padding * 2;
        return [conW, conH];
    }

    /**
     * 根据画布宽高计算背景图片大小
     * @param oImg
     * @param canWidth
     * @param canHeight
     * @param padding
     * @param inScale
     * @returns {number[]}
     * @private
     */
    function _calcCanvasBackImageSize(oImg, canWidth, canHeight, padding, inScale) {
        padding = isNaN(padding) ? 0 : padding;
        inScale = inScale !== false;

        //计算背景图片大小
        let oImgScale = oImg.width / oImg.height;
        let nOImgWidth, nOImgHeight;
        nOImgWidth = canWidth - padding * 2;
        nOImgWidth = nOImgWidth < 0 ? 50 : nOImgWidth;
        if(inScale) {
            nOImgHeight = nOImgWidth / oImgScale;
        }else {
            nOImgHeight = canHeight - padding * 2;
            nOImgHeight = nOImgHeight < 0 ? 50 : nOImgHeight;
        }

        let newSize = [nOImgWidth, nOImgHeight];
        _scaleImgToSize(oImg, newSize);
        return newSize;
    }

    function _scaleImgToSize(oImg, tarSize) {
        oImg.scaleX = tarSize[0] / oImg.width;
        oImg.scaleY = tarSize[1] / oImg.height;
    }

    /**
     * 计算对象添加到画布上的坐标原点
     * @param canW
     * @param canH
     * @param imgW
     * @param imgH
     * @returns {number[]}
     * @private
     */
    function _calcOringinCoordinate(canW, canH, imgW, imgH) {
        let originX = (canW - imgW) / 2;
        let originY = (canH - imgH) / 2;
        return [originX, originY];
    }

    /**
     * 获取元素中间位置对应的屏幕坐标
     * @param ele
     * @returns {{x: number, y: number}}
     * @private
     */
    function _getEleCenterPoint(ele) {
        let pClientRect = ele.getBoundingClientRect();
        return {
            x: pClientRect.left + pClientRect.width / 2,
            y: pClientRect.top + pClientRect.height / 2,
        };
    }

    function _bindEvtForObject(target, _this) {
        // 初始可操作性状态
        _setObjectInteractive(target, null, _this);

        // 绑定事件
        let lObj = target._labelObject;
        target.on('mouseover', function (evt) {
            _setClassForObjOverlay(target, 'hover', true);
            if (!target.selected) {
                _setObjectOverlaysShow(target, true, true, 'hover');

                if (lObj && lObj.showMode !== false) {
                    lObj.item(0).set({
                        fill: _this.drawStyle.fontBackColor
                    });
                    lObj.item(1).set({
                        fill: _this.drawStyle.fontColor
                    });
                    lObj.set('visible', true);
                }

                let flag1 = target.isNew;
                let flag2 = _this.editDirectly || evt.e.ctrlKey;
                if (flag1 || flag2) {
                    target.set({
                        hoverCursor: MODE_CURSOR.hand,
                        moveCursor: MODE_CURSOR.hand
                    });
                }

                target.set({
                    backgroundColor: _this.drawStyle.backColorHover
                });

                _this.refresh();
            }
        });
        target.on('mouseout', function (evt) {
            _setClassForObjOverlay(target, 'hover', false);
            if (!target.selected) {
                _setObjectOverlaysShow(target, false, true);

                if (lObj && lObj.showMode === 'auto') {
                    lObj.set('visible', false);
                }
                target.set({
                    hoverCursor: MODE_CURSOR.auto,
                    moveCursor: MODE_CURSOR.auto,
                    backgroundColor: _this.drawStyle.backColor
                });
                _this.refresh();
            }
        });
        target.on('selected', function (evt) {
            if (lObj) {
                lObj.item(0).set({
                    fill: _this.drawStyle.fontBackColorActive
                });
                lObj.item(1).set({
                    fill: _this.drawStyle.fontColorActive
                });
                lObj.set('visible', lObj.showMode === 'auto' ? true : lObj.showMode);
            }
            target.set({
                hoverCursor: MODE_CURSOR.move,
                moveCursor: MODE_CURSOR.move
            });
            target.selected = true;
            _this.highlightObjects([target]);
            _setClassForObjOverlay(target, 'selected', true);
            _setObjectOverlaysShow(target, true, false);
        });
        target.on('deselected', function (evt) {
            if (lObj) {
                lObj.set('visible', lObj.showMode === 'auto' ? false : lObj.showMode);
            }
            if (_this.mode === DrawerMode.draw) {
                target.selectable = false;
                target.evented = false;
            } else {
                if (!_this.editDirectly) {
                    target.selectable = false;
                    target.evented = false;
                }
            }
            target.selected = false;
            target.backgroundColor = _this.drawStyle.backColor;
            _this.darkenObjects([target]);
            _setClassForObjOverlay(target, 'selected', false);
            _setObjectOverlaysShow(target, false, true);
            _this.option.afterObjectDeSelect(target);
        });
        target.on('removed', function (evt) {
            _removeObjectOverlays(target);
            lObj && _this.canvas.remove(lObj);
        });
        target.on('moving', function (evt) {
            target.moveCursor = MODE_CURSOR.move;
        });
    }

    function _setObjectInteractive(target, flag, _this) {
        let selectable, evented;
        if (flag) {
            selectable = evented = true;
        } else {
            if (_this.mode === DrawerMode.draw) {
                selectable = evented = target.isNew ? true : false;
            } else if (_this.mode === DrawerMode.edit) {
                selectable = evented = _this.editDirectly;
            }
        }
        target.set({
            selectable: selectable,
            evented: evented
        });
    }

    function _copyObject(target, _this) {
        let copys = [];
        if (target) {
            if (target.type === 'activeSelection') {
                target.forEachObject(function (obj, index, objs) {
                    if (obj.agType !== 'ag-label') {
                        copys.push(_copyWithLabelObject(obj, obj.left + 15, obj.top + 15, true, _this));
                    }
                });
            } else if (target instanceof Array) {
                let tmp;
                for (let i = 0, len = target.length; i < len; i++) {
                    tmp = target[i];
                    tmp.clone(function (obj) {
                        _copyFlatAgProps(tmp, obj);

                        tmp._labelObject && (obj._labelObject = tmp._labelObject);
                        if (tmp._copyFromSelection) {
                            copys.push(_copyWithLabelObject(obj, obj.left + 15, obj.top + 15, true, _this));
                        } else {
                            copys.push(_copyWithLabelObject(obj, obj.left + 15, obj.top + 15, false, _this));
                        }
                    });
                }
            } else {
                copys.push(_copyWithLabelObject(target, target.left + 15, target.top + 15, false, _this));
            }
        }
        return copys;
    }

    function _copyWithLabelObject(target, tarLeft, tarTop, fromSelection, _this) {
        let copy = null, tarLableObj = target._labelObject;
        if (tarLableObj) {
            tarLableObj.clone(function (copyLabelObj) {
                tarLableObj.showMode && (copyLabelObj.showMode = tarLableObj.showMode);
                target.clone(function (obj) {
                    _copyFlatAgProps(target, obj);

                    copyLabelObj.set({
                        left: tarLeft,
                        top: tarTop,
                        visible: copyLabelObj.showMode === true ? true : false
                    });
                    copyLabelObj.item(0).set('fill', _this.drawStyle.fontBackColor);
                    copyLabelObj.item(1).set('fill', _this.drawStyle.fontColor);
                    obj.set({
                        left: tarLeft,
                        top: tarTop + copyLabelObj.height,
                        stroke: _this.drawStyle.borderColor,
                        _copyFromSelection: fromSelection
                    });
                    obj._labelObject = copyLabelObj;
                    copy = obj;
                });
            });
        } else {
            target.clone(function (obj) {
                _copyFlatAgProps(target, obj);
                obj.set({
                    left: tarLeft,
                    top: tarTop,
                    stroke: _this.drawStyle.borderColor,
                    _copyFromSelection: fromSelection
                });
                copy = obj;
            });
        }
        // copy.agType = target.agType;
        copy.isNew = true;
        return copy;
    }

    /**
     * 复制对象的带ag前缀的属性
     * @private
     */
    function _copyFlatAgProps(from, to) {
        if ((typeof from) !== 'object' || (typeof to) !== 'object') return;
        let tmpVal;
        for (let key in from) {
            tmpVal = from[key];
            if (key.startsWith('ag') && (typeof tmpVal !== 'object' || tmpVal instanceof Array) && typeof tmpVal !== 'function') {
                to[key] = tmpVal;
            }
        }
    }

    function _setCopyObjectPosition() {
        if (_clipboard instanceof Array) {
            let tarX, tarY;
            let tmp, tmpLabel;
            for (let i = 0, len = _clipboard.length; i < len; i++) {
                tmp = _clipboard[i];
                tmpLabel = tmp._labelObject;

                if (_hoverOnCanvas) {
                    tarX = _mousePosition.move.x;
                    tarY = _mousePosition.move.y;
                } else {
                    tarX = tmp.left;
                    tarY = tmp.top;
                }

                if (tmpLabel) {
                    tmpLabel.set({
                        left: tarX,
                        top: tarY - tmpLabel.height
                    });
                    tmp.set({
                        left: tarX,
                        top: tarY
                    });
                } else {
                    tmp.set({
                        left: tarX,
                        top: tarY
                    });
                }
            }
        }
    }

    function _setForNewObject(target, drawer) {
        target.lockBoundary = drawer.option.lockBoundary;
        target.agBoundary = getDrawBoundary(drawer._originCoord, drawer.backgroundImageSize);
        target.canvasWidth = drawer.originWidth;
        target.canvasHeight = drawer.originHeight;

        _recordOriginProp(target, {
            strokeWidth: drawer.drawStyle.borderWidth,
            fontSize: drawer.drawStyle.fontSize,
            drawIndex: drawer._drawIndex++
        });
    }

    function _setObjectOverlaysShow(target, ifShow, ifAuto) {
        let overlays = target._overlays;
        if (overlays) {
            overlays.forEach(function (item) {
                if (!ifShow) {
                    item.style.visibility = 'hidden';
                } else if (ifAuto) {
                    if (item.overlayOpt.visible === 'auto' && !target.selected) {
                        item.style.visibility = ifShow ? 'visible' : 'hidden';
                    }
                } else {
                    item.style.visibility = 'visible';
                }
            });
        }
    }

    function _setClassForObjOverlay(target, clazz, flag) {
        let overlays = target._overlays;
        if (overlays) {
            overlays.forEach(function (item) {
                if (flag) {
                    item.classList.add(clazz);
                } else {
                    item.classList.remove(clazz);
                }
            });
        }
    }

    function _removeObjectOverlays(target) {
        let overlays = target._overlays;
        if (overlays) {
            overlays.forEach(function (item) {
                item.parentNode.removeChild(item);
            });
        }
    }

    /**
     * 获取画布上鼠标所在位置的对象
     * @param fCanvas
     * @param objects
     * @param evt
     * @returns {Array}
     * @private
     */
    function _getPointerObjects(fCanvas, objects, evt) {
        let tarObjs = [];
        objects.forEach((item) => {
            if(fCanvas.containsPoint(evt, item)) {
                tarObjs.push(item);
            }
        });
        return tarObjs;
    }

    /**
     * 计算对象缩放后的实际尺寸
     * @param target
     * @param scaleX
     * @param scaleY
     * @param isOutest - 是否是最外层对象
     * @private
     */
    function _calcObjSizeAfterScale(target, scaleX, scaleY, isOutest) {
        var newProps;
        var type = target.type;
        if(target.agType === 'ag-label') {// 自定义的标签类型不做缩放
            newProps = {
                width: target.width,
                height: target.height,
                scaleX: 1,
                scaleY: 1
            };
        }else if(type === 'activeSelection' || type === 'group') {// 选择集、组
            newProps = {
                width: target.width * scaleX,
                height: target.height * scaleY,
                scaleX: 1,
                scaleY: 1
            };
            if(!isOutest) {
                newProps.left = target.left * scaleX;
                newProps.top = target.top * scaleY;
            }
            target.forEachObject(function(obj, index, objs) {
                _calcObjSizeAfterScale(obj, scaleX, scaleY, false);
            });
        }else if(type === 'text' || type === 'i-text' || type === 'textbox') {// 文本对象：不做缩放
            newProps = {
                scaleX: 1,
                scaleY: 1
            };
        }else {
            var offsetSWX = target.strokeWidth * (scaleX - 1);
            var offsetSWY = target.strokeWidth * (scaleY - 1);
            if(type === 'ellipse') {
                newProps = {
                    rx: target.rx * scaleX + offsetSWX,
                    ry: target.ry * scaleY + offsetSWY,
                };
                if(target.group) {
                    newProps.left = target.left * scaleX;
                    newProps.top = target.top * scaleY;
                }else {
                    newProps.scaleX = 1;
                    newProps.scaleY = 1;
                }
            }else {// 对象
                newProps = {
                    width: target.width * scaleX + offsetSWX,
                    height: target.height * scaleY + offsetSWY,
                };
                if(target.group) {
                    newProps.left = target.left * scaleX;
                    newProps.top = target.top * scaleY;
                }else {
                    newProps.scaleX = 1;
                    newProps.scaleY = 1;
                }
            }
        }
        target.set(newProps).setCoords();
    }
})(window);
