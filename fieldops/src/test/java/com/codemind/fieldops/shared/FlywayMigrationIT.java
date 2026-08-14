package com.codemind.fieldops.shared;

import static org.assertj.core.api.Assertions.assertThat;

import com.codemind.fieldops.FieldopsApplication;
import com.codemind.fieldops.TestcontainersConfiguration;
import java.util.List;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(classes = FieldopsApplication.class)
@ActiveProfiles("local")
class FlywayMigrationIT {

	@Autowired
	private Flyway flyway;

	@Autowired
	private DataSource dataSource;

	@Test
	void migrationsApplyCleanlyOnAnEmptyDatabase() {
		assertThat(flyway.info().all()).isNotEmpty();
		assertThat(flyway.info().all())
			.allSatisfy(migration -> assertThat(migration.getState()).isEqualTo(MigrationState.SUCCESS));
		assertThat(flyway.info().current().getVersion().toString()).isEqualTo("7");
	}

	@Test
	void expectedCoreTablesExistAfterMigration() {
		JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);

		List<String> tables = jdbcTemplate.queryForList(
			"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
			String.class);

		assertThat(tables).contains(
			"users", "clients", "inspection_sites", "equipment",
			"inspection_templates", "inspection_template_versions", "template_sections", "template_items",
			"inspections", "inspection_item_snapshots", "inspection_responses",
			"evidence", "non_conformities", "inspection_reviews", "audit_events");
	}

}
