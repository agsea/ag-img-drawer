/**
 * 图片编辑
 * Created by aegean on 2017/5/27 0027.
 */

var drawer;
var newDrawRect;
var zTreeObj;

$().ready(function() {
    zTreeObj = initObjectTree('objTree');

    drawer = new AgImgDrawer('myDrawer', {
        backgroundUrl: 'images/big_img2.jpeg',
        autoAdjustment: true,
        // loadingMask: false,
        lockBoundary: true,
        // padding: 50,
        // showAssistLine: 0,
        afterInitialize: function() {
            drawer.setMode('draw');
            drawer.setEditDirectly(true);
            drawRects();
            drawPolygons();
            // drawTest();

            drawer.drawType = 'Polygon';
        },
        afterAdd: function(object) {
            // console.info('添加', object);
            addNodeByObject(object);
        },
        afterDraw: function(object) {
            // console.info('绘制', object);
            // 仅保留一个矩形框
            // if(newDrawRect) {
            //     drawer.removeObject(newDrawRect);
            // }
            newDrawRect = object;
            drawer.setActiveObject(object);
        },
        afterModify(object, isSingle) {
            console.info('修改', object, isSingle);
        },
        afterEnter(object, isSingle, isModified) {
            // console.info('回车', object, isSingle, isModified);
        },
        beforeDelete: function (objects, ctrlKey) {
            // console.info('删除前', ctrlKey, objects);
            // return false;
        },
        afterDelete: function(objects, ctrlKey) {
            console.info('删除', objects);
            deleteNodeByObjects(objects);
        },
        afterClear: function(objects) {
            deleteNodeByObjects(objects);
        },
        afterSelect: function(objects) {
            // console.info('选中', objects);
        },
        afterObjectDeSelect: function(object) {
            // console.info('单个物体取消选中', object);
        },
        afterCopy: function(objects, source) {
            // console.info('复制', objects);
        },
        afterPaste: function(objects) {
            // console.info('粘贴', objects[0].agTestProp);
        },
        afterKeydownLeft: function() {
            // console.info('向左走');
        },
        afterKeydownRight: function() {
            // console.info('向右走');
        },
        afterKeydownEsc: function () {
            // console.info('esc');
        },
        afterZoom: function () {
            // console.info('zoom');
        }
    });
    // drawer.drawType = 'Ellipse';
});

function createLabelPopu(text) {
    var div = document.createElement('div');
    var input = document.createElement('input');
    input.value = text;
    div.classList.add('popup-label');
    div.appendChild(input);
    return div;
}

function createPopu(text) {
    var div = document.createElement('div');
    var textarea = document.createElement('textarea');
    div.appendChild(textarea);
    textarea.value = text;
    return div;
}

function toggleSide(ele) {
    var $this = $(ele);
    var $main =$('.drawer-main');
    var $side =$('.drawer-side');
    if($this.hasClass('fold')) {
        $this.removeClass('fold');
        $main.removeClass('active');
        $side.addClass('active');
    }else {
        $this.addClass('fold');
        $main.addClass('active');
        $side.removeClass('active');
    }
}

function zoomIn() {
    drawer.zoomIn();
}
function zoomOut() {
    drawer.zoomOut();
}
function changeBackground() {
    drawer.setBackgroundImage('images/img_1.jpg', null, false);
}
function changeBackground2() {
    drawer.setBackgroundImageWithUpdateSize('images/img_2.jpg');
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
function drawGeometry() {
    drawer.drawType = 'Polygon';
}
var groupIndex = 0;
function deleteDraw() {
    //drawer.deleteSelection();
    console.info(groupIndex);
    drawer.removeObject(groupObjectMap['groupObj' + (groupIndex++)]);
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
    // console.info(dataURL);
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
        content: $('#shortcutDescr')
    });
});

/**
 * 序列化对象
 */
function serializeObjects() {
    console.info(drawer.serializeAllObject());
}

/**
 * 绘制矩形
 */
