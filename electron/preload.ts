import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
    onShowPanel: (callback: () => void) => {
        ipcRenderer.on('show-panel', callback)
    },
    hidePanel: () => ipcRenderer.invoke('hide-panel'),
    getClipboardData: () => ipcRenderer.invoke('get-clipboard-data'),
    createCardFromClipboard: () => ipcRenderer.invoke('create-card-from-clipboard'),
    getAllCards: () => ipcRenderer.invoke('get-all-cards'),
    onCardCreated: (callback: (card: any) => void) => {
        ipcRenderer.on('card-created', (_event, card) => callback(card))
    }
})