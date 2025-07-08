export interface CardData {
    id: string;
    content: string;
    contentType: ContentType;
    title: string;
    createdAt: string;
    isPinned: boolean;
    tags: string[];
    source?: string;
}

export enum ContentType {
    TEXT = 'text',
    HTML = 'html',
    IMAGE = 'image',
    CODE = 'code',
    URL = 'url'
}

export interface ClipboardEvent {
    action: 'copy' | 'paste';
    data?: CardData;
}