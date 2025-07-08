import { app, BrowserWindow, globalShortcut, clipboard } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

class PasterApp {
    private mainWindow: BrowserWindow | null = null

    constructor() {
        this.initApp()
    }

    private async initApp() {
        await app.whenReady()
        this.createWindow()
        this.registerShortcuts()

        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') app.quit()
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
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: join(__dirname, '../preload/preload.js')
            }
        })

        if (isDev) {
            this.mainWindow.loadURL('http://localhost:5173')
            this.mainWindow.webContents.openDevTools()
        } else {
            this.mainWindow.loadFile(join(__dirname, '../dist-renderer/index.html'))
        }
    }

    private registerShortcuts() {
        // Ctrl+Q: 复制到剪贴板
        globalShortcut.register('CommandOrControl+Q', () => {
            console.log('复制快捷键触发')
        })

        // Ctrl+E: 显示粘贴面板
        globalShortcut.register('CommandOrControl+E', () => {
            this.showPastePanel()
        })
    }

    private showPastePanel() {
        if (this.mainWindow) {
            this.mainWindow.show()
            this.mainWindow.focus()
        }
    }
}

new PasterApp()