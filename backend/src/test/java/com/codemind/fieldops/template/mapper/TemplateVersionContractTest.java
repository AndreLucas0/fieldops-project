package com.codemind.fieldops.template.mapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.user.domain.User;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class TemplateVersionContractTest {
    @Test
    void keepsTemplateAndPublisherIdentifiersRequiredByThePublishedContract() {
        var version = mock(TemplateVersion.class);
        var template = mock(InspectionTemplate.class);
        var publisher = mock(User.class);
        var templateId = UUID.randomUUID();
        var publisherId = UUID.randomUUID();
        when(version.getTemplate()).thenReturn(template);
        when(version.getPublishedBy()).thenReturn(publisher);
        when(template.getId()).thenReturn(templateId);
        when(publisher.getId()).thenReturn(publisherId);
        var response = Mappers.getMapper(TemplateMapper.class).toVersionResponse(version);
        assertThat(response.templateId()).isEqualTo(templateId);
        assertThat(response.publishedBy()).isEqualTo(publisherId);
        assertThat(response.publishedById()).isEqualTo(publisherId);
    }
}
