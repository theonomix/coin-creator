console.log('🚀 Coin Creator - Discord integration loaded');

// Server URL for coin creation
const SERVER_URL = 'https://coin-creator-production.up.railway.app';

let isTracking = false;
let messageObserver = null;

// Platform selector function
function openPlatformSelector(sourceData) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;
    
    overlay.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
            <h2 style="text-align: center; margin-bottom: 25px; color: #333; display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span>🚀</span> Choose Platform
            </h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <button data-platform="pump.fun" style="padding: 20px; border: 2px solid #e3e5e8; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">💊</div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px;">Pump.fun</div>
                    <div style="font-size: 12px; color: #666;">Solana meme coins</div>
                </button>
                
                <button data-platform="bonk.fun" style="padding: 20px; border: 2px solid #e3e5e8; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🐕</div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px;">Bonk.fun</div>
                    <div style="font-size: 12px; color: #666;">Bonk ecosystem</div>
                </button>
                
                <button data-platform="custom" style="padding: 20px; border: 2px solid #e3e5e8; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">⚙️</div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px;">Custom</div>
                    <div style="font-size: 12px; color: #666;">Other platforms</div>
                </button>
                
                <button data-platform="demo" style="padding: 20px; border: 2px solid #e3e5e8; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s; text-align: center;">
                    <div style="font-size: 32px; margin-bottom: 8px;">🧪</div>
                    <div style="font-weight: bold; color: #333; margin-bottom: 4px;">Demo Mode</div>
                    <div style="font-size: 12px; color: #666;">Test functionality</div>
                </button>
            </div>
            
            <div style="text-align: center; margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px; font-size: 13px; color: #666;">
                <strong>Source:</strong> ${sourceData.title || sourceData.text || 'Discord message'}
            </div>
            
            <button id="cancelBtn" style="width: 100%; background: #6c757d; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: bold;">Cancel</button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Add platform button click handlers
    const platformButtons = overlay.querySelectorAll('button[data-platform]');
    platformButtons.forEach(btn => {
        btn.onmouseover = () => {
            btn.style.borderColor = '#5865f2';
            btn.style.transform = 'translateY(-3px)';
            btn.style.boxShadow = '0 6px 20px rgba(88, 101, 242, 0.3)';
        };
        btn.onmouseout = () => {
            btn.style.borderColor = '#e3e5e8';
            btn.style.transform = 'translateY(0)';
            btn.style.boxShadow = 'none';
        };
        
        btn.addEventListener('click', function() {
            const platform = this.getAttribute('data-platform');
            console.log('Platform selected:', platform);
            overlay.remove();
            openAdvancedCoinCreator(sourceData, platform);
        });
    });
    
    overlay.querySelector('#cancelBtn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
}

function generateSymbol(title) {
    if (!title) return '';
    const symbol = title.replace(/[^A-Z0-9]/gi, '').substring(0, 6).toUpperCase();
    return symbol || 'COIN';
}

function addTrackerButton() {
    setTimeout(() => {
        const selectors = [
            'div[class*="toolbar"]',
            'div[class*="headerToolbar"]', 
            'section[class*="title"]',
            'header[role="banner"]'
        ];
        
        let container = null;
        for (const selector of selectors) {
            container = document.querySelector(selector);
            if (container && !container.querySelector('#discord-tracker-btn')) {
                addButtonToContainer(container);
                break;
            }
        }
        
        if (!document.querySelector('#discord-tracker-btn')) {
            addFloatingButton();
        }
    }, 3000);
}

function addButtonToContainer(container) {
    const btn = document.createElement('button');
    btn.id = 'discord-tracker-btn';
    btn.textContent = '🚀 Start Coin Tracker';
    btn.style.cssText = `
        background: linear-gradient(45deg, #7289da, #5865f2);
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 8px;
        transition: all 0.2s;
    `;
    
    btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
    btn.onmouseout = () => btn.style.transform = 'scale(1)';
    
    btn.onclick = () => toggleTracking(btn);
    container.appendChild(btn);
}

function addFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'discord-tracker-btn';
    btn.innerHTML = `
        <span style="font-size: 18px;">🚀</span>
        <span style="margin-left: 8px;">Track Messages</span>
    `;
    btn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        background: linear-gradient(45deg, #7289da, #5865f2);
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 30px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 6px 20px rgba(114, 137, 218, 0.4);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
    `;
    
    btn.onclick = () => toggleTracking(btn);
    document.body.appendChild(btn);
}

function toggleTracking(button) {
    isTracking = !isTracking;
    
    if (isTracking) {
        button.textContent = '⏹️ Stop Tracker';
        button.style.background = '#ed4245';
        startMessageTracking();
        showNotification('Coin tracker started! 🚀', 'Looking for messages to turn into coins...');
    } else {
        button.textContent = '🚀 Start Coin Tracker';
        button.style.background = 'linear-gradient(45deg, #7289da, #5865f2)';
        stopMessageTracking();
        showNotification('Coin tracker stopped', 'Click start to begin tracking again');
    }
}

function startMessageTracking() {
    const messagesContainer = findMessagesContainer();
    if (!messagesContainer) {
        showNotification('Error', 'Could not find messages container');
        return;
    }

    console.log('Started tracking messages in:', messagesContainer);
    processExistingMessages(messagesContainer);
    
    messageObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    processMessage(node);
                }
            });
        });
    });
    
    messageObserver.observe(messagesContainer, {
        childList: true,
        subtree: true
    });
}

function stopMessageTracking() {
    if (messageObserver) {
        messageObserver.disconnect();
        messageObserver = null;
    }
    document.querySelectorAll('.coin-create-btn').forEach(btn => btn.remove());
}

function findMessagesContainer() {
    const selectors = [
        '[data-list-id="chat-messages"]',
        'div[class*="messagesWrapper"]',
        'div[class*="scroller"][class*="messages"]',
        'ol[data-list-id]'
    ];
    
    for (const selector of selectors) {
        const container = document.querySelector(selector);
        if (container) return container;
    }
    return null;
}

function processExistingMessages(container) {
    const messages = container.querySelectorAll('li[id*="chat-messages"], div[class*="message"]');
    messages.forEach(processMessage);
}

function processMessage(messageElement) {
    if (!messageElement || messageElement.querySelector('.coin-create-btn')) return;
    
    const embedData = extractMessageData(messageElement);
    
    if (embedData && (embedData.hasEmbed || embedData.hasImages || embedData.hasLinks)) {
        addCoinButtonToMessage(messageElement, embedData);
    }
}

function extractMessageData(messageElement) {
    const data = {
        hasEmbed: false,
        hasImages: false,
        hasLinks: false,
        title: '',
        author: '',
        description: '',
        images: [],
        links: [],
        timestamp: Date.now()
    };
    
    const embed = messageElement.querySelector('div[class*="embed"], article[class*="embed"]');
    if (embed) {
        data.hasEmbed = true;
        
        const embedTitle = embed.querySelector('div[class*="embedTitle"], a[class*="embedTitle"]');
        if (embedTitle) {
            data.title = embedTitle.textContent.trim();
            if (embedTitle.href) data.links.push(embedTitle.href);
        }
        
        const embedAuthor = embed.querySelector('div[class*="embedAuthor"]');
        if (embedAuthor) {
            data.author = embedAuthor.textContent.trim();
        }
        
        const embedDesc = embed.querySelector('div[class*="embedDescription"]');
        if (embedDesc) {
            data.description = embedDesc.textContent.trim();
        }
    }
    
    const images = messageElement.querySelectorAll('img');
    images.forEach(img => {
        if (img.src && !img.src.includes('emoji') && !img.src.includes('avatar')) {
            data.images.push(img.src);
            data.hasImages = true;
        }
    });
    
    const links = messageElement.querySelectorAll('a[href]');
    links.forEach(link => {
        if (link.href && !link.href.includes('discord.com')) {
            data.links.push(link.href);
            data.hasLinks = true;
        }
    });
    
    if (!data.title) {
        const messageContent = messageElement.querySelector('div[class*="messageContent"]');
        if (messageContent) {
            const text = messageContent.textContent.trim();
            data.title = text.substring(0, 50);
        }
    }
    
    return data;
}

function addCoinButtonToMessage(messageElement, messageData) {
    const button = document.createElement('button');
    button.className = 'coin-create-btn';
    button.textContent = '🚀 Create Coin';
    button.style.cssText = `
        background: linear-gradient(45deg, #57f287, #3ba55d);
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 8px;
        transition: all 0.2s;
    `;
    
    button.onclick = (e) => {
        e.stopPropagation();
        openPlatformSelector(messageData);
    };
    
    const embedAuthor = messageElement.querySelector('div[class*="embedAuthor"]');
    const embedTitle = messageElement.querySelector('div[class*="embedTitle"]');
    const messageHeader = messageElement.querySelector('div[class*="messageHeader"]');
    
    if (embedAuthor) {
        embedAuthor.appendChild(button);
    } else if (embedTitle && embedTitle.parentElement) {
        embedTitle.parentElement.appendChild(button);
    } else if (messageHeader) {
        messageHeader.appendChild(button);
    }
}

function openAdvancedCoinCreator(messageData, selectedPlatform = 'demo') {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(5px);
    `;
    
    const platformInfo = {
        'pump.fun': { emoji: '💊', name: 'Pump.fun', color: '#ff6b35' },
        'bonk.fun': { emoji: '🐕', name: 'Bonk.fun', color: '#ffa726' },
        'custom': { emoji: '⚙️', name: 'Custom Platform', color: '#42a5f5' },
        'demo': { emoji: '🧪', name: 'Demo Mode', color: '#66bb6a' }
    };
    
    const platform = platformInfo[selectedPlatform] || platformInfo['demo'];
    
    overlay.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 15px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">${platform.emoji}</span>
                    <h2 style="margin: 0; color: ${platform.color};">Create on ${platform.name}</h2>
                </div>
                <button onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer;">×</button>
            </div>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid ${platform.color};">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <span style="font-weight: bold; color: ${platform.color};">Platform: ${platform.name}</span>
                    <button onclick="showPlatformSelector()" style="background: none; border: 1px solid ${platform.color}; color: ${platform.color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">Change</button>
                </div>
                ${messageData.title ? `<p><strong>Source:</strong> ${messageData.title}</p>` : ''}
                ${messageData.author ? `<p><strong>Author:</strong> ${messageData.author}</p>` : ''}
                ${messageData.links && messageData.links.length ? `<p><strong>URL:</strong> <a href="${messageData.links[0]}" target="_blank" style="color: ${platform.color};">${messageData.links[0]}</a></p>` : ''}
            </div>
            
            <form id="advancedCoinForm">
                <div style="margin: 15px 0;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Coin Name *</label>
                    <input type="text" id="coinName" value="${messageData.title || ''}" style="width: 100%; padding: 12px; border: 2px solid #e3e5e8; border-radius: 8px; font-size: 14px;" placeholder="e.g., Pepe Coin" required>
                </div>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Symbol/Ticker *</label>
                    <input type="text" id="coinSymbol" value="${generateSymbol(messageData.title)}" style="width: 100%; padding: 12px; border: 2px solid #e3e5e8; border-radius: 8px; font-size: 14px; text-transform: uppercase;" placeholder="e.g., PEPE" maxlength="10" required>
                </div>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Description</label>
                    <textarea id="coinDesc" style="width: 100%; padding: 12px; border: 2px solid #e3e5e8; border-radius: 8px; height: 100px; font-size: 14px; resize: vertical;" placeholder="Tell people about your coin...">${messageData.description || ''}</textarea>
                </div>
                
                <div style="margin: 15px 0;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
                        <input type="checkbox" id="enableDevBuy" checked style="width: 16px; height: 16px;">
                        <label for="enableDevBuy" style="font-weight: bold; margin: 0;">Enable Developer Buy</label>
                    </div>
                    <div id="devBuyAmount" style="display: block;">
                        <label style="display: block; font-weight: bold; margin-bottom: 5px;">Developer Buy Amount (SOL)</label>
                        <div style="position: relative;">
                            <input type="number" id="coinSolAmount" value="0.01" min="0" max="100" step="0.001" style="width: 100%; padding: 12px; border: 2px solid #e3e5e8; border-radius: 8px; font-size: 14px;" placeholder="e.g., 0.01">
                            <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #666; font-size: 14px; pointer-events: none;">SOL</div>
                        </div>
                        <div style="font-size: 12px; color: #666; margin-top: 5px;">Amount of SOL to buy immediately after creation (0 - 100 SOL)</div>
                    </div>
                </div>
                
                <script>
                document.getElementById('enableDevBuy').addEventListener('change', function() {
                    const devBuyAmount = document.getElementById('devBuyAmount');
                    const solAmountInput = document.getElementById('coinSolAmount');
                    if (this.checked) {
                        devBuyAmount.style.display = 'block';
                        solAmountInput.required = true;
                    } else {
                        devBuyAmount.style.display = 'none';
                        solAmountInput.required = false;
                    }
                });
                </script>
                
                ${messageData.images && messageData.images.length ? `
                <div style="margin: 15px 0;">
                    <label style="display: block; font-weight: bold; margin-bottom: 5px;">Select Image for Coin</label>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${messageData.images.slice(0, 4).map((img, i) => `
                            <img src="${img}" style="width: 80px; height: 80px; object-fit: cover; border: 3px solid transparent; border-radius: 8px; cursor: pointer;" onclick="selectImage(this, '${img}')" data-image-url="${img}">
                        `).join('')}
                    </div>
                    <input type="hidden" id="selectedImage" value="${messageData.images[0] || ''}">
                </div>
                ` : ''}
                
                <div style="display: flex; gap: 10px; margin-top: 25px;">
                    <button type="submit" style="flex: 1; background: ${platform.color}; color: white; border: none; padding: 15px; border-radius: 8px; font-weight: bold; font-size: 16px; cursor: pointer;">${platform.emoji} Create on ${platform.name}</button>
                    <button type="button" onclick="this.closest('[style*=\"position: fixed\"]').remove()" style="background: #6c757d; color: white; border: none; padding: 15px 20px; border-radius: 8px; cursor: pointer;">Cancel</button>
                </div>
            </form>
            
            <div id="creationStatus" style="margin-top: 20px; padding: 15px; border-radius: 8px; display: none;"></div>
        </div>
    `;
    
    // Show platform selector function
    window.showPlatformSelector = function() {
        overlay.remove();
        openPlatformSelector(messageData);
    };
    
    // Image selection functionality
    window.selectImage = function(img, url) {
        overlay.querySelectorAll('img[data-image-url]').forEach(i => {
            i.style.border = '3px solid transparent';
        });
        img.style.border = `3px solid ${platform.color}`;
        overlay.querySelector('#selectedImage').value = url;
    };
    
    // Auto-select first image
    setTimeout(() => {
        const firstImg = overlay.querySelector('img[data-image-url]');
        if (firstImg) {
            firstImg.style.border = `3px solid ${platform.color}`;
        }
    }, 100);
    
    // Handle form submission
    overlay.querySelector('#advancedCoinForm').onsubmit = (e) => {
        e.preventDefault();
        createCoinOnPlatform(overlay, messageData, selectedPlatform, platform);
    };
    
    document.body.appendChild(overlay);
}

async function createCoinOnPlatform(overlay, messageData, platformKey, platformInfo) {
    const name = overlay.querySelector('#coinName').value;
    const symbol = overlay.querySelector('#coinSymbol').value;
    const description = overlay.querySelector('#coinDesc').value;
    const selectedImage = overlay.querySelector('#selectedImage')?.value || '';
    const enableDevBuy = overlay.querySelector('#enableDevBuy')?.checked || false;
    const solAmount = enableDevBuy ? parseFloat(overlay.querySelector('#coinSolAmount')?.value || '0.01') : 0;
    
    if (!name || !symbol) {
        showError(overlay, 'Please fill in name and symbol!');
        return;
    }
    
    if (enableDevBuy && (solAmount < 0 || solAmount > 100)) {
        showError(overlay, 'SOL amount must be between 0 and 100!');
        return;
    }
    
    const statusDiv = overlay.querySelector('#creationStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#e3f2fd';
    statusDiv.style.color = '#1976d2';
    statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 20px; height: 20px; border: 2px solid #1976d2; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div>Creating "${name}" (${symbol}) on ${platformInfo.name}...</div>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;
    
    // Prepare data for server
    const coinData = {
        name: name,
        symbol: symbol,
        description: description,
        platform: platformKey,
        image: selectedImage,
        solAmount: solAmount,
        sourceData: {
            title: messageData.title,
            author: messageData.author,
            links: messageData.links,
            timestamp: messageData.timestamp
        }
    };
    
    try {
        if (platformKey === 'demo') {
            setTimeout(() => {
                statusDiv.style.background = '#e8f5e8';
                statusDiv.style.color = '#2e7d32';
                statusDiv.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="color: #4caf50; font-size: 20px;">✅</div>
                        <div>
                            <strong>Demo Coin Created Successfully!</strong><br>
                            <small>Platform: ${platformInfo.name}</small><br>
                            <small>Coin: ${name} (${symbol})</small><br>
                            <small>Dev Buy: ${solAmount} SOL</small><br>
                            <small>This is a demo - choose Pump.fun for real coins!</small>
                        </div>
                    </div>
                `;
                
                setTimeout(() => overlay.remove(), 4000);
            }, 2000);
            return;
        }
        
        console.log('Sending coin data to server:', coinData);
        
        const response = await fetch(`${SERVER_URL}/api/coins/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(coinData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            statusDiv.style.background = '#e8f5e8';
            statusDiv.style.color = '#2e7d32';
            statusDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="color: #4caf50; font-size: 20px;">✅</div>
                    <div>
                        <strong>Coin Created Successfully!</strong><br>
                        <small>Platform: ${platformInfo.name}</small><br>
                        <small>Coin: ${name} (${symbol})</small><br>
                        <small>Dev Buy: ${solAmount} SOL</small><br>
                        ${result.transactionUrl ? `<a href="${result.transactionUrl}" target="_blank" style="color: #2e7d32;">View Transaction →</a>` : ''}
                    </div>
                </div>
            `;
            
            showNotification('Coin Created! 🎉', `${name} (${symbol}) created on ${platformInfo.name}`);
            setTimeout(() => overlay.remove(), 6000);
            
        } else {
            throw new Error(result.error || 'Server error occurred');
        }
        
    } catch (error) {
        console.error('Error creating coin:', error);
        
        statusDiv.style.background = '#ffebee';
        statusDiv.style.color = '#c62828';
        statusDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="color: #f44336; font-size: 20px;">❌</div>
                <div>
                    <strong>Creation Failed</strong><br>
                    <small>${error.message || 'Network error - please try again'}</small><br>
                    <small>Platform: ${platformInfo.name}</small>
                </div>
            </div>
        `;
        
        showNotification('Creation Failed ❌', `Error creating ${name} - ${error.message}`);
    }
}

function showError(overlay, message) {
    const statusDiv = overlay.querySelector('#creationStatus');
    statusDiv.style.display = 'block';
    statusDiv.style.background = '#ffebee';
    statusDiv.style.color = '#c62828';
    statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <div style="color: #f44336; font-size: 20px;">❌</div>
            <div>${message}</div>
        </div>
    `;
}

function showNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(45deg, #7289da, #5865f2);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <style>
            @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        </style>
        <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
        <div style="font-size: 13px; opacity: 0.9;">${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize
addTrackerButton();

// Re-add button when navigating Discord
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        isTracking = false;
        setTimeout(addTrackerButton, 1000);
    }
}).observe(document.body, { childList: true, subtree: true });
