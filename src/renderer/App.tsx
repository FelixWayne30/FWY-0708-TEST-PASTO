import React, { useEffect, useState, useCallback, useRef } from 'react'

interface CardData {
    id: string;
    content: string;
    contentType: string;
    title: string;
    createdAt: string;
    isPinned: boolean;
    tags: string[];
    source?: string;
    contentHash?: string;
}

const App: React.FC = () => {
    const [cards, setCards] = useState<CardData[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)
    const cardIdsRef = useRef(new Set<string>()) // 用于去重的ID集合

    // 防重复添加的卡片更新函数
    const addNewCard = useCallback((newCard: CardData) => {
        if (cardIdsRef.current.has(newCard.id)) {
            console.log('卡片已存在，跳过添加:', newCard.id)
            return
        }

        cardIdsRef.current.add(newCard.id)
        setCards(prev => {
            // 再次检查是否已存在（双重保险）
            const exists = prev.some(card => card.id === newCard.id)
            if (exists) {
                console.log('卡片已存在于状态中，跳过添加:', newCard.id)
                return prev
            }
            return [newCard, ...prev]
        })
    }, [])

    // 加载所有卡片并同步ID集合
    const loadCards = useCallback(async () => {
        try {
            if (window.electronAPI?.getAllCards) {
                const allCards = await window.electronAPI.getAllCards()
                setCards(allCards || [])

                // 同步更新ID集合
                cardIdsRef.current.clear()
                allCards?.forEach(card => {
                    cardIdsRef.current.add(card.id)
                })
            }
        } catch (error) {
            console.error('加载卡片失败:', error)
        }
    }, [])

    useEffect(() => {
        // 检查electronAPI是否可用
        if (typeof window !== 'undefined' && window.electronAPI) {
            // 监听显示面板事件
            window.electronAPI.onShowPanel(() => {
                loadCards()
                setSelectedIndex(0) // 重置选中索引
            })

            // 监听新卡片创建事件  
            window.electronAPI.onCardCreated(addNewCard)

            // 初始加载卡片
            loadCards()
        }
    }, [loadCards, addNewCard])

    // 当卡片列表变化时，确保选中索引在有效范围内
    useEffect(() => {
        if (selectedIndex >= cards.length && cards.length > 0) {
            setSelectedIndex(cards.length - 1)
        }
    }, [cards.length, selectedIndex])

    const hidePanel = useCallback(async () => {
        try {
            if (window.electronAPI?.hidePanel) {
                await window.electronAPI.hidePanel()
            }
        } catch (error) {
            console.error('隐藏面板失败:', error)
        }
    }, [])

    const pasteCard = useCallback(async (card: CardData) => {
        try {
            if (window.electronAPI?.pasteCardContent) {
                await window.electronAPI.pasteCardContent(card.content)
                console.log('已粘贴卡片内容:', card.title)
            }
        } catch (error) {
            console.error('粘贴卡片失败:', error)
        }
    }, [])

    const handleCardClick = useCallback((index: number) => {
        setSelectedIndex(index)
        pasteCard(cards[index])
    }, [cards, pasteCard])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (cards.length === 0) {
            if (e.key === 'Escape') {
                hidePanel()
            }
            return
        }

        switch (e.key) {
            case 'Escape':
                hidePanel()
                break
            case 'ArrowDown':
                e.preventDefault()
                setSelectedIndex(prev => (prev + 1) % cards.length)
                break
            case 'ArrowUp':
                e.preventDefault()
                setSelectedIndex(prev => (prev - 1 + cards.length) % cards.length)
                break
            case 'Enter':
                e.preventDefault()
                if (cards[selectedIndex]) {
                    pasteCard(cards[selectedIndex])
                }
                break
            default:
                // 数字键快速选择 (1-9)
                const num = parseInt(e.key)
                if (num >= 1 && num <= 9 && num <= cards.length) {
                    setSelectedIndex(num - 1)
                    pasteCard(cards[num - 1])
                }
                break
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
                    <p>Ctrl+C - 自动捕获到卡片 | Ctrl+E - 显示面板</p>
                    <p>↑↓ 选择 | Enter 粘贴 | 1-9 快速选择 | Esc 关闭</p>
                </div>

                <div className="cards-container">
                    {cards.length === 0 ? (
                        <div className="empty-state">
                            <p>还没有卡片</p>
                            <p>使用 Ctrl+C 复制内容会自动创建卡片</p>
                        </div>
                    ) : (
                        cards.map((card: CardData, index: number) => (
                            <div
                                key={card.id}
                                className={`card-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleCardClick(index)}
                            >
                                <div className="card-header">
                                    <div className="card-left">
                                        <span className="card-number">{index + 1}</span>
                                        <span
                                            className="card-type"
                                            style={{ backgroundColor: getTypeColor(card.contentType) }}
                                        >
                                            {card.contentType}
                                        </span>
                                    </div>
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