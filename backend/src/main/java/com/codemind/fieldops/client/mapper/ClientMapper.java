package com.codemind.fieldops.client.mapper;

import com.codemind.fieldops.client.domain.Client;
import com.codemind.fieldops.client.dto.ClientResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ClientMapper {

    ClientResponse toResponse(Client client);

}
