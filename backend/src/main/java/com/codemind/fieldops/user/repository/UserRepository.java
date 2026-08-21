package com.codemind.fieldops.user.repository;

import com.codemind.fieldops.user.domain.User;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {

	Optional<User> findByEmail(String email);

	boolean existsByEmail(String email);

}
