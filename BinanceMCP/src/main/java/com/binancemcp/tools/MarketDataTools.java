package com.binancemcp.tools;

import com.binancemcp.client.BinanceClient;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public Binance market-data tools. No API key required.
 */
@Component
public class MarketDataTools {

    private final BinanceClient client;

    public MarketDataTools(BinanceClient client) {
        this.client = client;
    }

    @Tool(description = "Get the latest price for a Binance spot symbol, e.g. BTCUSDT. Returns JSON.")
    public String getPrice(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol) {
        return client.getPublic("/api/v3/ticker/price",
                Map.of("symbol", symbol.toUpperCase()));
    }

    @Tool(description = "Get 24-hour rolling price change statistics for a symbol, e.g. BTCUSDT. Returns JSON.")
    public String get24hStats(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol) {
        return client.getPublic("/api/v3/ticker/24hr",
                Map.of("symbol", symbol.toUpperCase()));
    }

    @Tool(description = "Get the current order book (bids and asks) for a symbol. Returns JSON.")
    public String getOrderBook(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol,
            @ToolParam(description = "Number of levels per side: 5, 10, 20, 50, 100, 500, 1000 (default 20)",
                    required = false) Integer limit) {
        return client.getPublic("/api/v3/depth", Map.of(
                "symbol", symbol.toUpperCase(),
                "limit", limit == null ? 20 : limit));
    }

    @Tool(description = "Get candlestick / kline data for a symbol. Returns a JSON array of OHLCV candles. "
            + "Use startTime/endTime (epoch milliseconds) to fetch a specific HISTORICAL window "
            + "(e.g. a past bull run) for backtesting; omit them for the most recent candles.")
    public String getKlines(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol,
            @ToolParam(description = "Interval: 1m,5m,15m,1h,4h,1d,1w, etc.") String interval,
            @ToolParam(description = "Number of candles to return, max 1000 (default 100)",
                    required = false) Integer limit,
            @ToolParam(description = "Optional window start in epoch milliseconds (UTC). "
                    + "Returns candles at/after this time.", required = false) Long startTime,
            @ToolParam(description = "Optional window end in epoch milliseconds (UTC). "
                    + "Returns candles up to this time.", required = false) Long endTime) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("symbol", symbol.toUpperCase());
        params.put("interval", interval);
        params.put("limit", limit == null ? 100 : limit);
        if (startTime != null) params.put("startTime", startTime);
        if (endTime != null) params.put("endTime", endTime);
        return client.getPublic("/api/v3/klines", params);
    }

    @Tool(description = "Get exchange trading rules and symbol information. "
            + "Pass a symbol to filter, or omit for all symbols (large response). Returns JSON.")
    public String getExchangeInfo(
            @ToolParam(description = "Optional trading pair symbol to filter, e.g. BTCUSDT",
                    required = false) String symbol) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (symbol != null && !symbol.isBlank()) {
            params.put("symbol", symbol.toUpperCase());
        }
        return client.getPublic("/api/v3/exchangeInfo", params);
    }
}
