/**
 * 图片编辑
 * Created by aegean on 2017/5/27 0027.
 */

var drawer;
var zTreeObj;

$().ready(function() {
    zTreeObj = initObjectTree('objTree');

    drawer = new AgImgDrawer('myDrawer', {
        autoAdjustment: true,
        backgroundUrl: 'img_1.jpg',
        loadingMask: false,
        afterInitialize: function() {
            // console.info('初始化完成', drawer.originWidth, drawer.originHeight);
            // drawTest();
            drawRects();
            drawer.setMode('draw');
            drawer.setSelectable(false);
        },
        afterAdd: function(object) {
            // console.info('添加', object);
            addNodeByObject(object);
        },
        afterDraw: function(object) {
            // console.info('绘制', object);
            drawer.setActiveObject(object);
        },
        beforeDelete: function (objects) {
            console.info(objects);
            // return false;
        },
        afterDelete: function(objects) {
            deleteNodeByObjects(objects);
        },
        afterClear: function(objects) {
            deleteNodeByObjects(objects);
        },
        afterSelect: function(objects) {
            console.info('选中', objects);
        }
    });
    // drawer.drawType = 'Ellipse';
});

function zoomIn() {
    AgImgLarger.zoomIn('myDrawer', function(newWidth, newHeight, scale) {
        drawer.setSize(newWidth, newHeight, scale);
    });
}
function zoomOut() {
    AgImgLarger.zoomOut('myDrawer', function(newWidth, newHeight, scale) {
        drawer.setSize(newWidth, newHeight, scale);
    });
}
function changeBackground() {
    drawer.setBackgroundImageWithUpdateSize('img_2.jpg');
}
function changeBackground2() {
    drawer.setBackgroundImageWithUpdateSize('img_1.jpg');
}
function changeBackground3() {
    drawer.setBackgroundImageWithUpdateSize('img_2.jpg');
}

//初始化滑动开关
$('.switcher-wrapper').find('input[type=checkbox]').rcSwitcher({
    theme: 'dark',          //滑动开关按钮的主题：'flat, light, dark, modern'
    width: 55,
    height: 20,
    blobOffset: 0,
    reverse: true,
    inputs: false,
    autoFontSize: true,
    autoStick: false
}).on({
    'turnon.rcSwitcher': function(e, dataObj){
        $('#' + dataObj.$input.data('target')).removeClass('hidden');
    },
    'turnoff.rcSwitcher': function(e, dataObj){
        $('#' + dataObj.$input.data('target')).addClass('hidden');
    }
});
$('#fixObjectLayer').rcSwitcher({
    theme: 'dark',
    width: 55,
    height: 20,
    blobOffset: 0,
    reverse: true,
    inputs: false,
    autoFontSize: true,
    autoStick: false
}).on({
    'turnon.rcSwitcher': function(e, dataObj){
        drawer.setCanvasOptions({
            preserveObjectStacking: true   //物体选中时保持原有层级关系
        });
    },
    'turnoff.rcSwitcher': function(e, dataObj){
        drawer.setCanvasOptions({
            preserveObjectStacking: false
        });
    }
});

//按钮组
$('.btn-group').find('.side-btn').click(function() {
    if(!$(this).hasClass('active')) {
        $(this).addClass('active');
        $(this).siblings().removeClass('active');
    }
});

//字体
$('.font-oitem').click(function() {
    if($(this).hasClass('active')) {
        $(this).removeClass('active');
    }else {
        $(this).addClass('active');
    }
});

//样式设置
var settingItems = $('.setting-item');
settingItems.each(function() {
    if($(this).hasClass('input') || $(this).hasClass('color-box')) {//文本框
        $(this).change(function() {
            if($(this).attr('type') === 'color') {
                var opts = {};
                opts[$(this).data('target')] = $(this).val();
                drawer.setDrawStyle(opts);
            }else if($(this).attr('type') === 'text') {
                var val = parseInt($(this).val());
                if(val === NaN) {
                    return;
                }
                var opts = {};
                opts[$(this).data('target')] = val;
                drawer.setDrawStyle(opts);
            }
        });
    }else if($(this).hasClass('range')) {//范围框
        $(this).change(function() {
            var opts = {};
            opts[$(this).data('target')] = parseInt($(this).val()) / 10.0;
            drawer.setDrawStyle(opts);
        });
    }else if($(this).hasClass('select')) {//下拉框
        $(this).change(function() {
            var opts = {};
            opts[$(this).data('target')] = $(this).val();
            drawer.setDrawStyle(opts);
        });
    }else {//普通
        $(this).click(function() {
            var opts = {};
            var tar = $(this).data('target');
            if($(this).hasClass('active')) {
                opts[tar] = $(this).data('onValue');
            }else {
                opts[tar] = $(this).data('offValue');
            }
            drawer.setDrawStyle(opts);
        });
    }
});

