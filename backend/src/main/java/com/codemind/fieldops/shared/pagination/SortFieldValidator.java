package com.codemind.fieldops.shared.pagination;

import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import java.util.Set;
import org.springframework.data.domain.Sort;

/**
 * Rejects sort fields outside an entity's allow-list — a client-supplied
 * sort property is never passed straight into a JPA query (arquitetura.md
 * §11.6 / plano-implementacao-backend.md §7: never expose internal column
 * names or allow property-name injection).
 */
public final class SortFieldValidator {

	private SortFieldValidator() {
	}

	public static void validate(Sort sort, Set<String> allowedFields) {
		for (Sort.Order order : sort) {
			if (!allowedFields.contains(order.getProperty())) {
				throw new BusinessRuleViolationException("INVALID_SORT_FIELD",
					"Sort field '" + order.getProperty() + "' is not allowed");
			}
		}
	}

}
