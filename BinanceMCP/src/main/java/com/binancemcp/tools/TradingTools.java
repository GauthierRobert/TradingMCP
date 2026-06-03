package com.binancemcp.tools;

import com.binancemcp.client.BinanceClient;
import com.binancemcp.config.BinanceProperties;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Signed Binance trading tools. These place and cancel REAL orders against the configured account.
 *
 * <p>As a safety guard, order placement and cancellation are refused unless
 * {@code binance.trading-enabled=true}. Leave it off until you intend to trade for real.
 */
@Component
public class TradingTools {

    private final BinanceClient client;
    private final BinanceProperties props;

    public TradingTools(BinanceClient client, BinanceProperties props) {
        this.client = client;
        this.props = props;
    }

    @Tool(description = "Place a spot order on Binance. This executes a REAL trade. "
            + "Requires trading to be enabled in the server configuration. Returns JSON.")
    public String placeOrder(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol,
            @ToolParam(description = "Order side: BUY or SELL") String side,
            @ToolParam(description = "Order type: LIMIT, MARKET, STOP_LOSS_LIMIT, etc.") String type,
            @ToolParam(description = "Order quantity in base asset, e.g. 0.001 for BTC", required = false)
            String quantity,
            @ToolParam(description = "Limit price (required for LIMIT orders)", required = false)
            String price,
            @ToolParam(description = "Time in force for LIMIT orders: GTC, IOC, FOK (default GTC)",
                    required = false) String timeInForce,
            @ToolParam(description = "Quote order quantity for MARKET orders (alternative to quantity), "
                    + "e.g. 100 to spend 100 USDT", required = false) String quoteOrderQty) {

        requireTradingEnabled();

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("symbol", symbol.toUpperCase());
        params.put("side", side.toUpperCase());
        params.put("type", type.toUpperCase());
        if (quantity != null && !quantity.isBlank()) {
            params.put("quantity", quantity);
        }
        if (quoteOrderQty != null && !quoteOrderQty.isBlank()) {
            params.put("quoteOrderQty", quoteOrderQty);
        }
        if (price != null && !price.isBlank()) {
            params.put("price", price);
            params.put("timeInForce", timeInForce == null || timeInForce.isBlank() ? "GTC" : timeInForce);
        }
        return client.signed(HttpMethod.POST, "/api/v3/order", params);
    }

    @Tool(description = "Cancel an open order by orderId. Requires trading to be enabled. Returns JSON.")
    public String cancelOrder(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol,
            @ToolParam(description = "The orderId returned when the order was placed") long orderId) {
        requireTradingEnabled();
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("symbol", symbol.toUpperCase());
        params.put("orderId", orderId);
        return client.signed(HttpMethod.DELETE, "/api/v3/order", params);
    }

    @Tool(description = "Query the status of a specific order by orderId. Read-only. Returns JSON.")
    public String getOrder(
            @ToolParam(description = "Trading pair symbol, e.g. BTCUSDT") String symbol,
            @ToolParam(description = "The orderId to look up") long orderId) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("symbol", symbol.toUpperCase());
        params.put("orderId", orderId);
        return client.signed(HttpMethod.GET, "/api/v3/order", params);
    }

    private void requireTradingEnabled() {
        if (!props.tradingEnabled()) {
            throw new IllegalStateException(
                    "Trading is disabled. Set binance.trading-enabled=true "
                            + "(or BINANCE_TRADING_ENABLED=true) to allow placing or cancelling orders.");
        }
    }
}