/*基本操作*/
function switchDrawMode(mode) {
    drawer.setMode(mode);
}
function drawRect() {
    drawer.drawType = 'Rect';
}
function drawEclipse() {
    drawer.drawType = 'Ellipse';
}
function drawLabel() {
    drawer.drawType = 'Text';
}
function deleteDraw() {
    //drawer.deleteSelection();
    drawer.remove(groupObjectMap['groupObj1']);
}
function cancleSele() {
    drawer.cancelSelection();
}
function clearDraw() {
    drawer.clear();
}

/*预览导出*/
function previewCanvas() {
    var dataURL = drawer.getDataURL();
    $('#preview').removeClass('hide');
    $('#preview').find('img').attr('src', dataURL);
}
function exportCanvas() {
    var dataURL = drawer.getDataURL({
        quality: 1
    });
    console.info(dataURL);
}
$('.preview-close').click(function() {
    $(this).parent().addClass('hide');
});

/*操作提示*/
$('#tips').click(function() {
    layer.open({
        type: 1,
        title: '操作提示',
        closeBtn: 2,
        shade: 0.4,
        skin: 'layui-layer-rim', //加上边框
        area: ['360px', '170px'], //宽高
        content: '<div style="padding: 15px; color: #007d86; font-size: 14px; line-height: 30px;"><p>1.在任何状态下按住空格键和鼠标左键可拖动图片</p><p>2.在任何状态下滚动鼠标滚轮缩放图片</p><p>3.在编辑和绘制状态下按住shift键框选对象或点击多选</p></div>'
    });
});

/**
 * 序列化对象
 */
function serializeObjects() {
    console.info(drawer.serializeObjects());
}

/**
 * 绘制矩形
 */
var groupCounter = 0;
var groupObjectMap = {};
function drawRects() {
    //按组聚合矩形框和标签
    var group, rect, label;
    for(var i = 0; i < 5; i++) {
        var left = 120 * (i + 1);
        var top = 40 * (i + 1);

        var w = randomFrom(15, 50);
        var h = randomFrom(15, 50);
        var style = getLabelStyle(w, h);
        rect = createRect(w, h, 0, 0);
        label = crateLabel(i + 1, style.left, style.top, style.fontSize);
        group = new fabric.Group([rect, label], {
            left: left,
            top: top
        });
        group.index = ++groupCounter;
        drawer.getFabricCanvas().add(group);

        groupObjectMap['groupObj' + groupCounter] = group;
    }

    //console.info(groupObjectMap);
}

/**
 * 测试
 * 注：如果group中只有一个对象。则设置left/top无效，如果大于两个，left、top将相对于group的左上角位置起作用
 * 如果group内的所有对象的left、top都为0那么他们将按照添加进该group的顺序叠加
 * 如果某一对象的left（top）加width（height）大于group的宽（如果设置了的话），那么group将被撑开
 */
var tstGroup, tstLabel, tstRect;
function drawTest() {
    var rectRealPos = [200, 200];

    tstLabel = new fabric.Text('想要问问', {
        fontSize: 15,
        left: 0,
        top: 0
    });
    // 将rect放置于200、200位置
    tstRect = new fabric.Circle({
        radius: 50,
        fill: 'red',
        left: tstLabel.width,
        top: 0
    });

    tstGroup = new fabric.Group([tstRect, tstLabel], {
        left: rectRealPos[0] - tstLabel.width,
        top: rectRealPos[1],
        /*width: 100,
        height: 100,*/
        backgroundColor: '#00a6d2'
    });

    drawer.getFabricCanvas().add(tstGroup);
}

/**
 * 根据矩形框大小获取标签左上边距，标签字体大小
 * @param w
 * @param h
 * @return {Object}
 */
