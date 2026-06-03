package com.binancemcp.client;

import com.binancemcp.config.BinanceProperties;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin wrapper around the Binance Spot REST API.
 *
 * <p>Two request flavours:
 * <ul>
 *   <li>{@link #getPublic} — unsigned market-data endpoints.</li>
 *   <li>{@link #signed} — endpoints requiring an API key + HMAC-SHA256 signature
 *       (account data and trading).</li>
 * </ul>
 *
 * <p>Responses are returned as raw JSON strings: the MCP client (an LLM) reads them directly,
 * so there is no need to model every Binance payload. Binance error responses (non-2xx) are
 * returned verbatim rather than thrown, so the caller can surface the exact reason.
 */
@Component
public class BinanceClient {

    private final BinanceProperties props;
    private final RestClient http;

    public BinanceClient(BinanceProperties props) {
        this.props = props;
        this.http = RestClient.builder()
                .baseUrl(props.baseUrl())
                // Don't throw on 4xx/5xx — let the JSON error body flow back to the caller.
                .defaultStatusHandler(status -> status.isError(), (request, response) -> { })
                .build();
    }

    /** Calls an unsigned, public endpoint such as /api/v3/ticker/price. */
    public String getPublic(String path, Map<String, ?> params) {
        String query = toQuery(params);
        String uri = query.isEmpty() ? path : path + "?" + query;
        return http.get().uri(uri).retrieve().body(String.class);
    }

    /**
     * Calls a signed endpoint. {@code timestamp} and {@code recvWindow} are added automatically,
     * and the whole query string is signed with the API secret.
     */
    public String signed(HttpMethod method, String path, Map<String, Object> params) {
        if (!props.hasCredentials()) {
            throw new IllegalStateException(
                    "Binance API credentials are not configured. "
                            + "Set BINANCE_API_KEY and BINANCE_SECRET_KEY.");
        }

        Map<String, Object> all = new LinkedHashMap<>(params);
        all.put("recvWindow", props.recvWindow());
        all.put("timestamp", System.currentTimeMillis());

        String query = toQuery(all);
        String signature = hmacSha256(query, props.secretKey());
        String uri = path + "?" + query + "&signature=" + signature;

        return http.method(method)
                .uri(uri)
                .header("X-MBX-APIKEY", props.apiKey())
                .retrieve()
                .body(String.class);
    }

    private static String toQuery(Map<String, ?> params) {
        if (params == null || params.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, ?> e : params.entrySet()) {
            if (e.getValue() == null) {
                continue;
            }
            if (sb.length() > 0) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8))
                    .append('=')
                    .append(URLEncoder.encode(String.valueOf(e.getValue()), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private static String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16))
                        .append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to sign Binance request", ex);
        }
    }
}
