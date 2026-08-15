package com.codemind.fieldops.client.application;

import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.domain.ClientStatus;
import org.springframework.data.jpa.domain.Specification;

final class ClientSpecifications {

    private ClientSpecifications() {
    }

    static Specification<Client> nameContains(String name) {
        return (root, query, cb) -> name == null ? null
            : cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%");
    }

    static Specification<Client> hasStatus(ClientStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

}
