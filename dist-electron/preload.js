"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // 主进程通信接口
    onShowPanel: (callback) => electron_1.ipcRenderer.on('show-panel', callback),
    hidePanel: () => electron_1.ipcRenderer.invoke('hide-panel'),
    getClipboardData: () => electron_1.ipcRenderer.invoke('get-clipboard-data'),
    saveCard: (data) => electron_1.ipcRenderer.invoke('save-card', data)
});
