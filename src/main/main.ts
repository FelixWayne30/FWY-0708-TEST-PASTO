import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join } from 'path'

const isDev = process.env.NODE_ENV === 'development'

class PasterApp {
    private mainWindow: BrowserWindow | null = null

    constructor() {
        this.initApp()
        this.setupIPC()
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
                preload: join(__dirname, '../preload.js')
            }
        })

        if (isDev) {
            this.mainWindow.loadURL('http://localhost:5173')
            this.mainWindow.webContents.openDevTools()
        } else {
            this.mainWindow.loadFile(join(__dirname, '../dist-renderer/index.html'))
        }
    }

    private setupIPC() {
        ipcMain.handle('hide-panel', () => {
            this.mainWindow?.hide()
        })

        ipcMain.handle('get-clipboard-data', () => {
            return '测试剪贴板数据'
        })
    }

    private registerShortcuts() {
        globalShortcut.register('CommandOrControl+Q', () => {
            console.log('复制快捷键触发')
        })

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