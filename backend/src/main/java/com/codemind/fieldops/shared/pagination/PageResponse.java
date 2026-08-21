package com.codemind.fieldops.shared.pagination;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Pagination envelope fixed by openapi.yaml/contrato-backend-frontend.md §9.2 —
 * intentionally not Spring HATEOAS's PagedModel, whose field names differ.
 */
public record PageResponse<T>(int page, int size, long totalElements, int totalPages, List<T> content) {

	public static <T> PageResponse<T> from(Page<T> page) {
		return new PageResponse<>(page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages(),
			page.getContent());
	}

}
