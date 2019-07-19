/**
 * 消息提示模块
 * */

import {
    mergeObject
} from './drawer-utils';

const MSG_ANIM_TIME = 400; // ms
const  DEFAULT_OPT = {
    type: 'info',   // info、success、warning、error
    duration: 1500,
    delay: 0
};

function _createMsgEle(text) {
    let conEle = document.createElement('div');
    let wrapperEle = document.createElement('div');
    let iconEle = document.createElement('div');
    let txtEle = document.createElement('span');
    iconEle.classList.add('icon');
    txtEle.innerText = text;
    wrapperEle.appendChild(iconEle);
    wrapperEle.appendChild(txtEle);
    wrapperEle.classList.add('wrapper');
    conEle.classList.add('ag-msg');
    conEle.appendChild(wrapperEle);
    return conEle;
}

function _removeMsgEle(ele) {
    if(ele) {
        document.body.removeChild(ele);
    }
}

export function showMessgae(text, options) {
    let opt = mergeObject(DEFAULT_OPT, options);

    let msgEle = _createMsgEle(text);
    msgEle.classList.add(opt.type);
    document.body.appendChild(msgEle);
    setTimeout(() => {
        msgEle.classList.add('show');
        setTimeout(() => {
            msgEle.classList.remove('show');
            setTimeout(() => {
                _removeMsgEle(msgEle);
            }, MSG_ANIM_TIME);
        }, opt.duration);
    }, opt.delay);
}
