import { app, BrowserWindow, globalShortcut, ipcMain, clipboard } from 'electron'
import { join } from 'path'
import { createHash } from 'crypto'

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
    contentHash: string; // 新增内容哈希
}

class PasterApp {
    private mainWindow: BrowserWindow | null = null
    private isQuitting = false
    private cards: CardData[] = []
    private lastClipboardHash = ''
    private clipboardWatcher: NodeJS.Timeout | null = null
    private contentHashSet = new Set<string>() // 用于快速查重

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

        ipcMain.handle('get-all-cards', () => {
            return this.cards
        })

        ipcMain.handle('paste-card-content', (event, content: string) => {
            return this.pasteContent(content)
        })
    }

    private registerShortcuts() {
        const pasteSuccess = globalShortcut.register('CommandOrControl+E', () => {
            console.log('显示面板快捷键触发')
            this.showPastePanel()
        })

        if (!pasteSuccess) {
            console.log('显示面板快捷键注册失败')
        }
    }

    private generateContentHash(content: string): string {
        return createHash('md5').update(content.trim()).digest('hex')
    }

    private startClipboardWatcher() {
        // 初始化
        const initialContent = clipboard.readText() || ''
        this.lastClipboardHash = this.generateContentHash(initialContent)

        // 使用更长的间隔，500ms
        this.clipboardWatcher = setInterval(() => {
            this.checkClipboard()
        }, 500)
    }

    private checkClipboard() {
        try {
            const currentContent = clipboard.readText() || ''

            // 内容为空直接返回
            if (!currentContent.trim()) {
                return
            }

            const currentHash = this.generateContentHash(currentContent)

            // 哈希值没有变化，直接返回
            if (currentHash === this.lastClipboardHash) {
                return
            }

            // 检查是否已存在相同内容
            if (this.contentHashSet.has(currentHash)) {
                console.log('检测到重复内容，跳过')
                this.lastClipboardHash = currentHash
                return
            }

            // 更新最后的哈希值
            this.lastClipboardHash = currentHash

            // 创建新卡片
            this.createNewCard(currentContent.trim(), currentHash)

        } catch (error) {
            console.error('剪贴板检查出错:', error)
        }
    }

    private createNewCard(content: string, contentHash: string) {
        const card: CardData = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            content: content,
            contentType: this.detectContentType(content),
            title: this.generateTitle(content),
            createdAt: new Date().toISOString(),
            isPinned: false,
            tags: [],
            source: 'clipboard',
            contentHash: contentHash
        }

        // 添加到卡片列表和哈希集合
        this.cards.unshift(card)
        this.contentHashSet.add(contentHash)

        // 限制卡片数量，同时清理哈希集合
        if (this.cards.length > 50) {
            const removedCards = this.cards.splice(50)
            removedCards.forEach(removedCard => {
                this.contentHashSet.delete(removedCard.contentHash)
            })
        }

        console.log('创建新卡片:', card.title)
        this.mainWindow?.webContents.send('card-created', card)
    }

    private stopClipboardWatcher() {
        if (this.clipboardWatcher) {
            clearInterval(this.clipboardWatcher)
            this.clipboardWatcher = null
        }
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
        clipboard.writeText(content)
        this.mainWindow?.hide()
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