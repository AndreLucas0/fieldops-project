package com.codemind.fieldops.shared.audit.mapper;

import com.codemind.fieldops.shared.audit.AuditEvent;
import com.codemind.fieldops.shared.audit.dto.AuditEventResponse;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AuditEventMapper {

    AuditEventResponse toResponse(AuditEvent auditEvent);

}
