package kr.routineslim.config;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class DatabaseProfileConfigurationTest {
  private ApplicationContextRunner configuration() {
    Path config = Path.of("src/main/resources/application.properties");
    if (!java.nio.file.Files.isRegularFile(config))
      config = Path.of("backend/src/main/resources/application.properties");
    return new ApplicationContextRunner()
        .withInitializer(new ConfigDataApplicationContextInitializer())
        .withPropertyValues("spring.config.location=" + config.toAbsolutePath().toUri());
  }

  @Test
  void defaultH2DoesNotRequireOrUseMysqlConnectionSettings() {
    configuration()
        .withPropertyValues(
            "DB_URL=jdbc:mysql://invalid/unused",
            "DB_USERNAME=mysql_only",
            "DB_PASSWORD=mysql_only")
        .run(
            context -> {
              assertNull(context.getStartupFailure());
              var env = context.getEnvironment();
              assertEquals("h2", env.getDefaultProfiles()[0]);
              assertTrue(env.getProperty("spring.datasource.url").startsWith("jdbc:h2:file:"));
              assertEquals("org.h2.Driver", env.getProperty("spring.datasource.driver-class-name"));
              assertEquals("sa", env.getProperty("spring.datasource.username"));
              assertEquals(
                  "classpath:schema.sql", env.getProperty("spring.sql.init.schema-locations"));
            });
  }

  @Test
  void mysqlProfileSelectsMysqlDriverSchemaAndExternalCredentials() {
    configuration()
        .withPropertyValues(
            "spring.profiles.active=mysql",
            "DB_URL=jdbc:mysql://localhost:3306/runtime_test",
            "DB_USERNAME=runtime_user",
            "DB_PASSWORD=test_only")
        .run(
            context -> {
              assertNull(context.getStartupFailure());
              var env = context.getEnvironment();
              assertEquals(
                  "jdbc:mysql://localhost:3306/runtime_test",
                  env.getProperty("spring.datasource.url"));
              assertEquals(
                  "com.mysql.cj.jdbc.Driver",
                  env.getProperty("spring.datasource.driver-class-name"));
              assertEquals("runtime_user", env.getProperty("spring.datasource.username"));
              assertEquals("test_only", env.getProperty("spring.datasource.password"));
              assertEquals(
                  "classpath:schema-mysql.sql",
                  env.getProperty("spring.sql.init.schema-locations"));
            });
  }
}
