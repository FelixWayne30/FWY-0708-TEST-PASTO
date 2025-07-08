"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const isDev = process.env.NODE_ENV === 'development';
class PasterApp {
    constructor() {
        this.mainWindow = null;
        this.isQuitting = false;
        this.cards = [];
        this.initApp();
        this.setupIPC();
    }
    async initApp() {
        await electron_1.app.whenReady();
        this.createWindow();
        this.registerShortcuts();
        electron_1.app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                electron_1.globalShortcut.unregisterAll();
                electron_1.app.quit();
            }
        });
        electron_1.app.on('before-quit', () => {
            this.isQuitting = true;
            electron_1.globalShortcut.unregisterAll();
        });
    }
    createWindow() {
        this.mainWindow = new electron_1.BrowserWindow({
            width: 400,
            height: 600,
            show: false,
            frame: false,
            resizable: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: (0, path_1.join)(__dirname, 'preload.js')
            }
        });
        if (isDev) {
            const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';
            this.mainWindow.loadURL(devServerUrl);
            this.mainWindow.webContents.openDevTools();
        }
        else {
            this.mainWindow.loadFile((0, path_1.join)(__dirname, '../dist-renderer/index.html'));
        }
        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.mainWindow?.hide();
            }
        });
    }
    setupIPC() {
        electron_1.ipcMain.handle('hide-panel', () => {
            this.mainWindow?.hide();
        });
        electron_1.ipcMain.handle('get-clipboard-data', () => {
            const text = electron_1.clipboard.readText();
            return text || '剪贴板为空';
        });
        electron_1.ipcMain.handle('create-card-from-clipboard', () => {
            return this.createCardFromClipboard();
        });
        electron_1.ipcMain.handle('get-all-cards', () => {
            return this.cards;
        });
    }
    registerShortcuts() {
        const copySuccess = electron_1.globalShortcut.register('CommandOrControl+Shift+C', () => {
            console.log('复制快捷键触发');
            this.handleCopyShortcut();
        });
        const pasteSuccess = electron_1.globalShortcut.register('CommandOrControl+E', () => {
            console.log('粘贴快捷键触发');
            this.showPastePanel();
        });
        if (!copySuccess) {
            console.log('复制快捷键注册失败');
        }
        if (!pasteSuccess) {
            console.log('粘贴快捷键注册失败');
        }
    }
    async handleCopyShortcut() {
        const card = this.createCardFromClipboard();
        if (card) {
            console.log('成功创建卡片:', card.title);
            this.mainWindow?.webContents.send('card-created', card);
        }
    }
    createCardFromClipboard() {
        const content = electron_1.clipboard.readText();
        if (!content || content.trim().length === 0) {
            console.log('剪贴板内容为空');
            return null;
        }
        const card = {
            id: Date.now().toString(),
            content: content.trim(),
            contentType: this.detectContentType(content),
            title: this.generateTitle(content),
            createdAt: new Date().toISOString(),
            isPinned: false,
            tags: [],
            source: 'clipboard'
        };
        this.cards.unshift(card);
        if (this.cards.length > 50) {
            this.cards = this.cards.slice(0, 50);
        }
        return card;
    }
    detectContentType(content) {
        if (content.includes('http://') || content.includes('https://')) {
            return 'url';
        }
        if (content.includes('<') && content.includes('>')) {
            return 'html';
        }
        if (content.includes('function') || content.includes('const') || content.includes('class')) {
            return 'code';
        }
        return 'text';
    }
    generateTitle(content) {
        const title = content.replace(/\n/g, ' ').trim();
        return title.length > 30 ? title.substring(0, 30) + '...' : title;
    }
    showPastePanel() {
        if (this.mainWindow) {
            this.mainWindow.show();
            this.mainWindow.focus();
            this.mainWindow.webContents.send('show-panel');
        }
    }
}
new PasterApp();