function getLabelStyle(w, h) {
    var style = {};

    //计算左边距
    if(w < 5) {
        style.left = -8;
    }else if(w >= 5 && w < 10) {
        style.left = -8;
    }else if(w >= 10 && w < 15) {
        style.left = 1;
    }else if(w >= 15 && w < 20) {
        style.left = 3;
    }else if(w >= 20 && w < 30) {
        style.left = 4;
    }else if(w >= 30) {
        style.left = 6;
    }

    //计算上边距
    if(h < 5) {
        style.top = 9;
    }else if(h >= 5 && h < 10) {
        style.top = 9;
    }else if(h >= 10 && h < 15) {
        style.top = 0;
    }else if(h >= 15 && h < 20) {
        style.top = 2;
    }else if(h >= 20 && h < 30) {
        style.top = 4;
    }else if(h >= 30) {
        style.top = 6;
    }

    //计算字体大小
    var min = (w < h) ? w : h;
    if(min < 5) {
        style.fontSize = 0.1;
    }else if(min >= 5 && min < 10) {
        style.fontSize = 1;
    }else if(min >= 10 && min < 20) {
        style.fontSize = 12;
    }else if(min >= 20 && min < 30) {
        style.fontSize = 14;
    }else if(min >= 30) {
        style.fontSize = 18;
    }

    return style;
}

function light() {
    highlightGroupObject(groupObjectMap['groupObj4']);
}
function dark() {
    darkenGroupObject(groupObjectMap['groupObj4']);
}
function locate() {
    drawer.locate(groupObjectMap['groupObj' + 3]);
}
function refresh() {
    drawer.refresh();
}

//绘制样式
var DrawStyle = {
    fill: 'rgba(0, 0, 0, 0.2)',
    borderColor: '#fff',
    borderHColor: '#ff461f',    //高亮样式
    borderWidth: 2,
    fontFamily: 'Microsoft YaHei',
    fontSize: 16,
    fontColor: '#fff',
    fontHColor: '#ff461f',      //高亮样式
    fontWeight: 'normal',
    fontStyle: 'normal',
    strokeColor: '#fff',
    strokeWidth: 0
};

/**
 * 创建矩形要素
 * @param width
 * @param height
 * @param left
 * @param top
 * @return {*}
 */
function createRect(width, height, left, top) {
    return new fabric.Rect({
        width: width,
        height: height,
        left: left,
        top: top,
        fill: DrawStyle.fill,
        stroke: DrawStyle.borderColor,
        strokeWidth: DrawStyle.borderWidth  //(Math.random() > 0.5) ? 3 : 1
    });
}

/**
 * 创建标签
 * @param label
 */
function crateLabel(label, left, top, fontSize) {
    return new fabric.IText(label.toString(), {
        left: left,
        top: top,
        fontFamily: DrawStyle.fontFamily,
        fontSize: fontSize,//DrawStyle.fontSize,
        fill: DrawStyle.fontColor,
        fontWeight: DrawStyle.fontWeight,
        fontStyle: DrawStyle.fontStyle,
        stroke: DrawStyle.strokeColor,
        strokeWidth: DrawStyle.strokeWidth,
        charSpacing: 1,
        editingBorderColor: '#0099FF',
        selectionColor: 'rgba(255, 204, 0, 0.5)'
    });
}

/**
 * 高亮显示组对象
 */
function highlightGroupObject(group) {
    var objects = group.getObjects();
    for(var i = 0; i < objects.length; i++) {
        if(objects[i].type === 'rect' || objects[i].type === 'ellipse') {
            objects[i].set('stroke', DrawStyle.borderHColor);
        }
        if(objects[i].type === 'i-text') {
            objects[i].set('fill', DrawStyle.fontHColor);
        }
    }
    group.moveTo(groupCounter);
    drawer.refresh();
}

/**
 * 取消高亮显示组对象
 */
function darkenGroupObject(group) {
    var objects = group.getObjects();
    for(var i = 0; i < objects.length; i++) {
        if(objects[i].type === 'rect' || objects[i].type === 'ellipse') {
            objects[i].set('stroke', DrawStyle.borderColor);
        }
        if(objects[i].type === 'i-text') {
            objects[i].set('fill', DrawStyle.fontColor);
        }
    }
    group.moveTo(group.index - 1);
    drawer.refresh();
}

function randomFrom(lowerValue,upperValue) {
    return Math.floor(Math.random() * (upperValue - lowerValue + 1) + lowerValue);
}