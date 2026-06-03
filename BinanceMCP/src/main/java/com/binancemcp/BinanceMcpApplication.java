package com.binancemcp;

import com.binancemcp.tools.AccountTools;
import com.binancemcp.tools.MarketDataTools;
import com.binancemcp.tools.TradingTools;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BinanceMcpApplication {

    public static void main(String[] args) {
        SpringApplication.run(BinanceMcpApplication.class, args);
    }

    /**
     * Registers every {@code @Tool}-annotated method on these beans as an MCP tool.
     * Add new tool classes here when you create them.
     */
    @Bean
    ToolCallbackProvider binanceTools(MarketDataTools marketData,
                                      AccountTools account,
                                      TradingTools trading) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(marketData, account, trading)
                .build();
    }
}
