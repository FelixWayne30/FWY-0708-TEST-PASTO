import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

// 简单的内联类型定义
interface CardData {
    id: string;
    content: string;
    contentType: string;
    title: string;
    createdAt: string;
    isPinned: boolean;
    tags: string[];
    source?: string;
}

class PasterApp {
    private mainWindow: BrowserWindow | null = null
    private isQuitting = false
    private cards: CardData[] = []

    constructor() {
        this.initApp()
        this.setupIPC()
    }

    private async initApp() {
        await app.whenReady()
        this.createWindow()
        this.registerShortcuts()

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                globalShortcut.unregisterAll()
                app.quit()
            }
        })

        app.on('before-quit', () => {
            this.isQuitting = true
            globalShortcut.unregisterAll()
        })
    }

    private createWindow() {
        this.mainWindow = new BrowserWindow({
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
                preload: join(__dirname, 'preload.js')
            }
        })

        if (isDev) {
            const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174'
            this.mainWindow.loadURL(devServerUrl)
            this.mainWindow.webContents.openDevTools()
        } else {
            this.mainWindow.loadFile(join(__dirname, '../dist-renderer/index.html'))
        }

        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault()
                this.mainWindow?.hide()
            }
        })
    }

    private setupIPC() {
        ipcMain.handle('hide-panel', () => {
            this.mainWindow?.hide()
        })

        ipcMain.handle('get-clipboard-data', () => {
            const text = clipboard.readText()
            return text || '剪贴板为空'
        })

        ipcMain.handle('create-card-from-clipboard', () => {
            return this.createCardFromClipboard()
        })

        ipcMain.handle('get-all-cards', () => {
            return this.cards
        })
    }

    private registerShortcuts() {
        const copySuccess = globalShortcut.register('CommandOrControl+Shift+C', () => {
            console.log('复制快捷键触发')
            this.handleCopyShortcut()
        })

        const pasteSuccess = globalShortcut.register('CommandOrControl+E', () => {
            console.log('粘贴快捷键触发')
            this.showPastePanel()
        })

        if (!copySuccess) {
            console.log('复制快捷键注册失败')
        }
        if (!pasteSuccess) {
            console.log('粘贴快捷键注册失败')
        }
    }

    private async handleCopyShortcut() {
        const card = this.createCardFromClipboard()
        if (card) {
            console.log('成功创建卡片:', card.title)
            this.mainWindow?.webContents.send('card-created', card)
        }
    }

    private createCardFromClipboard(): CardData | null {
        const content = clipboard.readText()

        if (!content || content.trim().length === 0) {
            console.log('剪贴板内容为空')
            return null
        }

        const card: CardData = {
            id: Date.now().toString(),
            content: content.trim(),
            contentType: this.detectContentType(content),
            title: this.generateTitle(content),
            createdAt: new Date().toISOString(),
            isPinned: false,
            tags: [],
            source: 'clipboard'
        }

        this.cards.unshift(card)

        if (this.cards.length > 50) {
            this.cards = this.cards.slice(0, 50)
        }

        return card
    }

    private detectContentType(content: string): string {
        if (content.includes('http://') || content.includes('https://')) {
            return 'url'
        }
        if (content.includes('<') && content.includes('>')) {
            return 'html'
        }
        if (content.includes('function') || content.includes('const') || content.includes('class')) {
            return 'code'
        }
        return 'text'
    }

    private generateTitle(content: string): string {
        const title = content.replace(/\n/g, ' ').trim()
        return title.length > 30 ? title.substring(0, 30) + '...' : title
    }

    private showPastePanel() {
        if (this.mainWindow) {
            this.mainWindow.show()
            this.mainWindow.focus()
            this.mainWindow.webContents.send('show-panel')
        }
    }
}

new PasterApp()