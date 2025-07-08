import React, { useEffect, useState } from 'react'

const App: React.FC = () => {
    const [cards, setCards] = useState<any[]>([])

    useEffect(() => {
        // 检查electronAPI是否可用
        if (typeof window !== 'undefined' && window.electronAPI) {
            // 监听显示面板事件
            window.electronAPI.onShowPanel(() => {
                loadCards()
            })

            // 监听新卡片创建事件  
            window.electronAPI.onCardCreated((card: any) => {
                setCards(prev => [card, ...prev])
            })

            // 初始加载卡片
            loadCards()
        }
    }, [])

    const loadCards = async () => {
        try {
            if (window.electronAPI?.getAllCards) {
                const allCards = await window.electronAPI.getAllCards()
                setCards(allCards || [])
            }
        } catch (error) {
            console.error('加载卡片失败:', error)
        }
    }

    const hidePanel = async () => {
        try {
            if (window.electronAPI?.hidePanel) {
                await window.electronAPI.hidePanel()
            }
        } catch (error) {
            console.error('隐藏面板失败:', error)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            hidePanel()
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('zh-CN')
    }

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            text: '#4CAF50',
            code: '#FF9800',
            url: '#2196F3',
            html: '#9C27B0'
        }
        return colors[type] || '#666'
    }

    return (
        <div className="app" onKeyDown={handleKeyDown} tabIndex={0}>
            <div className="header">
                <h1>Paster</h1>
                <div className="card-count">{cards.length} 个卡片</div>
                <button onClick={hidePanel} className="close-btn">×</button>
            </div>

            <div className="content">
                <div className="tips">
                    <p>Ctrl+Shift+C - 捕获剪贴板内容</p>
                    <p>Ctrl+E - 显示卡片面板</p>
                </div>

                <div className="cards-container">
                    {cards.length === 0 ? (
                        <div className="empty-state">
                            <p>还没有卡片</p>
                            <p>使用 Ctrl+Shift+C 创建第一个卡片</p>
                        </div>
                    ) : (
                        cards.map((card: any) => (
                            <div key={card.id} className="card-item">
                                <div className="card-header">
                                    <span
                                        className="card-type"
                                        style={{ backgroundColor: getTypeColor(card.contentType) }}
                                    >
                                        {card.contentType}
                                    </span>
                                    <span className="card-time">{formatDate(card.createdAt)}</span>
                                </div>
                                <div className="card-title">{card.title}</div>
                                <div className="card-content">{card.content}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

export default App