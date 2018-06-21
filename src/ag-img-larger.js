/**
 * 图片放大模块
 * Created by aegean on 2017/5/22 0022.
 */

;(function(global) {
    //缩放参数：为便于计算，这里的放大比例乘以10，实际执行放大操作时再除以10
    var SCALE_TOLERANT = 240;
    var SCALE_STEP = 2;
    var SCALE_MIN = 2;
    var SCALE_MAX = 60;

    global.AgImgLarger = {
        init: function(eleId, afterWheel) {
            var ele = document.getElementById(eleId);
            if(ele.dataset.enlargable) {
                return;
            }

            // 设置初始参数
            ele.classList.add('ag-smooth');
            ele.dataset.enlargable = true;
            ele.dataset.originWidth = ele.clientWidth;
            ele.dataset.originHeight = ele.clientHeight;
            ele.dataset.width = ele.clientWidth;
            ele.dataset.height = ele.clientHeight;
            ele.dataset.scale = 10;
            ele.dataset.scaleStep = 2;
            ele.dataset.timestamp = new Date().getTime();

            _registeWheelEvt(ele, afterWheel);
            ele.dataset.enlargable = true;
        },
        zoomIn: function(eleId, pointer, callback) {
            var ele = document.getElementById(eleId);
            if(ele.dataset.enlargable) {
                var scale = parseInt(ele.dataset.scale);
                var scaleStep = _calcScaleStep(scale, SCALE_STEP);
                ele.dataset.scaleStep = scaleStep;

                if(scale + scaleStep > SCALE_MAX) {
                    return;
                }
                scale += scaleStep;
                _zoomElement(pointer, ele, scale, callback);
            }
        },
        zoomOut: function(eleId, pointer, callback) {
            var ele = document.getElementById(eleId);
            if(ele.dataset.enlargable) {
                var scale = parseInt(ele.dataset.scale);
                var scaleStep = _calcScaleStep(scale, SCALE_STEP);
                ele.dataset.scaleStep = scaleStep;

                if(scale - scaleStep < SCALE_MIN) {
                    return;
                }
                scale -= scaleStep;
                _zoomElement(pointer, ele, scale, callback);
            }
        },
        zoom: function(eleId, scale, pointer, callback) {
            scale = Math.round((isNaN(scale) ? 1 : scale) * 10);
            scale = (scale % 2 === 0) ? scale : scale + 1;

            if(scale < SCALE_MIN) {
                console.info('The zoom value is not in a reasonable range.');
                scale = SCALE_MIN;
            }else if(scale > SCALE_MAX) {
                console.info('The zoom value is not in a reasonable range.');
                scale = SCALE_MAX;
            }

            var ele = document.getElementById(eleId);
            var scaleStep = _calcScaleStep(scale, SCALE_STEP);
            ele.dataset.scaleStep = scaleStep;
            _zoomElement(pointer, ele, scale, callback);
        },
        reset: function(eleId, newOriginW, newOriginH) {
            var ele = document.getElementById(eleId);
            ele.dataset.originWidth = newOriginW;
            ele.dataset.originHeight = newOriginH;
            ele.dataset.width = newOriginW;
            ele.dataset.height = newOriginH;
            ele.dataset.scale = 10;
            ele.dataset.scaleStep = 2;
        }
    };

    /**
     * 注册滚轮事件
     * @param ele
     * @param callback
     * @private
     */
    function _registeWheelEvt(ele, callback) {
        ele.addEventListener('mousewheel', function(evt) {
            var delta = evt.wheelDelta && (evt.wheelDelta > 0 ? 1 : -1);
            _wheelHandler(evt, ele, delta, callback);
        });
        ele.addEventListener('DOMMouseScroll', function(evt) {
            var delta = evt.detail && (evt.detail > 0 ? -1 : 1);
            _wheelHandler(evt, ele, delta, callback);
        });
    }

    /**
     * 滚轮事件处理函数
     * @param evt
     * @param ele
     * @param delta
     * @param callback
     * @private
     */
    function _wheelHandler(evt, ele, delta, callback) {
        // 对连续滚轮缩放做检测
        if(new Date().getTime() - parseInt(ele.dataset.timestamp) < SCALE_TOLERANT) {
            // console.info('操作过于频繁');
            return;
        }

        var scale = parseInt(ele.dataset.scale);
        _scaleStep = _calcScaleStep(scale, SCALE_STEP);
        ele.dataset.timestamp = new Date().getTime();
        if(delta > 0) {
            if(scale + _scaleStep > SCALE_MAX) {
                return;
            }
            scale += _scaleStep;
        }else if(delta < 0) {
            if(scale - _scaleStep < SCALE_MIN) {
                return;
            }
            scale -= _scaleStep;
        }

        var pointer = {
            x: evt.pageX,
            y: evt.pageY
        };
        _zoomElement(pointer, ele, scale, callback);
    }

    /**
     * 缩放元素(以鼠标所在位置为缩放中心)
     * @param pointer
     * @param ele
     * @param scale
     * @param callback
     * @private
     */
    function _zoomElement(pointer, ele, scale, callback) {
        var oldML = parseFloat(ele.style.marginLeft);
        var oldMT = parseFloat(ele.style.marginTop);
        var oldW = parseFloat(ele.dataset.width);
        var oldH = parseFloat(ele.dataset.height);
        var newW = parseFloat(ele.dataset.originWidth) * scale / 10;
        var newH = parseFloat(ele.dataset.originHeight) * scale / 10;

        var newML, newMT;
        if(pointer) {
            var pBoundRect = ele.parentNode.getBoundingClientRect();
            var relaMX = pointer.x - pBoundRect.left;
            var relaMY = pointer.y - pBoundRect.top;
            var zoomRationX = (relaMX - oldML) / oldW;
            var zoomRationY = (relaMY - oldMT) / oldH;
            newML = oldML - zoomRationX * (newW - oldW);
            newMT = oldMT - zoomRationY * (newH - oldH);
        }else {
            newML = oldML - (newW - oldW) / 2;
            newMT = oldMT - (newH - oldH) / 2;
        }

        ele.dataset.scale = scale;
        ele.dataset.width = newW;
        ele.dataset.height = newH;
        ele.style.width = newW + 'px';
        ele.style.height = newH + 'px';
        ele.style.marginLeft = newML+ 'px';
        ele.style.marginTop = newMT + 'px';

        if(callback instanceof Function) {
            callback(newW, newH, scale / 10);
        }
    }

    /**
     * 根据缩放等级计算合适的缩放增量
     * @param scale
     * @private
     */
    function _calcScaleStep(scale, normalStep) {
        if(scale > 15) {
            normalStep = 6;
        }else {
            normalStep = 2;
        }

        return normalStep;
    }
})(window);
