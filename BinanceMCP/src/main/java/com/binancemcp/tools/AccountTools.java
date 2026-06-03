package com.binancemcp.tools;

import com.binancemcp.client.BinanceClient;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Signed Binance account tools (read-only). Require BINANCE_API_KEY / BINANCE_SECRET_KEY.
 */
@Component
public class AccountTools {

    private final BinanceClient client;

    public AccountTools(BinanceClient client) {
        this.client = client;
    }

    @Tool(description = "Get the current account information including all asset balances. Returns JSON.")
    public String getAccount() {
        return client.signed(HttpMethod.GET, "/api/v3/account", new LinkedHashMap<>());
    }

    @Tool(description = "List open orders. Pass a symbol to filter, or omit for all symbols. Returns JSON.")
    public String getOpenOrders(
            @ToolParam(description = "Optional trading pair symbol, e.g. BTCUSDT", required = false)
            String symbol) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (symbol != null && !symbol.isBlank()) {
            params.put("symbol", symbol.toUpperCase());
        }
        return client.signed(HttpMethod.GET, "/api/v3/openOrders", params);
    }

    @Tool(description = "Get the trade history for a symbol (your fills). Returns JSON.")
    public String getMyTrades(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol,
            @ToolParam(description = "Max number of trades to return, max 1000 (default 50)",
                    required = false) Integer limit) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("symbol", symbol.toUpperCase());
        params.put("limit", limit == null ? 50 : limit);
        return client.signed(HttpMethod.GET, "/api/v3/myTrades", params);
    }
}
