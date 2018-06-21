/**
 * 图片拖动模块（按住空格和鼠标左键拖动画布）
 * Created by aegean on 2017/5/22 0006.
 */

;(function(global) {
    global.AgImgDragger = {
        init: function(eleId) {
            var dragEle = document.getElementById(eleId);
            if(dragEle.initializeDrag) return;

            var container = dragEle.parentNode;

            // 拖拽参数
            var hit = false, spaceKey = false;
            var conMarginL, conMarginT;
            var mouseOffsetX, mouseOffsetY;

            /* 注册事件 */
            // 鼠标摁下
            dragEle.addEventListener('mousedown', function(evt) {
                if(evt.which === 1) {
                    hit = true;
                    dragEle.classList.remove('ag-smooth');

                    //当前鼠标位置
                    var mouseX = evt.clientX || evt.pageX || evt.screenX;
                    var mouseY = evt.clientY || evt.pageY || evt.screenY;
                    //被拖动元素的左上边距
                    var dragEleMarginL = parseFloat(dragEle.style.marginLeft);
                    var dragEleMarginT = parseFloat(dragEle.style.marginTop);
                    dragEleMarginL = isNaN(dragEleMarginL) ? 0 : dragEleMarginL;
                    dragEleMarginT = isNaN(dragEleMarginT) ? 0 : dragEleMarginT;

                    //被拖动元素所在容器的左上边距
                    conMarginL = parseFloat(container.style.marginLeft);
                    conMarginT = parseFloat(container.style.marginTop);
                    conMarginL = isNaN(conMarginL) ? 0 : conMarginL;
                    conMarginT = isNaN(conMarginT) ? 0 : conMarginT;
                    //鼠标相对图片左上角的位置
                    mouseOffsetX = mouseX - conMarginL - dragEleMarginL;
                    mouseOffsetY = mouseY - conMarginT - dragEleMarginT;
                }
            });

            // 鼠标移动(为优化体验，将鼠标移动事件注册至全局)
            window.addEventListener('mousemove', function(evt) {
                if((dragEle.dataset.dragDirectly === 'true' || spaceKey) && hit) {
                    //当前鼠标位置
                    var mouseX = evt.clientX || evt.pageX || evt.screenX;
                    var mouseY = evt.clientY || evt.pageY || evt.screenY;

                    //图片新的位置
                    var tarMarginL = mouseX - conMarginL - mouseOffsetX;
                    var tarMarginT = mouseY - conMarginT - mouseOffsetY;
                    dragEle.style.marginLeft = tarMarginL + 'px';
                    dragEle.style.marginTop = tarMarginT + 'px';
                }
            });

            // 鼠标弹起
            window.addEventListener('mouseup', function(evt) {
                if(evt.which === 1) {
                    hit = false;
                    dragEle.classList.add('ag-smooth');
                }
            });

            // 键盘摁下
            window.addEventListener('keydown', function(evt) {
                if(evt.which === 32 && evt.target.localName !== 'input') {// 空格键
                    evt.preventDefault();
                    spaceKey = true;
                    if(dragEle.dataset.dragDirectly === 'false') {
                        var maskEle = dragEle.querySelector('.aDrawer-mask');
                        maskEle.style.display = 'block';
                    }
                }
            });

            // 键盘弹起
            window.addEventListener('keyup', function(evt) {
                if(evt.which === 32) {
                    evt.preventDefault();
                    spaceKey = false;
                    if(dragEle.dataset.dragDirectly === 'false') {
                        var maskEle = dragEle.querySelector('.aDrawer-mask');
                        maskEle.style.display = 'none';
                    }
                }
            });

            // 记录初始化状态
            dragEle.initializeDrag = true;
        }
    };
})(window);
