declare global {
    interface Window {
        electronAPI: {
            onShowPanel: (callback: () => void) => void;
            hidePanel: () => Promise<void>;
            getClipboardData: () => Promise<string>;
            createCardFromClipboard: () => Promise<any>;
            getAllCards: () => Promise<any[]>;
            onCardCreated: (callback: (card: any) => void) => void;
        }
    }
}

export { };