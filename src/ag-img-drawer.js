/**
 * 基于fabric.js的Web绘图器
 * Created by aegean on 2017/5/19 0019.
 */

;(function(global) {
    // 默认配置项
    var defaultOption = {
        width: 600,     //若要指定绘图器宽高，请将 autoAdjustment 设为false
        height: 560,
        padding: 30,    // 图片与容器的边距
        backgroundUrl: null,  //背景图片地址
        autoAdjustment: true,   //根据容器大小自动调整绘图器宽高
        loadingMask: true,  //加载动画遮罩
        afterInitialize: function() {},
        afterAdd: function(object) {},      //添加对象回调，携带一个参数为所添加的对象，添加包括所有的绘制情况
        afterDraw: function(object) {},     //绘制回调，携带一个参数为所绘制的对象
        afterModify: function(object, isSingle) {},         //修改回调，携带参数：所修改的对象、是否是单个对象
        afterEnter: function(object, isSingle, isModified) {},          //按回车键回调，携带参数：当前选中对象、是否是单个对象、是否修改
        beforeDelete: function() {},                //删除前回调，携带参数：将要删除的对象数组、ctrl键是否按下、方法返回false则取消删除
        afterDelete: function(objects) {},          //删除回调，携带参数：删除的对象数组、ctrl键是否按下
        afterClear: function(objects) {},           //清空回调，携带一个参数为包含所有对象的数组
        afterSelect: function(objects) {},          //选中物体回调，携带一个参数为所选中的对象数组
        afterCancelSelect: function() {},           //取消选中物体回调
        afterCopy: function(objects) {},            //复制选中对象的回调，携带参数：所复制的对象集合
        afterPaste: function(objects) {},           //粘贴选中对象的回调，携带一个参数为所粘贴的对象集合
    };
    // 绘图器模式
    // 浏览模式（browse）: 默认只能像浏览图片一样操作绘图器，无法对画布上的对象做任何操作（遮罩显示），可直接拖拽画布
    // 编辑模式（edit）: 默认行为类似浏览模式（遮罩不显示），摁住空格键可拖拽画布
    //                摁住ctrl键可进行对象选择，松开后除已选择对象外其余所有对象不可选，且单击选中对象之外的地方将取消选中
    //               （默认摁住ctrl才能对对象操作，也可以调用方法设置直接能操作）
    // 绘制模式（draw）: 摁住空格键可拖拽画布
    //                所有对象不可选，切换至该模式后所有已选中对象也必须取消选中状态
    //                可在画布上任意地方绘制矩形对象，仅有新绘制的对象可被编辑
    var DRAWER_MODE = {
        browse: 'browse',
        edit: 'edit',
        draw: 'draw'
    };
    // 绘制类型：Rect、Circle、Circle
    var DRAWER_TYPE = {
        rect: 'Rect',
        ellipse: 'Ellipse',
        text: 'Text'
    };
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

    // 内部变量
    var _beforeActiveObjs = null;
    var _clipboard = null;
    var _ctrlKey = false;
    var _mousePosition = {
        move: {x: 0, y: 0}
    };

    // 鼠标指针图片Base64
    var CURSOR = {
        handOpen: 'data:image/x-icon;base64,AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAgBAAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABVVVUGMzMzBf///wEzMzMKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFVVVQM7OzucQUFB1D09Pes4ODj4NDQ0/TU1Nfw2Njb7NjY2+jMzM/82NjY0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPDw8ojMzM//Q0ND/5eXl//f39//////////////////7+/v/g4OD/z8/P6UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADg4OFdHR0f18fHx///////////////////////////////////////Pz8//QUFB3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzMzN3Pj4+9d7e3v////////////////////////////////////////////////9aWlrzNTU1YQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANDQ0ejMzM//h4eH//////////////////////////////////////////////////////9vb2/87OzvvOTk5CQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMzMzczMzP/zs7O/////////////////////////////////////////////////////////////////2NjY/I1NTVbAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0NDRFPj4+9cPDw///////////////////////////////////////////////////////////////////////xcXF/z8/P84AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMzMzLTs7O/TV1dX////////////////////////////////////////////////////////////////////////////t7e3/Ojo68wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEZGRgs7Ozvkvb29/f////////////////////////////////////////////////////////////////////////////////////89PT32PT09FQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOTk5eWpqavT//////////////////////////////////////////////////////////////////////////////////////////01NTfAzMzMtAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wE8PDzt39/f////////////////////////////////////////////////////////////////////////////////////////////XV1d7zU1NT8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANTU1PlFRUfH//////////////////////Pz8//////////////////////////////////////////////////////////////////////9wcHDyNDQ0VAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9PT2anp6e/P///////////////zMzM/8zMzP//////////////////////////////////////////////////////////////////////6enp/4/Pz+mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADw8PO7j4+P///////////+srKz9MzMz/4+Pj/r/////////////////////////////////////////////////////////////////////6Ojo/zo6OvNVVVUDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0NDQ2S0tL8v//////////8PDw/zw8PPY5OTnIrq6u////////////////////////////////////////////////////////////////////////////U1NT8DMzM0EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQ0NHuQkJD5//////////9PT0/7PDw8nUJCQszKysr//////////////////////////////////////////////////////6Ojo/+srKz8//////////+goKD8PDw8lgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPj4+qbKysv//////kJCQ+zMzM/9VVVUGPT096+Tk5P///////////zk5Of59fX3////////////Ly8v/MzMz////////////e3t7/zMzM////////////9TU1P8/Pz/fAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7OzuHMzMz/15eXu48PDzcPT09FUBAQAQ2Njb8////////////////MzMz/5aWlv///////////8bGxv8zMzP///////////+8vLz/MzMz/9nZ2f///////f39/zo6OvgzMzMUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzMzN3NTU1Vjk5OQkAAAAANTU1IkNDQ/P//////////9PT0/8zMzP/qamp////////////t7e3/zMzM//5+fn//////8/Pz/8zMzP/hYWF9///////////aWlp8DMzM1UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2NjZCXV1d7///////////mJiY+zMzM/+qqqr///////////+jo6P/MzMz/+Pj4///////4uLi/zc3N/U7Ozv29PT0//////+ZmZn9Nzc3hgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADU1NWB5eXnz//////////9XV1fwPDw8q6urq////////////4mJifg7Ozvgx8fH///////y8vL/ODg49T4+PqSWlpb6/////7i4uP9AQECyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANDQ0e5aWlvz/////8/Pz/zg4OPg9PT2eqamp////////////b29v8DU1Ne6rq6v///////////81NTX9ODg4IDk5Offg4OD/t7e3/zMzM/oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA9PT2eqqqq//////+/v7//Q0NDwz4+Ppypqan///////////9SUlLvMzMzgouLi/n//////////z8/P/U6OjoWPDw8VTMzM/89PT38NDQ0ewAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAENDQ7i8vLz//////4iIiPg1NTV0Pj4+nKmpqf///////////zw8PPYzMzNQYmJi7///////////SUlJ8TMzMygAAAAANTU1ZjQ0NHoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARERExMbGxv//////UVFR7zc3Nzg/Pz+bq6ur///////39/f/NjY2+zs7Oxo9PT31//////////9UVFTvNjY2NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBQUG0urq6/+7u7v85OTn0SUlJBz8/P5qqqqr//////93d3f8/Pz/i////AT8/P+Ta2tr//////1NTU+43NzczAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADU1NYN9fX34SkpK/Do6Op8AAAAAPj4+nKurq///////vb29/0JCQroAAAAAOTk5eGFhYfX/////Ozs7+DU1NR0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANjY2EzMzM/8zMzP/VVVVAwAAAAA3NzeKn5+f//////+SkpL7Nzc3gQAAAABAQEAEMzMz/zMzM/81NTX3////AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////AQAAAAAAAAAAAAAAADQ0NGd7e3v0/////0JCQvg2NjZCAAAAAAAAAABVVVUDNjY2TFVVVQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANTU1IjMzM/9vb2/9MzMz/1VVVQMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANjY2TDQ0NPE2NjYTAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA///D///wAf//8AH//+AB///AAP//gAB//wAAf/4AAH/8AAB/+AAAP/gAAD/wAAA/8AAAP/AAAD/wAAAf4AAAH+AAAB/gAAAf4AAAD/EAAA//AAAP/wAAD/8AAA//AAAP/wAAn/8AAP//AAD//wgg//8IIP//uDH///g////8f/8=',
        handHold: 'data:image/x-icon;base64,AAABAAEAICAAAAEAIACoEAAAFgAAACgAAAAgAAAAQAAAAAEAIAAAAAAAgBAAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADY2NhMzMzM8NTU1XDQ0NHA1NTV5MzMzaTQ0NFk0NDRJNjY2OTMzM0EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8PDyUMzMz/1hYWO50dHTyjIyM+JSUlPuDg4P2cnJy8WNjY+9VVVXvMzMz/zc3N1gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOzs7GjMzM//x8fH///////////////////////////////////////////+urq7/PT09xgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ODh3dnZ29f///////////////////////////////////////////////5qamvw5OTmOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANDQ0OzMzM/7f39//////////////////////////////////////////////////a2tr8DQ0NFMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMzM0szMzP/0tLS//////////////////////////////////////////////////////9HR0fyMzMzKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADY2NiZAQEC4SkpK9NPT0////////////////////////////////////////////////////////////zg4OPkzMzMKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ODhtPT099J2dnfv6+vr/////////////////////////////////////////////////////////////////SUlJ8Tc3NyoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOzs7ekJCQvjr6+v///////////////////////////////////////////////////////////////////////////98fHz1MzMzaQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADMzMygzMzP/5+fn/////////////////////////////////////////////////////////////////////////////////7S0tP9CQkKyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPT09k5eXl/v/////////////////////////////////////////////////////////////////////////////////////6urq/zk5OfSAgIACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8PDzp4ODg////////////////////////////////////////////////////////////////////////////////////////////T09P8DMzMzcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASUlJBzY2Nvz+/v7///////////////////////////////////////////////////////////////////////////////////////////+Pj4/5NjY2fwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1NTUrSUlJ8f///////////////6enp/+rq6v//////////////////////////////////////////////////////////////////////8bGxv9CQkLIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQ0NE9nZ2fw////////////////MzMz/3h4eP//////////////////////////////////////////////////////////////////////39/f/z8/P+YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANTU1ZoGBgfP///////////////8zMzP/ubm5///////////////////////////////////////////////////////////////////////39/f/ODg4+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0NDRPMzMz/+fn5///////+/v7/zMzM//z8/P///////////////////////////////////////////////////////////////////////r6+v81NTX7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7Ozt9MzMz/4eHh/ZGRkb+MzMz/////////////////////////////////////////////////////////////////////////////f39/zU1NfwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAzMzMZNTU1fDc3N786Ojr5///////////////////////////////////////////////////////////////////////////x8fH/OTk59QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANjY2NFRUVO///////////////////////////////////////////////////////////////////////////+Li4v8+Pj7mAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1NTU/W1tb7f///////////////zMzM/+kpKT////////////Nzc3/q6ur////////////MzMz/39/f///////wsLC/z8/P8UAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADc3NyUzMzP/+/v7//////+bm5v/MzMz//39/f///////////zMzM/9vb2////////39/f8zMzP/k5OT//f39/8zMzP/MzMzaQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEJCQpIzMzP/f39/9TMzM/9DQ0P3///////////5+fn/MzMz/93d3f//////y8vL/zQ0NPwzMzP/MzMz/z4+Po8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQ0NHE0NDRnNTU1ajMzM//4+Pj//////4WFhfozMzP/z8/P//Pz8/8zMzP/NTU1ajc3Nw41NTUYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPDw8kDMzM/9KSkryOjo65TU1NUgzMzP/MzMz/z4+PosAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANTU1MDY2Nj1AQEAEAAAAADMzMwUzMzMKAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//////////////////wA///4AH//8AB///AAf//gAH//wAB//wAAf/4AAH/8AAB/+AAAf/gAAD/4AAA/8AAAP/AAAD/wAAA/8AAAP/AAAD/4AAA//AAAP/8AAD//AAA//wAAP/+AAH//wAD///gH///8T/////////////////8='
    };


    //--------------------------------------------------------
    // AgImgDrawer: 核心
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

        this.containerId = containerId;
        this.option = option;
        this.mode = DRAWER_MODE.browse;
        this._beforeMode = null;
        this.drawType = DRAWER_TYPE.rect;
        this.canvas = null;
        this.maskEle = null;
        this.drawingItem = null;//正在绘制的对象
        this.originWidth = null;
        this.originHeight = null;
        this.drawable = false;  //是否是可绘制状态
        this.dragDirectly = true;  //是否可以使用鼠标左键直接拖拽
        this.selectable = true; //是否允许选择对象
        this.selectedItems = null;
        this.editDirectly = false;  //仅在编辑模式有效：是否可以直接对画布上的对象编辑，如果为false则需摁住ctrl键操作对象
        this.backgroundUrl = null;
        this.backgroundImage = null;
        this.zoom = 1;
        this.loadingMask = true;
        this.drawStyle = {  //绘制样式
            fillColor: '#000',
            fillOpacity: 0.2,
            _fill: 'rgba(0, 0, 0, 0)',     //根据fillColor和fillOpacity生成
            borderColor: '#f04155',
            borderColorH: '#ffc64b',
            borderWidth: 2,
            _borderWidth: 2,
            fontFamily: 'Microsoft YaHei',
            fontSize: 14,
            fontColor: '#fff',
            fontColorH: '#333',
            fontBackColor: 'rgba(240, 65, 85, 0.7)',
            fontBackColorH: 'rgba(255, 198, 75, 0.7)',
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
        _centerElement(container, 300, 154);

        var conParent = container.parentNode;
        var conPWidth = conParent.clientWidth;
        var conPHeight = conParent.clientHeight;
        if(option.backgroundUrl) {
            if(option.autoAdjustment) {
                //获取背景大小
                fabric.Image.fromURL(option.backgroundUrl, function(oImg) {
                    var newSize = _calcImgSize(conPWidth, conPHeight, oImg.width, oImg.height, self.option.padding);

                    self.backgroundImage = oImg;
                    option.width = newSize[0];
                    option.height = newSize[1];
                    self.originWidth = newSize[0];
                    self.originHeight = newSize[1];
                    _initSize();
                    _centerElement(container, newSize[0], newSize[1]);
                });
            }else {
                fabric.Image.fromURL(option.backgroundUrl, function(oImg) {
                    self.backgroundImage = oImg;
                    self.originWidth = option.width;
                    self.originHeight = option.height;
                    _initSize();
                    _centerElement(container, option.width, option.height);
                });
            }
        }else {
            self.backgroundImage = new fabric.Image();
            self.originWidth = option.width;
            self.originHeight = option.height;
            _initSize();
            _centerElement(container, option.width, option.height);
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
            container.dataset.dragDirectly = self.dragDirectly;
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
        var drawParam;
        var startX, startY, endX, endY;
        var tempLeft, tempTop, tempWidth, tempHeight;
        //是否存在选中项、是否是在画布上单击
        var hasSelect = false, hit = false;

        //创建fabric.js实例
        var canvas = self.canvas = new fabric.Canvas(self.canvasEleId);
        self.setSize(option.width, option.height, 1);
        self.setBackgroundImage(self.backgroundImage, null);
        self.loadingEle.style.display = 'none';
        _setGlobalObjectProp();
        _setGlobalControlStyle();

        //添加动画
        var canvasEle = canvas.getElement();
        canvasEle.classList.add('ag-smooth');

        //鼠标事件
        canvas.on('mouse:down', function(evt) {
            hit = true;
            self.drawingItem = null;
            self.drawStyle._borderWidth = _calcSWByScale(self.drawStyle.borderWidth, self.zoom);

            var conEle = document.getElementById(self.containerId);
            var conParentClient = conEle.parentNode.getBoundingClientRect();
            var marginL = parseInt(conEle.style.marginLeft);
            var marginT = parseInt(conEle.style.marginTop);
            drawParam = {
                offsetX: conParentClient.left + marginL,
                offsetY: conParentClient.top + marginT
            };
            startX = (evt.e.pageX - drawParam.offsetX) / self.zoom;
            startY = (evt.e.pageY - drawParam.offsetY) / self.zoom;
        });
        window.addEventListener('mousemove', function(evt) {
            _mousePosition.move.x = evt.offsetX / self.zoom;
            _mousePosition.move.y = evt.offsetY / self.zoom;
            if(hit && self.drawable && (self.mode === DRAWER_MODE.draw) && !hasSelect) {
                endX = (evt.pageX - drawParam.offsetX) / self.zoom;
                endY = (evt.pageY - drawParam.offsetY) / self.zoom;

                if(self.drawingItem) {
                    canvas.remove(self.drawingItem);
                }

                tempLeft = (endX > startX) ? startX : endX;
                tempTop = (endY > startY) ? startY : endY;

                //判断绘制类型
                if(self.drawType === DRAWER_TYPE.rect) {
                    // tempWidth = Math.abs(endX - startX) - self.drawStyle._borderWidth;
                    // tempHeight = Math.abs(endY - startY) - self.drawStyle._borderWidth;
                    tempWidth = Math.abs(endX - startX) - self.drawStyle.borderWidth;
                    tempHeight = Math.abs(endY - startY) - self.drawStyle.borderWidth;
                    tempWidth = tempWidth < 0 ? 0 : tempWidth;
                    tempHeight = tempHeight < 0 ? 0 : tempHeight;

                    self.drawingItem = new fabric.Rect({
                        width: tempWidth,
                        height: tempHeight,
                        left: tempLeft,
                        top: tempTop,
                        fill: self.drawStyle._fill,
                        stroke: self.drawStyle.borderColor,
                        // strokeWidth: self.drawStyle._borderWidth,
                        strokeWidth: self.drawStyle.borderWidth,
                        originStrokeWidth: self.drawStyle.borderWidth
                    });
                }else if(self.drawType === DRAWER_TYPE.ellipse) {
                    // tempWidth = Math.abs(endX - startX) / 2 - self.drawStyle._borderWidth / 2;
                    // tempHeight = Math.abs(endY - startY) / 2 - self.drawStyle._borderWidth / 2;
                    tempWidth = Math.abs(endX - startX) / 2 - self.drawStyle.borderWidth / 2;
                    tempHeight = Math.abs(endY - startY) / 2 - self.drawStyle.borderWidth / 2;
                    tempWidth = tempWidth < 0 ? 0 : tempWidth;
                    tempHeight = tempHeight < 0 ? 0 : tempHeight;

                    self.drawingItem = new fabric.Ellipse({
                        rx: tempWidth,
                        ry: tempHeight,
                        left: tempLeft,
                        top: tempTop,
                        fill: self.drawStyle._fill,
                        stroke: self.drawStyle.borderColor,
                        // strokeWidth: self.drawStyle._borderWidth,
                        strokeWidth: self.drawStyle.borderWidth,
                        originStrokeWidth: self.drawStyle.borderWidth
                    });
                }else if(self.drawType === DRAWER_TYPE.text) {
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

                    option.afterAdd(self.drawingItem);
                    option.afterDraw(self.drawingItem);
                }

                self.drawingItem = null;
            }
        });
        canvas.on('mouse:out', function(evt) {
            _mousePosition.move.x = 0;
            _mousePosition.move.y = 0;

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
        });
        canvas.on('object:modified', function(evt) {
            var target = evt.target;
            var isSingle = target.type !== 'activeSelection' && target.type !== 'group';
            target.modified = true;
            option.afterModify(target, isSingle);
            _calcObjSizeAfterScale(target, target.scaleX, target.scaleY, true);
            _handleAgRectModify(target);
        });
        canvas.on('object:moving', function(evt) {
            _handleAgRectModify(evt.target);
        });
        canvas.on('object:scaling', function(evt) {
            _handleAgRectModify(evt.target);
        });

        //选择集事件
        canvas.on('selection:created', function(evt) {
            hasSelect = true;
            if(self.drawingItem) {
                return;
            }

            self.selectedItems = evt.target;
            _setObjectInteractive(evt.target, true, self);

            var aciveObjs = self.getSelection();
            option.afterSelect(aciveObjs);
            self.highlightObjects(aciveObjs);
        });
        canvas.on('selection:updated', function(evt) {
            self.selectedItems = evt.target;
            _setObjectInteractive(evt.target, true, self);

            var aciveObjs = self.getSelection();
            option.afterSelect(aciveObjs);
            self.highlightObjects(aciveObjs);
        });
        canvas.on('selection:cleared', function(evt) {
            hasSelect = false;
            self.selectedItems = null;
            option.afterCancelSelect();
        });
        canvas.on('before:selection:cleared', function(evt) {
            self.darkenObjects(self.getSelection());
        });

        //键盘事件
        window.addEventListener('keydown', function(evt) {
            if(evt.target.nodeName === 'input')  return;

            var keyCode = evt.which;
            if(evt.ctrlKey) {
                _ctrlKey = true;
                //ctrl键：编辑模式下摁住可选择物体
                if(self.mode === DRAWER_MODE.draw || (self.mode === DRAWER_MODE.edit && !self.editDirectly)) {
                    self.setExistObjectInteractive(true);
                }
            }
            // 快捷键缩放
            if(_ctrlKey && evt.altKey) {
                switch(keyCode) {
                    case 187: self.zoomIn(); break;    //ctrl+alt+加号
                    case 189: self.zoomOut(); break;    //ctrl+alt+减号
                }
            }

            if(keyCode >= 37 && keyCode <= 40) {  //方位键
                switch(keyCode) {
                    case 37: _moveItem(self.selectedItems, -1, 0); break;
                    case 38: _moveItem(self.selectedItems, 0, -1); break;
                    case 39: _moveItem(self.selectedItems, 1, 0); break;
                    case 40: _moveItem(self.selectedItems, 0, 1); break;
                }
                self.refresh();
            }else if(keyCode === 46) {// 删除选中对象
                self.removeObjects(self.getSelection());
                self.cancelSelection();
            }else if(keyCode === 67 && self.mode !== DRAWER_MODE.browse && _ctrlKey) {// 复制对象：ctrl+C
                self.copySelectedObject();
            }else if(keyCode === 86 && self.mode !== DRAWER_MODE.browse && _ctrlKey) {// 粘贴对象：ctrl+V
                self.pasteSelectedObject();
            }else if(keyCode === 13) {// 回车
                var activeObj = self.canvas.getActiveObject();
                if(activeObj) {
                    var isSingle = activeObj.type !== 'activeSelection' && activeObj.type !== 'group';
                    var isModified = activeObj.modified ? activeObj.modified : false;
                    option.afterEnter(activeObj, isSingle, isModified);
                }else {
                    option.afterEnter(null, false, false);
                }
            }else if(keyCode === 84) {  //T键切换浏览模式
                if(self._beforeMode) {
                    self.setMode(self._beforeMode);
                    self._beforeMode = null;
                }else {
                    self._beforeMode = self.mode;
                    self.setMode(DRAWER_MODE.browse);
                }
            }
        }, true);
        window.addEventListener('keyup', function(evt) {
            var keyCode = evt.which;
            if(keyCode === 17) {    //ctrl键：编辑模式下弹起取消可选择
                _ctrlKey = false;
                if(self.mode === DRAWER_MODE.draw || (self.mode === DRAWER_MODE.edit && !self.editDirectly)) {
                    self.setExistObjectInteractive(false, false);
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
            this.maskEle.style.display = 'block';
            this.canvas.defaultCursor = 'auto';
            this.canvas.selection = false;
            this.drawable = false;
            this.setExistObjectInteractive(false);
            document.getElementById(this.containerId).dataset.dragDirectly = true;
        }else if(mode === DRAWER_MODE.edit) {
            this.maskEle.style.display = 'none';
            this.canvas.defaultCursor = 'auto';
            this.canvas.selection = true;
            this.drawable = false;
            this.setExistObjectInteractive(this.editDirectly);
            document.getElementById(this.containerId).dataset.dragDirectly = false;
        }else if(mode === DRAWER_MODE.draw) {
            this.maskEle.style.display = 'none';
            this.canvas.defaultCursor = 'crossHair';
            this.canvas.selection = false;
            this.drawable = true;
            this.setExistObjectInteractive(false);
            document.getElementById(this.containerId).dataset.dragDirectly = false;
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
            var newSize = _calcImgSize(conPWidth, conPHeight, img.width, img.height, self.option.padding);
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
                var newSize = _calcImgSize(conPWidth, conPHeight, oImg.width, oImg.height, self.option.padding);
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
     * @deprecated
     * @param object
     */
    global.AgImgDrawer.prototype.add = function(object) {
        console.warn('This method has been deprecated, please consider using addObject !');
        this.addObject(object);
    };

    /**
     * 添加一个对象
     * @param object
     */
    global.AgImgDrawer.prototype.addObject = function(object) {
        this.canvas.add(object);
        object._labelObject && this.canvas.add(object._labelObject);
        _bindEvtForObject(object, this);
        this.option.afterAdd(object);
    };

    /**
     * 添加多个对象
     * @param objects
     */
    global.AgImgDrawer.prototype.addObjects = function(objects) {
        for(var i = 0, len = objects.length; i < len; i++) {
            this.addObject(objects[i]);
        }
    };

    /**
     * 删除一个对象
     * @deprecated
     * @param object
     */
    global.AgImgDrawer.prototype.remove = function(object) {
        console.warn('This method has been deprecated, please consider using removeObject !');
        this.removeObject(object);
    };

    /**
     * 删除一个对象
     * @param object
     */
    global.AgImgDrawer.prototype.removeObject = function(object) {
        var objects = [object];
        if(this.option.beforeDelete(objects, _ctrlKey) === false) return;

        if(object instanceof fabric.Object && this.canvas.contains(object)) {
            this.option.afterDelete(objects, _ctrlKey);
            this.canvas.remove(object);
        }
    };

    /**
     * 删除多个对象
     * @param objects
     */
    global.AgImgDrawer.prototype.removeObjects = function(objects) {
        if(this.option.beforeDelete(objects, _ctrlKey) === false) return;
        var success = [], tmp;
        for(var i = 0, len = objects.length; i < len; i++) {
            tmp = objects[i];
            this.canvas.remove(tmp);
            success.push(tmp);
        }
        this.option.afterDelete(success, _ctrlKey);
    };

    /**
     * 获取画布上所有对象
     * @param {object} exclude - 过滤规则（依据对象的类型），默认匹配自定义标签对象之外的所有对象
     * @return {Array[fabric.Object]}
     */
    global.AgImgDrawer.prototype.getObjects = function(exclude) {
        var result = [];
        exclude = _mergeObject({
            'ag-label': true
        }, exclude);
        this.canvas.forEachObject(function(obj, index, objs) {
            if(!exclude[obj.type] && !exclude[obj.agType]) {
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
    global.AgImgDrawer.prototype.getSelection = function(exclude) {
        var result = [], tmp;
        exclude = _mergeObject({
            'ag-label': true
        }, exclude);
        var activeObjs = this.canvas.getActiveObjects();
        for(var i = 0, len = activeObjs.length; i < len; i++) {
            tmp = activeObjs[i];
            if(!exclude[tmp.type] && !exclude[tmp.agType]) {
                result.push(tmp);
            }
        }
        return result;
    };

    /**
     * 取消选中的对象
     */
    global.AgImgDrawer.prototype.cancelSelection = function() {
        this.canvas.discardActiveObject();
        var activeObject = this.canvas.getActiveObject();
        activeObject && this.removeObject(activeObject);
        this.canvas.renderAll();
    };

    /**
     * 删除所选中的对象
     */
    global.AgImgDrawer.prototype.removeSelection = function() {
        this.removeObjects(this.getSelection());
    };

    /**
     * 设置选中对象
     * @param object
     */
    global.AgImgDrawer.prototype.setActiveObject = function(object) {
        this.canvas.setActiveObject(object);
    };

    /**
     * 序列化对象为WKT字符串，序列化取左上角，右下角
     * @param object
     * @return {string}
     */
    global.AgImgDrawer.prototype.serializeObject = function(object) {
        var w, h, l, t, ltPoint, rbPoint;
        w = object.width;
        h = object.height;
        l = object.left;
        t = object.top;
        ltPoint = [l, t];
        rbPoint = [l + w, t + h];
        return 'BOX(' + ltPoint.join(' ') + ',' + rbPoint.join(' ') + ')';
    };

    /**
     * 序列化多个对象
     * @return {Array[string]}
     */
    global.AgImgDrawer.prototype.serializeObjects = function(objects) {
        var wkts = [];
        if(objects && objects.length) {
            for(var i = 0, len = objects.length; i < len; i++) {
                wkts.push(this.serializeObject(objects[i]));
            }
        }
        return wkts;
    };

    /**
     * 清空绘图板
     */
    global.AgImgDrawer.prototype.clear = function() {
        this.option.afterClear(this.canvas.getObjects());
        this.canvas.clear();
        this.setBackgroundImage(this.backgroundImage);
    };

    /**
     * 刷新绘图器
     */
    global.AgImgDrawer.prototype.refresh = function() {
        this.canvas.renderAll();
    };

    /**
     * 定位对象至视图中央：缩放、平移
     * [先平移再缩放]
     * @param object
     */
    global.AgImgDrawer.prototype.locate = function(object) {
        var self = this;

        // 平移
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

        // 以物体中间位置为中心缩放
        setTimeout(function() {
            var pointer = _getEleCenterPoint(conParent);
            var minObjValue = (object.width > object.height) ? object.height : object.width;
            var tarScale = 200 / minObjValue;
            AgImgLarger.zoom(self.containerId, tarScale, pointer, function(newWidth, newHeight, scale) {
                self.setSize(newWidth, newHeight, scale);
            });
        }, 400);
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
        this.canvas.setZoom(zoom);
        this.maskEle.style.width = width + 'px';
        this.maskEle.style.height = height + 'px';

        //根据缩放比例为矩形框设置边框粗细
        /*this.canvas.forEachObject(function(obj, index, objs) {
            _setStrokeWidthByScale(obj, zoom);
        });*/
        this.canvas.renderAll();
    };

    /**
     * 获取绘图器缩放比例
     * @deprecated
     * @return {Number|*}
     */
    global.AgImgDrawer.prototype.getScale = function() {
        console.warn('This method has been deprecated, please consider using getZoom !');
        return this.getZoom();
    };
    /**
     * 设置绘图器缩放比例
     * @deprecated
     * @param scale
     */
    global.AgImgDrawer.prototype.setScale = function(scale) {
        console.warn('This method has been deprecated, please consider using setZoom !');
        this.setZoom(scale);
    };

    /**
     * 获取绘图器缩放比例
     * @return {Number|*}
     */
    global.AgImgDrawer.prototype.getZoom = function() {
        return this.zoom;
    };

    /**
     * 设置绘图器缩放比例
     * @param scale
     */
    global.AgImgDrawer.prototype.setZoom = function(scale) {
        var self = this;
        var container = document.getElementById(self.containerId);
        var conParent = container.parentNode;
        var pointer = _getEleCenterPoint(conParent);
        AgImgLarger.zoom(self.containerId, scale, pointer, function(newWidth, newHeight, scale) {
            self.setSize(newWidth, newHeight, scale);
        });
    };

    /**
     * 放大
     */
    global.AgImgDrawer.prototype.zoomIn = function() {
        var self = this;
        var container = document.getElementById(self.containerId);
        var conParent = container.parentNode;
        var pointer = _getEleCenterPoint(conParent);
        AgImgLarger.zoomIn('myDrawer', pointer, function(newWidth, newHeight, scale) {
            self.setSize(newWidth, newHeight, scale);
        });
    };

    /**
     * 缩小
     */
    global.AgImgDrawer.prototype.zoomOut = function() {
        var self = this;
        var container = document.getElementById(self.containerId);
        var conParent = container.parentNode;
        var pointer = _getEleCenterPoint(conParent);
        AgImgLarger.zoomOut('myDrawer', pointer, function(newWidth, newHeight, scale) {
            self.setSize(newWidth, newHeight, scale);
        });
    };

    /**
     * 重置绘图器大小
     */
    global.AgImgDrawer.prototype.resetSize = function() {
        var orW = this.originWidth;
        var orH = this.originHeight;
        var container = document.getElementById(this.containerId);
        container.style.width = orW + 'px';
        container.style.height = orH + 'px';
        _centerElement(container, orW, orH);

        AgImgLarger.reset(this.containerId, orW, orH);
        this.setSize(orW, orH, 1);
        this.setZoom(1);
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
     * 设置画布上已存在的对象是否可交互
     * @param flag {boolean}
     * @param includeActiveObj {boolean} - 当前设置是否对当前选中对象生效
     */
    global.AgImgDrawer.prototype.setExistObjectInteractive = function(flag, includeActiveObj) {
        includeActiveObj = includeActiveObj === false ? false : true;
        if(flag === true) {
            this.canvas.selection = true;
            this.canvas.forEachObject(function(obj, index, objs) {
                if(obj.agType !== 'ag-label') {
                    obj.selectable = true;
                    obj.evented = true;
                    // obj.hoverCursor = cursor;
                    // obj.moveCursor = cursor;
                }
            });
        }else {
            if(includeActiveObj) {
                this.cancelSelection();
            }
            this.canvas.selection = false;
            this.canvas.forEachObject(function(obj, index, objs) {
                if(obj.agType !== 'ag-label' && !obj.selected) {
                    obj.selectable = false;
                    obj.evented = false;
                    // obj.hoverCursor = cursor;
                    // obj.moveCursor = cursor;
                }
            });
        }
    };

    /**
     * 设置编辑模式下是否可直接编辑对象
     * @param flag
     */
    global.AgImgDrawer.prototype.setEditDirectly = function(flag) {
        flag = flag === true ? true : false;
        this.editDirectly = flag;
        if(this.mode === DRAWER_MODE.edit) {
            if(flag) {
                this.setExistObjectInteractive(true, false);
            }else {
                this.setExistObjectInteractive(false, false);
            }
        }
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
    global.AgImgDrawer.prototype.createRect = function(option) {
        option = _mergeObject({
            width: 100,
            height: 100,
            left: 0,
            top: 0,
            fill: this.drawStyle._fill,
            stroke: this.drawStyle.borderColor,
            strokeWidth: this.drawStyle.borderWidth,
            originStrokeWidth: this.drawStyle.borderWidth
        }, option);
        var rect = new fabric.Rect(option);
        rect.agType = 'ag-rect';
        return rect;
    };

    /**
     * 标签对象，组合了fabric.Rect、fabric.Text和fabric.Group
     * @param text
     * @param left
     * @param top
     */
    global.AgImgDrawer.prototype.createLabel = function(text, left, top) {
        text = text ? text : '';
        var paddingX = 8, paddingY = 4;
        var textObj = new fabric.Text(text.toString(), {
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
        var rectObj = this.createRect({
            width: textObj.width + paddingX * 2,
            height: textObj.height + paddingY * 2,
            originX: 'center',
            originY: 'center',
            fill: this.drawStyle.fontBackColor,
            strokeWidth: 0
        });
        var label = new fabric.Group([rectObj, textObj], {
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
    global.AgImgDrawer.prototype.createRectWithLabel = function(text, option) {
        var self = this;
        var rect = self.createRect(option);
        var label = self.createLabel(text, rect.left, rect.top);
        var showMode;
        switch(option.showLabel) {
            case true: showMode = true; break;
            case false: showMode = false; break;
            default: showMode = 'auto';
        }
        label.hoverCursor = 'auto';
        label.moveCursor = 'auto';
        label.targetObject = rect;
        label.showMode = showMode;
        label.set('visible', showMode !== 'auto' ? showMode : false);
        rect.agType = 'ag-rect';
        rect._labelObject = label;
        return rect;
    };

    /**
     * 高亮显示对象
     * @param objects
     */
    global.AgImgDrawer.prototype.highlightObjects = function(objects) {
        var self = this;
        if(_beforeActiveObjs) {
            self.darkenObjects(_beforeActiveObjs);
        }

        if(objects && objects.length) {
            _beforeActiveObjs = objects;

            var object, type;
            for(var i = 0; i < objects.length; i++) {
                object = objects[i];
                type = object.type;
                if(type === 'activeSelection' || type === 'group') {
                    object.forEachObject(function(obj, index, objs) {
                        self.highlightObjects([obj]);
                    });
                }else {
                    object.set({
                        stroke: self.drawStyle.borderColorH
                    });
                    var labelObj = object._labelObject;
                    if(labelObj) {
                        // 将标签对象加入选择集使其可以被一起拖动
                        if(labelObj.showMode === true) {
                            var activeObject = self.canvas.getActiveObject();
                            activeObject.type === 'activeSelection' && activeObject.add(labelObj);
                        }

                        labelObj.set({
                            left: object.left,
                            top: object.top - labelObj.height,
                        }).setCoords();
                        labelObj.item(0).set({
                            fill: this.drawStyle.fontBackColorH
                        });
                        labelObj.item(1).set({
                            fill: this.drawStyle.fontColorH
                        });
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
    global.AgImgDrawer.prototype.darkenObjects = function(objects) {
        if(objects && objects.length) {
            var self = this;
            var object, type;
            for(var i = 0; i < objects.length; i++) {
                object = objects[i];
                type = object.type;
                if(type === 'activeSelection' || type === 'group') {
                    object.forEachObject(function(obj, index, objs) {
                        self.darkenObjects([obj]);
                    });
                }else {
                    object.set({
                        stroke: self.drawStyle.borderColor
                    });
                    var labelObj = object._labelObject;
                    if(labelObj) {
                        labelObj.item(0).set({
                            fill: this.drawStyle.fontBackColor
                        });
                        labelObj.item(1).set({
                            fill: this.drawStyle.fontColor
                        });
                    }
                }
            }
            self.refresh();
        }
    };

    /**
     * 复制选中的对象（除对象的基本组成属性外，仅会额外地复制带有ag前缀的属性，且不复制object和function类型，数组除外）
     */
    global.AgImgDrawer.prototype.copySelectedObject = function() {
        var source = this.canvas.getActiveObject();
        _clipboard = _copyObject(source, this);
        _clipboard.length && this.option.afterCopy(_clipboard, source);
    };

    /**
     * 粘贴选中的对象
     */
    global.AgImgDrawer.prototype.pasteSelectedObject = function() {
        if(_clipboard.length) {
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
    global.AgImgDrawer.prototype.clearClipboard = function() {
        _clipboard = null;
    };

    //--------------------------------------------------------
    // 内部方法
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
        fabric.Object.prototype.cornerSize = 6;
        fabric.Object.prototype.cornerStyle = 'circle';
        fabric.Object.prototype.cornerColor = '#fff';
        fabric.Object.prototype.cornerStrokeColor = '#888';
        // fabric.Object.prototype.borderColor = '#00CCFF';
        fabric.Object.prototype.hasBorders = false;

        fabric.Object.prototype.setControlVisible('ml', false);
        fabric.Object.prototype.setControlVisible('mb', false);
        fabric.Object.prototype.setControlVisible('mr', false);
        fabric.Object.prototype.setControlVisible('mt', false);
        fabric.Object.prototype.setControlVisible('mtr', false);
    }

    /**
     * 移动对象
     * @private
     * @param item
     * @param offsetX
     * @param offsetY
     */
    function _moveItem(item, offsetX, offsetY) {
        if(!item || item.length === 0 || item.isEditing) {
            return;
        }

        offsetX = parseInt(offsetX);
        offsetY = parseInt(offsetY);

        item.set({
            left: item.left + offsetX,
            top: item.top + offsetY
        }).setCoords();
        _handleAgRectModify(item);
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
     * @param item
     * @param scale - 当前缩放比例
     */
    function _setStrokeWidthByScale(item, scale) {
        if(item.agType === 'ag-label') {
            return;
        }

        if(item.isType('rect') || item.isType('ellipse')) {
            var strokeWidth = _calcSWByScale(item.originStrokeWidth, scale);
            item.set('strokeWidth', strokeWidth).setCoords();
        }else if(item.isType('group')) {
            item.forEachObject(function(obj, index, objs) {
                _setStrokeWidthByScale(obj, scale);
            });
        }
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
    function _calcImgSize(conWidth, conHeight, imgWidth, imgHeight, padding) {
        padding = padding ? padding : 0;

        var tempMin = (conWidth < conHeight) ? conWidth : conHeight;
        tempMin -= padding * 2;
        tempMin = tempMin < 0 ? 50 : tempMin;

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
     * 居中元素
     * @param ele
     * @param width
     * @param height
     * @private
     */
    function _centerElement(ele, width, height) {
        var conParent = ele.parentNode;
        var conPWidth = parseFloat(conParent.clientWidth);
        var conPHeight = parseFloat(conParent.clientHeight);
        var left = (conPWidth - width) / 2 + 'px';
        var top = (conPHeight - height) / 2 + 'px';
        ele.style.marginLeft = left;
        ele.style.marginTop = top;
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
    function _getRGBAColor(hexStr, opacity) {
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
    }

    /**
     * 获取元素中间位置对应的屏幕坐标
     * @param ele
     * @returns {{x: number, y: number}}
     * @private
     */
    function _getEleCenterPoint(ele) {
        var pClientRect = ele.getBoundingClientRect();
        return {
            x: pClientRect.left + pClientRect.width / 2,
            y: pClientRect.top + pClientRect.height / 2,
        };
    }

    function _handleAgRectModify(target) {
        var type = target.type;
        if(type === 'activeSelection' || type === 'group') {
            target.forEachObject(function(obj, index, objs) {
                _handleAgRectModify(obj);
            });
        }else {
            var labelObj = target._labelObject;
            if(labelObj) {
                labelObj.set({
                    left: target.left,
                    top: target.top - labelObj.height,
                }).setCoords();
            }
        }
    }

    function _getCursorStyle(base64) {
        return 'url("' + base64 + '"), auto';
    }

    function _bindEvtForObject(target, _this) {
        // 初始可操作性状态
        _setObjectInteractive(target, null, _this);

        // 绑定事件
        var lObj = target._labelObject;
        target.on('mouseover', function(evt) {
            if(!target.selected) {
                if(lObj && lObj.showMode !== false) {
                    lObj.item(0).set({
                        fill: _this.drawStyle.fontBackColor
                    });
                    lObj.item(1).set({
                        fill: _this.drawStyle.fontColor
                    });
                    lObj.set('visible', true);
                }

                var flag1 = target.isNew;
                var flag2 = _this.editDirectly || evt.e.ctrlKey;
                if(flag1 || flag2) {
                    target.moveCursor = target.hoverCursor = _getCursorStyle(CURSOR.handOpen);
                    _this.refresh();
                }
            }
        });
        target.on('mouseout', function(evt) {
            if(!target.selected) {
                if(lObj && lObj.showMode === 'auto') {
                    lObj.set('visible', false);
                }
                target.moveCursor = target.hoverCursor = 'auto';
                _this.refresh();
            }
        });
        target.on('selected', function(evt) {
            if(lObj) {
                lObj.item(0).set({
                    fill: _this.drawStyle.fontBackColorH
                });
                lObj.item(1).set({
                    fill: _this.drawStyle.fontColorH
                });
                lObj.set('visible', lObj.showMode === 'auto' ? true : lObj.showMode);
            }
            target.selected = true;
            target.moveCursor = target.hoverCursor = _getCursorStyle(CURSOR.handHold);
            _this.highlightObjects([target]);
        });
        target.on('deselected', function(evt) {
            if(lObj) {
                lObj.set('visible', lObj.showMode === 'auto' ? false : lObj.showMode);
            }
            if(_this.mode === DRAWER_MODE.draw) {
                if(!target.isNew) {
                    target.selectable = false;
                    target.evented = false;
                }
            }else {
                if(!_this.editDirectly) {
                    target.selectable = false;
                    target.evented = false;
                }
            }
            target.selected = false;
            _this.darkenObjects([target]);
        });
        target.on('removed', function(evt) {
            lObj && _this.canvas.remove(lObj);
        });
    }

    function _setObjectInteractive(target, flag, _this) {
        var selectable, evented;
        if(flag) {
            selectable = evented = true;
        }else {
            if(_this.mode === DRAWER_MODE.draw) {
                selectable = evented = target.isNew ? true : false;
            }else if(_this.mode === DRAWER_MODE.edit) {
                selectable = evented =_this.editDirectly;
            }
        }
        target.set({
            selectable: selectable,
            evented: evented
        });
    }

    function _copyObject(target, _this) {
        var copys = [];
        if(target) {
            if(target.type === 'activeSelection') {
                target.forEachObject(function(obj, index, objs) {
                    if(obj.agType !== 'ag-label') {
                        copys.push(_copyWithLabelObject(obj, obj.left + 15, obj.top + 15, true, _this));
                    }
                });
            }else if(target instanceof Array) {
                var tmp;
                for(var i = 0, len = target.length; i < len; i++) {
                    tmp = target[i];
                    tmp.clone(function(obj) {
                        _copyFlatAgProps(tmp, obj);

                        tmp._labelObject && (obj._labelObject = tmp._labelObject);
                        if(tmp._copyFromSelection) {
                            copys.push(_copyWithLabelObject(obj, obj.left + 15, obj.top + 15, true, _this));
                        }else {
                            copys.push(_copyWithLabelObject(obj, obj.left + 15, obj.top + 15, false, _this));
                        }
                    });
                }
            }else {
                copys.push(_copyWithLabelObject(target, target.left + 15, target.top + 15, false, _this));
            }
        }
        return copys;
    }

    function _copyWithLabelObject(target, tarLeft, tarTop, fromSelection, _this) {
        var copy = null, tarLableObj = target._labelObject;
        if(tarLableObj) {
            tarLableObj.clone(function(copyLabelObj) {
                tarLableObj.showMode && (copyLabelObj.showMode = tarLableObj.showMode);
                target.clone(function(obj) {
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
        }else {
            target.clone(function(obj) {
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
        if((typeof from) !== 'object' || (typeof to) !== 'object') return;
        var tmpVal;
        for(var key in from) {
            tmpVal = from[key];
            if(key.startsWith('ag') && (typeof tmpVal !== 'object' || tmpVal instanceof Array) && typeof tmpVal !== 'function') {
                to[key] = tmpVal;
            }
        }
    }

    function _setCopyObjectPosition() {
        if(_clipboard instanceof Array) {
            var mX = _mousePosition.move.x;
            var mY = _mousePosition.move.y;
            var tmp, tmpLabel;
            for(var i = 0, len = _clipboard.length; i < len; i++) {
                tmp = _clipboard[i];
                tmpLabel = tmp._labelObject;
                if(tmpLabel) {
                    tmpLabel.set({
                        left: mX,
                        top: mY - tmpLabel.height
                    });
                    tmp.set({
                        left: mX,
                        top: mY
                    });
                }else {
                    tmp.set({
                        left: mX,
                        top: mY
                    });
                }
            }
        }
    }
})(window);
