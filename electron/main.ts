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
    private lastClipboardContent = ''
    private clipboardWatcher: NodeJS.Timeout | null = null

    constructor() {
        this.initApp()
        this.setupIPC()
    }

    private async initApp() {
        await app.whenReady()
        this.createWindow()
        this.registerShortcuts()
        this.startClipboardWatcher()

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                this.stopClipboardWatcher()
                globalShortcut.unregisterAll()
                app.quit()
            }
        })

        app.on('before-quit', () => {
            this.isQuitting = true
            this.stopClipboardWatcher()
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

        ipcMain.handle('paste-card-content', (event, content: string) => {
            return this.pasteContent(content)
        })
    }

    private registerShortcuts() {
        // 只注册显示面板的快捷键
        const pasteSuccess = globalShortcut.register('CommandOrControl+E', () => {
            console.log('显示面板快捷键触发')
            this.showPastePanel()
        })

        if (!pasteSuccess) {
            console.log('显示面板快捷键注册失败')
        }
    }

    private startClipboardWatcher() {
        // 初始化上次剪贴板内容
        this.lastClipboardContent = clipboard.readText() || ''

        // 每100ms检查一次剪贴板变化
        this.clipboardWatcher = setInterval(() => {
            const currentContent = clipboard.readText() || ''

            // 如果内容发生变化且不为空
            if (currentContent !== this.lastClipboardContent && currentContent.trim().length > 0) {
                this.lastClipboardContent = currentContent
                this.handleClipboardChange(currentContent)
            }
        }, 100)
    }

    private stopClipboardWatcher() {
        if (this.clipboardWatcher) {
            clearInterval(this.clipboardWatcher)
            this.clipboardWatcher = null
        }
    }

    private handleClipboardChange(content: string) {
        const card = this.createCardFromContent(content)
        if (card) {
            console.log('剪贴板内容变化，自动创建卡片:', card.title)
            this.mainWindow?.webContents.send('card-created', card)
        }
    }

    private createCardFromClipboard(): CardData | null {
        const content = clipboard.readText()
        return this.createCardFromContent(content)
    }

    private createCardFromContent(content: string): CardData | null {
        if (!content || content.trim().length === 0) {
            console.log('内容为空')
            return null
        }

        const trimmedContent = content.trim()

        // 检查是否与最近的卡片内容重复
        if (this.cards.length > 0 && this.cards[0].content === trimmedContent) {
            return null
        }

        const card: CardData = {
            id: Date.now().toString(),
            content: trimmedContent,
            contentType: this.detectContentType(trimmedContent),
            title: this.generateTitle(trimmedContent),
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

    private async pasteContent(content: string): Promise<void> {
        // 将内容设置到剪贴板
        clipboard.writeText(content)

        // 隐藏面板
        this.mainWindow?.hide()

        // 这里可以添加自动粘贴逻辑，需要使用第三方库如robot.js
        // 暂时先只设置到剪贴板，用户可以手动Ctrl+V粘贴
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