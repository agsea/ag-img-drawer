/**
 * 对象树
 * Created by aegean on 2017/12/20.
 */

var zNodes = [
    { id:1, pId:0, name:"随意拖拽 1", open:true},
    { id:11, pId:1, name:"随意拖拽 1-1"},
    { id:12, pId:1, name:"随意拖拽 1-2", open:true},
    { id:121, pId:12, name:"随意拖拽 1-2-1"},
    { id:122, pId:12, name:"随意拖拽 1-2-2"},
    { id:123, pId:12, name:"随意拖拽 1-2-3"},
    { id:13, pId:1, name:"禁止拖拽 1-3", open:true, drag:false},
    { id:131, pId:13, name:"禁止拖拽 1-3-1", drag:false},
    { id:132, pId:13, name:"禁止拖拽 1-3-2", drag:false},
    { id:133, pId:13, name:"随意拖拽 1-3-3"},
    { id:2, pId:0, name:"随意拖拽 2", open:true},
    { id:21, pId:2, name:"随意拖拽 2-1"},
    { id:22, pId:2, name:"禁止拖拽到我身上 2-2", open:true, drop:false},
    { id:221, pId:22, name:"随意拖拽 2-2-1"},
    { id:222, pId:22, name:"随意拖拽 2-2-2"},
    { id:223, pId:22, name:"随意拖拽 2-2-3"},
    { id:23, pId:2, name:"随意拖拽 2-3"}
];

/**
 * 初始化对象树
 * @param eleId
 */
function initObjectTree(eleId) {
    var setting = {
        view: {
            addHoverDom: addHoverDom,
            removeHoverDom: removeHoverDom,
            selectedMulti: false
        },
        edit: {
            enable: true,
            /*showRemoveBtn: false,
            showRenameBtn: false*/
        },
        data: {
            simpleData: {
                enable: true
            }
        },
        callback: {
            beforeDrag: beforeDrag,
            beforeDrop: beforeDrop
        }
    };

    var newCount = 1;
    function addHoverDom(treeId, treeNode) {
        var sObj = $("#" + treeNode.tId + "_span");
        if (treeNode.editNameFlag || $("#addBtn_"+treeNode.tId).length>0) return;
        var addStr = "<span class='button add' id='addBtn_" + treeNode.tId
            + "' title='add node' onfocus='this.blur();'></span>";
        sObj.after(addStr);
        var btn = $("#addBtn_"+treeNode.tId);
        if (btn) btn.bind("click", function(){
            var zTree = $.fn.zTree.getZTreeObj("treeDemo");
            zTree.addNodes(treeNode, {id:(100 + newCount), pId:treeNode.id, name:"new node" + (newCount++)});
            return false;
        });
    };
    function removeHoverDom(treeId, treeNode) {
        $("#addBtn_"+treeNode.tId).unbind().remove();
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

    function setCheck() {
        var zTree = $.fn.zTree.getZTreeObj("treeDemo"),
            isCopy = $("#copy").attr("checked"),
            isMove = $("#move").attr("checked"),
            prev = $("#prev").attr("checked"),
            inner = $("#inner").attr("checked"),
            next = $("#next").attr("checked");
        zTree.setting.edit.drag.isCopy = isCopy;
        zTree.setting.edit.drag.isMove = isMove;
        showCode(1, ['setting.edit.drag.isCopy = ' + isCopy, 'setting.edit.drag.isMove = ' + isMove]);

        zTree.setting.edit.drag.prev = prev;
        zTree.setting.edit.drag.inner = inner;
        zTree.setting.edit.drag.next = next;
        showCode(2, ['setting.edit.drag.prev = ' + prev, 'setting.edit.drag.inner = ' + inner, 'setting.edit.drag.next = ' + next]);
    }
    function showCode(id, str) {
        var code = $("#code" + id);
        code.empty();
        for (var i=0, l=str.length; i<l; i++) {
            code.append("<li>"+str[i]+"</li>");
        }
    }

    //初始化ztree
    $.fn.zTree.init($('#' + eleId), setting, zNodes);
}
initObjectTree('treeDemo');