package com.pollosflow;

import com.pollosflow.users.KeycloakProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(KeycloakProperties.class)
public class PollosflowApplication {

	public static void main(String[] args) {
		SpringApplication.run(PollosflowApplication.class, args);
	}

}
