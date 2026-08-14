package com.codemind.fieldops.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@ActiveProfiles("local")
class ApplicationBootIT {

	@Autowired
	private Environment environment;

	@Autowired
	private DataSource dataSource;

	@Test
	void contextLoadsWithLocalProfileAndReachableDatabase() {
		assertThat(environment.getActiveProfiles()).contains("local");

		JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
		Integer result = jdbcTemplate.queryForObject("SELECT 1", Integer.class);

		assertThat(result).isEqualTo(1);
	}

}
