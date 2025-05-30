const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Environment variables
const PUMPPORTAL_API_KEY = process.env.PUMPPORTAL_API_KEY || 'your-api-key-here';

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        apiConfigured: !!PUMPPORTAL_API_KEY && PUMPPORTAL_API_KEY !== 'your-api-key-here'
    });
});

// Main coin creation endpoint
app.post('/api/coins/create', async (req, res) => {
    try {
        console.log('🚀 Received coin creation request:', req.body);

        const { name, symbol, description, image, platform, sourceData } = req.body;

        if (!name || !symbol || !platform) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, symbol, platform' 
            });
        }

        if (!['pump.fun', 'bonk.fun', 'demo'].includes(platform)) {
            return res.status(400).json({ 
                error: 'Invalid platform. Must be pump.fun, bonk.fun, or demo' 
            });
        }

        // Demo mode
        if (platform === 'demo') {
            console.log('📝 Demo mode - simulating coin creation');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return res.json({
                success: true,
                demo: true,
                coin: { name, symbol, platform },
                message: 'Demo coin created successfully!',
                transactionUrl: `https://solscan.io/tx/demo-${Date.now()}`
            });
        }

        if (!PUMPPORTAL_API_KEY || PUMPPORTAL_API_KEY === 'your-api-key-here') {
            return res.status(500).json({ 
                error: 'PumpPortal API key not configured' 
            });
        }

        const mintKeypair = Keypair.generate();
        console.log('🔑 Generated token address:', mintKeypair.publicKey.toString());

        let metadataUri;
        
        if (image) {
            console.log('📤 Uploading image and metadata to IPFS...');
            metadataUri = await uploadToIPFS(name, symbol, description, image, sourceData);
        } else {
            metadataUri = await uploadMetadataOnly(name, symbol, description, sourceData);
        }

        console.log('🪙 Creating token on', platform);
        const result = await createToken({
            name,
            symbol,
            metadataUri,
            mintKeypair,
            platform: platform === 'pump.fun' ? 'pump' : 'bonk'
        });

        res.json({
            success: true,
            coin: {
                name,
                symbol,
                platform,
                address: mintKeypair.publicKey.toString()
            },
            transaction: result.signature,
            transactionUrl: `https://solscan.io/tx/${result.signature}`,
            metadataUri
        });

    } catch (error) {
        console.error('❌ Error creating coin:', error);
        res.status(500).json({ 
            error: 'Failed to create coin',
            details: error.message 
        });
    }
});

async function uploadToIPFS(name, symbol, description, imageUrl, sourceData) {
    try {
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to download image');
        }
        const imageBuffer = await imageResponse.buffer();

        const formData = new FormData();
        formData.append('name', name);
        formData.append('symbol', symbol);
        formData.append('description', description || `${name} token`);
        formData.append('showName', 'true');
        
        if (sourceData?.url) {
            formData.append('website', sourceData.url);
        }
        
        formData.append('file', imageBuffer, {
            filename: 'token-image.png',
            contentType: 'image/png'
        });

        const response = await fetch('https://pump.fun/api/ipfs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`IPFS upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ IPFS upload successful:', result.metadataUri);
        return result.metadataUri;

    } catch (error) {
        console.error('❌ IPFS upload error:', error);
        throw error;
    }
}

async function uploadMetadataOnly(name, symbol, description, sourceData) {
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('symbol', symbol);
        formData.append('description', description || `${name} token`);
        formData.append('showName', 'true');
        
        if (sourceData?.url) {
            formData.append('website', sourceData.url);
        }

        const response = await fetch('https://pump.fun/api/ipfs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Metadata upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.metadataUri;

    } catch (error) {
        console.error('❌ Metadata upload error:', error);
        throw error;
    }
}

async function createToken({ name, symbol, metadataUri, mintKeypair, platform }) {
    try {
        const tokenMetadata = {
            name,
            symbol,
            uri: metadataUri
        };

        const requestBody = {
            action: 'create',
            tokenMetadata,
            mint: bs58.encode(mintKeypair.secretKey),
            denominatedInSol: 'true',
            amount: 0.1,
            slippage: 15,
            priorityFee: 0.0005,
            pool: platform
        };

        const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${PUMPPORTAL_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`PumpPortal API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Token created successfully:', result);
        return result;

    } catch (error) {
        console.error('❌ Token creation error:', error);
        throw error;
    }
}

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health: http://localhost:${PORT}/health`);
    
    if (!PUMPPORTAL_API_KEY || PUMPPORTAL_API_KEY === 'your-api-key-here') {
        console.log('⚠️  Warning: PumpPortal API key not configured!');
    } else {
        console.log('✅ PumpPortal API key configured');
    }
});

module.exports = app;