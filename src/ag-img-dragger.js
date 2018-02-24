/**
 * 图片拖动模块（按住空格和鼠标左键拖动画布）
 * Created by aegean on 2017/5/22 0006.
 */

;(function(global) {
    global.AgImgDragger = {
        init: function(eleId) {
            var dragEle = document.getElementById(eleId);
            if(dragEle.dataset.draggable) {
                return;
            }

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
                    if(dragEle.dataset.drawable === 'false') {
                        dragEle.style.cursor = 'move';
                    }

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

            // 鼠标移动
            dragEle.addEventListener('mousemove', function(evt) {
                if((dragEle.dataset.drawable === 'false' || spaceKey) && hit) {
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
            dragEle.addEventListener('mouseup', function(evt) {
                if(evt.which === 1) {
                    hit = false;
                    dragEle.classList.add('ag-smooth');
                    if(dragEle.dataset.drawable === 'false') {
                        dragEle.style.cursor = 'auto';
                    }
                }
            });

            // 键盘摁下
            document.body.addEventListener('keydown', function(evt) {
                if(evt.which === 32 && evt.target.localName !== 'input') {// 空格键
                    evt.preventDefault();
                    dragEle.style.cursor = 'move';
                    spaceKey = true;
                }
            });

            // 键盘弹起
            document.body.addEventListener('keyup', function(evt) {
                if(evt.which === 32) {
                    dragEle.style.cursor = 'auto';
                    spaceKey = false;
                }
            });

            // 记录初始化状态
            dragEle.dataset.draggable = true;
        }
    };
})(window);