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

        const { name, symbol, image, platform, solAmount, slippage, priorityFee, links, sourceData } = req.body;

        if (!name || !symbol || !platform) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, symbol, platform' 
            });
        }

        if (!['pump.fun', 'letsbonk.fun', 'demo'].includes(platform)) {
            return res.status(400).json({ 
                error: 'Invalid platform. Must be pump.fun, letsbonk.fun, or demo' 
            });
        }

        // Demo mode
        if (platform === 'demo') {
            console.log('📝 Demo mode - simulating coin creation');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            return res.json({
                success: true,
                demo: true,
                coin: { name, symbol, platform, solAmount: solAmount || 0.1 },
                message: 'Demo coin created successfully!',
                transactionUrl: `https://solscan.io/tx/demo-${Date.now()}`
            });
        }

        if (!PUMPPORTAL_API_KEY || PUMPPORTAL_API_KEY === 'your-api-key-here') {
            return res.status(500).json({ 
                error: 'PumpPortal API key not configured' 
            });
        }

        // Validate and set fee parameters
        const amount = parseFloat(solAmount);
        const slippageValue = parseFloat(slippage) || 15;
        const priorityFeeValue = parseFloat(priorityFee) || 0.0005;
        
        if (isNaN(amount)) {
            return res.status(400).json({
                error: 'Invalid SOL amount provided'
            });
        }
        if (amount < 0 || amount > 100) {
            return res.status(400).json({
                error: 'SOL amount must be between 0 and 100'
            });
        }
        if (slippageValue < 1 || slippageValue > 50) {
            return res.status(400).json({
                error: 'Slippage must be between 1 and 50 percent'
            });
        }
        if (priorityFeeValue < 0 || priorityFeeValue > 0.01) {
            return res.status(400).json({
                error: 'Priority fee must be between 0 and 0.01 SOL'
            });
        }

        console.log(`💰 Creating coin with ${amount} SOL dev buy, ${slippageValue}% slippage, ${priorityFeeValue} SOL priority fee`);

        const mintKeypair = Keypair.generate();
        console.log('🔑 Generated token address:', mintKeypair.publicKey.toString());

        let metadataUri;
        
        if (image) {
            console.log('📤 Uploading image and metadata to IPFS...');
            metadataUri = await uploadToIPFS(name, symbol, links, image, sourceData);
        } else {
            metadataUri = await uploadMetadataOnly(name, symbol, links, sourceData);
        }

        console.log('🪙 Creating token on', platform);
        const result = await createToken({
            name,
            symbol,
            metadataUri,
            mintKeypair,
            platform: platform === 'pump.fun' ? 'pump' : 'bonk',
            amount,
            slippage: slippageValue,
            priorityFee: priorityFeeValue
        });

        res.json({
            success: true,
            coin: {
                name,
                symbol,
                platform,
                address: mintKeypair.publicKey.toString(),
                solAmount: amount
            },
            transaction: result.signature,
            transactionUrl: `https://solscan.io/tx/${result.signature}`,
            metadataUri
        });

    } catch (error) {
        console.error('❌ Error creating coin:', error);
        
        // Better error messages based on the error type
        let errorMessage = 'Failed to create coin';
        let errorDetails = error.message;
        
        if (error.message.includes('custom program error: 1')) {
            errorMessage = 'Pump.fun creation failed';
            errorDetails = 'This could be due to: insufficient SOL balance, invalid parameters, or API limits. Please try again or reduce the SOL amount.';
        } else if (error.message.includes('403')) {
            errorMessage = 'API key rejected';
            errorDetails = 'Please check your PumpPortal API key configuration.';
        } else if (error.message.includes('429')) {
            errorMessage = 'Rate limit exceeded';
            errorDetails = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('IPFS')) {
            errorMessage = 'Image upload failed';
            errorDetails = 'Could not upload image to IPFS. Try again or use a different image.';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: errorDetails,
            rawError: error.message
        });
    }
});

