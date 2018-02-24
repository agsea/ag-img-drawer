/**
 * 对象树
 * Created by aegean on 2017/12/20.
 */

//对象集合
var objCollection = fabric.Collection;
var zNodes = [];
var objCount = 0;

var objTreeCallback = {
    //节点单击之前的回调
    beforeClickHandler: function(treeId, treeNode, clickFlag) {
        //清除之前的选中样式
        var beforeNode = zTreeObj.getSelectedNodes()[0];
        if(beforeNode) {
            setObjectLightByNode(beforeNode, false);
        }
    },
    //节点单击回调
    clickHandler: function(evt, treeId, treeNode, clickFlag) {
        setObjectLightByNode(treeNode, clickFlag !== 0);
        drawer.refresh();
    },
    //节点重命名回调
    renameHandler: function(evt, treeId, treeNode, isCancel) {
        var object = objCollection.item(treeNode.objectIndex);
        object.set('name', treeNode.name);
        console.info(object);
    },
    //节点删除回调
    removeHandler: function(evt, treeId, treeNode) {
        deleteObjectByNode(treeNode);
    },
    //拖拽开始回调
    dragStartHandler: function(evt, treeId, treeNodes) {
        console.info('拖拽开始', treeNodes);
    },
    //拖拽结束回调
    dragEndHandler: function(evt, treeId, treeNodes, targetNode, moveType, isCopy) {
        //完成了有效拖拽之后更新对象层级
        if(targetNode) {
            console.info('拖拽结束', treeNodes, targetNode, moveType);
            updateObjectIndex();
        }
    }

    //TODO:节点的选中事件与取消选中事件
};

/**
 * 初始化对象树
 * @param eleId
 */
function initObjectTree(eleId) {
    var setting = {
        view: {
            // addHoverDom: addHoverDom,
            // removeHoverDom: removeHoverDom,
            selectedMulti: false,
            showTitle: false,
            showLine: false
        },
        edit: {
            enable: true,
            showRenameBtn: true,
            showRemoveBtn: true,
            renameTitle: '重命名',
            removeTitle: '移除'
        },
        data: {
            simpleData: {
                enable: true
            }
        },
        callback: {
            beforeDrag: beforeDrag,
            beforeDrop: beforeDrop,
            beforeClick: objTreeCallback.beforeClickHandler,
            onClick: objTreeCallback.clickHandler,
            onRename: objTreeCallback.renameHandler,
            onRemove: objTreeCallback.removeHandler,
            onDrag: objTreeCallback.dragStartHandler,
            onDrop: objTreeCallback.dragEndHandler
        }
    };

    function beforeDrag(treeId, treeNodes) {
        for (var i=0,l=treeNodes.length; i<l; i++) {
            if (treeNodes[i].drag === false) {
                return false;
            }
        }
        return true;
    }
    function beforeDrop(treeId, treeNodes, targetNode, moveType) {
        return targetNode ? targetNode.drop !== false : true;
    }

    //初始化ztree并返回
    return $.fn.zTree.init($('#' + eleId), setting, zNodes);
}

/**
 * 根据对象信息添加节点：并为添加的对象设置标识信息(name、index)
 * @param object {fabric.Object}
 */
function addNodeByObject(object) {
    objCount += 1;

    var objName = '未命名对象' + objCount;
    object.name = objName;
    object.index = objCount;
    object.id = objCount;
    objCollection.insertAt(object, objCount, true);

    var objNode = {
        id: objCount,
        pId: 1,
        name: objName,
        objectIndex: objCount,
        objectId: objCount
    };
    //第二个参数设为0保证后添加的节点在已有节点的前面
    zTreeObj.addNodes(null, 0, objNode);
    return objNode;
}

/**
 * 根据删除的单个对象移除对应的树节点
 * @param object
 */
function deleteNodeByObject(object) {
    var node = zTreeObj.getNodeByParam('id', object.id, null);
    //如果该节点下存在子节点，则将与子节点相应的对象从画布删除
    if(node && node.children && node.children.length) {
        deleteObjectByNode(node);
    }
    zTreeObj.removeNode(node);

    objCollection.remove(objCollection.item(object.index));
    objCollection.insertAt(null, object.index);
}

/**
 * 根据删除的多个对象移除对应的树节点
 * @param objects
 */
function deleteNodeByObjects(objects) {
    for(var i = 0; i < objects.length; i++) {
        deleteNodeByObject(objects[i]);
    }
}

/**
 * 根据节点迭代删除对象
 * @param treeNode
 */
function deleteObjectByNode(treeNode) {
    var object = objCollection.item(treeNode.objectIndex);
    drawer.remove(object);

    var children = treeNode.children;
    if(children && children.length) {
        for(var i = 0; i < children.length; i++) {
            deleteObjectByNode(children[i]);
        }
    }
}

/**
 * 设置对象高亮状态
 * @param object
 * @param ifLight - 是否高亮
 */
function setObjectLight(object, ifLight) {
    if(object.isType('rect') || object.isType('circle') || object.isType('ellipse')) {
        object.set('stroke', ifLight ? DrawStyle.borderHColor : DrawStyle.borderColor);
    }else if(object.isType('text') || object.isType('i-text')) {
        object.set('fill', ifLight ? DrawStyle.fontHColor: DrawStyle.fontColor);
    }else if(object.isType('group')) {
        object.forEachObject(function(obj, index, objs) {
            setObjectLight(obj, ifLight);
        });
    }
}

/**
 * 根据节点为与其相对应极其子节点相对应的对象设置高亮状态
 * @param treeNode
 * @param ifLight
 */
function setObjectLightByNode(treeNode, ifLight) {
    var object = objCollection.item(treeNode.objectIndex);
    if(object) {
        setObjectLight(object, ifLight);
    }

    var children = treeNode.children;
    if(children && children.length) {
        for(var i = 0; i < children.length; i++) {
            setObjectLightByNode(children[i], ifLight);
        }
    }
}

/**
 * 更新所有对象层级
 */
function updateObjectIndex() {
    //获取包含层级关系的所有节点
    var nodes = zTreeObj.getNodes();
    //将所有节点转换为扁平结构的数组
    var nodesArr = zTreeObj.transformToArray(nodes);
    var nodesCount = nodesArr.length;


    //遍历节点数组
    var treeNode, object, newIndex;
    for(var i = 0; i < nodesCount; i++) {
        treeNode = nodesArr[i];
        newIndex = nodesCount - i;

        //记录对象新的层级
        object = objCollection.item(treeNode.objectIndex);
        object.index = newIndex;
        treeNode.objectIndex = newIndex;
    }

    //清空旧的对象集合并插入更新了层级的对象
    clearObjCollection();
    var objs = drawer.getObjects();
    for(var j = 0, len = objs.length; j < len; j++) {
        objCollection.insertAt(objs[j], objs[j].index, true);
    }
    //将对象移动至新的层级
    objCollection.forEachObject(function(obj, index, objs) {
        if(obj) {
            console.info(index, obj);
            obj.moveTo(obj.index);
        }
    });
    drawer.refresh();
}

/**
 * 清空对象集合
 */
function clearObjCollection() {
    objCollection._objects = [];
}