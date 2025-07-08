import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    // 主进程通信接口
    onShowPanel: (callback: () => void) => ipcRenderer.on('show-panel', callback),
    hidePanel: () => ipcRenderer.invoke('hide-panel'),
    getClipboardData: () => ipcRenderer.invoke('get-clipboard-data'),
    saveCard: (data: any) => ipcRenderer.invoke('save-card', data)
})