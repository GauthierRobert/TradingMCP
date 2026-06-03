package com.binancemcp.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Plain unit test (no Spring context, so it never touches the STDIO transport).
 */
class BinancePropertiesTest {

    @Test
    void hasCredentials_isFalse_whenKeysMissingOrBlank() {
        assertFalse(props(null, null).hasCredentials());
        assertFalse(props("", "").hasCredentials());
        assertFalse(props("key", " ").hasCredentials());
    }

    @Test
    void hasCredentials_isTrue_whenBothKeysPresent() {
        assertTrue(props("key", "secret").hasCredentials());
    }

    private static BinanceProperties props(String apiKey, String secret) {
        return new BinanceProperties("https://api.binance.com", apiKey, secret, 5000, false);
    }
}
