package com.codemind.fieldops.user.application;

import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.domain.UserRole;
import com.codemind.fieldops.user.domain.UserStatus;
import org.springframework.data.jpa.domain.Specification;

final class UserSpecifications {

	private UserSpecifications() {
	}

	static Specification<User> nameContains(String name) {
		return (root, query, cb) -> name == null ? null
			: cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
	}

	static Specification<User> emailContains(String email) {
		return (root, query, cb) -> email == null ? null
			: cb.like(cb.lower(root.get("email")), "%" + email.toLowerCase() + "%");
	}

	static Specification<User> hasRole(UserRole role) {
		return (root, query, cb) -> role == null ? null : cb.equal(root.get("role"), role);
	}

	static Specification<User> hasStatus(UserStatus status) {
		return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
	}

}
