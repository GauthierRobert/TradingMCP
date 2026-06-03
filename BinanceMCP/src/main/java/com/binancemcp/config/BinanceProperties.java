package com.binancemcp.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the Binance REST API, bound from the {@code binance.*} namespace.
 *
 * <p>Credentials are read from environment variables (see application.yml) and must never be
 * committed to source control. {@code tradingEnabled} is a safety switch: order placement and
 * cancellation are rejected unless it is explicitly turned on.
 */
@ConfigurationProperties(prefix = "binance")
public record BinanceProperties(
        String baseUrl,
        String apiKey,
        String secretKey,
        long recvWindow,
        boolean tradingEnabled
) {
    /** True when both an API key and secret are present. */
    public boolean hasCredentials() {
        return apiKey != null && !apiKey.isBlank()
                && secretKey != null && !secretKey.isBlank();
    }
}
