/**
 * 基于fabric.js的Web绘图器
 * Created by aegean on 2017/5/19 0019.
 */

;(function(global) {
    //默认配置项
    var defaultOption = {
        width: 600,     //若要指定绘图器宽高，请将 autoAdjustment 设为false
        height: 560,
        backgroundUrl: null,  //背景图片
        autoAdjustment: true,   //根据容器大小自动调整绘图器宽高
        loadingMask: true,  //加载动画遮罩
        afterInitialize: function() {},
        afterAdd: function(object) {},      //添加对象回调，携带一个参数为所添加的对象，添加包括所有的绘制情况
        afterDraw: function(object) {},     //绘制回调，携带一个参数为所绘制的对象
        beforeDelete: function () {},       //删除前回调，携带一个参数为要删除的对象数组，方法返回false则取消删除
        afterDelete: function(objects) {},   //删除回调，携带一个参数为删除的对象数组
        afterClear: function(objects) {},          //清空回调，携带一个参数为包含所有对象的数组
        afterSelect: function(objects) {},         //选中物体回调，携带一个参数为所选中的对象数组
        afterCancelSelect: function() {}    //取消选中物体回调
    };
    //绘图器模式
    //浏览模式（browse）：不能操作对象，只能对画布进行缩放和移动，此模式为默认模式
    //编辑模式（edit）：可以删除移动修改已绘制对象，不能绘制新对象
    //绘制模式（draw）：可以进行所有交互操作，其中处于该模式下时移动画布对象需摁住空格键并摁下鼠标左键移动鼠标
    var DRAWER_MODE = {
        browse: 'browse',
        edit: 'edit',
        draw: 'draw'
    };
    //绘制类型：Rect、Circle、Circle
    var DRAWER_TYPE = {
        rect: 'Rect',
        ellipse: 'Ellipse',
        text: 'Text'
    };

    //--------------------------------------------------------
    //AgImgDrawer: 核心
    //--------------------------------------------------------
    /**
     * 绘图器构造函数
     * @param containerId
     * @param option
     * @constructor
     */
    global.AgImgDrawer = function(containerId, option) {
        option = _mergeObject(defaultOption, option);

        if(!containerId) {
            console.error('Initialize has failed,  the field "containerId" must has value.');
            return;
        }

        this.option = option;
        this.drawType = DRAWER_TYPE.rect;
        this.mode = DRAWER_MODE.browse;
        this.containerId = containerId;
        this.canvas = null;
        this.maskEle = null;
        this.drawingItem = null;//正在绘制的对象
        this.originWidth = null;
        this.originHeight = null;
        this.drawable = false;  //是否是可绘制状态
        this.selectable = true; //是否允许选择对象
        this.selectedItems = null;
        this.backgroundUrl = null;
        this.backgroundImage = null;
        this.zoom = 1;
        this.loadingMask = true;
        this.drawStyle = {  //绘制样式
            fillColor: '#000',
            fillOpacity: 0.2,
            _fill: 'rgba(0, 0, 0, 0.2)',     //根据fillColor和fillOpacity生成
            borderColor: '#fff',
            borderWidth: 2,
            _borderWidth: 2,
            fontFamily: 'Microsoft YaHei',
            fontSize: 16,
            fontColor: '#fff',
            fontWeight: 'normal',
            fontStyle: 'normal',
            underline: false,
            linethrough: false,
            overline: false,
            strokeColor: '#fff',
            strokeWidth: 0
        };
        this.initCanvasContent(option);
    };

    /**
     * 初始化canvas元素
     * @param option
     */
    global.AgImgDrawer.prototype.initCanvasContent = function(option) {
        var self = this;

        var canvasEle = _createCanvasEle();
        self.canvasEleId = canvasEle.id;
        self.maskEle = _createMaskEle();
        self.loadingEle = _createLoadingEle();
        self.loadingMask = option.loadingMask;

        var container = document.getElementById(self.containerId);
        container.appendChild(canvasEle);
        container.appendChild(self.maskEle);
        container.appendChild(self.loadingEle);

        //禁用右键菜单
        container.oncontextmenu = function(evt) {
            evt.returnValue = false;
            return false;
        };

        if(option.backgroundUrl) {
            if(option.autoAdjustment) {
                //获取背景大小
                fabric.Image.fromURL(option.backgroundUrl, function(oImg) {
                    var conParent = container.parentNode;
                    var conPWidth = conParent.clientWidth;
                    var conPHeight = conParent.clientHeight;
                    var newSize = _calcImgSize(conPWidth, conPHeight, oImg.width, oImg.height);

                    self.backgroundImage = oImg;
                    option.width = newSize[0];
                    option.height = newSize[1];
                    self.originWidth = newSize[0];
                    self.originHeight = newSize[1];
                    _initSize();
                });
            }else {
                fabric.Image.fromURL(option.backgroundUrl, function(oImg) {
                    self.backgroundImage = oImg;
                    self.originWidth = option.width;
                    self.originHeight = option.height;
                    _initSize();
                });
            }
        }else {
            self.backgroundImage = new fabric.Image();
            self.originWidth = option.width;
            self.originHeight = option.height;
            _initSize();
        }


        //初始化大小
        function _initSize() {
            //设置样式
            container.style.width = option.width + 'px';
            container.style.height = option.height + 'px';

            //初始化拖拽和缩放
            AgImgDragger.init(self.containerId);
            AgImgLarger.init(self.containerId, function(newWidth, newHeight, scale) {
                self.setSize(newWidth, newHeight, scale);
            });
            container.dataset.drawable = self.drawable;
            self.initDrawer(option);

            //初始化完成的回调：立即执行会出现获取不到drawer对象的问题
            setTimeout(function() {
                option.afterInitialize();
            }, 100);
        }
    };

    /**
     * 初始化绘图器
     * @param option
     */
    global.AgImgDrawer.prototype.initDrawer = function(option) {
        var self = this;
        //鼠标绘制相关变量
        var startX, startY, endX, endY;
        var tempLeft, tempTop, tempWidth, tempHeight;
        //是否存在选中项、是否是在画布上单击
        var hasSelect = false, hit = false;
        //是否按下空格键、是否按下ctrl键
        var spaceKey = false, ctrlKey = false;

        //创建fabric.js实例
        var canvas = self.canvas = new fabric.Canvas(self.canvasEleId);
        self.setSize(option.width, option.height, 1);
        self.setBackgroundImage(self.backgroundImage, null);
        self.loadingEle.style.display = 'none';
        _setGlobalControlStyle();

        //添加动画
        var canvasEle = canvas.getElement();
        canvasEle.classList.add('ag-smooth');

        //鼠标事件
        canvas.on('mouse:down', function(evt) {
            hit = true;
            self.drawingItem = null;
            self.drawStyle._borderWidth = _calcSWByScale(self.drawStyle.borderWidth, self.zoom);

            startX = evt.e.offsetX / self.zoom;
            startY = evt.e.offsetY / self.zoom;
        });
        window.addEventListener('mousemove', function(evt) {
            //编辑模式下按住空格键为移动、按住shift键为框选
            if(spaceKey || evt.shiftKey) {
                return;
            }

            if(self.drawable && (self.mode === DRAWER_MODE.draw) && hit && !hasSelect) {
                if(self.drawingItem) {
                    canvas.remove(self.drawingItem);
                }

                endX = evt.offsetX / self.zoom;
                endY = evt.offsetY / self.zoom;
                tempLeft = (endX > startX) ? startX : endX;
                tempTop = (endY > startY) ? startY : endY;

                //判断绘制类型
                if(self.drawType === DRAWER_TYPE.rect) {
                    tempWidth = Math.abs(endX - startX) - self.drawStyle._borderWidth;
                    tempHeight = Math.abs(endY - startY) - self.drawStyle._borderWidth;
                    tempWidth = tempWidth < 0 ? 0 : tempWidth;
                    tempHeight = tempHeight < 0 ? 0 : tempHeight;

                    self.drawingItem = new fabric.Rect({
                        width: tempWidth,
                        height: tempHeight,
                        left: tempLeft,
                        top: tempTop,
                        fill: self.drawStyle._fill,
                        stroke: self.drawStyle.borderColor,
                        strokeWidth: self.drawStyle._borderWidth,
                        originStrokeWidth: self.drawStyle.borderWidth
                    });
                }else if(self.drawType === DRAWER_TYPE.ellipse) {
                    tempWidth = Math.abs(endX - startX) / 2 - self.drawStyle._borderWidth / 2;
                    tempHeight = Math.abs(endY - startY) / 2 - self.drawStyle._borderWidth / 2;
                    tempWidth = tempWidth < 0 ? 0 : tempWidth;
                    tempHeight = tempHeight < 0 ? 0 : tempHeight;

                    self.drawingItem = new fabric.Ellipse({
                        rx: tempWidth,
                        ry: tempHeight,
                        left: tempLeft,
                        top: tempTop,
                        fill: self.drawStyle._fill,
                        stroke: self.drawStyle.borderColor,
                        strokeWidth: self.drawStyle._borderWidth,
                        originStrokeWidth: self.drawStyle.borderWidth
                    });
                }else if(self.drawType === DRAWER_TYPE.text) {
                    self.drawingItem = new fabric.IText('', {
                        width: Math.abs(endX - startX),
                        left: tempLeft,
                        top: tempTop,
                        fontFamily: self.drawStyle.fontFamily,
                        fontSize: self.drawStyle.fontSize,
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
                canvas.add(self.drawingItem);
                canvas.renderAll();
            }
        });
        window.addEventListener('mouseup', function(evt) {
            hit = false;

            if(self.drawingItem) {
                if(self.drawingItem.width < 3 && self.drawingItem.height < 3) {
                    canvas.remove(self.drawingItem);
                }else {
                    if(self.drawType === DRAWER_TYPE.text) {
                        var labelStr = prompt('添加标签', '');
                        if(labelStr && labelStr !== '') {
                            self.drawingItem.set('text', labelStr);
                        }else {
                            canvas.remove(self.drawingItem);
                        }
                    }

                    if(!self.selectable) {
                        self.drawingItem.selectable = false;
                        self.drawingItem.hoverCursor = 'crosshair';
                        self.drawingItem.moveCursor = 'crosshair';
                    }

                    canvas.discardActiveObject();
                    option.afterAdd(self.drawingItem);
                    option.afterDraw(self.drawingItem);
                }

                self.drawingItem = null;
                canvas.renderAll();
            }
        });
        canvas.on('mouse:out', function(evt) {
            hit = false;
        });

        //对象事件
        canvas.on('object:added', function(evt) {
            if(self.drawingItem) {
                return;
            }

            if(!self.selectable) {
                evt.target.selectable = false;
                evt.target.hoverCursor = 'crosshair';
                evt.target.moveCursor = 'crosshair';
            }

            _recordOriginProp(evt.target, {
                strokeWidth: self.drawStyle.borderWidth,
                fontSize: self.drawStyle.fontSize
            });
            option.afterAdd(evt.target);
        });
        canvas.on('object:modified', function(evt) {
            evt.target.modified = true;
        });

        //选择集事件
        canvas.on('selection:created', function(evt) {
            if(self.drawingItem) {
                return;
            }

            hasSelect = true;
            self.selectedItems = evt.target;
            option.afterSelect(self.getSelection());
        });
        canvas.on('selection:updated', function(evt) {
            hasSelect = true;
            self.selectedItems = evt.target;
            option.afterSelect(self.getSelection());
        });
        canvas.on('selection:cleared', function(evt) {
            hasSelect = false;

            //如果是选择集，当选择集清空时将其内的所有对象移除出该选择集，以更新选择集内对象在选择集存在期间移动缩放等操作后的边距、宽高等属性
            if(self.selectedItems && self.selectedItems.type === 'activeSelection') {
                self.selectedItems.forEachObject(function(obj) {
                    self.selectedItems.remove(obj);
                });
            }

            self.selectedItems = null;
            option.afterCancelSelect();
        });

        //键盘事件监听
        window.addEventListener('keydown', function(evt) {
            if(evt.target.nodeName === 'input') {
                return;
            }
            var keyCode = evt.which;
            if(keyCode === 46) {    //删除键
                if(self.getMode() !== DRAWER_MODE.browse) {
                    self.removeSelection();
                }
            }else if(keyCode >= 37 && keyCode <= 40 && self.selectedItems && !self.selectedItems.isEditing) {   //方位键
                if(keyCode === 37) {        //左
                    _moveItem(self.selectedItems, -1, 0);
                }else if(keyCode === 39) {  //右
                    _moveItem(self.selectedItems, 1, 0);
                }else if(keyCode === 38) {  //上
                    _moveItem(self.selectedItems, 0, -1);
                }else if(keyCode === 40) {  //下
                    _moveItem(self.selectedItems, 0, 1);
                }
                canvas.renderAll();
            }else if(keyCode === 32) {  //空格键
                spaceKey = true;
                self.canvas.defaultCursor = 'move';
            }else if(keyCode === 16) {  //shift键
                if(self.mode === DRAWER_MODE.draw) {
                    ctrlKey = true;
                    self.setSelectable(true);
                }
            }
        }, true);
        window.addEventListener('keyup', function(evt) {
            var keyCode = evt.which;
            if(keyCode === 32) { //空格键
                spaceKey = false;
                if(self.drawable) {
                    self.canvas.defaultCursor = 'crosshair';
                }else {
                    self.canvas.defaultCursor = 'auto';
                }
            }else if(keyCode === 16) {  //shift键
                if(self.mode === DRAWER_MODE.draw) {
                    ctrlKey = false;
                    self.setSelectable(false);
                }
            }
        }, true);
    };

    /**
     * 设置绘图器模式
     * @param mode
     */
    global.AgImgDrawer.prototype.setMode = function(mode) {
        if(!DRAWER_MODE[mode]) {
            console.error('Unsupported drawer mode "' + mode + '".');
            return;
        }
        this.mode = mode;
        this.cancelSelection();

        if(mode === DRAWER_MODE.browse) {
            this.canvas.defaultCursor  = 'auto';
            this.drawable = false;
            this.maskEle.style.display = 'block';
            document.getElementById(this.containerId).dataset.drawable = false;
        }else if(mode === DRAWER_MODE.edit) {
            this.canvas.defaultCursor  = 'auto';
            this.drawable = true;
            this.maskEle.style.display = 'none';
            this.setSelectable(true);
            document.getElementById(this.containerId).dataset.drawable = true;
        }else if(mode === DRAWER_MODE.draw) {
            this.canvas.defaultCursor  = 'crosshair';
            this.drawable = true;
            this.maskEle.style.display = 'none';
            document.getElementById(this.containerId).dataset.drawable = true;
        }
    };

    /**
     * 获取绘图器模式
     * @param mode
     */
    global.AgImgDrawer.prototype.getMode = function() {
        return this.mode;
    };

    /**
     * 获取当前绘图器所挂载的fabric.Canvas画布对象
     * @return {fabric.Canvas|*}
     */
    global.AgImgDrawer.prototype.getFabricCanvas = function() {
        return this.canvas;
    };

    /**
     * 设置背景图片，并调整图片大小以适应绘图器宽高
     * @param {string|fabric.Image} img - 图片地址或fabric.Image对象
     * @param callback
     */
    global.AgImgDrawer.prototype.setBackgroundImage = function(img, callback) {
        var self = this;
        self.loadingEle.style.display = 'block';
        var oldMaskDisplay = self.maskEle.style.display;
        self.maskEle.className = (self.loadingMask) ? 'aDrawer-mask dark' : 'aDrawer-mask';
        self.maskEle.style.display = 'block';

        if(img instanceof fabric.Image) {
            _scaleBackgroundImage(img, self.originWidth, self.originHeight);
            self.canvas.setBackgroundImage(img, self.canvas.renderAll.bind(self.canvas));

            self.loadingEle.style.display = 'none';
            self.maskEle.className = 'aDrawer-mask';
            self.maskEle.style.display = oldMaskDisplay;
            if(callback instanceof Function) {
                callback();
            }
        }else {
            self.backgroundUrl = img;
            fabric.Image.fromURL(img, function(oImg) {
                self.backgroundImage = oImg;
                _scaleBackgroundImage(self.backgroundImage, self.originWidth, self.originHeight);
                self.canvas.setBackgroundImage(self.backgroundImage, self.canvas.renderAll.bind(self.canvas));

                self.loadingEle.style.display = 'none';
                self.maskEle.className = 'aDrawer-mask';
                self.maskEle.style.display = oldMaskDisplay;
                if(callback instanceof Function) {
                    callback();
                }
            });
        }
    };

    /**
     * 设置背景图片，并更新绘图器大小
     * @param {string|fabric.Image} img - 图片地址或fabric.Image对象
     * @param callback
     */
    global.AgImgDrawer.prototype.setBackgroundImageWithUpdateSize = function(img, callback) {
        var self = this;
        self.loadingEle.style.display = 'block';
        var oldMaskDisplay = self.maskEle.style.display;
        self.maskEle.className = (self.loadingMask) ? 'aDrawer-mask dark' : 'aDrawer-mask';
        self.maskEle.style.display = 'block';

        //隐藏旧背景
        self.backgroundImage.opacity = 0;
        self.canvas.setBackgroundImage(self.backgroundImage, self.canvas.renderAll.bind(self.canvas));
        self.resetSize();

        //容器的父元素
        var conParent = document.getElementById(self.containerId).parentNode;
        var conPWidth = parseFloat(conParent.clientWidth);
        var conPHeight = parseFloat(conParent.clientHeight);

        if(img instanceof fabric.Image) {
            var newSize = _calcImgSize(conPWidth, conPHeight, img.width, img.height);
            self.backgroundImage.opacity = 1;
            _scaleBackgroundImage(self.backgroundImage, newSize[0], newSize[1]);
            self.canvas.setBackgroundImage(img, self.canvas.renderAll.bind(self.canvas));
            self.originWidth = newSize[0];
            self.originHeight = newSize[1];
            self.resetSize();

            self.loadingEle.style.display = 'none';
            self.maskEle.className = 'aDrawer-mask';
            self.maskEle.style.display = oldMaskDisplay;
            if(callback instanceof Function) {
                //样式变化动画期间获取到的宽高等属性为动画开始前的属性，因此应动画结束后再去执行回调
                setTimeout(function() {
                    callback();
                }, 450);
            }
        }else {
            self.backgroundUrl = img;
            fabric.Image.fromURL(img, function(oImg) {
                var newSize = _calcImgSize(conPWidth, conPHeight, oImg.width, oImg.height);
                self.backgroundImage = oImg;
                self.backgroundImage.opacity = 1;
                _scaleBackgroundImage(self.backgroundImage, newSize[0], newSize[1]);
                self.canvas.setBackgroundImage(self.backgroundImage, self.canvas.renderAll.bind(self.canvas));
                self.originWidth = newSize[0];
                self.originHeight = newSize[1];
                self.resetSize();

                self.loadingEle.style.display = 'none';
                self.maskEle.className = 'aDrawer-mask';
                self.maskEle.style.display = oldMaskDisplay;
                if(callback instanceof Function) {
                    //样式变化动画期间获取到的宽高等属性为动画开始前的属性，因此应动画结束后再去执行回调
                    setTimeout(function() {
                        callback();
                    }, 450);
                }
            });
        }
    };

    /**
     * 添加一个对象
     * @param object
     */
    global.AgImgDrawer.prototype.add = function(object) {
        this.canvas.add(object);
    };

    /**
     * 删除一个对象
     * @param object
     */
    global.AgImgDrawer.prototype.remove = function(object) {
        var objects = [object];
        if(this.option.beforeDelete(objects) === false) return;

        if(object instanceof fabric.Object && this.canvas.contains(object)) {
            this.option.afterDelete(objects);
            this.canvas.remove(object);
        }
    };

    /**
     * 获取所选中的对象
     * @return {*|fabric.Object}
     */
    global.AgImgDrawer.prototype.getSelection = function() {
        return this.canvas.getActiveObjects();
    };

    /**
     * 取消选中的对象
     */
    global.AgImgDrawer.prototype.cancelSelection = function() {
        this.canvas.discardActiveObject();
        this.canvas.renderAll();
    };

    /**
     * 删除所选中的对象
     */
    global.AgImgDrawer.prototype.removeSelection = function() {
        var activeObjs = this.canvas.getActiveObjects();

        if(this.option.beforeDelete(activeObjs) === false) return;

        var len = activeObjs.length;
        for(var i = 0; i < len; i++) {
            this.canvas.remove(activeObjs[i]);
        }

        this.canvas.discardActiveObject();
        this.option.afterDelete(activeObjs);
    };

    /**
     * 清空绘图板
     */
    global.AgImgDrawer.prototype.clear = function() {
        var self = this;
        self.option.afterClear(self.getObjects());
        self.canvas.clear();
        self.setBackgroundImage(self.backgroundImage);
    };

    /**
     * 定位对象至视图中央：缩放、平移
     * @param object
     */
    global.AgImgDrawer.prototype.locate = function(object) {
        var self = this;

        //计算缩放比例
        var minObjValue = (object.width > object.height) ? object.height : object.width;
        var tarScale = 120 / minObjValue;
        AgImgLarger.zoom(self.containerId, tarScale, function(newWidth, newHeight, scale) {
            self.setSize(newWidth, newHeight, scale);

            //动画结束之后再平移
            setTimeout(function() {
                var container = document.getElementById(self.containerId);
                var conL = parseFloat(container.style.marginLeft);
                var conT = parseFloat(container.style.marginTop);
                conL = conL ? conL : 0;
                conT = conT ? conT : 0;

                var clientRect = container.getBoundingClientRect();
                var conParent = container.parentNode;
                var conPWidth = parseFloat(conParent.clientWidth);
                var conPHeight = parseFloat(conParent.clientHeight);
                var tempHalfW = object.width * object.zoomX / 2;
                var tempHalfH = object.height * object.zoomY / 2;

                var newMarginL = conL - clientRect.left - object.left * object.zoomX - tempHalfW + conPWidth / 2;
                var newMarginT = conT - clientRect.top - object.top * object.zoomY - tempHalfH + conPHeight / 2;
                container.style.marginLeft = newMarginL + 'px';
                container.style.marginTop = newMarginT + 'px';
            }, 450);
        });
    };

    /**
     * 设置大小
     * @param width - 缩放后宽度
     * @param height - 缩放后高度
     * @param zoom - 缩放比例
     */
    global.AgImgDrawer.prototype.setSize = function(width, height, zoom) {
        this.zoom = zoom;

        this.canvas.setWidth(width);
        this.canvas.setHeight(height);
        this.canvas.setZoom(this.zoom);

        this.maskEle.style.width = width + 'px';
        this.maskEle.style.height = height + 'px';

        //根据缩放比例为矩形框设置边框粗细
        var objects = this.canvas.getObjects(), object, innerObjs;
        for(var i = 0, len = objects.length; i < len; i++) {
            object = objects[i];
            if(object.isType('rect')) {
                _setStrokeWidthByScale(object, this.zoom);
            }else if(object.isType('group')) {
                innerObjs = object.getObjects();
                for(var j =0; j < innerObjs.length; j++) {
                    if(innerObjs[j].isType('rect')) {
                        _setStrokeWidthByScale(innerObjs[j], this.zoom);
                    }
                }
            }
        }

        this.canvas.renderAll();
    };

    /**
     * 获取绘图器缩放比例
     * @return {Number|*}
     */
    global.AgImgDrawer.prototype.getScale = function() {
        return this.zoom;
    };

    /**
     * 设置绘图器缩放比例
     * @param scale
     */
    global.AgImgDrawer.prototype.setScale = function(scale) {
        var self = this;
        AgImgLarger.zoom(self.containerId, scale, function(newWidth, newHeight, scale) {
            self.setSize(newWidth, newHeight, scale);
        });
    };

    /**
     * 重置绘图器大小
     */
    global.AgImgDrawer.prototype.resetSize = function() {
        var self = this;
        self.setSize(self.originWidth, self.originHeight, 1);

        var container = document.getElementById(self.containerId);
        container.style.width = self.originWidth + 'px';
        container.style.height = self.originHeight + 'px';
        container.style.marginLeft = '0px';
        container.style.marginTop = '0px';
        // container.data('scale', 10);

        AgImgLarger.reset(self.containerId, self.originWidth, self.originHeight);
        self.setScale(1);
    };

    /**
     * 获取背景图片原始大小
     */
    global.AgImgDrawer.prototype.getBackgroundOriginSize = function() {
        return this.backgroundImage.getOriginalSize();
    };

    /**
     * 获取图像base64数据
     * @param option
     * @param option.format {string} - 图片格式，‘jpeg’或‘png’
     * @param option.quality {number} - 图片质量，范围 0~1
     */
    global.AgImgDrawer.prototype.getDataURL = function(option) {
        var defaultOpt = {
            format: 'jpeg',
            quality: 0.8
        };
        option = _mergeObject(defaultOpt, option);

        var dataURL;
        try {
            dataURL = drawer.canvas.toDataURL({
                format: option.format,
                quality: option.quality
            });
        }catch(e) {
            console.error("Canvas's background-image not belong to the current domain, so canvases may not be exported.");
        }

        return dataURL;
    };

    /**
     * 根据传入的参数对象自定义绘制样式
     * 书写形式：drawer.setDrawStyle({'fillColor': '#000'});
     * @param opts {object}
     */
    global.AgImgDrawer.prototype.setDrawStyle = function(opts) {
        for(var key in opts) {
            this.drawStyle[key] = opts[key];

            if(key === 'fillColor') {
                var fOpac = opts['fillOpacity'] ? opts['fillOpacity'] : this.drawStyle.fillOpacity;
                this.drawStyle._fill = _getRGBAColor(opts[key], fOpac);
            }else if(key === 'fillOpacity') {
                var fColor = opts['fillColor'] ? opts['fillColor'] : this.drawStyle.fillColor;
                this.drawStyle._fill = _getRGBAColor(fColor, opts[key]);
            }
        }
    };

    /**
     * 设置fabric.Canvas实例的属性
     * @param opts {object}
     */
    global.AgImgDrawer.prototype.setCanvasOptions = function(opts) {
        for(var key in opts) {
            this.canvas[key] = opts[key];
        }
        this.refresh();
    };
    
    /**
     * 添加物体
     * @param {fabric.Object} object - fabric.Circle、fabric.Rect、fabric.Text、fabric.Point、fabric.Polyline、fabric.Polygon等，
     * 详情请参见{@link http://fabricjs.com/docs/}
     */
    global.AgImgDrawer.prototype.addObject = function(object) {
        this.canvas.add(object);
        this.canvas.renderAll();
    };

    /**
     * 获取画布上所有对象
     * @param {object} exclude - 过滤规则，默认匹配所有
     * @return {Array[fabric.Object]}
     */
    global.AgImgDrawer.prototype.getObjects = function(exclude) {
        exclude = _mergeObject({
            'rect': false,
            'i-text': false,
            'text': false,
            'group': false,
            'notmodified': false
        }, exclude);

        var result = [];
        this.canvas.forEachObject(function(obj, index, objs) {
            if(!exclude[obj.type] && !(exclude.notmodified && !obj.modified)) {
                result.push(obj);
            }
        });
        return result;
    };

    /**
     * 序列化所有绘制对象，序列化取左上角，右下角
     * @param {object} exclude - 过滤规则，默认匹配所有
     * @return {Array[string]}
     */
    global.AgImgDrawer.prototype.serializeObjects = function(exclude) {
        exclude = _mergeObject({
            'rect': false,
            'i-text': false,
            'text': false,
            'group': false,
            'notmodified': false
        }, exclude);

        var wkts = [];
        var w, h, l, t, ltPoint, rbPoint;
        this.canvas.forEachObject(function(obj, index, objs) {
            if(!exclude[obj.type] && !(exclude.notmodified && !obj.modified)) {
                w = obj.width;
                h = obj.height;
                l = obj.left;
                t = obj.top;

                ltPoint = [l, t];
                rbPoint = [l + w, t + h];
                wkts.push('BOX(' + ltPoint.join(' ') + ',' + rbPoint.join(' ') + ')');
            }
        });
        return wkts;
    };

    /**
     * 刷新绘图器
     */
    global.AgImgDrawer.prototype.refresh = function() {
        this.canvas.renderAll();
    };

    /**
     * 设置是否允许选择对象
     * @param flag {boolean}
     */
    global.AgImgDrawer.prototype.setSelectable = function(flag) {
        this.selectable = flag;
        if(flag) {
            this.canvas.forEachObject(function(obj, index, objs) {
                obj.selectable = true;
                obj.hoverCursor = undefined;
                obj.moveCursor = undefined;
            });
        }else {
            this.cancelSelection();
            this.canvas.forEachObject(function(obj, index, objs) {
                obj.selectable = false;
                obj.hoverCursor = 'crosshair';
                obj.moveCursor = 'crosshair';
            });
        }
    };


    //--------------------------------------------------------
    //辅助方法
    //--------------------------------------------------------
    /**
     * 创建canvas元素
     * @private
     */
    function _createCanvasEle() {
        var canvasId = 'aegeanCanvas' + new Date().getTime();
        var cEle = document.createElement('canvas');
        cEle.id = canvasId;
        return cEle;
    }

    /**
     * 创建遮罩元素
     * @private
     */
    function _createMaskEle() {
        var divEle = document.createElement('div');
        //禁用默认的右键菜单
        divEle.oncontextmenu = function(evt) {
            evt.returnValue=false;
            return false;
        };

        divEle.className = 'aDrawer-mask';
        return divEle;
    }

    /**
     * 创建加载动画元素
     * @private
     */
    function _createLoadingEle() {
        var divEle = document.createElement('div');
        divEle.className = 'aDrawer-loading';
        return divEle;
    }

    /**
     * 设置全局控制框样式
     * @private
     */
    function _setGlobalControlStyle() {
        fabric.Object.prototype.transparentCorners = false;
        fabric.Object.prototype.cornerSize = 6;
        fabric.Object.prototype.cornerColor = '#00CCFF';
        fabric.Object.prototype.borderColor = '#00CCFF';
        // 从旋转锚点开始顺时针：mt, mt, tr, mr, br, mb, bl, ml, tl
        /*fabric.Object.prototype.setControlVisible('ml', false);
        fabric.Object.prototype.setControlVisible('mb', false);
        fabric.Object.prototype.setControlVisible('mr', false);
        fabric.Object.prototype.setControlVisible('mt', false);*/
    }

    /**
     * 移动对象
     * @private
     * @param item
     * @param offsetX
     * @param offsetY
     */
    function _moveItem(item, offsetX, offsetY) {
        if(!item || item.length === 0) {
            return;
        }

        offsetX = parseInt(offsetX);
        offsetY = parseInt(offsetY);

        item.left = item.left + offsetX;
        item.top = item.top + offsetY;
    }

    /**
     * 记录原始属性信息：如几何框的在缩放比例为1时的边框粗细
     * @private
     * @param object
     * @param opts
     */
    function _recordOriginProp(object, opts) {
        if(object.isType('group')) {
            var innerObjs = object.getObjects();
            for(var i = 0; i < innerObjs.length; i++) {
                _recordOriginProp(innerObjs[i], opts);
            }
        }else if(object.isType('rect') || object.isType('ellipse')) {
            object.originStrokeWidth = opts.strokeWidth;
        }else if(object.isType('text') || object.isType('i-text')) {
            object.originFontSize = opts.fontSize;
        }
    }

    /**
     * 根据缩放等级获取边框宽度
     * @private
     * @param originW - 原始边框粗细
     * @param scale - 当前缩放比例
     * @return {number}
     */
    function _setStrokeWidthByScale(item, scale) {
        var strokeWidth = _calcSWByScale(item.originStrokeWidth, scale);
        item.set('strokeWidth', strokeWidth).setCoords();
    }

    /**
     * 根据绘图器缩放等级计算边框大小
     * @private
     * @param originSW
     * @param scale
     */
    function _calcSWByScale(originSW, scale) {
        var strokeWidth;
        if(scale < 0.5) {
            strokeWidth = originSW - 0.5;
        }else if(scale >= 0.5 && scale < 1) {
            strokeWidth = originSW - 1;
        }else if(scale >= 1) {
            strokeWidth = originSW / scale;
        }
        return strokeWidth;
    }

    /**
     * 根据容器宽高计算图片大小
     * @private
     * @param conWidth
     * @param conHeight
     * @param imgWidth
     * @param imgHeight
     */
    function _calcImgSize(conWidth, conHeight, imgWidth, imgHeight) {
        var tempMin = (conWidth < conHeight) ? conWidth : conHeight;

        //计算背景图片大小
        var oImgScale = imgWidth / imgHeight;
        var nOImgWidth, nOImgHeight;
        if(imgWidth > imgHeight) {
            nOImgWidth = tempMin;
            nOImgHeight = tempMin / oImgScale;
        }else {
            nOImgWidth = tempMin * oImgScale;
            nOImgHeight = tempMin;
        }
        return [nOImgWidth, nOImgHeight];
    }

    /**
     * 设置背景图片覆盖画布
     * @param img
     * @param canvasWidth
     * @param canvasHeight
     * @private
     */
    function _scaleBackgroundImage(img, canvasWidth, canvasHeight) {
        img.scaleX = canvasWidth / img.width;
        img.scaleY = canvasHeight / img.height;
    }

    /**
     * 对象扩展（基于jQuery extend原理）
     * @private
     * @param {boolean|object} arg - 可变参数，你可以传入任意个参数将它们合并为一个对象；当不传入任何参数或者只有一个参数且类型不是对象，或者该参数为布尔值时将返回空对象；当参数个数大于等于两个时，
     * 若第一个参数类型不是布尔值或为 false ，将返回后续参数的浅拷贝合并，否则返回第一个参数后续参数的深拷贝合并
     * @return {object} - 扩展后的对象
     */
    /*var _extend = (function fn() {
        var options, name, src, copy, copyIsArray, clone,
            target = arguments[0] || {},
            length = arguments.length,
            i = 1, deep = false;

        //是否深度拷贝
        if(typeof target === "boolean") {
            deep = target;
            target = arguments[ i ] || {};
            i++;
        }
        if(typeof target !== "object" && !jQuery.isFunction(target)) {
            target = {};
        }
        if(i === length) {
            target = {};
            i--;
        }

        for(; i < length; i++) {
            if((options = arguments[i]) !== null) {
                for(name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if(target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if(deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
                        if(copyIsArray) {
                            copyIsArray = false;
                            clone = src && jQuery.isArray(src) ? src : [];
                        }else {
                            clone = src && jQuery.isPlainObject(src) ? src : {};
                        }
                        // Never move original objects, clone them
                        target[name] = fn(deep, clone, copy);
                    }else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    });*/

    /**
     * 合并对象属性：若存在相同属性则使用后面对象的属性
     * @param obj1
     * @param obj2
     * @private
     */
    function _mergeObject(obj1, obj2) {
        var result = {};
        if(typeof obj1 !== 'object' && typeof obj2 !== 'object') {
            return result;
        }else if(typeof obj1 === 'object' && typeof obj2 !== 'object') {
            return obj1;
        }else if(typeof obj1 !== 'object' && typeof obj2 === 'object') {
            return obj2;
        }else {
            for(var k in obj1) {
                if(obj1[k] !== undefined) {
                    result[k] = obj1[k];
                }
            }
            for(var m in obj2) {
                if(obj2[m] !== undefined) {
                    result[m] = obj2[m];
                }
            }
            return result;
        }
    }

    /**
     * 将16进制颜色值转换为rgb形式
     * @private
     * @param {string} hexStr - 颜色16进制字符串表示
     * @param {number} opacity - 透明度
     * @return {string} - 颜色RGB字符串表示
     */
    var _getRGBAColor = function(hexStr, opacity) {
        var sColor = hexStr.toLowerCase();
        if(sColor) {
            if(sColor.length === 4){
                var sColorNew = '#';
                for(var i = 1; i < 4; i+=1) {
                    sColorNew += sColor.slice(i,i+1).concat(sColor.slice(i,i+1));
                }
                sColor = sColorNew;
            }
            //处理六位的颜色值
            var sColorChange = [];
            for(var j = 1; j < 7; j+=2) {
                sColorChange.push(parseInt('0x' + sColor.slice(j, j+2)));
            }
            return 'rgba(' + sColorChange.join(',') + ', '+ opacity + ')';
        }else{
            return 'rgba(0, 0, 0, ' + opacity + ')';
        }
    };
})(window);