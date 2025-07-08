"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    onShowPanel: (callback) => {
        electron_1.ipcRenderer.on('show-panel', callback);
    },
    hidePanel: () => electron_1.ipcRenderer.invoke('hide-panel'),
    getClipboardData: () => electron_1.ipcRenderer.invoke('get-clipboard-data'),
    createCardFromClipboard: () => electron_1.ipcRenderer.invoke('create-card-from-clipboard'),
    getAllCards: () => electron_1.ipcRenderer.invoke('get-all-cards'),
    onCardCreated: (callback) => {
        electron_1.ipcRenderer.on('card-created', (_event, card) => callback(card));
    }
});