var groupCounter = 0;
var groupObjectMap = {};
function drawRects() {
    for(var i = 0; i < 2; i++) {
        groupCounter++;
        var agRect = drawer.createRect({
            width: 150, //randomFrom(10, 300),
            height: 100,
            left: 160 * i,
            top: 120 * i + 50,
            // showLabel: true
        });
        agRect.set('agTestProp', 666);
        drawer.addObject(agRect);
        drawer.createOverlay({
            ele: createLabelPopu('这是一个位于上面悬浮框-' + i),
            target: agRect,
            position: 'top',
            visible: true
        });
        drawer.createOverlay({
            ele: createPopu('这是一个位于下面悬浮框-' + i),
            target: agRect,
            position: 'bottom',
            visible: 'auto'
        });
        groupObjectMap['groupObj' + i] = agRect;

        // var agRect2 = drawer.createRect({
        //     width: 400,
        //     height: 10,
        //     left: 200,
        //     top: 150 + 50,
        //     // showLabel: true
        // });
        // agRect.set('agTestProp', 666);
        // drawer.addObject(agRect2);
        // groupObjectMap['groupObj' + 2] = agRect2;
    }
}

function drawPolygons() {
    var wkt1 = 'MULTIPOLYGON(((3136.51 1044.40,2763.60 2322.97,3489.46 2862.38,4468.37 2975.58,4861.27 1916.76,4448.39 1337.40,3136.51 1044.40)))';
    var wkt2 = 'MULTIPOLYGON(((1752.38 2206.35,1479.37 3019.05,2393.65 3330.16,2780.95 2326.98,1752.38 2206.35)),((3733.33 2384.13,3384.13 3165.08,4895.24 2676.19,3733.33 2384.13)))';
    var wkt3 = 'MULTIPOLYGON(((2628.57 1628.57,2298.41 2980.95,4038.10 3285.71,5047.62 2904.76,5085.71 1812.70,4768.25 555.56,3822.22 504.76,3104.76 555.56,2628.57 1628.57)))';
    var wkt4 = 'MULTIPOLYGON(((537.49 2622.20,321.32 3037.00,712.76 3060.37,852.97 2815.00,882.18 2610.52,537.49 2622.20)),((1536.51 2949.37,1191.82 3393.38,1939.63 3416.75,2056.48 3037.00,1536.51 2949.37)))';
    var multiPolygonObj = drawer.parsePolygon(wkt4);
    drawer.addObject(multiPolygonObj);
    drawer.createOverlay({
        ele: createLabelPopu('这是一个位于上面悬浮框-多边形'),
        target: multiPolygonObj,
        position: 'top',
        visible: true
    });
    drawer.createOverlay({
        ele: createPopu('这是一个位于下面悬浮框-多边形'),
        target: multiPolygonObj,
        position: 'bottom',
        visible: 'auto'
    });

    groupObjectMap['groupObj2'] = multiPolygonObj;
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

function light() {
    highlightGroupObject(groupObjectMap['groupObj1']);
}
function dark() {
    darkenGroupObject(groupObjectMap['groupObj1']);
}
var locateIndex = 0, locateIndexBefore;
function locate() {
    locateIndex = locateIndex > 2 ? 0 : locateIndex;

    drawer.locate(groupObjectMap['groupObj' + locateIndex]);

    locateIndexBefore = locateIndex;
    locateIndex += 1;
}
function refresh() {
    drawer.refresh();
}
var ifObjVisible = true;
function setObjVisible() {
    ifObjVisible = !ifObjVisible;
    drawer.setObjectVisible(groupObjectMap['groupObj2'], ifObjVisible);
}
var ifObjInteractive = true;
function setObjInteractive() {
    ifObjInteractive = !ifObjInteractive;
    drawer.setObjectInteractive(groupObjectMap['groupObj1'], ifObjInteractive);
}

/**
 * 高亮显示组对象
 */
function highlightGroupObject(obj) {
    drawer.highlightObjects([obj]);
}
/**
 * 取消高亮显示组对象
 */
function darkenGroupObject(obj) {
    drawer.darkenObjects([obj]);
}

function randomFrom(lowerValue,upperValue) {
    return Math.floor(Math.random() * (upperValue - lowerValue + 1) + lowerValue);
}