async function uploadToIPFS(name, symbol, links, imageUrl, sourceData) {
    try {
        let imageBuffer;
        let contentType = 'image/png';
        
        if (imageUrl.startsWith('data:')) {
            // Handle base64 data URLs (uploaded/pasted images)
            console.log('🖼️ Processing base64 image data...');
            const base64Data = imageUrl.split(',')[1];
            const mimeType = imageUrl.split(';')[0].split(':')[1];
            contentType = mimeType || 'image/png';
            imageBuffer = Buffer.from(base64Data, 'base64');
            console.log(`📦 Base64 image processed: ${imageBuffer.length} bytes, type: ${contentType}`);
        } else {
            // Handle regular URLs (Discord images, etc.)
            console.log('🖼️ Downloading image from URL:', imageUrl);
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
            }
            imageBuffer = await imageResponse.buffer();
            contentType = imageResponse.headers.get('content-type') || 'image/png';
            console.log(`📦 Image downloaded: ${imageBuffer.length} bytes, type: ${contentType}`);
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('symbol', symbol);
        formData.append('description', `${name} token`); // Simple description
        formData.append('showName', 'true');
        
        // Add social links to metadata
        if (links) {
            if (links.website) {
                formData.append('website', links.website);
                console.log('🌐 Added website:', links.website);
            }
            if (links.twitter) {
                formData.append('twitter', links.twitter);
                console.log('🐦 Added Twitter:', links.twitter);
            }
            if (links.telegram) {
                formData.append('telegram', links.telegram);
                console.log('💬 Added Telegram:', links.telegram);
            }
        }

        formData.append('file', imageBuffer, {
            filename: 'token-image.png',
            contentType: contentType
        });

        console.log('☁️ Uploading to IPFS...');
        const response = await fetch('https://pump.fun/api/ipfs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('IPFS Error Response:', errorText);
            throw new Error(`IPFS upload failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ IPFS upload successful:', result.metadataUri);
        return result.metadataUri;

    } catch (error) {
        console.error('❌ IPFS upload error:', error);
        throw new Error(`IPFS upload failed: ${error.message}`);
    }
}

async function uploadMetadataOnly(name, symbol, links, sourceData) {
    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('symbol', symbol);
        formData.append('description', `${name} token`);
        formData.append('showName', 'true');
        
        // Add social links to metadata
        if (links) {
            if (links.website) {
                formData.append('website', links.website);
            }
            if (links.twitter) {
                formData.append('twitter', links.twitter);
            }
            if (links.telegram) {
                formData.append('telegram', links.telegram);
            }
        }

        const response = await fetch('https://pump.fun/api/ipfs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Metadata upload failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return result.metadataUri;

    } catch (error) {
        console.error('❌ Metadata upload error:', error);
        throw error;
    }
}

async function createToken({ name, symbol, metadataUri, mintKeypair, platform, amount, slippage, priorityFee }) {
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
            amount: amount,
            slippage: slippage || 15,
            priorityFee: priorityFee || 0.0005,
            pool: platform
        };

        console.log('📡 Sending request to PumpPortal:', {
            ...requestBody,
            mint: '[PRIVATE_KEY_HIDDEN]',
            amount: amount,
            slippage: slippage,
            priorityFee: priorityFee
        });

        const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${PUMPPORTAL_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('📨 PumpPortal response status:', response.status);
        console.log('📨 PumpPortal response:', responseText);

        if (!response.ok) {
            throw new Error(`PumpPortal API error: ${response.status} - ${responseText}`);
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Invalid JSON response from PumpPortal: ${responseText}`);
        }

        if (result.error) {
            throw new Error(`PumpPortal error: ${result.error}`);
        }

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
        console.log('   Set PUMPPORTAL_API_KEY environment variable');
    } else {
        console.log('✅ PumpPortal API key configured');
    }
});

module.exports = app;
