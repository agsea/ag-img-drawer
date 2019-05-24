// 不同绘制模式下，鼠标样式

import DrawerMode from './drawer-mode';

export const MODE_CURSOR = {
    'default': 'default',
    'auto': 'auto',
    'grab': 'grab',
    'grabbing': 'grabbing',
    'draw': 'crosshair',
    'hand': 'pointer',
    'move': 'move'
};

export function getCanvasModeCursor(mode, spaceKey) {
    if(spaceKey) {
        return MODE_CURSOR.grab;
    }else {
        switch (mode) {
            case DrawerMode.browse: return MODE_CURSOR.grab; break;
            case DrawerMode.edit: return MODE_CURSOR.default; break;
            case DrawerMode.draw: return MODE_CURSOR.draw; break;
            default: return MODE_CURSOR.default;
        }
    }
}
