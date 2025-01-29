document.addEventListener("DOMContentLoaded", function () {
    // First update the HTML to add market cap elements
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const symbol = card.querySelector('h2').textContent;
        const marketCapElement = document.createElement('p');
        marketCapElement.id = `mcap-${symbol.toLowerCase()}`;
        marketCapElement.className = 'market-cap';
        marketCapElement.textContent = 'Market Cap: Loading...';
        // Insert market cap element after the percentage change
        card.querySelector('.percentage').after(marketCapElement);
    });

    function initTradingViewWidget(containerId, symbol) {
        new TradingView.widget({
            container_id: containerId,
            symbol: `GATEIO:${symbol}`,
            interval: "D",
            timezone: "Etc/UTC",
            theme: "light",
            style: "1",
            locale: "en",
            toolbar_bg: "#f1f3f6",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: false,
            height: 350,
            width: "100%",
            studies: ["RSI@tv-basicstudies"]
        });
    }

    // Initialize TradingView charts
    initTradingViewWidget("btc-chart", "BTCUSDT");
    initTradingViewWidget("xrp-chart", "XRPUSDT");
    initTradingViewWidget("flr-chart", "FLRUSDT");
    initTradingViewWidget("hln-chart", "HLNUSDT");

    // WebSocket connection
    const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');
    
    const TRADING_PAIRS = {
        BTC: { 
            pair: "BTC_USDT", 
            price: "price-btc", 
            change: "change-btc",
            mcap: "mcap-btc",
            circulatingSupply: 19600000 // Approximate BTC circulating supply
        },
        XRP: { 
            pair: "XRP_USDT", 
            price: "price-xrp", 
            change: "change-xrp",
            mcap: "mcap-xrp",
            circulatingSupply: 45404028640 // Approximate XRP circulating supply
        },
        FLR: { 
            pair: "FLR_USDT", 
            price: "price-flr", 
            change: "change-flr",
            mcap: "mcap-flr",
            circulatingSupply: 1200000000 // Approximate FLR circulating supply
        },
        HLN: { 
            pair: "HLN_USDT", 
            price: "price-hln", 
            change: "change-hln",
            mcap: "mcap-hln",
            circulatingSupply: 100000000 // HLN circulating supply
        }
    };

    function formatMarketCap(marketCap) {
        if (marketCap >= 1e9) {
            return `$${(marketCap / 1e9).toFixed(2)}B`;
        } else if (marketCap >= 1e6) {
            return `$${(marketCap / 1e6).toFixed(2)}M`;
        } else if (marketCap >= 1e3) {
            return `$${(marketCap / 1e3).toFixed(2)}K`;
        }
        return `$${marketCap.toFixed(2)}`;
    }
    
    ws.onopen = function() {
        console.log('WebSocket Connected');
        
        const pairs = Object.values(TRADING_PAIRS).map(coin => coin.pair);
        const subscribeMessage = {
            "time": Math.floor(Date.now() / 1000),
            "channel": "spot.tickers",
            "event": "subscribe",
            "payload": pairs
        };
        
        ws.send(JSON.stringify(subscribeMessage));
    };

    ws.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.channel === "spot.tickers" && data.event === "update") {
                const ticker = data.result;
                const coin = Object.values(TRADING_PAIRS).find(c => c.pair === ticker.currency_pair);
                
                if (coin) {
                    const priceElement = document.getElementById(coin.price);
                    const changeElement = document.getElementById(coin.change);
                    const mcapElement = document.getElementById(coin.mcap);

                    // Update price with 4 decimal places
                    const price = parseFloat(ticker.last).toFixed(4);
                    priceElement.textContent = `$${price}`;

                    // Update 24h change
                    const change = parseFloat(ticker.change_percentage);
                    changeElement.textContent = `${change.toFixed(2)}%`;
                    changeElement.className = `percentage ${change >= 0 ? 'green' : 'red'}`;

                    // Calculate and update market cap
                    const marketCap = parseFloat(ticker.last) * coin.circulatingSupply;
                    mcapElement.textContent = `Market Cap: ${formatMarketCap(marketCap)}`;
                }
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
    };

    ws.onerror = function(error) {
        console.error("WebSocket Error:", error);
    };

    ws.onclose = function() {
        console.log("WebSocket Disconnected");
        setTimeout(() => {
            location.reload();
        }, 5000);
    };

    // Keep connection alive
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                "time": Math.floor(Date.now() / 1000),
                "channel": "spot.ping"
            }));
        }
    }, 20000);
});